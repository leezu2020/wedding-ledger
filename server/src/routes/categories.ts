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

export default router;
