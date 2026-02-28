import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2, Plus, Trash2, Edit2, X, Save, ArrowUpDown, ArrowUp, ArrowDown, Wallet, Search } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { CategorySelect } from '../components/ui/CategorySelect';
import { SearchableCategorySelect } from '../components/ui/SearchableCategorySelect';
import { 
  transactionsApi, 
  accountsApi, 
  categoriesApi, 
  savingsApi 
} from '../api';
import { type Account, type Category, type Transaction, type Saving } from '../types';

type SortConfig = {
  key: 'date' | 'amount';
  direction: 'asc' | 'desc';
};

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

  // Tab & Sort State
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });

  // Inline Editing State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormTx, setEditFormTx] = useState<Partial<Transaction>>({});
  const [editFormSav, setEditFormSav] = useState<Partial<Saving>>({});
  
  // Creation Form State
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [createDate, setCreateDate] = useState(todayStr);

  // Detailed Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchCategories, setSearchCategories] = useState<Category[]>([]);
  const [searchDesc, setSearchDesc] = useState('');
  const [searchMinAmt, setSearchMinAmt] = useState<number | ''>('');
  const [searchMaxAmt, setSearchMaxAmt] = useState<number | ''>('');
  
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
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
      
      // Initialize tab to first account if not yet selected
      if (accData.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accData[0].id);
      }

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

  // ... (Keep existing CRUD handlers: startEditingTx, saveEditingTx, etc.) ...
  const startEditingTx = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditFormTx({ ...tx });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditFormTx({});
    setEditFormSav({});
  };

  const saveEditingTx = async () => {
    if (!editingId || !editFormTx.amount || !editFormTx.account_id || !editFormTx.category_id) return;
    try {
      const payload = {
        type: inputType as 'income' | 'expense',
        year: editFormTx.year!, 
        month: editFormTx.month!, 
        day: editFormTx.day!,
        account_id: editFormTx.account_id,
        category_id: editFormTx.category_id,
        amount: Number(editFormTx.amount),
        description: editFormTx.description
      };
      
      await transactionsApi.update(editingId, payload);
      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error('Failed to update transaction', error);
    }
  };

  const startEditingSav = (sav: Saving) => {
    setEditingId(sav.id);
    setEditFormSav({ ...sav });
  };

  const saveEditingSav = async () => {
    if (!editingId || !editFormSav.amount || !editFormSav.account_id || !editFormSav.name) return;
    try {
      const payload = {
        year: editFormSav.year!, 
        month: editFormSav.month!, 
        day: editFormSav.day!,
        type: editFormSav.type as 'savings_plan' | 'deposit',
        account_id: editFormSav.account_id,
        name: editFormSav.name,
        amount: Number(editFormSav.amount),
        description: editFormSav.description
      };
      await savingsApi.update(editingId, payload);
      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error('Failed to update saving', error);
    }
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.amount || !selectedAccountId || !newTransaction.category_id) return;
    const d = new Date(createDate);
    try {
      const payload = {
        type: inputType as 'income' | 'expense',
        year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(),
        account_id: selectedAccountId,
        category_id: newTransaction.category_id,
        amount: Number(newTransaction.amount),
        description: newTransaction.description
      };
      await transactionsApi.create(payload);
      fetchData();
      setNewTransaction({ amount: 0, description: '' });
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
    if (!newSaving.amount || !selectedAccountId || !newSaving.name) return;
    const d = new Date(createDate);
    try {
      const payload = {
        year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(),
        type: newSaving.type as 'savings_plan' | 'deposit',
        account_id: selectedAccountId,
        name: newSaving.name,
        amount: Number(newSaving.amount),
        description: newSaving.description
      };
      await savingsApi.create(payload);
      fetchData();
      setNewSaving({ name: '', amount: 0, type: 'deposit' });
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

  const updateEditDate = (dateStr: string, isTx: boolean) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;
    if (isTx) {
      setEditFormTx(prev => ({ ...prev, year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }));
    } else {
      setEditFormSav(prev => ({ ...prev, year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }));
    }
  };

  // Derived Data (Filtered & Sorted)
  const processedData = useMemo(() => {
    // 1. Filter by active tab account
    let data;
    if (inputType === 'savings') {
      data = savings.filter(s => s.account_id === selectedAccountId);
    } else {
      data = transactions.filter(t => t.account_id === selectedAccountId);
      
      // Detailed Search Filters
      if (searchCategories.length > 0) {
        data = data.filter(t => {
          return searchCategories.some(searchCategory => {
            if (!searchCategory.sub) {
              // Major category search
              return t.major === searchCategory.major;
            } else {
              // Exact category match
              return t.category_id === searchCategory.id;
            }
          });
        });
      }
      
      if (searchDesc.trim()) {
        const lowerDesc = searchDesc.toLowerCase();
        data = data.filter(t => t.description && t.description.toLowerCase().includes(lowerDesc));
      }
      
      if (searchMinAmt !== '') {
        const min = Number(searchMinAmt);
        data = data.filter(t => t.amount >= min);
      }
      
      if (searchMaxAmt !== '') {
        const max = Number(searchMaxAmt);
        data = data.filter(t => t.amount <= max);
      }
    }

    // 2. Sort
    return [...data].sort((a, b) => {
      let valA, valB;
      
      if (sortConfig.key === 'date') {
        const dayA = ('day' in a) ? a.day : 1;
        const dayB = ('day' in b) ? b.day : 1;
        valA = (a.year * 10000) + (a.month * 100) + (dayA || 0);
        valB = (b.year * 10000) + (b.month * 100) + (dayB || 0);
      } else {
        valA = a.amount;
        valB = b.amount;
      }

      if (valA === valB) return 0;
      const compare = valA > valB ? 1 : -1;
      return sortConfig.direction === 'asc' ? compare : -compare;
    });
  }, [transactions, savings, inputType, selectedAccountId, sortConfig, searchCategories, searchDesc, searchMinAmt, searchMaxAmt]);

  const handleSort = (key: 'date' | 'amount') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ column }: { column: 'date' | 'amount' }) => {
    if (sortConfig.key !== column) return <ArrowUpDown size={14} className="ml-1 text-slate-300" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="ml-1 text-violet-500" />
      : <ArrowDown size={14} className="ml-1 text-violet-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => changeMonth(-1)} className="cursor-pointer">&lt;</Button>
            <span className="text-lg font-semibold">{format(currentDate, 'yyyy-MM')}</span>
            <Button variant="outline" size="sm" onClick={() => changeMonth(1)} className="cursor-pointer">&gt;</Button>
          </div>
        </div>
      </div>

      {/* Account Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {accounts.map(acc => (
          <button
            key={acc.id}
            onClick={() => setSelectedAccountId(acc.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 cursor-pointer ${
              selectedAccountId === acc.id
                ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Wallet size={14} />
            {acc.name}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {/* Creation Form */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
              {inputType !== 'savings' ? (
                <>
                  <DatePicker
                    label="날짜"
                    value={createDate}
                    onChange={e => setCreateDate(e.target.value)}
                  />
                  <CategorySelect
                    label="카테고리"
                    categories={categories}
                    value={newTransaction.category_id || ''}
                    onChange={val => setNewTransaction({...newTransaction, category_id: val})}
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
                  <Button onClick={handleAddTransaction} className="cursor-pointer">
                    <Plus size={16} className="mr-2"/> 추가
                  </Button>
                </>
              ) : (
                <>
                  <DatePicker
                    label="날짜"
                    value={createDate}
                    onChange={e => setCreateDate(e.target.value)}
                  />
                  <Select
                    label="유형"
                    options={[{ label: '적금', value: 'savings_plan' }, { label: '예금/자유저축', value: 'deposit' }]}
                    value={newSaving.type}
                    onChange={e => setNewSaving({...newSaving, type: e.target.value as any})}
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
                  <Button onClick={handleAddSaving} className="cursor-pointer">
                    <Plus size={16} className="mr-2"/> 추가
                  </Button>
                </>
              )}
            </div>

            {/* Detailed Search Toggle Button */}
            {inputType !== 'savings' && (
              <div className="flex justify-end mt-1 mb-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className={`bg-white dark:bg-slate-800 cursor-pointer ${isSearchOpen ? 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-900/20 dark:border-violet-800' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <Search size={14} className="mr-1.5" /> 상세 필터
                </Button>
              </div>
            )}

            {/* Detailed Search Accordion */}
            {inputType !== 'savings' && isSearchOpen && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">상세 검색</h3>
                  <button onClick={() => { setSearchCategories([]); setSearchDesc(''); setSearchMinAmt(''); setSearchMaxAmt(''); }} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer">
                    <X size={12} /> 필터 초기화
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">카테고리</label>
                    <SearchableCategorySelect
                      categories={categories}
                      value={searchCategories}
                      onChange={setSearchCategories}
                      placeholder="분류 검색 (ex. 식비, 카페...)"
                    />
                  </div>
                  <div>
                    <Input 
                      label="내용" 
                      placeholder="검색어 입력..."
                      value={searchDesc}
                      onChange={e => setSearchDesc(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">금액 범위</label>
                    <div className="flex items-center gap-2">
                       <input 
                          type="number"
                          placeholder="0"
                          className="w-full h-[38px] px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 hover:border-violet-400 transition-colors"
                          value={searchMinAmt}
                          onChange={e => setSearchMinAmt(e.target.value ? Number(e.target.value) : '')}
                       />
                       <span className="text-slate-400">~</span>
                       <input 
                          type="number"
                          placeholder="최대"
                          className="w-full h-[38px] px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 hover:border-violet-400 transition-colors"
                          value={searchMaxAmt}
                          onChange={e => setSearchMaxAmt(e.target.value ? Number(e.target.value) : '')}
                       />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* List Table with Inline Editing */}
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 dark:bg-slate-700/50 text-slate-500 font-medium whitespace-nowrap">
                  <tr>
                    {inputType !== 'savings' ? (
                      <>
                        <th 
                          className="px-4 py-3 w-[120px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          onClick={() => handleSort('date')}
                        >
                          <div className="flex items-center">날짜 <SortIcon column="date" /></div>
                        </th>
                        <th className="px-4 py-3">카테고리</th>
                        <th className="px-4 py-3">내용</th>
                        <th 
                          className="px-4 py-3 text-right w-[120px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          onClick={() => handleSort('amount')}
                        >
                           <div className="flex items-center justify-end">금액 <SortIcon column="amount" /></div>
                        </th>
                        <th className="px-4 py-3 w-[80px]"></th>
                      </>
                    ) : (
                      <>
                        <th 
                          className="px-4 py-3 w-[120px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          onClick={() => handleSort('date')}
                        >
                           <div className="flex items-center">날짜 <SortIcon column="date" /></div>
                        </th>
                        <th className="px-4 py-3 w-[120px]">유형</th>
                        <th className="px-4 py-3 w-[150px]">이름</th>
                        <th 
                          className="px-4 py-3 text-right w-[120px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          onClick={() => handleSort('amount')}
                        >
                           <div className="flex items-center justify-end">금액 <SortIcon column="amount" /></div>
                        </th>
                        <th className="px-4 py-3 w-[80px]"></th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {inputType !== 'savings' ? (
                    (processedData as Transaction[]).map((tx) => {
                      const isEditing = editingId === tx.id;
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          {isEditing ? (
                            <>
                              <td className="px-2 py-2">
                                <DatePicker 
                                  value={`${editFormTx.year}-${String(editFormTx.month).padStart(2,'0')}-${String(editFormTx.day).padStart(2,'0')}`}
                                  onChange={e => updateEditDate(e.target.value, true)}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <CategorySelect
                                  categories={categories}
                                  value={editFormTx.category_id!}
                                  onChange={val => setEditFormTx({...editFormTx, category_id: val})}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Input 
                                  value={editFormTx.description || ''}
                                  onChange={e => setEditFormTx({...editFormTx, description: e.target.value})}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Input 
                                  type="number"
                                  value={editFormTx.amount || 0}
                                  onChange={e => setEditFormTx({...editFormTx, amount: Number(e.target.value)})}
                                  className="text-right"
                                />
                              </td>
                              <td className="px-2 py-2 flex items-center justify-end gap-1">
                                <button onClick={saveEditingTx} className="p-1 text-green-600 hover:bg-green-100 rounded">
                                  <Save size={16} />
                                </button>
                                <button onClick={cancelEditing} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                                  <X size={16} />
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3">{tx.month}/{tx.day}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                  {tx.major}{tx.sub ? ` > ${tx.sub}` : ''}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                {tx.linked_transaction_id && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 mr-1.5">🔗 이체</span>
                                )}
                                {tx.description}
                              </td>
                              <td className={`px-4 py-3 text-right font-medium ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {tx.amount.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 flex items-center justify-end gap-2">
                                {tx.description?.startsWith('[자동이체]') ? (
                                  <span className="text-[10px] text-slate-400">원본에서 관리</span>
                                ) : (
                                  <>
                                    <button onClick={() => startEditingTx(tx)} className="text-slate-400 hover:text-blue-500">
                                      <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteTransaction(tx.id)} className="text-slate-400 hover:text-rose-500">
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    (processedData as Saving[]).map((sav) => {
                      const isEditing = editingId === sav.id;
                      return (
                         <tr key={sav.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                           {/* ... (Keep existing saving row helpers) ... */}
                          {isEditing ? (
                            <>
                              <td className="px-2 py-2">
                                <DatePicker 
                                  value={`${editFormSav.year}-${String(editFormSav.month).padStart(2,'0')}-${String(editFormSav.day || 1).padStart(2,'0')}`}
                                  onChange={e => updateEditDate(e.target.value, false)}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Select
                                  options={[{ label: '적금', value: 'savings_plan' }, { label: '예금/자유저축', value: 'deposit' }]}
                                  value={editFormSav.type!}
                                  onChange={e => setEditFormSav({...editFormSav, type: e.target.value as any})}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Input 
                                  value={editFormSav.name || ''}
                                  onChange={e => setEditFormSav({...editFormSav, name: e.target.value})}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Input 
                                  type="number"
                                  value={editFormSav.amount || 0}
                                  onChange={e => setEditFormSav({...editFormSav, amount: Number(e.target.value)})}
                                  className="text-right"
                                />
                              </td>
                              <td className="px-2 py-2 flex items-center justify-end gap-1">
                                <button onClick={saveEditingSav} className="p-1 text-green-600 hover:bg-green-100 rounded">
                                  <Save size={16} />
                                </button>
                                <button onClick={cancelEditing} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                                  <X size={16} />
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3">{sav.day ? `${sav.month}/${sav.day}` : `${sav.month}월`}</td>
                              <td className="px-4 py-3">{sav.type === 'savings_plan' ? '적금' : '예금/자유저축'}</td>
                              <td className="px-4 py-3 font-medium">{sav.name}</td>
                              <td className="px-4 py-3 text-right font-medium text-blue-600">
                                {sav.amount.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 flex items-center justify-end gap-2">
                                <button onClick={() => startEditingSav(sav)} className="text-slate-400 hover:text-blue-500">
                                  <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDeleteSaving(sav.id)} className="text-slate-400 hover:text-rose-500">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                  {((processedData.length === 0)) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
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
