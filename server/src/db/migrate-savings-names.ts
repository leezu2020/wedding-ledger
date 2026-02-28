import db from './connection';

console.log('Starting savings products name migration...');

// Find savings products where name is null or empty
const products = db.prepare("SELECT id, bank, name FROM savings_products WHERE name IS NULL OR name = ''").all();

console.log(`Found ${products.length} savings products that need name migration.`);

let count = 0;
const updateStmt = db.prepare('UPDATE savings_products SET name = ? WHERE id = ?');

db.transaction(() => {
  for (const product of products as any[]) {
    updateStmt.run(product.bank, product.id);
    count++;
  }
})();

console.log(`Successfully migrated ${count} savings products. (Set name = bank)`);
