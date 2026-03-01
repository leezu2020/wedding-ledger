import fs from 'fs';

const currData = JSON.parse(fs.readFileSync('output.json', 'utf8'));
const prevData = []; // Emulate empty previous month for now, or fetch if needed

const currMap = new Map();
const prevMap = new Map();

const getGroupKey = (tx) => {
  return tx.major ? `${tx.major}${tx.sub ? ' > ' + tx.sub : ''}` : '분류 없음';
};

currData.forEach(tx => {
  if (tx.linked_transaction_id) return;
  const key = getGroupKey(tx);
  const curr = currMap.get(key) || { income: 0, expense: 0 };
  if (tx.type === 'income') curr.income += tx.amount;
  else curr.expense += tx.amount;
  currMap.set(key, curr);
});

console.log('--- currMap keys ---');
for (const key of currMap.keys()) {
    console.log(key, currMap.get(key));
}

const categories = Array.from(new Set([...currMap.keys()]));
let newExpenses = [];
categories.forEach(cat => {
  const c = currMap.get(cat) || { income: 0, expense: 0 };
  const p = prevMap.get(cat) || { income: 0, expense: 0 };
  const expDiff = c.expense - p.expense;
  
  if (p.expense === 0 && c.expense > 0) newExpenses.push({ cat, amount: c.expense });
});
console.log('New Expenses length:', newExpenses.length);
console.log(newExpenses);
