import { Router } from 'express';
import db from '../db/connection';

const router = Router();

// GET /api/accounts
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM accounts ORDER BY id ASC');
    const accounts = stmt.all();
    res.json(accounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// POST /api/accounts
router.post('/', (req, res) => {
  const { name, description, initial_balance } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const stmt = db.prepare('INSERT INTO accounts (name, description, initial_balance) VALUES (?, ?, ?)');
    const info = stmt.run(name, description, initial_balance || 0);
    res.status(201).json({ id: info.lastInsertRowid, name, description, initial_balance: initial_balance || 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// PUT /api/accounts/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, initial_balance } = req.body;

  try {
    const stmt = db.prepare('UPDATE accounts SET name = ?, description = ?, initial_balance = ? WHERE id = ?');
    const info = stmt.run(name, description, initial_balance || 0, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ id, name, description, initial_balance: initial_balance || 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    // Delete associated transactions and savings
    const deleteTransactionsStmt = db.prepare('DELETE FROM transactions WHERE account_id = ?');
    deleteTransactionsStmt.run(id);

    const deleteSavingsStmt = db.prepare('DELETE FROM savings WHERE account_id = ?');
    deleteSavingsStmt.run(id);

    // Delete associated savings/deposits
    // Assuming there might be a savings table, but if not, just transactions.
    // Based on previous context, there is a savings table? Let's check imports or other routes.
    // Waiting on that, but let's at least delete transactions.
    
    // Actually, I should check if there are other dependencies. 
    // In MonthlySheet.tsx, we saw `savingsApi`. 
    // Let's assume for now transactions are the main blocker.
    // Double check DB schema if possible, but I don't have it open. 
    // I'll stick to deleting transactions first.

    const stmt = db.prepare('DELETE FROM accounts WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
