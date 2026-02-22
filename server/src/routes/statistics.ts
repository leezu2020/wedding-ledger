import { Router } from 'express';
import db from '../db/connection';

const router = Router();

// Helper: parse accountIds query param into SQL clause
function buildAccountFilter(accountIdsParam: any, tableAlias: string = '') {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  if (!accountIdsParam) return { clause: '', params: [] as any[] };
  const ids = String(accountIdsParam).split(',').map(Number).filter(n => !isNaN(n));
  if (ids.length === 0) return { clause: '', params: [] };
  const placeholders = ids.map(() => '?').join(',');
  return { clause: ` AND ${prefix}account_id IN (${placeholders})`, params: ids };
}

// GET /api/statistics/monthly?year=2024&month=2&accountIds=1,2,3
router.get('/monthly', (req, res) => {
  const { year, month, accountIds } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  try {
    const txFilter = buildAccountFilter(accountIds, 't');
    const txFilterSimple = buildAccountFilter(accountIds);
    const savFilter = buildAccountFilter(accountIds);

    // Check if this is the main account (needed to decide transfer filter)
    const mainAccount = db.prepare('SELECT id, initial_balance FROM accounts WHERE is_main = 1').get() as { id: number, initial_balance: number } | undefined;
    const isMainAccount = mainAccount ? (accountIds ? String(accountIds).split(',').map(Number).includes(mainAccount.id) : true) : false;
    // For main account: exclude transfers. For others: include transfers as income/expense.
    const transferFilter = isMainAccount ? ' AND linked_transaction_id IS NULL' : '';
    const transferFilterT = isMainAccount ? ' AND t.linked_transaction_id IS NULL' : '';

    // Total Income, Expense
    const totals = db.prepare(`
      SELECT type, SUM(amount) as total
      FROM transactions
      WHERE year = ? AND month = ?${txFilterSimple.clause}${transferFilter}
      GROUP BY type
    `).all(year, month, ...txFilterSimple.params) as { type: string, total: number }[];
    
    const income = totals.find(t => t.type === 'income')?.total || 0;
    const expense = totals.find(t => t.type === 'expense')?.total || 0;
    const balance = income - expense;

    // Savings Total (from transactions)
    const savingsTotal = (db.prepare(`
      SELECT SUM(t.amount) as total 
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.year = ? AND t.month = ? AND (c.major LIKE '%저축%' OR c.major LIKE '%적금%')${txFilter.clause}
    `).get(year, month, ...txFilter.params) as { total: number }).total || 0;

    // Category Breakdown with sub-categories
    const details = db.prepare(`
      SELECT c.major, c.middle as sub, t.type, SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.year = ? AND t.month = ?${txFilter.clause}${transferFilterT}
      GROUP BY c.major, c.middle, t.type
      ORDER BY total DESC
    `).all(year, month, ...txFilter.params) as { major: string, sub: string | null, type: string, total: number }[];

    const expenseMap = new Map<string, { major: string, total: number, subs: { sub: string, total: number }[] }>();
    const incomeMap = new Map<string, { major: string, total: number, subs: { sub: string, total: number }[] }>();

    details.forEach(row => {
      const map = row.type === 'expense' ? expenseMap : incomeMap;
      if (!map.has(row.major)) {
        map.set(row.major, { major: row.major, total: 0, subs: [] });
      }
      const entry = map.get(row.major)!;
      entry.total += row.total;
      if (row.sub) {
        entry.subs.push({ sub: row.sub, total: row.total });
      }
    });

    const expenseBreakdown = Array.from(expenseMap.values()).sort((a, b) => b.total - a.total);
    const incomeBreakdown = Array.from(incomeMap.values()).sort((a, b) => b.total - a.total);
    const categoryBreakdown = expenseBreakdown.map(e => ({ major: e.major, total: e.total }));

    // Stocks Total & List
    const stocks = db.prepare(`
      SELECT ticker, name, buy_amount, shares
      FROM stocks
      WHERE year = ? AND month = ?
    `).all(year, month) as { ticker: string, name: string, buy_amount: number, shares: number }[];
    
    const stockTotal = stocks.reduce((sum, s) => sum + s.buy_amount, 0);

    // Main account balance (initial_balance + cumulative income - expense up to this month)
    let mainAccountBalance = 0;
    if (mainAccount) {
      const mainInitial = mainAccount.initial_balance || 0;
      const mainTx = db.prepare(`
        SELECT 
          SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
        FROM transactions
        WHERE account_id = ? AND (year < ? OR (year = ? AND month <= ?)) AND linked_transaction_id IS NULL
      `).get(mainAccount.id, year, year, month) as { income: number, expense: number };
      mainAccountBalance = mainInitial + (mainTx.income || 0) - (mainTx.expense || 0);
    }

    res.json({
      income, expense, balance,
      savings: savingsTotal,
      stocks, stockTotal,
      mainAccountBalance, isMainAccount,
      categoryBreakdown, expenseBreakdown, incomeBreakdown
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch monthly statistics' });
  }
});

// GET /api/statistics/trend?months=12
router.get('/trend', (req, res) => {
  const { months = 6 } = req.query;
  const limit = Math.min(Number(months), 24);

  try {
    const stmt = db.prepare(`
      SELECT year, month, 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE linked_transaction_id IS NULL
      GROUP BY year, month
      ORDER BY year DESC, month DESC
      LIMIT ?
    `);
    const result = stmt.all(limit).reverse();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch trend data' });
  }
});

// GET /api/statistics/yearly?year=2026&accountIds=1,2,3
router.get('/yearly', (req, res) => {
  const { year, accountIds } = req.query;

  if (!year) {
    return res.status(400).json({ error: 'Year is required' });
  }

  try {
    const accFilter = buildAccountFilter(accountIds);
    const accFilterWhere = accountIds 
      ? ` WHERE account_id IN (${String(accountIds).split(',').map(() => '?').join(',')})` 
      : '';
    const accFilterIds = accountIds 
      ? String(accountIds).split(',').map(Number).filter(n => !isNaN(n)) 
      : [];

    // Check if selected account is the main account
    const mainAccount = db.prepare('SELECT id, initial_balance FROM accounts WHERE is_main = 1').get() as { id: number, initial_balance: number } | undefined;
    const isMainAccount = mainAccount ? (accountIds ? String(accountIds).split(',').map(Number).includes(mainAccount.id) : true) : false;
    // For main account: exclude transfers. For others: include them.
    const transferFilter = isMainAccount ? ' AND linked_transaction_id IS NULL' : '';

    // Initial balance from accounts
    const initialBalance = (db.prepare(
      `SELECT SUM(initial_balance) as total FROM accounts${accFilterWhere.replace('account_id', 'id')}`
    ).get(...accFilterIds) as { total: number }).total || 0;

    // Cumulative income/expense BEFORE this year
    const prior = db.prepare(`
      SELECT 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE year < ?${accFilter.clause}${transferFilter}
    `).get(year, ...accFilter.params) as { income: number, expense: number };
    const priorBalance = (prior.income || 0) - (prior.expense || 0);

    // Cumulative savings BEFORE this year (from transactions)
    const priorSavings = (db.prepare(`
      SELECT SUM(t.amount) as total 
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.year < ? AND (c.major LIKE '%저축%' OR c.major LIKE '%적금%')${accFilter.clause}
    `).get(year, ...accFilter.params) as { total: number }).total || 0;

    // Monthly income/expense for this year
    const monthlyData = db.prepare(`
      SELECT month,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE year = ?${accFilter.clause}${transferFilter}
      GROUP BY month
    `).all(year, ...accFilter.params) as { month: number, income: number, expense: number }[];

    // Monthly savings for this year
    const monthlySavings = db.prepare(`
      SELECT t.month, SUM(t.amount) as total 
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.year = ? AND (c.major LIKE '%저축%' OR c.major LIKE '%적금%') ${accFilter.clause ? `AND t.account_id IN (${accFilter.params.join(',')})` : ''}
      GROUP BY t.month
    `).all(year) as { month: number, total: number }[];

    // Monthly stocks (snapshot) for this year
    const monthlyStocks = db.prepare(`
      SELECT month, SUM(buy_amount) as total FROM stocks
      WHERE year = ?
      GROUP BY month
    `).all(year) as { month: number, total: number }[];

    // Main account balance per month (for totalAssets when main account is selected)
    let mainBalancePerMonth: Record<number, number> = {};
    if (isMainAccount && mainAccount) {
      const mainInitial = mainAccount.initial_balance || 0;
      // Get cumulative balance before this year for main account
      const mainPrior = db.prepare(`
        SELECT 
          SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
        FROM transactions
        WHERE account_id = ? AND year < ? AND linked_transaction_id IS NULL
      `).get(mainAccount.id, year) as { income: number, expense: number };
      let runningBalance = mainInitial + (mainPrior.income || 0) - (mainPrior.expense || 0);

      // Monthly main account transactions
      const mainMonthlyData = db.prepare(`
        SELECT month,
          SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
        FROM transactions
        WHERE account_id = ? AND year = ? AND linked_transaction_id IS NULL
        GROUP BY month
      `).all(mainAccount.id, year) as { month: number, income: number, expense: number }[];

      for (let m = 1; m <= 12; m++) {
        const mData = mainMonthlyData.find(d => d.month === m);
        runningBalance += (mData?.income || 0) - (mData?.expense || 0);
        mainBalancePerMonth[m] = runningBalance;
      }
    }

    // Build 12-month array
    let currentCashAndSavings = initialBalance + priorBalance + priorSavings;
    let cumulativeSavings = priorSavings;
    let cumulativeStocks = 0;
    const result = [];

    for (let m = 1; m <= 12; m++) {
      const data = monthlyData.find(d => d.month === m);
      const savData = monthlySavings.find(s => s.month === m);
      const stockData = monthlyStocks.find(s => s.month === m);
      
      const income = data?.income || 0;
      const expense = data?.expense || 0;
      const savings = savData?.total || 0;
      const stockTotal = stockData?.total || 0;
      
      const balance = income - expense;
      currentCashAndSavings += balance + savings;
      cumulativeSavings += savings;
      cumulativeStocks += stockTotal;
      
      // For main account: totalAssets = mainAccountBalance + cumulative savings + cumulative stocks
      // For other accounts: only balance matters, no total asset
      const mainAccountBalance = mainBalancePerMonth[m] || 0;
      const totalAssets = isMainAccount ? (mainAccountBalance + cumulativeSavings + cumulativeStocks) : 0;

      result.push({ 
        month: m, 
        income, 
        expense, 
        balance, 
        savings: isMainAccount ? savings : 0, 
        stocks: isMainAccount ? stockTotal : 0,
        totalAssets,
        mainAccountBalance: isMainAccount ? mainAccountBalance : 0,
        isMainAccount
      });
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch yearly statistics' });
  }
});

// GET /api/statistics/assets
router.get('/assets', async (req, res) => {
  try {
    const accountsStmt = db.prepare('SELECT SUM(initial_balance) as total FROM accounts');
    const initialTotal = (accountsStmt.get() as { total: number }).total || 0;

    const txStmt = db.prepare(`
      SELECT 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE linked_transaction_id IS NULL
    `);
    const txTotals = txStmt.get() as { income: number, expense: number };
    const cashBalance = initialTotal + (txTotals.income || 0) - (txTotals.expense || 0);

    const savingsStmt = db.prepare(`
      SELECT SUM(t.amount) as total 
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE c.major LIKE '%저축%' OR c.major LIKE '%적금%'
    `);
    const savingsTotal = (savingsStmt.get() as { total: number }).total || 0;

    const stockStmt = db.prepare('SELECT SUM(buy_amount) as total FROM stocks');
    const stockTotal = (stockStmt.get() as { total: number }).total || 0;

    res.json({
      cash: cashBalance,
      savings: savingsTotal,
      stock: stockTotal,
      total: cashBalance + savingsTotal + stockTotal
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

export default router;
