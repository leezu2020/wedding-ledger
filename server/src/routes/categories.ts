import { Router } from 'express';
import db from '../db/connection';

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
    const categories = stmt.all(...params);
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch categories' });
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
    console.error(error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete category' });
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
    console.error(error);
    res.status(500).json({ error: 'Failed to update major category' });
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
    console.error(error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

export default router;
