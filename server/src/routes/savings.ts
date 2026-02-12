import { Router } from 'express';
import db from '../db/connection';

const router = Router();

// Migrate: add day column if missing
try {
  db.exec('ALTER TABLE savings ADD COLUMN day INTEGER');
} catch (e) {
  // Column already exists
}

// GET /api/savings?year=2024&month=2
router.get('/', (req, res) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  try {
    const stmt = db.prepare(`
      SELECT s.*, a.name as account_name
      FROM savings s
      LEFT JOIN accounts a ON s.account_id = a.id
      WHERE s.year = ? AND s.month = ?
    `);
    const savings = stmt.all(year, month);
    res.json(savings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch savings' });
  }
});

// POST /api/savings
router.post('/', (req, res) => {
  const { year, month, day, type, account_id, name, amount, description } = req.body;

  if (!year || !month || !type || !account_id || !name || amount === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO savings (year, month, day, type, account_id, name, amount, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(year, month, day || null, type, account_id, name, amount, description);
    res.status(201).json({ id: info.lastInsertRowid, ...req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create saving entry' });
  }
});

// PUT /api/savings/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { year, month, day, type, account_id, name, amount, description } = req.body;

  if (!year || !month || !type || !account_id || !name || amount === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const stmt = db.prepare(`
      UPDATE savings
      SET year = ?, month = ?, day = ?, type = ?, account_id = ?, name = ?, amount = ?, description = ?
      WHERE id = ?
    `);
    const info = stmt.run(year, month, day || null, type, account_id, name, amount, description, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ id, ...req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update saving entry' });
  }
});

// DELETE /api/savings/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const stmt = db.prepare('DELETE FROM savings WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

export default router;
