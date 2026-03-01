import { Router } from 'express';
import db from '../db/connection';
import { generateMonthlyReport } from '../services/gemini';
// No additional imports needed here as we use direct DB queries

export const reportsRouter = Router();

// GET /api/reports?year=YYYY&month=MM
reportsRouter.get('/', (req, res) => {
  const year = parseInt(req.query.year as string);
  const month = parseInt(req.query.month as string);

  if (isNaN(year) || isNaN(month)) {
    return res.status(400).json({ error: 'Valid year and month are required' });
  }

  try {
    const report = db.prepare('SELECT * FROM monthly_reports WHERE year = ? AND month = ?').get(year, month);
    res.json(report || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/generate
reportsRouter.post('/generate', async (req, res) => {
  const { year, month } = req.body;

  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  try {
    // 1. Gather comprehensive data for the AI

    // Budgets
    const budgets = db.prepare('SELECT * FROM budgets WHERE year = ? AND month = ?').all(year, month);
    
    // Transactions
    const txStmt = db.prepare(`
      SELECT 
        t.type, t.amount, t.description, t.linked_transaction_id,
        c.major, c.sub 
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.year = ? AND t.month = ?
    `);
    const transactions = txStmt.all(year, month) as any[];

    // Aggregate Data roughly
    const aggregated = {
      totalIncome: 0,
      totalExpense: 0,
      expenseByCategory: {} as Record<string, number>,
      incomeByCategory: {} as Record<string, number>,
      budgets: {} as Record<string, number>
    };

    transactions.forEach(tx => {
      // Exclude internal transfers for clear analysis
      if (tx.linked_transaction_id) return;

      const catName = `${tx.major || '기타'}${tx.sub ? ` > ${tx.sub}` : ''}`;
      
      if (tx.type === 'income') {
        aggregated.totalIncome += tx.amount;
        aggregated.incomeByCategory[catName] = (aggregated.incomeByCategory[catName] || 0) + tx.amount;
      } else if (tx.type === 'expense') {
        aggregated.totalExpense += tx.amount;
        aggregated.expenseByCategory[catName] = (aggregated.expenseByCategory[catName] || 0) + tx.amount;
      }
    });

    budgets.forEach((b: any) => {
      const cat = db.prepare('SELECT major, sub FROM categories WHERE id = ?').get(b.category_id) as any;
      if (cat) {
        const catName = `${cat.major || '기타'}${cat.sub ? ` > ${cat.sub}` : ''}`;
        aggregated.budgets[catName] = b.amount;
      }
    });

    // 2. Call Gemini
    const reportContent = await generateMonthlyReport(year, month, aggregated);

    // 3. Save or Update in DB
    db.prepare(`
      INSERT INTO monthly_reports (year, month, content) 
      VALUES (?, ?, ?) 
      ON CONFLICT(year, month) 
      DO UPDATE SET content = excluded.content, created_at = CURRENT_TIMESTAMP
    `).run(year, month, reportContent);

    // 4. Return new report
    const newReport = db.prepare('SELECT * FROM monthly_reports WHERE year = ? AND month = ?').get(year, month);
    res.json(newReport);
  } catch (err: any) {
    console.error('Failed to generate report:', err);
    res.status(500).json({ error: err.message || 'Failed to generate report' });
  }
});

export default reportsRouter;
