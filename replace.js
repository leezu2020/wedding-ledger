const fs = require('node:fs');
const tempPath = '/app/temp.db';
const dbPath = '/data/wedding-ledger.db';
const walPath = dbPath + '-wal';
const shmPath = dbPath + '-shm';

try {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  
  if (fs.existsSync(tempPath)) {
    fs.copyFileSync(tempPath, dbPath);
    console.log('Database successfully replaced.');
  } else {
    console.error('Temp DB not found!');
  }
} catch (e) {
  console.error('Error replacing DB:', e);
}
