import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { initDB } from './db/schema';
import accountsRouter from './routes/accounts';
import categoriesRouter from './routes/categories';
import transactionsRouter from './routes/transactions';
import budgetsRouter from './routes/budgets';
import savingsRouter from './routes/savings';
import savingsProductsRouter from './routes/savingsProducts';
import stocksRouter from './routes/stocks';
import statisticsRouter from './routes/statistics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize DB
initDB();

// Global Basic Authentication Middleware
app.use((req, res, next) => {
  const password = process.env.APP_PASSWORD;
  
  // If no password is set in env, skip authentication (for local dev)
  if (!password) {
    return next();
  }

  // Parse Authorization header
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [loginUser, loginPassword] = Buffer.from(b64auth, 'base64').toString().split(':');

  // Verify credentials (username is hardcoded to 'admin' for simplicity)
  if (loginUser === 'admin' && loginPassword === password) {
    return next();
  }

  // Access denied - trigger browser login prompt
  res.set('WWW-Authenticate', 'Basic realm="Wedding Ledger"');
  res.status(401).send('Authentication required.');
});

// API routes
app.use('/api/accounts', accountsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/savings', savingsRouter);
app.use('/api/savings-products', savingsProductsRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/statistics', statisticsRouter);

// Serve client static files in production
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// SPA fallback: any non-API route serves index.html
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
      if (err) next();
    });
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
