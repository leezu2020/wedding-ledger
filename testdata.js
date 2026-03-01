const axios = require('axios');
const fs = require('fs');

async function test() {
  const token = '';
  const urlParams = '?year=2026&month=2';
  try {
    const res = await axios.get('https://wedding-ledger.fly.dev/api/transactions' + urlParams, {
      headers: { Authorization: 'Bearer ' + token }
    });
    fs.writeFileSync('debug-txs.json', JSON.stringify(res.data, null, 2));
    console.log('Saved ' + res.data.length + ' transactions.');
  } catch(e) {
    console.error(e.message);
  }
}
test();
