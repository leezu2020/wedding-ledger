import { Router } from 'express';
import db from '../db/connection';
import { sendError } from '../utils/errorHandler';

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
    // Fetch transactions joined with categories where major is '저축' or '적금'
    const stmt = db.prepare(`
      SELECT t.id, t.year, t.month, t.day, t.account_id, t.amount, t.description,
             c.major, c.middle,
             a.name as account_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.year = ? AND t.month = ? AND (c.major LIKE '%저축%' OR c.major LIKE '%적금%')
    `);
    
    const transactions = stmt.all(year, month) as any[];

    // Map to Saving interface
    const savings = transactions.map(t => ({
      id: t.id,
      year: t.year,
      month: t.month,
      day: t.day,
      type: t.middle === '적금' ? 'savings_plan' : 'deposit', // Default to deposit unless middle is '적금'
      account_id: t.account_id,
      account_name: t.account_name,
      name: t.description, // Use description as name
      amount: t.amount,
      description: ''      // No separate description field in transaction for now, or we could reuse description if we want?
                           // InputPage uses description as additional memo? No, InputPage maps name to description.
    }));

    res.json(savings);
  } catch (error) {
    sendError(res, '저축거래 내역 조회 실패', error);
  }
});

// POST /api/savings
router.post('/', (req, res) => {
  const { year, month, day, type, account_id, name, amount, description } = req.body;

  if (!year || !month || !type || !account_id || !name || amount === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Find appropriate category_id based on type
    // type: 'savings_plan' -> category middle '적금'
    // type: 'deposit' -> category middle IS NULL (or generic '저축')
    let category: any;
    if (type === 'savings_plan') {
      category = db.prepare("SELECT id FROM categories WHERE major = '저축' AND middle = '적금'").get();
      if (!category) {
        // If not found, try to find any category with '적금'
        category = db.prepare("SELECT id FROM categories WHERE major LIKE '%적금%' OR middle LIKE '%적금%'").get();
      }
    } else {
      // deposit
      category = db.prepare("SELECT id FROM categories WHERE major = '저축' AND (middle IS NULL OR middle != '적금')").get();
    }

    if (!category) {
      // Fallback: create category if absolutely needed, or just fail?
      // Let's try to find ANY '저축' category
      category = db.prepare("SELECT id FROM categories WHERE major LIKE '%저축%'").get();
    }

    if (!category) {
      return res.status(500).json({ error: 'No suitable savings category found' });
    }

    const stmt = db.prepare(`
      INSERT INTO transactions (type, year, month, day, account_id, category_id, amount, description)
      VALUES ('expense', ?, ?, ?, ?, ?, ?, ?)
    `);
    // Use 'name' as description
    const info = stmt.run(year, month, day || null, account_id, category.id, amount, name);
    
    res.status(201).json({ id: info.lastInsertRowid, ...req.body });
  } catch (error) {
    sendError(res, '저축거래 생성 실패', error);
  }
});

// PUT /api/savings/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { year, month, day, type, account_id, name, amount, description } = req.body;

  // Note: We don't support changing 'type' easily because it implies changing category_id.
  // But we can try to find the category again if type changed.

  if (!year || !month || !type || !account_id || !name || amount === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Find category ID based on type (similar logic to create)
    let category: any;
    if (type === 'savings_plan') {
      category = db.prepare("SELECT id FROM categories WHERE major = '저축' AND middle = '적금'").get();
    } else {
      category = db.prepare("SELECT id FROM categories WHERE major = '저축' AND (middle IS NULL OR middle != '적금')").get();
    }
    // Fallback
    if (!category) category = db.prepare("SELECT id FROM categories WHERE major LIKE '%저축%'").get();

    const stmt = db.prepare(`
      UPDATE transactions
      SET year = ?, month = ?, day = ?, account_id = ?, category_id = ?, amount = ?, description = ?
      WHERE id = ?
    `);
    
    // Use 'name' as description. Ignore 'description' param from body for now? 
    // Or concat? The user said "name" is what they edit.
    const info = stmt.run(year, month, day || null, account_id, category ? category.id : undefined, amount, name, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ id, ...req.body });
  } catch (error) {
    sendError(res, '저축거래 수정 실패', error);
  }
});

// DELETE /api/savings/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const stmt = db.prepare('DELETE FROM transactions WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.status(204).send();
  } catch (error) {
    sendError(res, '항목 삭제 실패', error);
  }
});

export default router;
