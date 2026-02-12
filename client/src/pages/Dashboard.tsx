import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { statisticsApi } from '../api';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const [isLoading, setIsLoading] = useState(false);

  const [monthlyStats, setMonthlyStats] = useState<{
    income: number;
    expense: number;
    balance: number;
    savings: number;
    categoryBreakdown: { major: string; total: number }[];
  } | null>(null);

  const [assets, setAssets] = useState<{
    cash: number; savings: number; stock: number; total: number;
  } | null>(null);

  const [trendData, setTrendData] = useState<{
    year: number; month: number; income: number; expense: number;
  }[]>([]);

  useEffect(() => {
    fetchStats();
  }, [year, month]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const [monthly, trend, assetData] = await Promise.all([
        statisticsApi.getMonthly(year, month),
        statisticsApi.getTrend(12),
        statisticsApi.getAssets()
      ]);
      setMonthlyStats(monthly);
      setTrendData(trend);
      setAssets(assetData);
    } catch (error) {
      console.error('Failed to fetch statistics', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">대시보드</h2>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>&lt;</Button>
          <span className="px-4 font-semibold">{format(currentDate, 'yyyy-MM')}</span>
          <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>&gt;</Button>
        </div>
      </div>

      {isLoading ? (
         <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-none">
              <div className="flex items-start justify-between">
                 <div>
                   <p className="text-indigo-100 text-sm font-medium">총 자산</p>
                   <h3 className="text-3xl font-bold mt-2">
                     ₩ {assets?.total.toLocaleString()}
                   </h3>
                 </div>
                 <div className="p-2 bg-white/20 rounded-lg">
                   <Wallet className="text-white" size={24} />
                 </div>
              </div>
              <p className="mt-4 text-xs text-indigo-100">
                자산: {(assets?.cash || 0).toLocaleString()} | 투자: {(assets?.stock || 0).toLocaleString()}
              </p>
            </Card>

            <Card>
               <div className="flex items-start justify-between">
                 <div>
                   <p className="text-slate-500 text-sm font-medium">이번 달 수입</p>
                   <h3 className="text-2xl font-bold mt-1 text-emerald-600">
                     + ₩ {monthlyStats?.income.toLocaleString()}
                   </h3>
                 </div>
                 <div className="p-2 bg-emerald-100 rounded-lg">
                   <TrendingUp className="text-emerald-600" size={20} />
                 </div>
              </div>
            </Card>

            <Card>
               <div className="flex items-start justify-between">
                 <div>
                   <p className="text-slate-500 text-sm font-medium">이번 달 지출</p>
                   <h3 className="text-2xl font-bold mt-1 text-rose-600">
                     - ₩ {monthlyStats?.expense.toLocaleString()}
                   </h3>
                 </div>
                 <div className="p-2 bg-rose-100 rounded-lg">
                   <TrendingDown className="text-rose-600" size={20} />
                 </div>
              </div>
            </Card>

            <Card>
               <div className="flex items-start justify-between">
                 <div>
                   <p className="text-slate-500 text-sm font-medium">이번 달 저축</p>
                   <h3 className="text-2xl font-bold mt-1 text-blue-600">
                     ₩ {monthlyStats?.savings.toLocaleString()}
                   </h3>
                 </div>
                 <div className="p-2 bg-blue-100 rounded-lg">
                   <Wallet className="text-blue-600" size={20} />
                 </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trend Chart */}
            <Card>
              <h3 className="text-lg font-bold mb-6">수입/지출 추이</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                       dataKey="month" 
                       tickFormatter={(month) => `${month}월`} 
                       stroke="#94A3B8"
                       tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                       stroke="#94A3B8"
                       tick={{ fontSize: 12 }}
                       tickFormatter={(val) => `${val / 10000}만`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [`₩ ${Number(value).toLocaleString()}`, '']}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="수입" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="expense" stroke="#F43F5E" strokeWidth={2} name="지출" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Category Pie Chart */}
            <Card>
              <h3 className="text-lg font-bold mb-6">지출 분석</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={monthlyStats?.categoryBreakdown || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="total"
                      nameKey="major"
                    >
                      {(monthlyStats?.categoryBreakdown || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `₩ ${Number(value).toLocaleString()}`} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
