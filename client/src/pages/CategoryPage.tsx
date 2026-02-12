import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Edit2, X, Check, Save } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { categoriesApi } from '../api';
import { type Category } from '../types';

export default function CategoryPage() {
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    fetchCategories();
  }, [activeTab]);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const data = await categoriesApi.getAll(activeTab);
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [newMajor, setNewMajor] = useState('');
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const [newSub, setNewSub] = useState('');

  // Editing States
  const [editingMajor, setEditingMajor] = useState<string | null>(null);
  const [editMajorName, setEditMajorName] = useState('');

  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [editSubName, setEditSubName] = useState('');

  const uniqueMajors = Array.from(new Set(categories.map(c => c.major)));
  
  const getSubs = (major: string) => {
    return categories.filter(c => c.major === major && c.sub);
  };

  const handleAddMajor = async () => {
    if (!newMajor.trim()) return;
    try {
      await categoriesApi.create({ type: activeTab, major: newMajor.trim(), sub: null });
      setNewMajor('');
      fetchCategories();
    } catch (error) {
       console.error(error);
    }
  };

  const handleAddSub = async (major: string) => {
    if (!newSub.trim()) return;
    try {
      await categoriesApi.create({ type: activeTab, major, sub: newSub.trim() });
      setNewSub('');
      setAddingSubTo(null);
      fetchCategories();
    } catch (error) {
       console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
     if (!confirm('정말 삭제하시겠습니까?')) return;
     try {
       await categoriesApi.delete(id);
       fetchCategories();
     } catch (error) { console.error(error); }
  };
  
  const handleDeleteMajor = async (major: string) => {
    if(!confirm(`대분류 "${major}" 및 하위 소분류를 모두 삭제하시겠습니까?`)) return;
    const toDelete = categories.filter(c => c.major === major);
    await Promise.all(toDelete.map(c => categoriesApi.delete(c.id)));
    fetchCategories();
  };

  // Major Edit Handlers
  const startEditMajor = (major: string) => {
    setEditingMajor(major);
    setEditMajorName(major);
  };

  const cancelEditMajor = () => {
    setEditingMajor(null);
    setEditMajorName('');
  };

  const saveEditMajor = async () => {
    if (!editingMajor || !editMajorName.trim()) return;
    try {
      await categoriesApi.updateMajor({ 
        type: activeTab, 
        oldMajor: editingMajor, 
        newMajor: editMajorName.trim() 
      });
      setEditingMajor(null);
      fetchCategories();
    } catch (error) {
      console.error(error);
      alert('대분류 수정에 실패했습니다.');
    }
  };

  // Sub Edit Handlers
  const startEditSub = (cat: Category) => {
    setEditingSubId(cat.id);
    setEditSubName(cat.sub || '');
  };

  const cancelEditSub = () => {
    setEditingSubId(null);
    setEditSubName('');
  };

  const saveEditSub = async () => {
    if (!editingSubId || !editSubName.trim()) return;
    try {
      await categoriesApi.update(editingSubId, { sub: editSubName.trim() });
      setEditingSubId(null);
      fetchCategories();
    } catch (error) {
      console.error(error);
      alert('소분류 수정에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">카테고리 관리</h2>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('income')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'income' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            수입
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'expense' ? 'bg-rose-100 text-rose-800' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            지출
          </button>
        </div>
      </div>

      {isLoading && <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}
      
      {!isLoading && (
        <>
      {/* Add New Major */}
      <Card className="p-4 flex gap-4 items-center">
        <Input 
          placeholder="새 대분류명" 
          value={newMajor} 
          onChange={e => setNewMajor(e.target.value)}
        />
        <Button onClick={handleAddMajor} disabled={!newMajor}>
          <Plus size={16} className="mr-2" /> 대분류 추가
        </Button>
      </Card>

      <div className="space-y-4">
        {uniqueMajors.map((major) => (
          <Card key={major} className="p-0 overflow-hidden border border-slate-200 dark:border-slate-700">
            {/* Major Header */}
            <div className="bg-slate-100 dark:bg-slate-800 p-4 flex justify-between items-center min-h-[64px]">
              {editingMajor === major ? (
                <div className="flex-1 flex gap-2 items-center">
                  <Input 
                    value={editMajorName} 
                    onChange={e => setEditMajorName(e.target.value)} 
                    className="max-w-[200px]"
                  />
                  <div className="flex gap-1">
                    <button onClick={saveEditMajor} className="p-1 text-green-600 hover:bg-green-100 rounded">
                      <Save size={18} />
                    </button>
                    <button onClick={cancelEditMajor} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 items-center group">
                  <h3 className="font-bold text-lg">{major}</h3>
                  <button 
                    onClick={() => startEditMajor(major)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-500 transition-opacity"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
              
              <div className="flex gap-2">
                 <button 
                  onClick={() => setAddingSubTo(addingSubTo === major ? null : major)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
                  title="소분류 추가"
                 >
                   <Plus size={18} />
                 </button>
                 <button 
                  onClick={() => handleDeleteMajor(major)}
                  className="p-1 hover:bg-rose-100 hover:text-rose-600 rounded text-slate-500"
                 >
                   <Trash2 size={18} />
                 </button>
              </div>
            </div>
            
            {/* Sub List */}
            <div className="p-4 space-y-2">
               {addingSubTo === major && (
                 <div className="flex gap-2 mb-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                   <Input 
                     placeholder="새 소분류명" 
                     value={newSub} 
                     onChange={e => setNewSub(e.target.value)} 
                     className="h-8 text-sm"
                   />
                   <Button size="sm" onClick={() => handleAddSub(major)}>추가</Button>
                 </div>
               )}
               
               {getSubs(major).map((cat) => (
                 <div key={cat.id} className="ml-4 border-l-2 border-slate-200 dark:border-slate-700 pl-4 py-2 flex justify-between items-center group">
                   {editingSubId === cat.id ? (
                      <div className="flex-1 flex gap-2 items-center">
                        <Input 
                          value={editSubName} 
                          onChange={e => setEditSubName(e.target.value)} 
                          className="max-w-[200px] h-8 text-sm"
                        />
                        <div className="flex gap-1">
                          <button onClick={saveEditSub} className="p-1 text-green-600 hover:bg-green-100 rounded">
                            <Save size={16} />
                          </button>
                          <button onClick={cancelEditSub} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                   ) : (
                     <>
                      <div className="flex gap-2 items-center">
                        <span className="font-medium">{cat.sub}</span>
                        <button 
                          onClick={() => startEditSub(cat)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-500 transition-opacity"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                      <button 
                        onClick={() => handleDelete(cat.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                     </>
                   )}
                 </div>
               ))}
               {getSubs(major).length === 0 && (
                 <p className="text-sm text-slate-400 italic ml-4">소분류 없음</p>
               )}
            </div>
          </Card>
        ))}
        {uniqueMajors.length === 0 && (
            <p className="text-center text-slate-500 py-8">카테고리가 없습니다.</p>
        )}
      </div>
      </>
      )}
    </div>
  );
}
