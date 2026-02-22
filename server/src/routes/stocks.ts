import { Router } from 'express';
import db from '../db/connection';
import { sendError } from '../utils/errorHandler';
import { stockService } from '../services/yahooFinance';

const router = Router();

// GET /api/stocks?year=2024&month=2
router.get('/', (req, res) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  try {
    const stmt = db.prepare('SELECT * FROM stocks WHERE year = ? AND month = ?');
    const stocks = stmt.all(year, month);
    res.json(stocks);
  } catch (error) {
    sendError(res, '주식 조회 실패', error);
  }
});

// GET /api/stocks/prices?tickers=AAPL,TSLA,005930.KS
router.get('/prices', async (req, res) => {
  const { tickers } = req.query;
  
  if (!tickers || typeof tickers !== 'string') {
    return res.status(400).json({ error: 'Tickers are required (comma separated)' });
  }

  const tickerList = tickers.split(',').map(t => t.trim()).filter(t => t);

  try {
    const prices = await stockService.getBulkPrices(tickerList);
    res.json(prices);
  } catch (error) {
    sendError(res, '주식 시세 조회 실패', error);
  }
});

// POST /api/stocks
router.post('/', (req, res) => {
  const { year, month, ticker, name, buy_amount, shares } = req.body;

  if (!year || !month || !ticker || !buy_amount || shares === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO stocks (year, month, ticker, name, buy_amount, shares)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(year, month, ticker, name, buy_amount, shares);
    res.status(201).json({ id: info.lastInsertRowid, ...req.body });
  } catch (error) {
    sendError(res, '주식 추가 실패', error);
  }
});

// DELETE /api/stocks/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const stmt = db.prepare('DELETE FROM stocks WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    res.status(204).send();
  } catch (error) {
    sendError(res, '주식 삭제 실패', error);
  }
});

export default router;
