import { Router } from 'express';
import db from '../db/connection';

const router = Router();

// GET /api/statistics/monthly?year=2024&month=2
router.get('/monthly', (req, res) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  try {
    // Total Income, Expense
    const totalStmt = db.prepare(`
      SELECT type, SUM(amount) as total
      FROM transactions
      WHERE year = ? AND month = ?
      GROUP BY type
    `);
    const totals = totalStmt.all(year, month) as { type: string, total: number }[];
    
    const income = totals.find(t => t.type === 'income')?.total || 0;
    const expense = totals.find(t => t.type === 'expense')?.total || 0;
    const balance = income - expense;

    // Savings Total
    const savingsStmt = db.prepare(`
      SELECT SUM(amount) as total
      FROM savings
      WHERE year = ? AND month = ?
    `);
    const savingsTotal = (savingsStmt.get(year, month) as { total: number }).total || 0;

    // Category Breakdown (Expense)
    const categoryStmt = db.prepare(`
      SELECT c.major, SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.year = ? AND t.month = ? AND t.type = 'expense'
      GROUP BY c.major
      ORDER BY total DESC
    `);
    const categoryBreakdown = categoryStmt.all(year, month);

    res.json({
      income,
      expense,
      balance,
      savings: savingsTotal,
      categoryBreakdown
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch monthly statistics' });
  }
});

// GET /api/statistics/trend?months=12
// Returns data for the last N months ending at current month (or specific date if needed)
router.get('/trend', (req, res) => {
  const { months = 6 } = req.query;
  const limit = Math.min(Number(months), 24); // Cap at 24 months

  try {
    const stmt = db.prepare(`
      SELECT 
        year, 
        month, 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      GROUP BY year, month
      ORDER BY year DESC, month DESC
      LIMIT ?
    `);
    
    // Reverse to chronological order for charts
    const result = stmt.all(limit).reverse();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch trend data' });
  }
});

// GET /api/statistics/assets
router.get('/assets', async (req, res) => {
  try {
    // 1. Total Account Balance (Initial + Income - Expense)
    // Note: We need to sum initial_balance of all accounts
    const accountsStmt = db.prepare('SELECT SUM(initial_balance) as total FROM accounts');
    const initialTotal = (accountsStmt.get() as { total: number }).total || 0;

    // Sum of all income/expense
    const txStmt = db.prepare(`
      SELECT 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM transactions
    `);
    const txTotals = txStmt.get() as { income: number, expense: number };
    const cashBalance = initialTotal + (txTotals.income || 0) - (txTotals.expense || 0);

    // 2. Savings Total
    // Assuming savings entries represent accumulated savings amount
    const savingsStmt = db.prepare('SELECT SUM(amount) as total FROM savings');
    const savingsTotal = (savingsStmt.get() as { total: number }).total || 0;

    // 3. Stocks Total (Invested Amount, or we could fetch current value if we want)
    // For now, let's use buy_amount for stability, or both?
    // Let's return buy_amount as "invested" and maybe estimated current value if needed.
    // Ideally we should use the cached prices or fetch new ones, but for dashboard speed, use buy_amount.
    // Actually, "Total Assets" usually implies market value. 
    // But fetching prices for all stocks might be slow here.
    // Let's return invested amount for now, or maybe calculated value if stored?
    // We don't store current price in DB. 
    // Let's return buy_amount. User can see details in Stock page.
    const stockStmt = db.prepare('SELECT SUM(buy_amount) as total FROM stocks');
    const stockTotal = (stockStmt.get() as { total: number }).total || 0;

    res.json({
      cash: cashBalance,
      savings: savingsTotal,
      stock: stockTotal,
      total: cashBalance + savingsTotal + stockTotal
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

export default router;
