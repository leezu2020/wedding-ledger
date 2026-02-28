import { useState, useEffect, useMemo } from 'react';
import { subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { HelpTooltip } from '../components/ui/HelpTooltip';
import { transactionsApi } from '../api';
import { type Transaction } from '../types';

export default function StatisticsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  
  const [currentMonthTxs, setCurrentMonthTxs] = useState<Transaction[]>([]);
  const [prevMonthTxs, setPrevMonthTxs] = useState<Transaction[]>([]);

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
      const [currData, prevData] = await Promise.all([
        transactionsApi.getAll(currentYear, currentMonth),
        transactionsApi.getAll(prevYear, prevMonth)
      ]);
      setCurrentMonthTxs(currData);
      setPrevMonthTxs(prevData);
    } catch (error) {
      console.error('Failed to fetch statistics data', error);
    } finally {
      setIsLoading(false);
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
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <ChevronLeft size={24} />
            </button>
            <div className="text-center">
              <h3 className="text-xl font-bold">{currentYear}년 {currentMonth}월</h3>
              <p className="text-violet-100 text-sm opacity-80 mt-1">
                vs {prevYear}년 {prevMonth}월
              </p>
            </div>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-violet-500" /></div>
        ) : (
          <div className="p-6 space-y-8">
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
    </div>
  );
}
