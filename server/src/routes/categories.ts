import { Router } from 'express';
import db from '../db/connection';
import { sendError } from '../utils/errorHandler';

const router = Router();

// GET /api/categories?type=income|expense
router.get('/', (req, res) => {
  const { type } = req.query;
  
  try {
    let query = 'SELECT id, type, major, middle as sub FROM categories';
    const params: any[] = [];
    
    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY major, middle';
    
    const stmt = db.prepare(query);
    const categories = stmt.all(...params) as any[];

    // Check which categories are linked to savings products
    const linkedIds = db.prepare(
      'SELECT category_id FROM savings_products WHERE category_id IS NOT NULL AND is_active = 1'
    ).all() as { category_id: number }[];
    const linkedSet = new Set(linkedIds.map(r => r.category_id));

    const result = categories.map(c => ({
      ...c,
      linked_savings: linkedSet.has(c.id)
    }));

    res.json(result);
  } catch (error) {
    sendError(res, '카테고리 조회 실패', error);
  }
});

// POST /api/categories
router.post('/', (req, res) => {
  const { type, major, sub } = req.body;
  if (!type || !major) {
    return res.status(400).json({ error: 'Type and Major category are required' });
  }

  try {
    const stmt = db.prepare('INSERT INTO categories (type, major, middle, minor) VALUES (?, ?, ?, NULL)');
    const info = stmt.run(type, major, sub || null);
    res.status(201).json({ id: info.lastInsertRowid, type, major, sub });
  } catch (error) {
    sendError(res, '카테고리 생성 실패', error);
  }
});

// DELETE /api/categories/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    // Prevent deleting categories linked to active savings products
    const linked = db.prepare(
      'SELECT id, bank, name FROM savings_products WHERE category_id = ? AND is_active = 1'
    ).get(id) as { id: number, bank: string, name: string } | undefined;
    if (linked) {
      return res.status(400).json({ error: `저축/적금 상품(${linked.bank} ${linked.name || ''})에 연동된 카테고리입니다.` });
    }

    // Check for referencing transactions
    const txCount = (db.prepare(
      'SELECT COUNT(*) as cnt FROM transactions WHERE category_id = ?'
    ).get(id) as { cnt: number }).cnt;
    if (txCount > 0) {
      return res.status(400).json({ error: `해당 카테고리를 사용하는 거래내역이 ${txCount}건 있어 삭제할 수 없습니다.` });
    }

    // Cascade-delete associated budgets (budgets without a category are useless)
    db.prepare('DELETE FROM budgets WHERE category_id = ?').run(id);

    const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    sendError(res, '카테고리 삭제 실패', error);
  }
});

// PUT /api/categories/major
// Renames a major category (updates all rows with that major name)
router.put('/major', (req, res) => {
  const { type, oldMajor, newMajor } = req.body;
  if (!type || !oldMajor || !newMajor) {
    return res.status(400).json({ error: 'Type, oldMajor, and newMajor are required' });
  }

  try {
    const stmt = db.prepare('UPDATE categories SET major = ? WHERE type = ? AND major = ?');
    const info = stmt.run(newMajor, type, oldMajor);
    
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Major category not found' });
    }

    res.json({ success: true, changes: info.changes });
  } catch (error) {
    sendError(res, '대분류 수정 실패', error);
  }
});

// PUT /api/categories/:id
// Updates a single category (renaming sub-category or changing its major group)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { major, sub } = req.body;

  try {
    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const params: any[] = [];

    if (major !== undefined) {
      updates.push('major = ?');
      params.push(major);
    }
    if (sub !== undefined) {
      updates.push('middle = ?');
      params.push(sub);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    const stmt = db.prepare(query);
    const info = stmt.run(...params);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true });
  } catch (error) {
    sendError(res, '카테고리 수정 실패', error);
  }
});

export default router;
