import axios from 'axios';
import type { Account, Category, Transaction, Budget, Saving, Stock } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:3000/api', // Env var later
});

export const accountsApi = {
  getAll: () => api.get<Account[]>('/accounts').then(res => res.data),
  create: (data: Omit<Account, 'id'>) => api.post<Account>('/accounts', data).then(res => res.data),
  update: (id: number, data: Omit<Account, 'id'>) => api.put<Account>(`/accounts/${id}`, data).then(res => res.data),
  delete: (id: number) => api.delete(`/accounts/${id}`),
};

export const categoriesApi = {
  getAll: (type?: 'income' | 'expense') => api.get<Category[]>('/categories', { params: { type } }).then(res => res.data),
  create: (data: Omit<Category, 'id'>) => api.post<Category>('/categories', data).then(res => res.data),
  update: (id: number, data: { major?: string; sub?: string }) => api.put<{ success: boolean }>(`/categories/${id}`, data).then(res => res.data),
  updateMajor: (data: { type: 'income' | 'expense'; oldMajor: string; newMajor: string }) => api.put<{ success: boolean; changes: number }>('/categories/major', data).then(res => res.data),
  delete: (id: number) => api.delete(`/categories/${id}`),
};

export const transactionsApi = {
  getAll: (year: number, month: number, type?: 'income' | 'expense') => 
    api.get<Transaction[]>('/transactions', { params: { year, month, type } }).then(res => res.data),
  create: (data: Omit<Transaction, 'id'>) => api.post<Transaction>('/transactions', data).then(res => res.data),
  update: (id: number, data: Partial<Transaction>) => api.put<Transaction>(`/transactions/${id}`, data).then(res => res.data),
  delete: (id: number) => api.delete(`/transactions/${id}`),
};

export const budgetsApi = {
  getAll: (year: number, month: number) => api.get<Budget[]>('/budgets', { params: { year, month } }).then(res => res.data),
  upsert: (data: Omit<Budget, 'id'>) => api.post<Budget>('/budgets', data).then(res => res.data),
};

export const savingsApi = {
  getAll: (year: number, month: number) => api.get<Saving[]>('/savings', { params: { year, month } }).then(res => res.data),
  create: (data: Omit<Saving, 'id'>) => api.post<Saving>('/savings', data).then(res => res.data),
  update: (id: number, data: Omit<Saving, 'id'>) => api.put<Saving>(`/savings/${id}`, data).then(res => res.data),
  delete: (id: number) => api.delete(`/savings/${id}`),
};

export const stocksApi = {
  getAll: (year: number, month: number) => api.get<Stock[]>('/stocks', { params: { year, month } }).then(res => res.data),
  create: (data: Omit<Stock, 'id'>) => api.post<Stock>('/stocks', data).then(res => res.data),
  delete: (id: number) => api.delete(`/stocks/${id}`),
  getPrices: (tickers: string[]) => api.get<Record<string, number>>('/stocks/prices', { params: { tickers: tickers.join(',') } }).then(res => res.data),
};

export const statisticsApi = {
  getMonthly: (year: number, month: number, accountIds?: number[]) => api.get<{
    income: number;
    expense: number;
    balance: number;
    savings: number;
    stocks: { ticker: string; name: string; buy_amount: number; shares: number }[];
    stockTotal: number;
    categoryBreakdown: { major: string; total: number }[];
    expenseBreakdown: { major: string; total: number; subs: { sub: string; total: number }[] }[];
    incomeBreakdown: { major: string; total: number; subs: { sub: string; total: number }[] }[];
  }>('/statistics/monthly', { params: { year, month, accountIds: accountIds?.join(',') } }).then(res => res.data),
  getTrend: (months: number = 6) => api.get<{
    year: number; month: number; income: number; expense: number;
  }[]>('/statistics/trend', { params: { months } }).then(res => res.data),
  getYearly: (year: number, accountIds?: number[]) => api.get<{
    month: number; income: number; expense: number; balance: number; savings: number; stocks: number; totalAssets: number;
  }[]>('/statistics/yearly', { params: { year, accountIds: accountIds?.join(',') } }).then(res => res.data),
  getAssets: () => api.get<{
    cash: number;
    savings: number;
    stock: number;
    total: number;
  }>('/statistics/assets').then(res => res.data),
};
