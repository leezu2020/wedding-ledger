import { useState, useEffect, useMemo } from 'react';
import { subMonths, getDaysInMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Card } from '../components/ui/Card';
import { HelpTooltip } from '../components/ui/HelpTooltip';
import { Button } from '../components/ui/Button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { transactionsApi, reportsApi } from '../api';
import { type Transaction, type MonthlyReport } from '../types';

export default function StatisticsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  
  const [currentMonthTxs, setCurrentMonthTxs] = useState<Transaction[]>([]);
  const [prevMonthTxs, setPrevMonthTxs] = useState<Transaction[]>([]);
  
  const [aiReport, setAiReport] = useState<MonthlyReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  const prevDate = subMonths(currentDate, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() + 1;

  useEffect(() => {
    fetchData();
  }, [currentYear, currentMonth]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch transactions independently so a reports API failure doesn't block comparison data
      const [currData, prevData] = await Promise.all([
        transactionsApi.getAll(currentYear, currentMonth),
        transactionsApi.getAll(prevYear, prevMonth),
      ]);
      setCurrentMonthTxs(currData);
      setPrevMonthTxs(prevData);
    } catch (error) {
      console.error('Failed to fetch transaction data', error);
    }
    // Fetch AI report separately so its failure never blocks the main UI
    try {
      const reportData = await reportsApi.get(currentYear, currentMonth);
      setAiReport(reportData);
    } catch {
      setAiReport(null);
    }
    setIsLoading(false);
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const report = await reportsApi.generate(currentYear, currentMonth);
      setAiReport(report);
    } catch (error) {
      console.error('Failed to generate AI report', error);
      alert('AI 결산 리포트 생성에 실패했습니다.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  // Compare logic
  const comparison = useMemo(() => {
    const currMap = new Map<string, { income: number, expense: number }>();
    const prevMap = new Map<string, { income: number, expense: number }>();

    const getGroupKey = (tx: Transaction) => {
      // 그룹화 기준: 대분류 > 소분류 (결제처가 파편화되어 있으면 항목별 변동 추적이 어려우므로 카테고리 기준)
      return tx.major ? `${tx.major}${tx.sub ? ` > ${tx.sub}` : ''}` : '분류 없음';
    };

    currentMonthTxs.forEach(tx => {
      if (tx.linked_transaction_id) return;
      const key = getGroupKey(tx);
      const curr = currMap.get(key) || { income: 0, expense: 0 };
      if (tx.type === 'income') curr.income += tx.amount;
      else curr.expense += tx.amount;
      currMap.set(key, curr);
    });

    prevMonthTxs.forEach(tx => {
      if (tx.linked_transaction_id) return;
      const key = getGroupKey(tx);
      const prev = prevMap.get(key) || { income: 0, expense: 0 };
      if (tx.type === 'income') prev.income += tx.amount;
      else prev.expense += tx.amount;
      prevMap.set(key, prev);
    });

    const categories = Array.from(new Set([...Array.from(currMap.keys()), ...Array.from(prevMap.keys())]));

    const increasedExpenses: any[] = [];
    const decreasedExpenses: any[] = [];
    const newExpenses: any[] = [];
    const noLongerExpenses: any[] = [];

    const increasedIncomes: any[] = [];
    const decreasedIncomes: any[] = [];
    const newIncomes: any[] = [];
    const noLongerIncomes: any[] = [];

    categories.forEach(cat => {
      const curr = currMap.get(cat) || { income: 0, expense: 0 };
      const prev = prevMap.get(cat) || { income: 0, expense: 0 };

      // Expense logic
      const expDiff = curr.expense - prev.expense;
      if (prev.expense === 0 && curr.expense > 0) {
        newExpenses.push({ category: cat, amount: curr.expense, diff: expDiff });
      } else if (prev.expense > 0 && curr.expense === 0) {
        noLongerExpenses.push({ category: cat, amount: 0, diff: expDiff });
      } else if (expDiff > 0) {
        increasedExpenses.push({ category: cat, amount: curr.expense, diff: expDiff, prevAmount: prev.expense });
      } else if (expDiff < 0) {
        decreasedExpenses.push({ category: cat, amount: curr.expense, diff: expDiff, prevAmount: prev.expense });
      }

      // Income logic
      const incDiff = curr.income - prev.income;
      if (prev.income === 0 && curr.income > 0) {
        newIncomes.push({ category: cat, amount: curr.income, diff: incDiff });
      } else if (prev.income > 0 && curr.income === 0) {
        noLongerIncomes.push({ category: cat, amount: 0, diff: incDiff });
      } else if (incDiff > 0) {
        increasedIncomes.push({ category: cat, amount: curr.income, diff: incDiff, prevAmount: prev.income });
      } else if (incDiff < 0) {
        decreasedIncomes.push({ category: cat, amount: curr.income, diff: incDiff, prevAmount: prev.income });
      }
    });

    const sortByDiff = (a: any, b: any) => Math.abs(b.diff) - Math.abs(a.diff);

    return {
      expense: {
        new: newExpenses.sort(sortByDiff),
        increased: increasedExpenses.sort(sortByDiff),
        decreased: decreasedExpenses.sort(sortByDiff),
        removed: noLongerExpenses.sort(sortByDiff),
      },
      income: {
        new: newIncomes.sort(sortByDiff),
        increased: increasedIncomes.sort(sortByDiff),
        decreased: decreasedIncomes.sort(sortByDiff),
        removed: noLongerIncomes.sort(sortByDiff),
      }
    };
  }, [currentMonthTxs, prevMonthTxs]);

  // ─── 일별 누적 지출 비교 데이터 ───
  const cumulativeData = useMemo(() => {
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth;
    const prevDays = getDaysInMonth(new Date(prevYear, prevMonth - 1));
    const currActualDays = getDaysInMonth(new Date(currentYear, currentMonth - 1));
    const maxDays = Math.max(prevDays, currActualDays);
    const currVisibleDays = isCurrentMonth ? today.getDate() : maxDays;

    // 일별 지출 합산 (이체 포함, expense만)
    const prevDailyMap: Record<number, number> = {};
    const currDailyMap: Record<number, number> = {};

    prevMonthTxs.forEach(tx => {
      if (tx.type !== 'expense') return;
      prevDailyMap[tx.day] = (prevDailyMap[tx.day] || 0) + tx.amount;
    });
    currentMonthTxs.forEach(tx => {
      if (tx.type !== 'expense') return;
      currDailyMap[tx.day] = (currDailyMap[tx.day] || 0) + tx.amount;
    });

    // 누적 합산
    let prevRunning = 0;
    let currRunning = 0;
    const result: { day: number; prev: number | null; curr: number | null }[] = [];

    for (let d = 1; d <= maxDays; d++) {
      if (d <= prevDays) prevRunning += prevDailyMap[d] || 0;
      if (d <= currActualDays) currRunning += currDailyMap[d] || 0;
      // 짧은 달은 마지막 날 누적값을 유지 (보정)
      // 이번 달이 현재 진행 중이면 오늘 이후는 null
      result.push({
        day: d,
        prev: prevRunning,
        curr: d <= currVisibleDays ? currRunning : null,
      });
    }

    // 최종 차이: 동일 일수 기준 비교
    // - 현재 월: 오늘까지의 누적 vs 지난달 같은 날까지의 누적
    // - 지난 달: 해당 월 전체 vs 지난달 전체
    const currTotal = result.filter(r => r.curr !== null).slice(-1)[0]?.curr ?? 0;
    const prevTotal = result[Math.min(currVisibleDays, prevDays) - 1]?.prev ?? 0;
    const diff = currTotal - prevTotal;

    return { chartData: result, diff, currDays: currVisibleDays, prevDays };
  }, [currentMonthTxs, prevMonthTxs, currentYear, currentMonth, prevYear, prevMonth]);

  const renderComparisonItem = (item: any, type: 'expense' | 'income', status: 'new' | 'increased' | 'decreased' | 'removed') => {
    let statusColor = '';
    let statusIcon = null;
    let label = '';

    if (status === 'new') {
      statusColor = type === 'expense' ? 'text-rose-500' : 'text-emerald-500';
      label = '신규';
      statusIcon = <ArrowUpRight size={16} className={statusColor} />;
    } else if (status === 'removed') {
      statusColor = 'text-slate-400';
      label = '소멸 (전월 발생)';
      statusIcon = <Minus size={16} className="text-slate-400" />;
    } else if (status === 'increased') {
      statusColor = type === 'expense' ? 'text-rose-500' : 'text-emerald-500';
      label = `전월비 +${item.diff.toLocaleString()}원`;
      statusIcon = <ArrowUpRight size={16} className={statusColor} />;
    } else if (status === 'decreased') {
      statusColor = type === 'expense' ? 'text-emerald-500' : 'text-rose-500';
      label = `전월비 ${item.diff.toLocaleString()}원`;
      statusIcon = <ArrowDownRight size={16} className={statusColor} />;
    }

    return (
      <div key={item.category} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
        <div>
          <p className="font-medium text-sm">{item.category}</p>
          <div className="flex items-center gap-1 mt-1">
            {statusIcon}
            <p className={`text-xs font-medium ${statusColor}`}>{label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold">{item.amount.toLocaleString()}원</p>
          {item.prevAmount !== undefined && (
            <p className="text-xs text-slate-400">전월: {item.prevAmount.toLocaleString()}원</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">월간 리포트 (전월 비교)</h2>
          <HelpTooltip content="이체 거래는 수입/지출 비교에서 제외됩니다. 카테고리(대분류>소분류) 기준으로 비교합니다." />
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/20 rounded-full transition-colors cursor-pointer">
              <ChevronLeft size={24} />
            </button>
            <div className="text-center">
              <h3 className="text-xl font-bold">{currentYear}년 {currentMonth}월</h3>
              <p className="text-violet-100 text-sm opacity-80 mt-1">
                vs {prevYear}년 {prevMonth}월
              </p>
            </div>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/20 rounded-full transition-colors cursor-pointer">
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-violet-500" /></div>
        ) : (
          <div className="p-6 space-y-8">
            {/* ─── 일별 누적 지출 비교 차트 ─── */}
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 w-full">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">📈</span>
                  일별 누적 지출 비교
                  {cumulativeData.diff !== null && (
                    <span className={`ml-auto text-sm font-semibold ${
                      cumulativeData.diff > 0 ? 'text-rose-500' : cumulativeData.diff < 0 ? 'text-emerald-500' : 'text-slate-400'
                    }`}>
                      {cumulativeData.diff > 0
                        ? `지난달 대비 +${cumulativeData.diff.toLocaleString()}원 초과 🚨`
                        : cumulativeData.diff < 0
                          ? `지난달 대비 ${Math.abs(cumulativeData.diff).toLocaleString()}원 절약 ✅`
                          : '지난달과 동일'}
                    </span>
                  )}
                </h3>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeData.chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="gradCurr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="day"
                      tickFormatter={(d) => `${d}일`}
                      stroke="#94A3B8"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="#94A3B8"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : v.toLocaleString()}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.12)', padding: '12px 16px' }}
                      labelFormatter={(label) => `${label}일`}
                      formatter={(value: any, name?: string) => [
                        `₩${Number(value).toLocaleString()}`,
                        name === 'prev' ? `${prevMonth}월 누적` : `${currentMonth}월 누적`
                      ]}
                    />
                    <Legend
                      formatter={(value: string) => (
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                          {value === 'prev' ? `${prevYear}년 ${prevMonth}월` : `${currentYear}년 ${currentMonth}월`}
                        </span>
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="prev"
                      stroke="#94A3B8"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      fill="url(#gradPrev)"
                      dot={{ r: 2, fill: '#94A3B8' }}
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="curr"
                      stroke="#6366F1"
                      strokeWidth={2.5}
                      fill="url(#gradCurr)"
                      dot={{ r: 2.5, fill: '#6366F1' }}
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* 지출 비교 섹션 */}
            <section>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-sm">
                  -
                </span>
                지출 변동내역
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 지출 증가 */}
                <div>
                  <h4 className="text-sm font-semibold text-rose-600 mb-3 flex items-center gap-1">
                    <ArrowUpRight size={16} /> 지출 증가 및 신규 항목 (전월대비 ⬆️)
                  </h4>
                  <div className="space-y-2">
                    {comparison.expense.new.length === 0 && comparison.expense.increased.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg">해당 내역이 없습니다.</p>
                    )}
                    {comparison.expense.new.map(item => renderComparisonItem(item, 'expense', 'new'))}
                    {comparison.expense.increased.map(item => renderComparisonItem(item, 'expense', 'increased'))}
                  </div>
                </div>

                {/* 지출 감소 */}
                <div>
                  <h4 className="text-sm font-semibold text-emerald-600 mb-3 flex items-center gap-1">
                    <ArrowDownRight size={16} /> 지출 감소 및 소멸 항목 (전월대비 ⬇️)
                  </h4>
                  <div className="space-y-2">
                    {comparison.expense.decreased.length === 0 && comparison.expense.removed.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg">해당 내역이 없습니다.</p>
                    )}
                    {comparison.expense.decreased.map(item => renderComparisonItem(item, 'expense', 'decreased'))}
                    {comparison.expense.removed.map(item => renderComparisonItem(item, 'expense', 'removed'))}
                  </div>
                </div>
              </div>
            </section>

            {/* 수입 비교 섹션 */}
            <section>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  +
                </span>
                수입 변동내역
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 수입 증가 */}
                <div>
                  <h4 className="text-sm font-semibold text-emerald-600 mb-3 flex items-center gap-1">
                    <ArrowUpRight size={16} /> 수입 증가 및 신규 항목 (전월대비 ⬆️)
                  </h4>
                  <div className="space-y-2">
                    {comparison.income.new.length === 0 && comparison.income.increased.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg">해당 내역이 없습니다.</p>
                    )}
                    {comparison.income.new.map(item => renderComparisonItem(item, 'income', 'new'))}
                    {comparison.income.increased.map(item => renderComparisonItem(item, 'income', 'increased'))}
                  </div>
                </div>

                {/* 수입 감소 */}
                <div>
                  <h4 className="text-sm font-semibold text-rose-600 mb-3 flex items-center gap-1">
                    <ArrowDownRight size={16} /> 수입 감소 및 소멸 항목 (전월대비 ⬇️)
                  </h4>
                  <div className="space-y-2">
                    {comparison.income.decreased.length === 0 && comparison.income.removed.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg">해당 내역이 없습니다.</p>
                    )}
                    {comparison.income.decreased.map(item => renderComparisonItem(item, 'income', 'decreased'))}
                    {comparison.income.removed.map(item => renderComparisonItem(item, 'income', 'removed'))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </Card>

      {/* AI 리포트 영역 */}
      <Card className="mt-8 border-violet-200 dark:border-violet-900 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-lg font-bold shadow-sm">
              ✨
            </div>
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400">
              AI 월간 재무 결산
            </h3>
          </div>
          {!aiReport && (
            <Button onClick={handleGenerateReport} isLoading={isGeneratingReport} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 border-0">
              결산하기
            </Button>
          )}
        </div>

        {isGeneratingReport ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-4" />
            <p className="font-medium animate-pulse">AI가 이번 달 가계부 기록을 꼼꼼히 분석하고 있어요...</p>
          </div>
        ) : aiReport ? (
          <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-violet-700 dark:prose-headings:text-violet-400 prose-a:text-fuchsia-600 bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiReport.content}</ReactMarkdown>
            <div className="mt-6 text-right">
              <span className="text-xs text-slate-400">
                작성일시: {new Date(aiReport.created_at).toLocaleString()}
              </span>
              <Button variant="ghost" size="sm" onClick={handleGenerateReport} className="ml-4 text-violet-600 hover:text-violet-700">
                다시 생성하기
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 relative overflow-hidden group hover:border-violet-300 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-slate-500 mb-4 relative z-10">이번 달의 재무 상태를 AI가 날카롭게 분석해 드립니다.</p>
            <Button onClick={handleGenerateReport} variant="outline" className="border-violet-200 hover:bg-violet-50 text-violet-700 relative z-10">
              첫 결산 리포트 생성하기
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
