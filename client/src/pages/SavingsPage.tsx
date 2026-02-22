import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { savingsProductsApi } from '../api';
import { type SavingsProduct } from '../types';

export default function SavingsPage() {
  const [products, setProducts] = useState<SavingsProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New product state
  const [newProduct, setNewProduct] = useState<Partial<SavingsProduct>>({
    type: 'savings_plan',
    bank: '',
    start_date: new Date().toISOString().split('T')[0],
    interest_rate: 0,
    interest_type: 'simple',
    term_months: 12,
    amount: 0,
    tax_type: '일반과세',
    initial_paid: 0,
  });

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<SavingsProduct>>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const data = await savingsProductsApi.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch savings products', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newProduct.bank || !newProduct.start_date || !newProduct.interest_rate || !newProduct.term_months || !newProduct.amount) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    try {
      await savingsProductsApi.create(newProduct as Omit<SavingsProduct, "id" | "principal" | "interest" | "tax" | "totalAmount" | "paidCount" | "paidTotal" | "paidStatus" | "maturity_date">);
      await fetchProducts();
      setNewProduct({
        type: 'savings_plan',
        bank: '',
        start_date: new Date().toISOString().split('T')[0],
        interest_rate: 0,
        interest_type: 'simple',
        term_months: 12,
        amount: 0,
        tax_type: '일반과세',
        pay_day: undefined,
        memo: '',
        initial_paid: 0,
      });
    } catch (error) {
      console.error('Failed to create savings product', error);
    }
  };

  const startEditing = (p: SavingsProduct) => {
    setEditingId(p.id);
    setEditForm({ ...p });
  };

  const saveEditing = async () => {
    if (!editingId) return;
    try {
      await savingsProductsApi.update(editingId, editForm);
      setEditingId(null);
      await fetchProducts();
    } catch (error) {
      console.error('Failed to update savings product', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까? 관련 데이터는 유지되지만 상품 정보는 영구 삭제됩니다.')) return;
    try {
      await savingsProductsApi.delete(id);
      await fetchProducts();
    } catch (error) {
      console.error('Failed to delete savings product', error);
    }
  };

  // Summary Calculations
  const summary = products.reduce((acc, p) => {
    acc.totalPaid += p.paidTotal;
    acc.totalPrincipal += p.principal;
    acc.totalInterest += p.interest;
    acc.totalReceipt += p.totalAmount;
    return acc;
  }, { totalPaid: 0, totalPrincipal: 0, totalInterest: 0, totalReceipt: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">저축/적금 현황</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
      ) : (
        <>
          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none p-4">
              <p className="text-blue-100 text-sm font-medium mb-1">총 납입/예치금</p>
              <h3 className="text-2xl font-bold">₩{summary.totalPaid.toLocaleString()}</h3>
            </Card>
            <Card className="bg-white dark:bg-slate-800 p-4">
              <p className="text-slate-500 text-sm font-medium mb-1">총 원금목표</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">₩{summary.totalPrincipal.toLocaleString()}</h3>
            </Card>
            <Card className="bg-white dark:bg-slate-800 p-4">
              <p className="text-slate-500 text-sm font-medium mb-1">예상 누적이자</p>
              <h3 className="text-2xl font-bold text-emerald-600">₩{summary.totalInterest.toLocaleString()}</h3>
            </Card>
            <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-none p-4">
              <p className="text-violet-100 text-sm font-medium mb-1">예상 수령총액</p>
              <h3 className="text-2xl font-bold">₩{summary.totalReceipt.toLocaleString()}</h3>
            </Card>
          </div>

          {/* Individual Product Status */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">상품별 납입 진행률</h3>
            <div className="space-y-4">
              {products.map(p => {
                const progress = Math.min(100, p.progressPercent);
                
                return (
                  <div key={p.id} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-700 dark:text-slate-200">{p.bank}({p.type === 'savings_plan' ? '적금' : '예금'})</span>
                        {p.name && <span className="text-sm text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">{p.name}</span>}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {p.type === 'savings_plan' 
                          ? `납입 ${p.paidTotal.toLocaleString()}원 / 원금목표 ${p.principal.toLocaleString()}원 (${p.paidStatus})`
                          : `경과 ${p.paidStatus} — 예치금 ${p.amount.toLocaleString()}원`}
                      </div>
                    </div>
                    <div className="w-full md:w-1/3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">진행률</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
              {products.length === 0 && (
                <div className="text-center text-slate-500 py-4">등록된 상품이 없습니다. 하단에서 새 상품을 추가해보세요.</div>
              )}
            </div>
          </Card>

          {/* Spreadsheet Table */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-100 dark:bg-slate-700/50 text-slate-600 font-medium border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-3">구분</th>
                    <th className="px-3 py-3">은행</th>
                    <th className="px-3 py-3 w-16 text-center">납입일</th>
                    <th className="px-3 py-3">시작일</th>
                    <th className="px-3 py-3 text-right">이율</th>
                    <th className="px-3 py-3">방식</th>
                    <th className="px-3 py-3 text-center">기간</th>
                    <th className="px-3 py-3 text-right">월금액/예치금</th>
                    <th className="px-3 py-3">과세</th>
                    <th className="px-3 py-3 text-slate-500">만기일</th>
                    <th className="px-3 py-3 text-right bg-blue-50/50 dark:bg-blue-900/10">원금</th>
                    <th className="px-3 py-3 text-right bg-emerald-50/50 dark:bg-emerald-900/10">이자</th>
                    <th className="px-3 py-3 text-right text-rose-500/80 bg-rose-50/50 dark:bg-rose-900/10">세금</th>
                    <th className="px-3 py-3 text-right font-bold bg-violet-50/50 dark:bg-violet-900/10">수령총액</th>
                    <th className="px-3 py-3 text-center">납입현황</th>
                    <th className="px-3 py-3">비고</th>
                    <th className="px-3 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {/* Existing Products */}
                  {products.map(p => {
                    const isEditing = editingId === p.id;
                    const isMatured = new Date(p.maturity_date) <= new Date();
                    
                    if (isEditing) {
                      return (
                        <tr key={p.id} className="bg-blue-50 dark:bg-blue-900/20">
                          <td className="px-2 py-2">
                            <Select 
                              className="min-w-[90px] h-8 text-sm"
                              options={[{ label: '적금', value: 'savings_plan' }, { label: '예금', value: 'deposit' }]}
                              value={editForm.type}
                              onChange={e => setEditForm({...editForm, type: e.target.value as any})}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input className="w-24 h-8 text-sm" value={editForm.bank || ''} onChange={e => setEditForm({...editForm, bank: e.target.value})} />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" className="w-16 h-8 text-sm" value={editForm.pay_day || ''} onChange={e => setEditForm({...editForm, pay_day: Number(e.target.value)})} />
                          </td>
                          <td className="px-2 py-2">
                            <DatePicker className="w-32 h-8 text-sm" value={editForm.start_date || ''} onChange={e => setEditForm({...editForm, start_date: e.target.value})} />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" step="0.1" className="w-20 h-8 text-sm text-right" value={editForm.interest_rate || ''} onChange={e => setEditForm({...editForm, interest_rate: Number(e.target.value)})} />
                          </td>
                          <td className="px-2 py-2">
                            <Select 
                              className="min-w-[90px] h-8 text-sm"
                              options={[{ label: '단리', value: 'simple' }, { label: '복리', value: 'compound' }]}
                              value={editForm.interest_type}
                              onChange={e => setEditForm({...editForm, interest_type: e.target.value as any})}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" className="w-16 h-8 text-sm text-center" value={editForm.term_months || ''} onChange={e => setEditForm({...editForm, term_months: Number(e.target.value)})} />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" className="w-28 h-8 text-sm text-right" value={editForm.amount || ''} onChange={e => setEditForm({...editForm, amount: Number(e.target.value)})} />
                          </td>
                          <td className="px-2 py-2">
                            <Select 
                              className="min-w-[100px] h-8 text-sm"
                              options={[{ label: '일반과세', value: '일반과세' }, { label: '비과세', value: '비과세' }, { label: '세금우대', value: '세금우대' }]}
                              value={editForm.tax_type}
                              onChange={e => setEditForm({...editForm, tax_type: e.target.value as any})}
                            />
                          </td>
                          <td className="px-3 py-3 text-slate-400" colSpan={editForm.type === 'savings_plan' ? 4 : 6}>저장 후 자동 계산됨</td>
                          {editForm.type === 'savings_plan' && (
                            <td className="px-2 py-2" colSpan={2}>
                              <div className="text-[10px] text-slate-400 mb-0.5">기존납입금</div>
                              <Input type="number" step="10000" className="w-28 h-8 text-sm text-right" placeholder="0" value={editForm.initial_paid || ''} onChange={e => setEditForm({...editForm, initial_paid: Number(e.target.value)})} />
                            </td>
                          )}
                          <td className="px-2 py-2 flex items-center justify-end gap-1">
                            <button onClick={saveEditing} className="p-1.5 text-green-600 hover:bg-green-100 rounded">
                              <Save size={14} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded">
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isMatured ? 'bg-slate-50 dark:bg-slate-800 text-slate-500' : ''}`}>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${p.type === 'savings_plan' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                            {p.type === 'savings_plan' ? '적금' : '예금'}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-200">{p.bank}</td>
                        <td className="px-3 py-3 text-center">{p.pay_day || '-'}</td>
                        <td className="px-3 py-3">{p.start_date.substring(5).replace('-','/')}</td> {/* MM/DD format */}
                        <td className="px-3 py-3 text-right">{p.interest_rate}%</td>
                        <td className="px-3 py-3 text-xs text-slate-500">{p.interest_type === 'simple' ? '단리' : '복리'}</td>
                        <td className="px-3 py-3 text-center">{p.term_months}개월</td>
                        <td className="px-3 py-3 text-right font-medium">{p.amount.toLocaleString()}</td>
                        <td className="px-3 py-3 text-xs">{p.tax_type}</td>
                        <td className="px-3 py-3 text-slate-500">{p.maturity_date}</td>
                        <td className="px-3 py-3 text-right font-medium bg-blue-50/20 dark:bg-blue-900/5">{p.principal.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-emerald-600 bg-emerald-50/20 dark:bg-emerald-900/5">+{p.interest.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-rose-500/80 bg-rose-50/20 dark:bg-rose-900/5">-{p.tax.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-bold text-violet-600 dark:text-violet-400 bg-violet-50/20 dark:bg-violet-900/5">{p.totalAmount.toLocaleString()}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs ${p.paidTotal >= p.principal ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                            {p.paidStatus}
                          </span>
                        </td>
                        <td className="px-3 py-3 max-w-[100px] truncate text-slate-500" title={p.memo || ''}>{p.memo || ''}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100">
                            <button onClick={() => startEditing(p)} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 size={14}/></button>
                            <button onClick={() => handleDelete(p.id)} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Add New Row Inline */}
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    <td className="px-2 py-3 border-t border-slate-200 dark:border-slate-700">
                      <Select 
                        className="min-w-[90px] h-8 text-sm"
                        options={[{ label: '적금', value: 'savings_plan' }, { label: '예금', value: 'deposit' }]}
                        value={newProduct.type}
                        onChange={e => setNewProduct({...newProduct, type: e.target.value as any})}
                      />
                    </td>
                    <td className="px-2 py-3 border-t border-slate-200 dark:border-slate-700">
                      <Input placeholder="은행명" className="w-24 h-8 text-sm" value={newProduct.bank || ''} onChange={e => setNewProduct({...newProduct, bank: e.target.value})} />
                    </td>
                    <td className="px-2 py-3 border-t border-slate-200 dark:border-slate-700">
                      <Input placeholder="일" type="number" className="w-16 h-8 text-sm text-center" value={newProduct.pay_day || ''} onChange={e => setNewProduct({...newProduct, pay_day: Number(e.target.value)})} />
                    </td>
                    <td className="px-2 py-3 border-t border-slate-200 dark:border-slate-700">
                      <DatePicker className="w-32 h-8 text-sm" value={newProduct.start_date || ''} onChange={e => setNewProduct({...newProduct, start_date: e.target.value})} />
                    </td>
                    <td className="px-2 py-3 border-t border-slate-200 dark:border-slate-700">
                      <Input placeholder="이율" type="number" step="0.1" className="w-20 h-8 text-sm text-right" value={newProduct.interest_rate || ''} onChange={e => setNewProduct({...newProduct, interest_rate: Number(e.target.value)})} />
                    </td>
                    <td className="px-2 py-3 border-t border-slate-200 dark:border-slate-700">
                      <Select 
                        className="min-w-[90px] h-8 text-sm"
                        options={[{ label: '단리', value: 'simple' }, { label: '복리', value: 'compound' }]}
                        value={newProduct.interest_type}
                        onChange={e => setNewProduct({...newProduct, interest_type: e.target.value as any})}
                      />
                    </td>
                    <td className="px-2 py-3 border-t border-slate-200 dark:border-slate-700">
                      <Input placeholder="개월" type="number" className="w-16 h-8 text-sm text-center" value={newProduct.term_months || ''} onChange={e => setNewProduct({...newProduct, term_months: Number(e.target.value)})} />
                    </td>
                    <td className="px-2 py-3 border-t border-slate-200 dark:border-slate-700">
                      <Input placeholder="금액" type="number" step="10000" className="w-28 h-8 text-sm text-right" value={newProduct.amount || ''} onChange={e => setNewProduct({...newProduct, amount: Number(e.target.value)})} />
                    </td>
                    <td className="px-2 py-3 border-t border-slate-200 dark:border-slate-700">
                      <Select 
                        className="min-w-[100px] h-8 text-sm"
                        options={[{ label: '일반과세', value: '일반과세' }, { label: '비과세', value: '비과세' }, { label: '세금우대', value: '세금우대' }]}
                        value={newProduct.tax_type}
                        onChange={e => setNewProduct({...newProduct, tax_type: e.target.value as any})}
                      />
                    </td>
                    <td colSpan={newProduct.type === 'savings_plan' ? 4 : 6} className="px-3 py-3 border-t border-slate-200 dark:border-slate-700">
                      <Input placeholder="비고를 입력하세요" className="w-full max-w-[200px] h-8 text-sm" value={newProduct.memo || ''} onChange={e => setNewProduct({...newProduct, memo: e.target.value})} />
                    </td>
                    {newProduct.type === 'savings_plan' && (
                      <td colSpan={2} className="px-2 py-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] text-slate-400 mb-0.5">기존납입금</div>
                        <Input type="number" step="10000" className="w-28 h-8 text-sm text-right" placeholder="0" value={newProduct.initial_paid || ''} onChange={e => setNewProduct({...newProduct, initial_paid: Number(e.target.value)})} />
                      </td>
                    )}
                    <td className="px-2 py-3 border-t border-slate-200 dark:border-slate-700 text-right">
                      <Button size="sm" onClick={handleCreate} className="h-8 shadow-sm">
                        <Plus size={14} className="mr-1" /> 추가
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
