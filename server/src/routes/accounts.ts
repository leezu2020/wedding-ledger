import { Router } from 'express';
import db from '../db/connection';
import { sendError } from '../utils/errorHandler';

const router = Router();

// ─── Helper: Sync transfer categories for an account ───
// Creates "이체 > {accountName}" categories for both income and expense
function ensureTransferCategories(accountName: string) {
  const insertStmt = db.prepare(
    'INSERT OR IGNORE INTO categories (type, major, middle, minor) VALUES (?, ?, ?, NULL)'
  );
  // We need a unique constraint check, so do SELECT first
  for (const type of ['income', 'expense']) {
    const existing = db.prepare(
      'SELECT id FROM categories WHERE type = ? AND major = ? AND middle = ?'
    ).get(type, '이체', accountName);
    if (!existing) {
      insertStmt.run(type, '이체', accountName);
    }
  }
}

function renameTransferCategories(oldName: string, newName: string) {
  db.prepare(
    'UPDATE categories SET middle = ? WHERE major = ? AND middle = ?'
  ).run(newName, '이체', oldName);
}

function deleteTransferCategories(accountName: string) {
  db.prepare(
    'DELETE FROM categories WHERE major = ? AND middle = ?'
  ).run('이체', accountName);
}

// GET /api/accounts
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM accounts ORDER BY id ASC');
    const accounts = stmt.all();
    res.json(accounts);
  } catch (error) {
    sendError(res, '계좌 조회 실패', error);
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

    // Auto-create transfer categories for this account
    ensureTransferCategories(name);

    res.status(201).json({ id: info.lastInsertRowid, name, description, initial_balance: initial_balance || 0 });
  } catch (error) {
    sendError(res, '계좌 생성 실패', error);
  }
});

// PUT /api/accounts/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, initial_balance } = req.body;

  try {
    // Get old name for category rename
    const oldAccount = db.prepare('SELECT name FROM accounts WHERE id = ?').get(id) as { name: string } | undefined;

    const stmt = db.prepare('UPDATE accounts SET name = ?, description = ?, initial_balance = ? WHERE id = ?');
    const info = stmt.run(name, description, initial_balance || 0, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Rename transfer categories if name changed
    if (oldAccount && oldAccount.name !== name) {
      renameTransferCategories(oldAccount.name, name);
    }

    res.json({ id, name, description, initial_balance: initial_balance || 0 });
  } catch (error) {
    sendError(res, '계좌 수정 실패', error);
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    // Get account name before deletion for category cleanup
    const account = db.prepare('SELECT name FROM accounts WHERE id = ?').get(id) as { name: string } | undefined;

    // Delete associated transactions and savings
    const deleteTransactionsStmt = db.prepare('DELETE FROM transactions WHERE account_id = ?');
    deleteTransactionsStmt.run(id);

    const deleteSavingsStmt = db.prepare('DELETE FROM savings WHERE account_id = ?');
    deleteSavingsStmt.run(id);

    const stmt = db.prepare('DELETE FROM accounts WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Delete transfer categories for this account
    if (account) {
      deleteTransferCategories(account.name);
    }

    res.status(204).send();
  } catch (error) {
    sendError(res, '계좌 삭제 실패', error);
  }
});

// PATCH /api/accounts/:id/main — Set as main account (auto-unsets others)
router.patch('/:id/main', (req, res) => {
  const { id } = req.params;

  try {
    const account = db.prepare('SELECT id FROM accounts WHERE id = ?').get(id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    db.transaction(() => {
      db.prepare('UPDATE accounts SET is_main = 0 WHERE is_main = 1').run();
      db.prepare('UPDATE accounts SET is_main = 1 WHERE id = ?').run(id);
    })();

    res.json({ success: true });
  } catch (error) {
    sendError(res, '메인계좌 설정 실패', error);
  }
});

export default router;
