import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { 
  PieChart, Pie, Cell, LineChart, Line,
  ComposedChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Wallet, Scale, RefreshCw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MultiSelectDropdown } from '../components/ui/MultiSelectDropdown';
import { HelpTooltip } from '../components/ui/HelpTooltip';
import { statisticsApi, accountsApi, stocksApi } from '../api';
import type { Account } from '../types';

const EXPENSE_COLORS = ['#F43F5E', '#FB923C', '#FBBF24', '#A78BFA', '#60A5FA', '#34D399', '#F472B6', '#818CF8'];
const INCOME_COLORS = ['#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#14B8A6', '#84CC16', '#22D3EE', '#6366F1'];

type CategoryBreakdown = { major: string; total: number; subs: { sub: string; total: number }[] };

type MonthlyStats = {
  income: number;
  expense: number;
  balance: number;
  savings: number;
  stocks: { ticker: string; name: string; buy_amount: number; shares: number }[];
  stockTotal: number;
  expenseBreakdown: CategoryBreakdown[];
  incomeBreakdown: CategoryBreakdown[];
};

type YearlyData = {
  month: number;
  income: number;
  expense: number;
  balance: number;
  savings: number;
  stocks: number;
  totalAssets: number;
};

// Custom Tooltip for Pie Chart — shows sub-category breakdown on hover
function CategoryTooltip({ active, payload, breakdown }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];
  const majorName = data.name;
  const entry = breakdown?.find((b: CategoryBreakdown) => b.major === majorName);
  if (!entry) return null;

  const total = entry.total;

  return (
    <div className="bg-white dark:bg-slate-800 shadow-xl rounded-lg p-3 border border-slate-200 dark:border-slate-700 min-w-[180px]">
      <p className="font-bold text-sm mb-2" style={{ color: data.payload?.fill }}>
        {majorName}: ₩{total.toLocaleString()}
      </p>
      {entry.subs.length > 0 ? (
        <div className="space-y-1">
          {entry.subs.map((s: { sub: string; total: number }) => (
            <div key={s.sub} className="flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-300">{s.sub}</span>
              <span className="font-medium ml-4">
                {((s.total / total) * 100).toFixed(1)}% <span className="text-slate-400">({s.total.toLocaleString()})</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">소분류 없음</p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);

  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);

  // Fetch accounts on mount, default all selected
  useEffect(() => {
    accountsApi.getAll().then(accs => {
      setAccounts(accs);
      setSelectedAccountIds(accs.map(a => a.id));
    });
  }, []);

  // Pass undefined when all selected (no filter), otherwise pass specific IDs
  const accountIdsParam = selectedAccountIds.length === accounts.length
    ? undefined
    : selectedAccountIds;

  const fetchMonthly = useCallback(async () => {
    setIsLoading(true);
    try {
      const monthly = await statisticsApi.getMonthly(year, month, accountIdsParam);
      setMonthlyStats(monthly);
    } catch (error) {
      console.error('Failed to fetch monthly stats', error);
    } finally {
      setIsLoading(false);
    }
  }, [year, month, accountIdsParam]);

  const fetchYearly = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await statisticsApi.getYearly(year, accountIdsParam);
      setYearlyData(data);
    } catch (error) {
      console.error('Failed to fetch yearly stats', error);
    } finally {
      setIsLoading(false);
    }
  }, [year, accountIdsParam]);

  useEffect(() => {
    if (accounts.length === 0) return; // wait for accounts to load
    if (activeTab === 'monthly') fetchMonthly();
    else fetchYearly();
  }, [activeTab, fetchMonthly, fetchYearly, accounts.length]);

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    if (activeTab === 'monthly') {
      newDate.setMonth(newDate.getMonth() + delta);
    } else {
      newDate.setFullYear(newDate.getFullYear() + delta);
    }
    setCurrentDate(newDate);
  };

  const periodLabel = activeTab === 'monthly'
    ? format(currentDate, 'yyyy-MM')
    : `${year}년`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">대시보드</h2>
          <HelpTooltip content="이체 거래는 수입/지출 합계에서 제외됩니다." />
        </div>
        <div className="flex items-center gap-4">
          {/* Tab Buttons */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              월별
            </button>
            <button
              onClick={() => setActiveTab('yearly')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === 'yearly'
                  ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              연도별
            </button>
          </div>
          {/* Account Filter */}
          <MultiSelectDropdown
            label="계좌"
            options={accounts.map(a => ({ id: a.id, label: a.name }))}
            selectedIds={selectedAccountIds}
            onChange={(ids) => setSelectedAccountIds(ids as number[])}
          />
          {/* Period Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>&lt;</Button>
            <span className="px-4 font-semibold min-w-[100px] text-center">{periodLabel}</span>
            <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>&gt;</Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8" /></div>
      ) : activeTab === 'monthly' ? (
        <MonthlyView stats={monthlyStats} />
      ) : (
        <YearlyView data={yearlyData} year={year} />
      )}
    </div>
  );
}

// ─── Monthly Tab ────────────────────────────────────
// ─── Monthly Tab ────────────────────────────────────
function MonthlyView({ stats }: { stats: MonthlyStats | null }) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (stats?.stocks && stats.stocks.length > 0) {
      fetchPrices();
    }
  }, [stats?.stocks]);

  const fetchPrices = async () => {
    if (!stats?.stocks.length) return;
    setIsRefreshing(true);
    try {
      const tickers = Array.from(new Set(stats.stocks.map(s => s.ticker)));
      const priceData = await stocksApi.getPrices(tickers);
      setPrices(priceData);
    } catch (error) {
      console.error('Failed to fetch prices', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!stats) return null;

  // Calculate Investment Metrics
  const stockPrincipal = stats.stockTotal;
  const stockCurrentValue = stats.stocks.reduce((sum, s) => {
    const price = prices[s.ticker];
    return sum + (price ? price * s.shares : s.buy_amount); // Fallback to buy_amount if no price
  }, 0);
  const stockPL = stockCurrentValue - stockPrincipal;
  const stockPLPercent = stockPrincipal > 0 ? (stockPL / stockPrincipal) * 100 : 0;

  // Total Assets = Balance + Savings + Stock Current Value
  const totalAssets = stats.balance + stats.savings + stockCurrentValue;

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Income */}
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">총 수입</p>
              <h3 className="text-2xl font-bold mt-1">₩{stats.income.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="text-white" size={20} />
            </div>
          </div>
        </Card>

        {/* Expense */}
        <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-white border-none">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-rose-100 text-sm font-medium">총 지출</p>
              <h3 className="text-2xl font-bold mt-1">₩{stats.expense.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingDown className="text-white" size={20} />
            </div>
          </div>
        </Card>

        {/* Balance */}
        <Card className={`bg-gradient-to-br ${stats.balance >= 0 ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-red-600'} text-white border-none`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">정산 (수입-지출)</p>
              <h3 className="text-2xl font-bold mt-1">
                {stats.balance >= 0 ? '+' : ''}₩{stats.balance.toLocaleString()}
              </h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <Scale className="text-white" size={20} />
            </div>
          </div>
        </Card>

        {/* Investments */}
        <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-none">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                 <p className="text-violet-100 text-sm font-medium">총 투자금</p>
                 <button onClick={fetchPrices} disabled={isRefreshing} className="p-0.5 hover:bg-white/10 rounded-full transition-colors">
                    <RefreshCw size={12} className={`text-violet-200 ${isRefreshing ? 'animate-spin' : ''}`} />
                 </button>
              </div>
              <h3 className="text-2xl font-bold mt-1">₩{stockCurrentValue.toLocaleString()}</h3>
              <p className="text-xs text-violet-100 mt-1">
                 원금 ₩{stockPrincipal.toLocaleString()} 
                 {stockPrincipal > 0 && (
                   <span className={`ml-2 font-bold ${stockPL >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                     {stockPL >= 0 ? '+' : ''}{stockPLPercent.toFixed(1)}%
                   </span>
                 )}
              </p>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="text-white" size={20} />
            </div>
          </div>
        </Card>

        {/* Total Assets (Expanded) */}
        <Card className="md:col-span-2 bg-gradient-to-br from-slate-700 to-slate-800 text-white border-none">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-300 text-sm font-medium">총 자산 현황</p>
              <h3 className="text-3xl font-bold mt-1">₩{totalAssets.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-white/10 rounded-lg">
              <Wallet className="text-white" size={24} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10 px-1">
             <div>
                <p className="text-xs text-slate-400">현금 자산 (잔액)</p>
                <p className="font-semibold text-lg">₩{stats.balance.toLocaleString()}</p>
             </div>
             <div>
                <p className="text-xs text-slate-400">저축 자산</p>
                <p className="font-semibold text-lg">₩{stats.savings.toLocaleString()}</p>
             </div>
             <div>
                <p className="text-xs text-slate-400">투자 자산 (평가)</p>
                <p className="font-semibold text-lg">₩{stockCurrentValue.toLocaleString()}</p>
             </div>
          </div>
        </Card>
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Pie */}
        <Card className="min-w-0 overflow-hidden">
          <h3 className="text-lg font-bold mb-4">지출 분석</h3>
          {stats.expenseBreakdown.length > 0 ? (
            <div className="h-[320px] min-w-0">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={stats.expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="total"
                    nameKey="major"
                    label={({ percent }: any) => `${(percent * 100).toFixed(1)}%`}
                  >
                    {stats.expenseBreakdown.map((_, i) => (
                      <Cell key={`exp-${i}`} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CategoryTooltip breakdown={stats.expenseBreakdown} />} />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    formatter={(value: string) => (
                      <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">지출 데이터가 없습니다.</p>
          )}
        </Card>

        {/* Income Pie */}
        <Card className="min-w-0 overflow-hidden">
          <h3 className="text-lg font-bold mb-4">수입 분석</h3>
          {stats.incomeBreakdown.length > 0 ? (
            <div className="h-[320px] min-w-0">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={stats.incomeBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="total"
                    nameKey="major"
                    label={({ percent }: any) => `${(percent * 100).toFixed(1)}%`}
                  >
                    {stats.incomeBreakdown.map((_, i) => (
                      <Cell key={`inc-${i}`} fill={INCOME_COLORS[i % INCOME_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CategoryTooltip breakdown={stats.incomeBreakdown} />} />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    formatter={(value: string) => (
                      <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">수입 데이터가 없습니다.</p>
          )}
        </Card>
      </div>
    </>
  );
}



// ─── Yearly Tab ─────────────────────────────────────
function YearlyView({ data, year }: { data: YearlyData[]; year: number }) {
  if (!data.length) return <p className="text-center text-slate-400 py-12">데이터가 없습니다.</p>;

  return (
    <div className="space-y-6">
      {/* Composed Chart: Total Assets (Line) + Monthly Balance (Bar) + Stocks (Area) */}
      <Card>
        <h3 className="text-lg font-bold mb-4">{year}년 자산 및 월별 정산</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="month"
                tickFormatter={(m) => `${m}월`}
                stroke="#94A3B8"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                yAxisId="left"
                stroke="#94A3B8"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#94A3B8"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any, name: any) => [
                  `₩${Number(value).toLocaleString()}`,
                  name === 'totalAssets' ? '총 자산' :
                  name === 'balance' ? '월별 정산' :
                  name === 'savings' ? '저축' :
                  name === 'stocks' ? '투자 자산' : String(name)
                ]}
                labelFormatter={(label) => `${label}월`}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="balance"
                name="월별 정산"
                fill="#818CF8"
                radius={[4, 4, 0, 0]}
                opacity={0.5}
              />
              <Bar
                yAxisId="left"
                dataKey="savings"
                name="저축"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                opacity={0.6}
              />
              {/* Show Stocks as an Area to visualize the investment portion base */}
              <Bar
                 yAxisId="right"
                 dataKey="stocks"
                 name="투자 자산"
                 fill="#8B5CF6"
                 radius={[2, 2, 0, 0]}
                 opacity={0.3}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalAssets"
                name="총 자산"
                stroke="#6366F1"
                strokeWidth={3}
                dot={{ r: 4, fill: '#6366F1' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Income / Expense Trend Line Chart */}
      <Card>
        <h3 className="text-lg font-bold mb-4">{year}년 수입/지출 추이</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="month"
                tickFormatter={(m) => `${m}월`}
                stroke="#94A3B8"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                stroke="#94A3B8"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any, name: any) => [
                  `₩${Number(value).toLocaleString()}`,
                  String(name)
                ]}
                labelFormatter={(label) => `${label}월`}
              />
              <Legend />
              <Line type="monotone" dataKey="income" name="수입" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="expense" name="지출" stroke="#F43F5E" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
