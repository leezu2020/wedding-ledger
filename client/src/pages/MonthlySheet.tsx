import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Loader2, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { 
  transactionsApi, 
  accountsApi, 
  categoriesApi, 
  savingsApi 
} from '../api';
import { type Account, type Category, type Transaction, type Saving } from '../types';

export default function MonthlySheet() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'savings'>('expense');
  const [isLoading, setIsLoading] = useState(false);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savings, setSavings] = useState<Saving[]>([]);

  // Form states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    day: new Date().getDate(),
    amount: 0,
    description: ''
  });
  const [newSaving, setNewSaving] = useState<Partial<Saving>>({
    name: '',
    amount: 0,
    type: 'deposit'
  });

  useEffect(() => {
    fetchData();
  }, [year, month, activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [accData, catData] = await Promise.all([
        accountsApi.getAll(),
        categoriesApi.getAll(activeTab === 'income' || activeTab === 'expense' ? activeTab : undefined)
      ]);
      setAccounts(accData);
      setCategories(catData);

      if (activeTab === 'savings') {
        const savData = await savingsApi.getAll(year, month);
        setSavings(savData);
      } else {
        const txData = await transactionsApi.getAll(year, month, activeTab);
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
    setNewTransaction({
      day: new Date().getDate(),
      amount: 0,
      description: ''
    });
    setNewSaving({
      name: '',
      amount: 0,
      type: 'deposit'
    });
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingId(tx.id);
    setNewTransaction({
      day: tx.day,
      amount: tx.amount,
      description: tx.description,
      account_id: tx.account_id,
      category_id: tx.category_id
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditSaving = (sav: Saving) => {
    setEditingId(sav.id);
    setNewSaving({
      name: sav.name,
      amount: sav.amount,
      type: sav.type,
      account_id: sav.account_id,
      description: sav.description
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.amount || !newTransaction.account_id || !newTransaction.category_id) return;

    try {
      const payload = {
        type: activeTab as 'income' | 'expense',
        year,
        month,
        day: newTransaction.day || 1,
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

    try {
      const payload = {
        year,
        month,
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
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>&lt;</Button>
          <h2 className="text-2xl font-bold">{format(currentDate, 'yyyy-MM')}</h2>
          <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>&gt;</Button>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          {['income', 'expense', 'savings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600 dark:text-violet-400'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              {tab === 'income' ? '수입' : tab === 'expense' ? '지출' : '저축'}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {/* Input Row */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
              {activeTab !== 'savings' ? (
                <>
                  <Input 
                    type="number" 
                    label="날짜(일)" 
                    value={newTransaction.day} 
                    onChange={e => setNewTransaction({...newTransaction, day: Number(e.target.value)})}
                  />
                  <Select
                    label="계좌"
                    options={accounts.map(a => ({ label: a.name, value: a.id }))}
                    value={newTransaction.account_id || ''}
                    onChange={e => setNewTransaction({...newTransaction, account_id: Number(e.target.value)})}
                  />
                  <Select
                    label="카테고리"
                    options={categories.map(c => ({ label: c.sub ? `${c.major} > ${c.sub}` : c.major, value: c.id }))}
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
                   <Select
                    label="유형"
                    options={[{ label: '적금', value: 'savings_plan' }, { label: '예금/자유저축', value: 'deposit' }]}
                    value={newSaving.type}
                    onChange={e => setNewSaving({...newSaving, type: e.target.value as any})}
                  />
                  <Select
                    label="계좌 (출금처)"
                    options={accounts.map(a => ({ label: a.name, value: a.id }))}
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
                  <Input 
                    label="내용/메모" 
                    value={newSaving.description || ''} 
                    onChange={e => setNewSaving({...newSaving, description: e.target.value})}
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
                    {activeTab !== 'savings' ? (
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
                        <th className="px-4 py-3">유형</th>
                        <th className="px-4 py-3">이름</th>
                        <th className="px-4 py-3">출금 계좌</th>
                        <th className="px-4 py-3">내용</th>
                        <th className="px-4 py-3 text-right">금액</th>
                        <th className="px-4 py-3 w-10"></th>
                        <th className="px-4 py-3 w-10"></th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {activeTab !== 'savings' ? (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">{tx.day}</td>
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
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleEditTransaction(tx)} className="text-slate-400 hover:text-blue-500 mr-2">
                            <Edit2 size={16} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDeleteTransaction(tx.id)} className="text-slate-400 hover:text-rose-500">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    savings.map((sav) => (
                      <tr key={sav.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                         <td className="px-4 py-3 capitalize">{sav.type.replace('_', ' ')}</td>
                         <td className="px-4 py-3 font-medium">{sav.name}</td>
                         <td className="px-4 py-3">{sav.account_name}</td>
                         <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{sav.description}</td>
                         <td className="px-4 py-3 text-right font-medium text-blue-600">
                            {sav.amount.toLocaleString()}
                         </td>
                         <td className="px-4 py-3 text-right">
                          <button onClick={() => handleEditSaving(sav)} className="text-slate-400 hover:text-blue-500 mr-2">
                            <Edit2 size={16} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDeleteSaving(sav.id)} className="text-slate-400 hover:text-rose-500">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                  {((activeTab !== 'savings' && transactions.length === 0) || (activeTab === 'savings' && savings.length === 0)) && (
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
