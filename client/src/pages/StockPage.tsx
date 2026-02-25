import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Loader2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DatePicker } from '../components/ui/DatePicker';
import { stocksApi } from '../api';
import { type Stock } from '../types';

export default function StockPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const [isLoading, setIsLoading] = useState(false);
  
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);

  const [allTimeStocks, setAllTimeStocks] = useState<Stock[]>([]);
  const [allTimePrices, setAllTimePrices] = useState<Record<string, number>>({});
  const [isLoadingAllTime, setIsLoadingAllTime] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [createDate, setCreateDate] = useState(todayStr);

  const [newStock, setNewStock] = useState({
    ticker: '',
    name: '',
    buy_amount: '',
    shares: ''
  });

  useEffect(() => {
    fetchStocks();
  }, [year, month]);

  useEffect(() => {
    fetchAllTimeStocks();
  }, []);

  const fetchStocks = async () => {
    setIsLoading(true);
    try {
      const data = await stocksApi.getAll(year, month);
      setStocks(data);
      if (data.length > 0) {
        fetchPrices(data);
      } else {
         setPrices({});
      }
    } catch (error) {
      console.error('Failed to fetch stocks', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllTimeStocks = async () => {
    setIsLoadingAllTime(true);
    try {
      const data = await stocksApi.getAllTime();
      setAllTimeStocks(data);
      if (data.length > 0) {
        const tickers = Array.from(new Set(data.map(s => s.ticker)));
        const priceData = await stocksApi.getPrices(tickers);
        setAllTimePrices(priceData);
      } else {
        setAllTimePrices({});
      }
    } catch (error) {
      console.error('Failed to fetch all-time stocks', error);
    } finally {
      setIsLoadingAllTime(false);
    }
  };

  const fetchPrices = async (stockList: Stock[]) => {
    const tickers = Array.from(new Set(stockList.map(s => s.ticker)));
    if (tickers.length === 0) return;
    
    setIsRefreshingPrices(true);
    try {
      const priceData = await stocksApi.getPrices(tickers);
      setPrices(priceData);
    } catch (error) {
      console.error('Failed to fetch prices', error);
    } finally {
      setIsRefreshingPrices(false);
    }
  };

  const handleAddStock = async () => {
    if (!newStock.ticker || !newStock.buy_amount || !newStock.shares) return;
    
    const d = new Date(createDate);
    try {
      await stocksApi.create({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        ticker: newStock.ticker.toUpperCase(),
        name: newStock.name,
        buy_amount: Number(newStock.buy_amount),
        shares: Number(newStock.shares)
      });
      setNewStock({ ticker: '', name: '', buy_amount: '', shares: '' });
      fetchStocks();
      fetchAllTimeStocks();
    } catch (error) {
      console.error('Failed to add stock', error);
    }
  };

  const handleDelete = async (id: number) => {
    if(!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await stocksApi.delete(id);
      fetchStocks();
      fetchAllTimeStocks();
    } catch (error) {
      console.error('Failed to delete stock', error);
    }
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };
  
  const calculateCurrentValue = (stock: Stock) => {
     const price = prices[stock.ticker];
     if (price === undefined) return null;
     return price * stock.shares;
  };
  
  const totalBuyAmount = stocks.reduce((sum, s) => sum + s.buy_amount, 0);
  const totalCurrentValue = stocks.reduce((sum, s) => {
     const val = calculateCurrentValue(s);
     return sum + (val || s.buy_amount); 
  }, 0); 

  const globalTotalBuyAmount = allTimeStocks.reduce((sum, s) => sum + s.buy_amount, 0);
  const globalTotalCurrentValue = allTimeStocks.reduce((sum, s) => {
     const price = allTimePrices[s.ticker];
     return sum + (price !== undefined ? price * s.shares : s.buy_amount); 
  }, 0);
  const globalDiff = globalTotalCurrentValue - globalTotalBuyAmount;
  const globalDiffPercent = globalTotalBuyAmount > 0 ? (globalDiff / globalTotalBuyAmount * 100).toFixed(2) : '0.00';
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">주식 포트폴리오</h2>
      </div>

      {isLoadingAllTime ? (
         <div className="flex justify-center p-4"><Loader2 className="animate-spin w-8 h-8 text-violet-500" /></div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-6 rounded-2xl border border-violet-100 dark:border-violet-800/50 shadow-sm">
            <div className="flex flex-col justify-between">
               <span className="text-sm font-bold text-violet-600 dark:text-violet-400">전체 누적 총 투자금</span>
               <span className="text-3xl font-extrabold text-violet-950 dark:text-violet-50 mt-2">₩ {globalTotalBuyAmount.toLocaleString()}</span>
            </div>
            <div className="flex flex-col justify-between">
               <div className="flex justify-between items-start">
                 <span className="text-sm font-bold text-violet-600 dark:text-violet-400">전체 누적 현재 평가금 (추정)</span>
                 <Button variant="ghost" size="sm" onClick={fetchAllTimeStocks} disabled={isLoadingAllTime} className="h-6 w-6 p-0 hover:bg-violet-200 dark:hover:bg-violet-800">
                   <RefreshCw size={14} className={isLoadingAllTime ? "animate-spin text-violet-600 dark:text-violet-400" : "text-violet-600 dark:text-violet-400"} />
                 </Button>
               </div>
               <div className="flex items-baseline gap-2 mt-2">
                 <span className="text-3xl font-extrabold text-violet-950 dark:text-violet-50">
                   {globalTotalCurrentValue === 0 && allTimeStocks.length > 0 ? '-' : `₩ ${globalTotalCurrentValue.toLocaleString()}`}
                 </span>
                 {allTimeStocks.length > 0 && globalTotalCurrentValue > 0 && (
                   <span className={`text-base font-bold px-2 py-0.5 rounded-md ${globalDiff >= 0 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                     {globalDiff >= 0 ? '+' : ''}{globalDiff.toLocaleString()} ({globalDiffPercent}%)
                   </span>
                 )}
               </div>
            </div>
         </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-xl font-bold">월별 관리</h3>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shadow-inner">
          <Button variant="outline" size="sm" onClick={() => changeMonth(-1)} className="border-none bg-white dark:bg-slate-700 shadow-sm">&lt;</Button>
          <span className="px-4 font-bold text-slate-700 dark:text-slate-200">{format(currentDate, 'yyyy-MM')}</span>
          <Button variant="outline" size="sm" onClick={() => changeMonth(1)} className="border-none bg-white dark:bg-slate-700 shadow-sm">&gt;</Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8" /></div>
      ) : (
        <>
      {/* Summary for this month */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card className="flex flex-col justify-between">
            <span className="text-sm text-slate-500">총 투자금 (이번 달)</span>
            <span className="text-2xl font-bold">₩ {totalBuyAmount.toLocaleString()}</span>
         </Card>
         <Card className="flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-sm text-slate-500">현재 평가금 (추정)</span>
              <Button variant="ghost" size="sm" onClick={() => fetchPrices(stocks)} disabled={isRefreshingPrices}>
                <RefreshCw size={14} className={isRefreshingPrices ? "animate-spin" : ""} />
              </Button>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-2xl font-bold">
                 {totalCurrentValue === 0 && stocks.length > 0 ? '-' : `₩ ${totalCurrentValue.toLocaleString()}`}
               </span>
               {stocks.length > 0 && totalCurrentValue > 0 && (() => {
                 const diff = totalCurrentValue - totalBuyAmount;
                 const diffPercent = (diff / totalBuyAmount * 100).toFixed(2);
                 return (
                   <span className={`text-sm font-medium ${diff >= 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                     {diff >= 0 ? '+' : ''}{diff.toLocaleString()} ({diffPercent}%)
                   </span>
                 );
               })()}
            </div>
         </Card>
      </div>

      <Card className="space-y-4">
        {/* Input */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
          <DatePicker
            label="일자"
            value={createDate}
            onChange={e => setCreateDate(e.target.value)}
          />
          <Input 
            label="종목코드 (Ticker)" 
            placeholder="예: 005930.KS" 
            value={newStock.ticker}
            onChange={e => setNewStock({...newStock, ticker: e.target.value})}
          />
          <Input 
            label="종목명 (선택)" 
            placeholder="삼성전자"
            value={newStock.name}
            onChange={e => setNewStock({...newStock, name: e.target.value})}
          />
          <Input 
            type="number"
            label="총 매수금" 
            placeholder="KRW"
            value={newStock.buy_amount}
            onChange={e => setNewStock({...newStock, buy_amount: e.target.value})}
          />
           <Input 
            type="number"
            label="보유수량" 
            placeholder="주"
            value={newStock.shares}
            onChange={e => setNewStock({...newStock, shares: e.target.value})}
          />
          <Button onClick={handleAddStock}><Plus size={16} className="mr-2"/> 추가</Button>
        </div>

        {/* List */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 dark:bg-slate-700/50 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3 w-20">일자</th>
                <th className="px-4 py-3">종목코드</th>
                <th className="px-4 py-3">종목명</th>
                <th className="px-4 py-3 text-right">보유수량</th>
                <th className="px-4 py-3 text-right">매수금</th>
                <th className="px-4 py-3 text-right">현재가</th>
                <th className="px-4 py-3 text-right">평가금</th>
                <th className="px-4 py-3 text-right">손익</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
             <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
               {stocks.map((stock) => {
                 const currentVal = calculateCurrentValue(stock);
                 const pl = currentVal ? currentVal - stock.buy_amount : null;
                 const plPercent = currentVal ? (pl! / stock.buy_amount * 100) : null;
                 
                 return (
                   <tr key={stock.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                     <td className="px-4 py-3 text-slate-500">{stock.day ? `${stock.month}/${stock.day}` : `${stock.month}월`}</td>
                     <td className="px-4 py-3 font-bold">{stock.ticker}</td>
                     <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{stock.name}</td>
                     <td className="px-4 py-3 text-right">{stock.shares}</td>
                     <td className="px-4 py-3 text-right font-medium">{stock.buy_amount.toLocaleString()}</td>
                     <td className="px-4 py-3 text-right text-slate-600">
                       {prices[stock.ticker] ? prices[stock.ticker].toLocaleString() : '-'}
                     </td>
                     <td className="px-4 py-3 text-right font-bold">
                        {currentVal ? currentVal.toLocaleString() : '-'}
                     </td>
                     <td className={`px-4 py-3 text-right font-medium ${pl != null ? (pl >= 0 ? 'text-rose-600' : 'text-blue-600') : ''}`}>
                        {pl != null ? `${pl > 0 ? '+' : ''}${pl.toLocaleString()} (${plPercent?.toFixed(2)}%)` : '-'}
                     </td>
                     <td className="px-4 py-3 text-right">
                       <button onClick={() => handleDelete(stock.id)} className="text-slate-400 hover:text-rose-500">
                         <Trash2 size={16} />
                       </button>
                     </td>
                   </tr>
                 );
               })}
               {stocks.length === 0 && (
                 <tr>
                   <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                     이번 달 투자 내역이 없습니다.
                   </td>
                 </tr>
               )}
             </tbody>
          </table>
        </div>
      </Card>
      
       <div className="text-xs text-slate-500 text-right">
          * 실시간 시세는 야후 파이낸스에서 제공하며 다소 지연될 수 있습니다.
       </div>
       </>
      )}
    </div>
  );
}
