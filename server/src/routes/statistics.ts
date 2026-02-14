import { Router } from 'express';
import db from '../db/connection';

const router = Router();

// Helper: parse accountIds query param into SQL clause
function buildAccountFilter(accountIdsParam: any, tableAlias: string = '') {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  if (!accountIdsParam) return { clause: '', params: [] as any[] };
  const ids = String(accountIdsParam).split(',').map(Number).filter(n => !isNaN(n));
  if (ids.length === 0) return { clause: '', params: [] };
  const placeholders = ids.map(() => '?').join(',');
  return { clause: ` AND ${prefix}account_id IN (${placeholders})`, params: ids };
}

// GET /api/statistics/monthly?year=2024&month=2&accountIds=1,2,3
router.get('/monthly', (req, res) => {
  const { year, month, accountIds } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  try {
    const txFilter = buildAccountFilter(accountIds, 't');
    const txFilterSimple = buildAccountFilter(accountIds);
    const savFilter = buildAccountFilter(accountIds);

    // Total Income, Expense
    const totals = db.prepare(`
      SELECT type, SUM(amount) as total
      FROM transactions
      WHERE year = ? AND month = ?${txFilterSimple.clause} AND linked_transaction_id IS NULL
      GROUP BY type
    `).all(year, month, ...txFilterSimple.params) as { type: string, total: number }[];
    
    const income = totals.find(t => t.type === 'income')?.total || 0;
    const expense = totals.find(t => t.type === 'expense')?.total || 0;
    const balance = income - expense;

    // Savings Total (from transactions)
    // Savings are typically NOT transfers in this logic (separate category), but if they were, we likely still want to count them as savings but not expense?
    // Current logic: Savings are calculated from '저축'/'적금' categories.
    // If we rely on linked_transaction_id for transfers, we assume Savings are not linked transfers.
    const savingsTotal = (db.prepare(`
      SELECT SUM(t.amount) as total 
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.year = ? AND t.month = ? AND (c.major LIKE '%저축%' OR c.major LIKE '%적금%')${txFilter.clause}
    `).get(year, month, ...txFilter.params) as { total: number }).total || 0;

    // Category Breakdown with sub-categories
    const details = db.prepare(`
      SELECT c.major, c.middle as sub, t.type, SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.year = ? AND t.month = ?${txFilter.clause} AND t.linked_transaction_id IS NULL
      GROUP BY c.major, c.middle, t.type
      ORDER BY total DESC
    `).all(year, month, ...txFilter.params) as { major: string, sub: string | null, type: string, total: number }[];

    const expenseMap = new Map<string, { major: string, total: number, subs: { sub: string, total: number }[] }>();
    const incomeMap = new Map<string, { major: string, total: number, subs: { sub: string, total: number }[] }>();

    details.forEach(row => {
      const map = row.type === 'expense' ? expenseMap : incomeMap;
      if (!map.has(row.major)) {
        map.set(row.major, { major: row.major, total: 0, subs: [] });
      }
      const entry = map.get(row.major)!;
      entry.total += row.total;
      if (row.sub) {
        entry.subs.push({ sub: row.sub, total: row.total });
      }
    });

    const expenseBreakdown = Array.from(expenseMap.values()).sort((a, b) => b.total - a.total);
    const incomeBreakdown = Array.from(incomeMap.values()).sort((a, b) => b.total - a.total);
    const categoryBreakdown = expenseBreakdown.map(e => ({ major: e.major, total: e.total }));

    // Stocks Total & List
    const stocks = db.prepare(`
      SELECT ticker, name, buy_amount, shares
      FROM stocks
      WHERE year = ? AND month = ?
    `).all(year, month) as { ticker: string, name: string, buy_amount: number, shares: number }[];
    
    const stockTotal = stocks.reduce((sum, s) => sum + s.buy_amount, 0);

    res.json({
      income, expense, balance,
      savings: savingsTotal,
      stocks, stockTotal,
      categoryBreakdown, expenseBreakdown, incomeBreakdown
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch monthly statistics' });
  }
});

// GET /api/statistics/trend?months=12
router.get('/trend', (req, res) => {
  const { months = 6 } = req.query;
  const limit = Math.min(Number(months), 24);

  try {
    const stmt = db.prepare(`
      SELECT year, month, 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE linked_transaction_id IS NULL
      GROUP BY year, month
      ORDER BY year DESC, month DESC
      LIMIT ?
    `);
    const result = stmt.all(limit).reverse();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch trend data' });
  }
});

// GET /api/statistics/yearly?year=2026&accountIds=1,2,3
router.get('/yearly', (req, res) => {
  const { year, accountIds } = req.query;

  if (!year) {
    return res.status(400).json({ error: 'Year is required' });
  }

  try {
    const accFilter = buildAccountFilter(accountIds);
    const accFilterWhere = accountIds 
      ? ` WHERE account_id IN (${String(accountIds).split(',').map(() => '?').join(',')})` 
      : '';
    const accFilterIds = accountIds 
      ? String(accountIds).split(',').map(Number).filter(n => !isNaN(n)) 
      : [];

    // Initial balance from accounts
    const initialBalance = (db.prepare(
      `SELECT SUM(initial_balance) as total FROM accounts${accFilterWhere.replace('account_id', 'id')}`
    ).get(...accFilterIds) as { total: number }).total || 0;

    // Cumulative income/expense BEFORE this year
    const prior = db.prepare(`
      SELECT 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE year < ?${accFilter.clause} AND linked_transaction_id IS NULL
    `).get(year, ...accFilter.params) as { income: number, expense: number };
    const priorBalance = (prior.income || 0) - (prior.expense || 0);

    // Cumulative savings BEFORE this year (from transactions)
    const priorSavings = (db.prepare(`
      SELECT SUM(t.amount) as total 
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.year < ? AND (c.major LIKE '%저축%' OR c.major LIKE '%적금%')${accFilter.clause}
    `).get(year, ...accFilter.params) as { total: number }).total || 0;

    // Monthly income/expense for this year
    const monthlyData = db.prepare(`
      SELECT month,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE year = ?${accFilter.clause} AND linked_transaction_id IS NULL
      GROUP BY month
    `).all(year, ...accFilter.params) as { month: number, income: number, expense: number }[];

    // Monthly savings for this year (from transactions where category major is '저축')
    // Note: We need to join with categories table
    const monthlySavings = db.prepare(`
      SELECT t.month, SUM(t.amount) as total 
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.year = ? AND (c.major LIKE '%저축%' OR c.major LIKE '%적금%') ${accFilter.clause ? `AND t.account_id IN (${accFilter.params.join(',')})` : ''}
      GROUP BY t.month
    `).all(year, ...accFilter.params) as { month: number, total: number }[];

    // Monthly stocks (snapshot) for this year
    const monthlyStocks = db.prepare(`
      SELECT month, SUM(buy_amount) as total FROM stocks
      WHERE year = ?
      GROUP BY month
    `).all(year) as { month: number, total: number }[];

    // Build 12-month array
    let currentCashAndSavings = initialBalance + priorBalance + priorSavings;
    const result = [];

    for (let m = 1; m <= 12; m++) {
      const data = monthlyData.find(d => d.month === m);
      const savData = monthlySavings.find(s => s.month === m);
      const stockData = monthlyStocks.find(s => s.month === m);
      
      const income = data?.income || 0;
      const expense = data?.expense || 0;
      const savings = savData?.total || 0;
      const stockTotal = stockData?.total || 0;
      
      // Balance is Income - Expense. 
      // Savings are already part of Expense in current logic (since they are transactions with type='expense' usually?)
      // Wait, if '저축' is 'expense' type in transactions, then 'balance' calculation (income - expense) ALREADY subtracts savings.
      // So 'currentCashAndSavings' should be:
      // If we consider Savings as Assets, then:
      // Balance(Net Income) = Income - Expense(including Savings).
      // So Cash increases by Balance.
      // But Savings Asset increases by Savings amount.
      // So Total Asset = Cash + Savings Asset.
      // If 'expense' includes 'savings', then 'balance' is (Income - Consumption - Savings).
      // So Cash = Previous Cash + (Income - Consumption - Savings).
      // Savings Asset = Previous Savings + Savings.
      // Total Asset = Cash + Savings Asset = Previous + Income - Consumption.
      // Which matches (Income - Consumption(excluding savings)).
      
      // However, current 'balance' variable comes from 'monthlyData' which sums 'type=income' and 'type=expense'.
      // If '저축' is 'expense', then 'balance' = Income - (Consumption + Savings).
      // So 'balance' is pure cash flow.
      // 'savings' variable is the Savings amount.
      // 'currentCashAndSavings' logic: 
      // cumulativeAssets += balance + savings;
      // If Balance is (Inc - Exp), and Exp includes Sav.
      // Then Balance + Sav = (Inc - (Cons + Sav)) + Sav = Inc - Cons.
      // This correctly represents the Net Worth increase (ignoring stock price changes).
      // So the logic `balance + savings` is correct IF 'balance' subtracts savings.
      
      const balance = income - expense;
      currentCashAndSavings += balance + savings;
      
      const totalAssets = currentCashAndSavings + stockTotal;

      result.push({ 
        month: m, 
        income, 
        expense, 
        balance, 
        savings, 
        stocks: stockTotal,
        totalAssets 
      });
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch yearly statistics' });
  }
});

// GET /api/statistics/assets
router.get('/assets', async (req, res) => {
  try {
    const accountsStmt = db.prepare('SELECT SUM(initial_balance) as total FROM accounts');
    const initialTotal = (accountsStmt.get() as { total: number }).total || 0;

    const txStmt = db.prepare(`
      SELECT 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE linked_transaction_id IS NULL
    `);
    const txTotals = txStmt.get() as { income: number, expense: number };
    const cashBalance = initialTotal + (txTotals.income || 0) - (txTotals.expense || 0);

    const savingsStmt = db.prepare(`
      SELECT SUM(t.amount) as total 
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE c.major LIKE '%저축%' OR c.major LIKE '%적금%'
    `);
    const savingsTotal = (savingsStmt.get() as { total: number }).total || 0;

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
