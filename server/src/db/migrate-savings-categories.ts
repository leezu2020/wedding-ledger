import db from './connection';

console.log('Starting categories name sync migration...');

const products = db.prepare("SELECT id, name, type, category_id FROM savings_products WHERE category_id IS NOT NULL").all();

let count = 0;
const updateCategoryStmt = db.prepare('UPDATE categories SET middle = ? WHERE id = ?');

db.transaction(() => {
  for (const product of products as any[]) {
    // Determine type label based on the same logic used in the creation
    const typeLabel = product.type === 'savings_plan' ? '적금' : '예금';
    // Use the product's name (which was populated in the first script if missing)
    const newCategoryMiddle = `${product.name}(${typeLabel})`;

    updateCategoryStmt.run(newCategoryMiddle, product.category_id);
    count++;
  }
})();

console.log(`Successfully synced ${count} category names from savings_products.`);
