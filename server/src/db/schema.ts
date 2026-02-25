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
      day INTEGER,
      ticker TEXT NOT NULL,
      name TEXT,
      buy_amount INTEGER NOT NULL,
      shares REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS savings_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      bank TEXT NOT NULL,
      name TEXT,
      pay_day INTEGER,
      start_date TEXT NOT NULL,
      interest_rate REAL NOT NULL,
      interest_type TEXT DEFAULT 'simple',
      term_months INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      tax_type TEXT DEFAULT '일반과세',
      maturity_date TEXT,
      category_id INTEGER REFERENCES categories(id),
      memo TEXT,
      is_active INTEGER DEFAULT 1,
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

  // Migration: add is_main column to accounts
  const accColumns = db.pragma('table_info(accounts)') as { name: string }[];
  if (!accColumns.some(c => c.name === 'is_main')) {
    db.exec('ALTER TABLE accounts ADD COLUMN is_main INTEGER DEFAULT 0');
    console.log('Migration: added is_main column to accounts');
  }

  // Migration: add initial_paid column to savings_products
  const spColumns = db.pragma('table_info(savings_products)') as { name: string }[];
  if (spColumns.length > 0 && !spColumns.some(c => c.name === 'initial_paid')) {
    db.exec('ALTER TABLE savings_products ADD COLUMN initial_paid INTEGER DEFAULT 0');
    console.log('Migration: added initial_paid column to savings_products');
  }

  // Migration: add day column to stocks
  const stockColumns = db.pragma('table_info(stocks)') as { name: string }[];
  if (stockColumns.length > 0 && !stockColumns.some(c => c.name === 'day')) {
    db.exec('ALTER TABLE stocks ADD COLUMN day INTEGER');
    db.exec('UPDATE stocks SET year = 2026, month = 1, day = 1');
    console.log('Migration: added day column to stocks and set default dates');
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
