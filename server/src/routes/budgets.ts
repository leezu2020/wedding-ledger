import { Router } from 'express';
import db from '../db/connection';

const router = Router();

// GET /api/budgets?year=2024&month=2
router.get('/', (req, res) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  try {
    const stmt = db.prepare(`
      SELECT b.*, c.major, c.middle as sub
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.year = ? AND b.month = ?
    `);
    const budgets = stmt.all(year, month);
    res.json(budgets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// POST /api/budgets
// Upsert mechanism: if budget exists for year/month/category, update it.
router.post('/', (req, res) => {
  const { year, month, category_id, amount } = req.body;

  if (!year || !month || !category_id || amount === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if exists
    const checkStmt = db.prepare('SELECT id FROM budgets WHERE year = ? AND month = ? AND category_id = ?');
    const existing = checkStmt.get(year, month, category_id) as { id: number } | undefined;

    if (existing) {
      const updateStmt = db.prepare('UPDATE budgets SET amount = ? WHERE id = ?');
      updateStmt.run(amount, existing.id);
      res.json({ id: existing.id, year, month, category_id, amount });
    } else {
      const insertStmt = db.prepare('INSERT INTO budgets (year, month, category_id, amount) VALUES (?, ?, ?, ?)');
      const info = insertStmt.run(year, month, category_id, amount);
      res.status(201).json({ id: info.lastInsertRowid, year, month, category_id, amount });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save budget' });
  }
});

export default router;
