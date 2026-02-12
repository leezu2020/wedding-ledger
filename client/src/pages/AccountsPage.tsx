import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { accountsApi } from '../api';
import { type Account } from '../types';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    initial_balance: 0
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const data = await accountsApi.getAll();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch accounts', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      if (editingAccount) {
        await accountsApi.update(editingAccount.id, formData);
      } else {
        await accountsApi.create(formData);
      }
      setIsModalOpen(false);
      setEditingAccount(null);
      setFormData({ name: '', description: '', initial_balance: 0 });
      fetchAccounts();
    } catch (error) {
      console.error('Failed to save account', error);
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({ 
      name: account.name, 
      description: account.description || '', 
      initial_balance: account.initial_balance || 0 
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 계좌를 삭제하시겠습니까? 연동된 모든 거래 내역도 함께 삭제됩니다.')) return;
    try {
      await accountsApi.delete(id);
      fetchAccounts();
    } catch (error) {
      console.error('Failed to delete account', error);
      alert('계좌 삭제에 실패했습니다.');
    }
  };

  const openModal = () => {
    setEditingAccount(null);
    setFormData({ name: '', description: '', initial_balance: 0 });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">계좌 자산 관리</h2>
        <Button onClick={openModal}>
          <Plus size={16} className="mr-2" /> 계좌 추가
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <Card key={account.id} className="relative group hover:shadow-xl transition-shadow">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(account)}
                  className="p-1 text-slate-400 hover:text-violet-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Pencil size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(account.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <h3 className="text-xl font-semibold mb-2">{account.name}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {account.description || '설명 없음'}
              </p>
              <p className="mt-2 text-sm font-medium">
                초기 잔액: ₩ {(account.initial_balance || 0).toLocaleString()}
              </p>
            </Card>
          ))}
          
          {accounts.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
              <p>등록된 계좌가 없습니다. 첫 계좌를 등록해보세요!</p>
              <Button variant="outline" className="mt-4" onClick={openModal}>
                계좌 생성
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">
                {editingAccount ? '계좌 수정' : '새 계좌 등록'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="계좌명"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: KB국민은행"
                required
                autoFocus
              />
              <Input
                label="설명"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="간단한 설명 (선택)"
              />
              <Input
                type="number"
                label="초기 잔액"
                value={formData.initial_balance}
                onChange={e => setFormData({ ...formData, initial_balance: Number(e.target.value) })}
                placeholder="0"
              />
              
              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                  취소
                </Button>
                <Button type="submit">
                  {editingAccount ? '수정' : '등록'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
