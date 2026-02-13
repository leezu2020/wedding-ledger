import db from './connection';

export const initDB = () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      initial_balance INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      major TEXT NOT NULL,
      middle TEXT,
      minor TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      day INTEGER,
      account_id INTEGER REFERENCES accounts(id),
      category_id INTEGER REFERENCES categories(id),
      amount INTEGER NOT NULL,
      description TEXT,
      linked_transaction_id INTEGER REFERENCES transactions(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      amount INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS savings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      day INTEGER,
      type TEXT NOT NULL,
      account_id INTEGER REFERENCES accounts(id),
      name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      ticker TEXT NOT NULL,
      name TEXT,
      buy_amount INTEGER NOT NULL,
      shares REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  db.exec(schema);

  // Migration: add linked_transaction_id if it doesn't exist yet
  const columns = db.pragma('table_info(transactions)') as { name: string }[];
  if (!columns.some(c => c.name === 'linked_transaction_id')) {
    db.exec('ALTER TABLE transactions ADD COLUMN linked_transaction_id INTEGER REFERENCES transactions(id)');
    console.log('Migration: added linked_transaction_id column');
  }

  // Ensure transfer categories exist for all current accounts
  const accounts = db.prepare('SELECT name FROM accounts').all() as { name: string }[];
  const insertCat = db.prepare(
    'INSERT INTO categories (type, major, middle, minor) SELECT ?, ?, ?, NULL WHERE NOT EXISTS (SELECT 1 FROM categories WHERE type = ? AND major = ? AND middle = ?)'
  );
  for (const acc of accounts) {
    for (const type of ['income', 'expense']) {
      insertCat.run(type, '이체', acc.name, type, '이체', acc.name);
    }
  }

  console.log('Database initialized');
};
