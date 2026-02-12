import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { transactionsApi, savingsApi } from '../api';
import { type Transaction, type Saving } from '../types';

type DaySummary = {
  date: Date;
  income: number;
  expense: number;
  savings: number;
  transactions: Transaction[];
  savingsEntries: Saving[];
};

export default function MonthlySheet() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [txData, savData] = await Promise.all([
        transactionsApi.getAll(year, month),
        savingsApi.getAll(year, month)
      ]);
      setTransactions(txData);
      setSavings(savData);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  // Build day summaries
  const daySummaries = useMemo(() => {
    const map = new Map<string, DaySummary>();

    calendarDays.forEach(date => {
      const key = format(date, 'yyyy-MM-dd');
      map.set(key, {
        date,
        income: 0,
        expense: 0,
        savings: 0,
        transactions: [],
        savingsEntries: []
      });
    });

    transactions.forEach(tx => {
      const key = `${year}-${String(month).padStart(2, '0')}-${String(tx.day).padStart(2, '0')}`;
      const summary = map.get(key);
      if (summary) {
        summary.transactions.push(tx);
        if (tx.type === 'income') summary.income += tx.amount;
        else summary.expense += tx.amount;
      }
    });

    savings.forEach(sav => {
      if (sav.day) {
        const key = `${year}-${String(month).padStart(2, '0')}-${String(sav.day).padStart(2, '0')}`;
        const summary = map.get(key);
        if (summary) {
          summary.savingsEntries.push(sav);
          summary.savings += sav.amount;
        }
      }
    });

    return map;
  }, [calendarDays, transactions, savings, year, month]);

  // Monthly totals
  const monthlyTotals = useMemo(() => {
    let income = 0, expense = 0, savingsTotal = 0;
    transactions.forEach(tx => {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    });
    savings.forEach(s => savingsTotal += s.amount);
    return { income, expense, savings: savingsTotal, balance: income - expense };
  }, [transactions, savings]);

  // Selected day data
  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    const key = format(selectedDate, 'yyyy-MM-dd');
    return daySummaries.get(key) || null;
  }, [selectedDate, daySummaries]);

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">월별 가계부</h2>
      </div>

      {/* Month Navigation + Summary */}
      <Card className="p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <ChevronLeft size={24} />
            </button>
            <h3 className="text-xl font-bold">{year}년 {month}월</h3>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <ChevronRight size={24} />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-white/80 text-sm">수입</p>
              <p className="text-lg font-bold text-emerald-100">{monthlyTotals.income.toLocaleString()}원</p>
            </div>
            <div>
              <p className="text-white/80 text-sm">지출</p>
              <p className="text-lg font-bold text-rose-200">{monthlyTotals.expense.toLocaleString()}원</p>
            </div>
            <div>
              <p className="text-white/80 text-sm">합계</p>
              <p className={`text-lg font-bold ${monthlyTotals.balance >= 0 ? 'text-white' : 'text-rose-200'}`}>
                {monthlyTotals.balance >= 0 ? '' : ''}{monthlyTotals.balance.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
        ) : (
          <>
            {/* Calendar Grid */}
            <div className="border-b border-slate-200 dark:border-slate-700">
              {/* Week day header */}
              <div className="grid grid-cols-7 text-center text-sm font-medium">
                {weekDays.map((day, i) => (
                  <div 
                    key={day} 
                    className={`py-2 border-b border-slate-200 dark:border-slate-700 ${
                      i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-slate-500'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {calendarDays.map((date, idx) => {
                  const key = format(date, 'yyyy-MM-dd');
                  const summary = daySummaries.get(key);
                  const isCurrentMonth = isSameMonth(date, currentDate);
                  const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                  const isTodayDate = isToday(date);
                  const dayOfWeek = date.getDay();

                  return (
                    <button
                      key={key}
                      onClick={() => isCurrentMonth && setSelectedDate(isSelected ? null : date)}
                      className={`
                        relative min-h-[80px] p-1.5 border-b border-r border-slate-100 dark:border-slate-800
                        text-left transition-colors
                        ${!isCurrentMonth ? 'bg-slate-50 dark:bg-slate-900/50 opacity-40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer'}
                        ${isSelected ? 'bg-violet-50 dark:bg-violet-900/20 ring-2 ring-violet-500 ring-inset' : ''}
                        ${idx % 7 === 6 ? 'border-r-0' : ''}
                      `}
                      disabled={!isCurrentMonth}
                    >
                      <span className={`
                        text-sm font-medium leading-none
                        ${isTodayDate ? 'bg-violet-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center' : ''}
                        ${!isTodayDate && dayOfWeek === 0 ? 'text-rose-500' : ''}
                        ${!isTodayDate && dayOfWeek === 6 ? 'text-blue-500' : ''}
                        ${!isCurrentMonth ? 'text-slate-300 dark:text-slate-600' : ''}
                      `}>
                        {format(date, 'd')}
                      </span>

                      {isCurrentMonth && summary && (summary.income > 0 || summary.expense > 0 || summary.savings > 0) && (
                        <div className="mt-1 space-y-0.5">
                          {summary.income > 0 && (
                            <p className="text-[10px] text-emerald-600 font-medium truncate leading-tight">
                              {summary.income.toLocaleString()}
                            </p>
                          )}
                          {summary.expense > 0 && (
                            <p className="text-[10px] text-rose-500 font-medium truncate leading-tight">
                              {summary.expense.toLocaleString()}
                            </p>
                          )}
                          {summary.savings > 0 && (
                            <p className="text-[10px] text-blue-500 font-medium truncate leading-tight">
                              {summary.savings.toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Savings Summary Row */}
            {monthlyTotals.savings > 0 && (
              <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">💰 이번 달 저축/적금</span>
                <span className="text-sm font-bold text-blue-600">{monthlyTotals.savings.toLocaleString()}원</span>
              </div>
            )}

            {/* Selected Day Detail */}
            {selectedDate && selectedDayData && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 animate-in fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg">
                    {format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })}
                  </h4>
                  <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={18} />
                  </button>
                </div>

                {selectedDayData.transactions.length === 0 && selectedDayData.savingsEntries.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">이 날짜에 기록된 내역이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayData.transactions.map(tx => (
                      <div key={`tx-${tx.id}`} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <div>
                            <p className="text-sm font-medium">{tx.description || (tx.major ? `${tx.major}${tx.sub ? ` > ${tx.sub}` : ''}` : '내용 없음')}</p>
                            <p className="text-xs text-slate-400">
                              {tx.account_name} · {tx.major}{tx.sub ? ` > ${tx.sub}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className={`font-medium ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()}원
                        </span>
                      </div>
                    ))}
                    {selectedDayData.savingsEntries.map(sav => (
                      <div key={`sav-${sav.id}`} className="flex items-center justify-between py-2 px-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <div className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <div>
                            <p className="text-sm font-medium">{sav.name}</p>
                            <p className="text-xs text-slate-400">
                              {sav.account_name} · {sav.type === 'savings_plan' ? '적금' : '예금/자유저축'}
                            </p>
                          </div>
                        </div>
                        <span className="font-medium text-blue-600">
                          {sav.amount.toLocaleString()}원
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Daily summary */}
                {(selectedDayData.transactions.length > 0 || selectedDayData.savingsEntries.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-6 text-sm">
                    {selectedDayData.income > 0 && (
                      <span className="text-emerald-600">수입: +{selectedDayData.income.toLocaleString()}</span>
                    )}
                    {selectedDayData.expense > 0 && (
                      <span className="text-rose-600">지출: -{selectedDayData.expense.toLocaleString()}</span>
                    )}
                    {selectedDayData.savings > 0 && (
                      <span className="text-blue-600">저축: {selectedDayData.savings.toLocaleString()}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
