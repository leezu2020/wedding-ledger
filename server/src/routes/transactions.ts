import { Router } from 'express';
import db from '../db/connection';
import { sendError } from '../utils/errorHandler';

const router = Router();

const TRANSFER_MAJOR = '이체';

// ─── Helper: Check if a category is a transfer category ───
function getTransferInfo(categoryId: number): { isTransfer: boolean; targetAccountName?: string; type?: string } {
  const cat = db.prepare(
    'SELECT type, major, middle FROM categories WHERE id = ?'
  ).get(categoryId) as { type: string; major: string; middle: string } | undefined;

  if (!cat || cat.major !== TRANSFER_MAJOR || !cat.middle) {
    return { isTransfer: false };
  }
  return { isTransfer: true, targetAccountName: cat.middle, type: cat.type };
}

// ─── Helper: Find or create the mirror category ───
// If original is income "이체 > B계좌" on A계좌,
// mirror should be expense "이체 > A계좌" on B계좌
function findMirrorCategoryId(sourceAccountId: number, mirrorType: string): number | null {
  // Get source account name
  const sourceAccount = db.prepare('SELECT name FROM accounts WHERE id = ?').get(sourceAccountId) as { name: string } | undefined;
  if (!sourceAccount) return null;

  // Find the mirror category: mirrorType + "이체" + sourceAccountName
  const mirrorCat = db.prepare(
    'SELECT id FROM categories WHERE type = ? AND major = ? AND middle = ?'
  ).get(mirrorType, TRANSFER_MAJOR, sourceAccount.name) as { id: number } | undefined;

  if (!mirrorCat) {
    // Auto-create if missing
    const info = db.prepare(
      'INSERT INTO categories (type, major, middle, minor) VALUES (?, ?, ?, NULL)'
    ).run(mirrorType, TRANSFER_MAJOR, sourceAccount.name);
    return Number(info.lastInsertRowid);
  }

  return mirrorCat.id;
}

// ─── Helper: Find target account by name ───
function findAccountByName(name: string): { id: number } | undefined {
  return db.prepare('SELECT id FROM accounts WHERE name = ?').get(name) as { id: number } | undefined;
}

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
    sendError(res, '거래내역 조회 실패', error);
  }
});

// POST /api/transactions
router.post('/', (req, res) => {
  const { type, year, month, day, account_id, category_id, amount, description } = req.body;

  if (!type || !year || !month || !amount || !account_id || !category_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Insert the original transaction
    const stmt = db.prepare(`
      INSERT INTO transactions (type, year, month, day, account_id, category_id, amount, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(type, year, month, day, account_id, category_id, amount, description);
    const originalId = Number(info.lastInsertRowid);

    // Check if this is a transfer category
    const transferInfo = getTransferInfo(category_id);
    let mirrorId: number | null = null;

    if (transferInfo.isTransfer && transferInfo.targetAccountName) {
      const targetAccount = findAccountByName(transferInfo.targetAccountName);
      if (targetAccount) {
        const mirrorType = type === 'income' ? 'expense' : 'income';
        const mirrorCategoryId = findMirrorCategoryId(account_id, mirrorType);

        if (mirrorCategoryId) {
          // Create mirror transaction
          const mirrorStmt = db.prepare(`
            INSERT INTO transactions (type, year, month, day, account_id, category_id, amount, description, linked_transaction_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const mirrorInfo = mirrorStmt.run(
            mirrorType, year, month, day, targetAccount.id, mirrorCategoryId, amount,
            description ? `[자동이체] ${description}` : '[자동이체]',
            originalId
          );
          mirrorId = Number(mirrorInfo.lastInsertRowid);

          // Link original → mirror
          db.prepare('UPDATE transactions SET linked_transaction_id = ? WHERE id = ?')
            .run(mirrorId, originalId);
        }
      }
    }

    res.status(201).json({ id: originalId, linked_transaction_id: mirrorId, ...req.body });
  } catch (error) {
    sendError(res, '거래내역 생성 실패', error);
  }
});

// PUT /api/transactions/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { day, account_id, category_id, amount, description } = req.body;

  try {
    // Get current transaction to check for linked mirror
    const current = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
    if (!current) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Update original transaction
    const stmt = db.prepare(`
      UPDATE transactions
      SET day = ?, account_id = ?, category_id = ?, amount = ?, description = ?
      WHERE id = ?
    `);
    stmt.run(day, account_id, category_id, amount, description, id);

    const newTransferInfo = getTransferInfo(category_id);
    const hadMirror = !!current.linked_transaction_id;

    if (newTransferInfo.isTransfer && newTransferInfo.targetAccountName) {
      // Category IS a transfer category now
      const targetAccount = findAccountByName(newTransferInfo.targetAccountName);

      if (targetAccount) {
        const mirrorType = current.type === 'income' ? 'expense' : 'income';
        const mirrorCategoryId = findMirrorCategoryId(account_id, mirrorType);
        const mirrorDesc = description ? `[자동이체] ${description}` : '[자동이체]';

        if (hadMirror) {
          // Update existing mirror (amount, day, account, category may have changed)
          db.prepare(`
            UPDATE transactions
            SET day = ?, account_id = ?, category_id = ?, amount = ?, description = ?
            WHERE id = ?
          `).run(day, targetAccount.id, mirrorCategoryId, amount, mirrorDesc, current.linked_transaction_id);
        } else if (mirrorCategoryId) {
          // Create NEW mirror (category just changed to transfer)
          const mirrorStmt = db.prepare(`
            INSERT INTO transactions (type, year, month, day, account_id, category_id, amount, description, linked_transaction_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const mirrorInfo = mirrorStmt.run(
            mirrorType, current.year, current.month, day, targetAccount.id, mirrorCategoryId, amount,
            mirrorDesc, id
          );
          const mirrorId = Number(mirrorInfo.lastInsertRowid);

          // Link original → mirror
          db.prepare('UPDATE transactions SET linked_transaction_id = ? WHERE id = ?')
            .run(mirrorId, id);
        }
      }
    } else if (hadMirror) {
      // Category changed AWAY from transfer → delete old mirror
      db.prepare('UPDATE transactions SET linked_transaction_id = NULL WHERE id = ?').run(id);
      db.prepare('DELETE FROM transactions WHERE id = ?').run(current.linked_transaction_id);
    }

    res.json({ id, ...req.body });
  } catch (error) {
    sendError(res, '거래내역 수정 실패', error);
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    // Get current transaction to check for linked mirror
    const current = db.prepare('SELECT linked_transaction_id FROM transactions WHERE id = ?').get(id) as any;

    if (!current) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Delete mirror first if exists
    if (current.linked_transaction_id) {
      // Also clear the reverse link to avoid FK issues
      db.prepare('UPDATE transactions SET linked_transaction_id = NULL WHERE id = ?')
        .run(current.linked_transaction_id);
      db.prepare('DELETE FROM transactions WHERE id = ?')
        .run(current.linked_transaction_id);
    }

    // Also check if another transaction links TO this one  
    db.prepare('UPDATE transactions SET linked_transaction_id = NULL WHERE linked_transaction_id = ?')
      .run(id);

    // Delete the original
    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);

    res.status(200).json({ success: true });
  } catch (error) {
    sendError(res, '거래내역 삭제 실패', error);
  }
});

export default router;
