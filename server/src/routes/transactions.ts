import { Router } from 'express';
import db from '../db/connection';

const router = Router();

// GET /api/transactions?year=2024&month=2&type=expense
router.get('/', (req, res) => {
  const { year, month, type } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  try {
    let query = `
      SELECT t.*, c.major, c.middle as sub, a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.year = ? AND t.month = ?
    `;
    const params: any[] = [year, month];

    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }

    query += ' ORDER BY t.day ASC, t.id ASC';

    const stmt = db.prepare(query);
    const transactions = stmt.all(...params);
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /api/transactions
router.post('/', (req, res) => {
  const { type, year, month, day, account_id, category_id, amount, description } = req.body;

  if (!type || !year || !month || !amount || !account_id || !category_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO transactions (type, year, month, day, account_id, category_id, amount, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(type, year, month, day, account_id, category_id, amount, description);
    res.status(201).json({ id: info.lastInsertRowid, ...req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// PUT /api/transactions/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { day, account_id, category_id, amount, description } = req.body;

  try {
    const stmt = db.prepare(`
      UPDATE transactions
      SET day = ?, account_id = ?, category_id = ?, amount = ?, description = ?
      WHERE id = ?
    `);
    const info = stmt.run(day, account_id, category_id, amount, description, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ id, ...req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const stmt = db.prepare('DELETE FROM transactions WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;
