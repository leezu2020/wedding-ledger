export type Account = {
  id: number;
  name: string;
  description?: string;
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
