export type Account = {
  id: number;
  name: string;
  description?: string;
  initial_balance?: number;
  is_main?: number;
};

export type Category = {
  id: number;
  type: 'income' | 'expense';
  major: string;
  sub: string | null;
};

export type Transaction = {
  id: number;
  type: 'income' | 'expense';
  year: number;
  month: number;
  day: number;
  account_id: number;
  category_id: number;
  amount: number;
  description?: string;
  linked_transaction_id?: number;
  // Joins
  account_name?: string;
  major?: string;
  sub?: string;
};

export type Budget = {
  id: number;
  year: number;
  month: number;
  category_id: number;
  amount: number;
  // Joins
  major?: string;
  sub?: string;
};

export type Saving = {
  id: number;
  year: number;
  month: number;
  day?: number;
  type: 'savings_plan' | 'deposit';
  account_id: number;
  name: string;
  amount: number;
  description?: string;
  // Joins
  account_name?: string;
};

export type Stock = {
  id: number;
  year: number;
  month: number;
  ticker: string;
  name?: string;
  buy_amount: number;
  shares: number;
};

export type SavingsProduct = {
  id: number;
  type: 'savings_plan' | 'deposit';
  bank: string;
  name?: string;
  pay_day?: number;
  start_date: string;
  interest_rate: number;
  interest_type: 'simple' | 'compound';
  term_months: number;
  amount: number;
  tax_type: '비과세' | '일반과세' | '세금우대';
  maturity_date: string;
  category_id?: number;
  memo?: string;
  is_active: number;
  initial_paid: number;
  // Calculated fields
  principal: number;
  interest: number;
  tax: number;
  totalAmount: number;
  paidCount: number;
  paidTotal: number;
  paidStatus: string;
  progressPercent: number;
};
