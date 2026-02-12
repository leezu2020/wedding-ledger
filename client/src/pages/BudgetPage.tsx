import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Loader2, Save } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { categoriesApi, budgetsApi, transactionsApi } from '../api';
import { type Category, type Transaction } from '../types';

export default function BudgetPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const [isLoading, setIsLoading] = useState(false);
  
  const [categories, setCategories] = useState<Category[]>([]);
  // budgets state is not needed as we map to budgetInputs immediately
  // const [budgets, setBudgets] = useState<Budget[]>([]);
  
  // Local state for inputs to avoid constant re-fetching/flickering
  const [budgetInputs, setBudgetInputs] = useState<Record<number, number>>({});
  const [actuals, setActuals] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [cats, buds, txs] = await Promise.all([
        categoriesApi.getAll('expense'),
        budgetsApi.getAll(year, month),
        transactionsApi.getAll(year, month, 'expense')
      ]);
      setCategories(cats);
      
      const inputs: Record<number, number> = {};
      cats.forEach(c => {
        const found = buds.find(b => b.category_id === c.id);
        inputs[c.id] = found ? found.amount : 0;
      });
      setBudgetInputs(inputs);

      // Aggregate actuals by category_id
      const acts: Record<number, number> = {};
      txs.forEach((t: Transaction) => {
        acts[t.category_id] = (acts[t.category_id] || 0) + t.amount;
      });
      setActuals(acts);

    } catch (error) {
      console.error('Failed to fetch budget data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (categoryId: number) => {
    const amount = budgetInputs[categoryId] || 0;
    try {
      await budgetsApi.upsert({
        year,
        month,
        category_id: categoryId,
        amount
      });
      // Optionally show success feedback
    } catch (error) {
      console.error('Failed to save budget', error);
    }
  };

  const handleSaveAll = async () => {
    setIsLoading(true);
    try {
      await Promise.all(
        categories.map(c => 
          budgetsApi.upsert({
            year,
            month,
            category_id: c.id,
            amount: budgetInputs[c.id] || 0
          })
        )
      );
      fetchData();
    } catch (error) {
       console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  // Group categories for better display
  const groupedCategories = categories.reduce((acc, cat) => {
    if (!acc[cat.major]) acc[cat.major] = [];
    acc[cat.major].push(cat);
    return acc;
  }, {} as Record<string, Category[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">월별 예산 관리</h2>
        <div className="flex gap-4">
           <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>&lt;</Button>
            <span className="px-4 font-semibold">{format(currentDate, 'yyyy-MM')}</span>
            <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>&gt;</Button>
          </div>
          <Button onClick={handleSaveAll} disabled={isLoading}>
            <Save size={16} className="mr-2" /> 전체 저장
          </Button>
        </div>
      </div>

      {isLoading && <div className="flex justify-center"><Loader2 className="animate-spin" /></div>}
      
      {!isLoading && Object.keys(groupedCategories).length === 0 && (
         <p className="text-center text-slate-500">지출 카테고리가 없습니다. 카테고리를 먼저 생성해주세요.</p>
      )}

      {/* Budget vs Actual Chart */}
      {!isLoading && Object.keys(groupedCategories).length > 0 && (
        <Card className="mb-6">
          <h3 className="text-lg font-bold mb-4">대분류별 예산 대비 지출</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Object.entries(groupedCategories).map(([major, cats]) => {
                  const totalBudget = cats.reduce((sum, c) => sum + (budgetInputs[c.id] || 0), 0);
                  const totalActual = cats.reduce((sum, c) => sum + (actuals[c.id] || 0), 0);
                  return {
                    name: major,
                    예산: totalBudget,
                    지출: totalActual
                  };
                })}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} tickFormatter={(val) => `${val/10000}만`} />
                <Tooltip 
                  formatter={(value: number) => `₩${(value || 0).toLocaleString()}`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar dataKey="예산" fill="#8884d8" name="예산" radius={[4, 4, 0, 0]} />
                <Bar dataKey="지출" fill="#F43F5E" name="지출" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(groupedCategories).map(([major, cats]) => (
          <Card key={major} className="space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">{major}</h3>
            <div className="space-y-3">
              {cats.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {cat.sub || '일반'}
                  </span>
                     <div className="flex flex-col items-end gap-1">
                       <div className="flex items-center gap-2">
                         <Input 
                           type="number"
                           className="w-32 h-8 text-right"
                           value={budgetInputs[cat.id] === undefined ? '' : budgetInputs[cat.id]}
                           onChange={(e) => setBudgetInputs({
                             ...budgetInputs,
                             [cat.id]: Number(e.target.value)
                           })}
                           onBlur={() => handleSave(cat.id)}
                         />
                         <span className="text-xs text-slate-400">₩</span>
                       </div>
                       <span className={`text-xs ${(actuals[cat.id] || 0) > (budgetInputs[cat.id] || 0) ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                         지출: {(actuals[cat.id] || 0).toLocaleString()}
                       </span>
                     </div>
                  </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-medium text-violet-600">
                 <span>소계</span>
                 <span>
                    {cats.reduce((sum, c) => sum + (budgetInputs[c.id] || 0), 0).toLocaleString()}
                 </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      <div className="bg-slate-900 text-white p-6 rounded-xl flex justify-between items-center shadow-lg">
         <span className="text-xl font-bold">월 예산 총계</span>
         <span className="text-2xl font-bold text-violet-300">
           ₩ {Object.values(budgetInputs).reduce((a, b) => a + b, 0).toLocaleString()}
         </span>
      </div>
    </div>
  );
}
