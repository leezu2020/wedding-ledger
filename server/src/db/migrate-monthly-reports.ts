import db from './connection';

export const createMonthlyReportsTable = () => {
    // Drop table if exists (optional, usually we just CREATE IF NOT EXISTS)
    // db.exec(`DROP TABLE IF EXISTS monthly_reports`);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS monthly_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(year, month)
      )
    `);
    console.log('monthly_reports table created (or already exists)');
  };
  
createMonthlyReportsTable();
