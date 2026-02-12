import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { CategorySelect } from '../components/ui/CategorySelect';
import { 
  transactionsApi, 
  accountsApi, 
  categoriesApi, 
  savingsApi 
} from '../api';
import { type Account, type Category, type Transaction, type Saving } from '../types';

export default function InputPage() {
  const { type: paramType } = useParams();
  const location = useLocation();
  
  const resolveType = (): 'income' | 'expense' | 'savings' => {
    if (paramType === 'income' || paramType === 'expense' || paramType === 'savings') return paramType;
    if (location.pathname === '/savings') return 'savings';
    return 'expense';
  };
  const inputType = resolveType();

  const titleMap = { income: '수입 입력', expense: '지출 입력', savings: '저축/적금 입력' };
  const title = titleMap[inputType];

  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savings, setSavings] = useState<Saving[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Date string for datepicker (yyyy-MM-dd)
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    amount: 0,
    description: ''
  });
  const [newSaving, setNewSaving] = useState<Partial<Saving>>({
    name: '',
    amount: 0,
    type: 'deposit'
  });
  const [savingDate, setSavingDate] = useState(todayStr);

  useEffect(() => {
    fetchData();
  }, [year, month, inputType]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [accData, catData] = await Promise.all([
        accountsApi.getAll(),
        inputType !== 'savings' ? categoriesApi.getAll(inputType) : Promise.resolve([])
      ]);
      setAccounts(accData);
      setCategories(catData);

      if (inputType === 'savings') {
        const savData = await savingsApi.getAll(year, month);
        setSavings(savData);
      } else {
        const txData = await transactionsApi.getAll(year, month, inputType);
        setTransactions(txData);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForms = () => {
    setEditingId(null);
    setSelectedDate(todayStr);
    setSavingDate(todayStr);
    setNewTransaction({ amount: 0, description: '' });
    setNewSaving({ name: '', amount: 0, type: 'deposit' });
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingId(tx.id);
    const dateStr = `${tx.year}-${String(tx.month).padStart(2, '0')}-${String(tx.day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setNewTransaction({
      amount: tx.amount, description: tx.description,
      account_id: tx.account_id, category_id: tx.category_id
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditSaving = (sav: Saving) => {
    setEditingId(sav.id);
    const dateStr = sav.day 
      ? `${sav.year}-${String(sav.month).padStart(2, '0')}-${String(sav.day).padStart(2, '0')}`
      : `${sav.year}-${String(sav.month).padStart(2, '0')}-01`;
    setSavingDate(dateStr);
    setNewSaving({
      name: sav.name, amount: sav.amount, type: sav.type,
      account_id: sav.account_id, description: sav.description
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.amount || !newTransaction.account_id || !newTransaction.category_id) return;
    const d = new Date(selectedDate);
    try {
      const payload = {
        type: inputType as 'income' | 'expense',
        year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(),
        account_id: newTransaction.account_id,
        category_id: newTransaction.category_id,
        amount: Number(newTransaction.amount),
        description: newTransaction.description
      };
      if (editingId) {
        await transactionsApi.update(editingId, payload);
      } else {
        await transactionsApi.create(payload);
      }
      fetchData();
      resetForms();
    } catch (error) {
      console.error('Failed to save transaction', error);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await transactionsApi.delete(id);
      fetchData();
    } catch (error) {
      console.error('Failed to delete transaction', error);
    }
  };

  const handleAddSaving = async () => {
    if (!newSaving.amount || !newSaving.account_id || !newSaving.name) return;
    const d = new Date(savingDate);
    try {
      const payload = {
        year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(),
        type: newSaving.type as 'savings_plan' | 'deposit',
        account_id: newSaving.account_id,
        name: newSaving.name,
        amount: Number(newSaving.amount),
        description: newSaving.description
      };
      if (editingId) {
        await savingsApi.update(editingId, payload);
      } else {
        await savingsApi.create(payload);
      }
      fetchData();
      resetForms();
    } catch (error) {
      console.error('Failed to save saving', error);
    }
  };

  const handleDeleteSaving = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await savingsApi.delete(id);
      fetchData();
    } catch (error) {
      console.error('Failed to delete saving', error);
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
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>&lt;</Button>
          <span className="text-lg font-semibold">{format(currentDate, 'yyyy-MM')}</span>
          <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>&gt;</Button>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {/* Input Form */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
              {inputType !== 'savings' ? (
                <>
                  <DatePicker
                    label="날짜"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                  />
                  <Select
                    label="계좌"
                    options={[{ label: '계좌 선택', value: '' }, ...accounts.map(a => ({ label: a.name, value: a.id }))]}
                    value={newTransaction.account_id || ''}
                    onChange={e => setNewTransaction({...newTransaction, account_id: Number(e.target.value)})}
                  />
                  <CategorySelect
                    label="카테고리"
                    categories={categories}
                    value={newTransaction.category_id || ''}
                    onChange={e => setNewTransaction({...newTransaction, category_id: Number(e.target.value)})}
                  />
                  <Input 
                    type="number" 
                    label="금액" 
                    value={newTransaction.amount || ''} 
                    onChange={e => setNewTransaction({...newTransaction, amount: Number(e.target.value)})}
                  />
                  <Input 
                    label="내용" 
                    value={newTransaction.description || ''} 
                    onChange={e => setNewTransaction({...newTransaction, description: e.target.value})}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddTransaction}>
                      {editingId ? <Check size={16} className="mr-2"/> : <Plus size={16} className="mr-2"/>} 
                      {editingId ? '수정' : '추가'}
                    </Button>
                    {editingId && (
                      <Button variant="outline" onClick={resetForms}>
                        <X size={16} />
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <DatePicker
                    label="날짜"
                    value={savingDate}
                    onChange={e => setSavingDate(e.target.value)}
                  />
                  <Select
                    label="유형"
                    options={[{ label: '적금', value: 'savings_plan' }, { label: '예금/자유저축', value: 'deposit' }]}
                    value={newSaving.type}
                    onChange={e => setNewSaving({...newSaving, type: e.target.value as any})}
                  />
                  <Select
                    label="계좌 (출금처)"
                    options={[{ label: '계좌 선택', value: '' }, ...accounts.map(a => ({ label: a.name, value: a.id }))]}
                    value={newSaving.account_id || ''}
                    onChange={e => setNewSaving({...newSaving, account_id: Number(e.target.value)})}
                  />
                  <Input 
                    label="이름 (적금명)" 
                    value={newSaving.name || ''} 
                    onChange={e => setNewSaving({...newSaving, name: e.target.value})}
                  />
                  <Input 
                    type="number" 
                    label="금액" 
                    value={newSaving.amount || ''} 
                    onChange={e => setNewSaving({...newSaving, amount: Number(e.target.value)})}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddSaving}>
                      {editingId ? <Check size={16} className="mr-2"/> : <Plus size={16} className="mr-2"/>} 
                      {editingId ? '수정' : '추가'}
                    </Button>
                    {editingId && (
                      <Button variant="outline" onClick={resetForms}>
                        <X size={16} />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* List */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 dark:bg-slate-700/50 text-slate-500 font-medium">
                  <tr>
                    {inputType !== 'savings' ? (
                      <>
                        <th className="px-4 py-3">날짜</th>
                        <th className="px-4 py-3">계좌</th>
                        <th className="px-4 py-3">카테고리</th>
                        <th className="px-4 py-3">내용</th>
                        <th className="px-4 py-3 text-right">금액</th>
                        <th className="px-4 py-3 w-10"></th>
                        <th className="px-4 py-3 w-10"></th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3">날짜</th>
                        <th className="px-4 py-3">유형</th>
                        <th className="px-4 py-3">이름</th>
                        <th className="px-4 py-3">출금 계좌</th>
                        <th className="px-4 py-3 text-right">금액</th>
                        <th className="px-4 py-3 w-10"></th>
                        <th className="px-4 py-3 w-10"></th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {inputType !== 'savings' ? (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">{tx.month}/{tx.day}</td>
                        <td className="px-4 py-3">{tx.account_name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            {tx.major}{tx.sub ? ` > ${tx.sub}` : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{tx.description}</td>
                        <td className={`px-4 py-3 text-right font-medium ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleEditTransaction(tx)} className="text-slate-400 hover:text-blue-500">
                            <Edit2 size={16} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDeleteTransaction(tx.id)} className="text-slate-400 hover:text-rose-500">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    savings.map((sav) => (
                      <tr key={sav.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">{sav.day ? `${sav.month}/${sav.day}` : `${sav.month}월`}</td>
                        <td className="px-4 py-3">{sav.type === 'savings_plan' ? '적금' : '예금/자유저축'}</td>
                        <td className="px-4 py-3 font-medium">{sav.name}</td>
                        <td className="px-4 py-3">{sav.account_name}</td>
                        <td className="px-4 py-3 text-right font-medium text-blue-600">
                          {sav.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleEditSaving(sav)} className="text-slate-400 hover:text-blue-500">
                            <Edit2 size={16} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDeleteSaving(sav.id)} className="text-slate-400 hover:text-rose-500">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                  {((inputType !== 'savings' && transactions.length === 0) || (inputType === 'savings' && savings.length === 0)) && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
