import Database from 'better-sqlite3';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

const dbPath = process.env.DB_PATH 
  || path.resolve(__dirname, '../../wedding-ledger.db');

const db = new Database(dbPath, { 
  verbose: isProduction ? undefined : console.log 
});

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

export default db;
