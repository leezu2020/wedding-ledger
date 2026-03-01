import fs from 'fs';

// 1. Read token
const envPath = 'd:\\개발\\wedding-ledger\\client\\.env.development';
const envContent = fs.readFileSync(envPath, 'utf8');
const tokenMatch = envContent.match(/VITE_API_TOKEN=(.+)/);
const token = tokenMatch ? tokenMatch[1].trim() : '';

console.log('Token extracted:', token.substring(0, 5) + '...');

async function test() {
  try {
    console.log('Fetching 2026-02 and 2026-01 via Native Fetch...');
    const opts = { headers: { Authorization: `Bearer ${token}` } };
    
    const [currRes, prevRes] = await Promise.all([
      fetch('https://wedding-ledger.fly.dev/api/transactions?year=2026&month=2', opts),
      fetch('https://wedding-ledger.fly.dev/api/transactions?year=2026&month=1', opts)
    ]);

    const currData = await currRes.json();
    const prevData = await prevRes.json();

    console.log(`Fetched current (${currData.length}) and prev (${prevData.length}) transactions.`);
    if (currData.length > 0) {
        console.log('Sample transaction keys:', Object.keys(currData[0]));
        console.log('Sample transaction major/sub:', currData[0].major, currData[0].sub);
    }

    // 3. Simulate React useMemo comparison logic
    const currMap = new Map();
    const prevMap = new Map();

    const getGroupKey = (tx) => {
      return tx.major ? `${tx.major}${tx.sub ? ` > ${tx.sub}` : ''}` : '분류 없음';
    };

    currData.forEach(tx => {
      if (tx.linked_transaction_id) return;
      const key = getGroupKey(tx);
      const curr = currMap.get(key) || { income: 0, expense: 0 };
      if (tx.type === 'income') curr.income += tx.amount;
      else curr.expense += tx.amount;
      currMap.set(key, curr);
    });

    prevData.forEach(tx => {
      if (tx.linked_transaction_id) return;
      const key = getGroupKey(tx);
      const prev = prevMap.get(key) || { income: 0, expense: 0 };
      if (tx.type === 'income') prev.income += tx.amount;
      else prev.expense += tx.amount;
      prevMap.set(key, prev);
    });

    console.log('\n[Current Map Keys]');
    console.log([...currMap.keys()]);

  } catch (error) {
    console.error('API Error:', error.message);
  }
}
test();
