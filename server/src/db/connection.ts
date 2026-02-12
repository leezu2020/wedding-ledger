import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../../wedding-ledger.db');
const db = new Database(dbPath, { verbose: console.log });

export default db;
