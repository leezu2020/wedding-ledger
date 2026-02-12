import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './db/schema';
import accountsRouter from './routes/accounts';
import categoriesRouter from './routes/categories';
import transactionsRouter from './routes/transactions';
import budgetsRouter from './routes/budgets';
import savingsRouter from './routes/savings';
import stocksRouter from './routes/stocks';
import statisticsRouter from './routes/statistics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ... (previous imports)

// Initialize DB
initDB();

app.get('/', (req, res) => {
  res.send('Wedding Ledger API is running');
});

app.use('/api/accounts', accountsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/savings', savingsRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/statistics', statisticsRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
