const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'wedding-ledger.db');
const db = new Database(dbPath, { verbose: console.log });

console.log('Migrating accounts table...');

try {
  db.exec('ALTER TABLE accounts ADD COLUMN initial_balance INTEGER DEFAULT 0');
  console.log('Added initial_balance column to accounts table.');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('Column initial_balance already exists.');
  } else {
    console.error('Migration failed:', error);
  }
}
