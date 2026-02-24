import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { type Category } from '../../types';
import { ChevronDown, Search } from 'lucide-react';

interface CategorySelectProps {
  label?: string;
  error?: string;
  categories: Category[];
  value: number | '';
  onChange: (categoryId: number) => void;
  className?: string;
}

export function CategorySelect({ label, error, categories, value, onChange, className }: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCategory = categories.find(c => c.id === value);
  const displayValue = selectedCategory ? `${selectedCategory.major} > ${selectedCategory.sub}` : '';

  const filteredCategories = categories.filter(c => {
    if (!c.sub) return false;
    const term = searchTerm.toLowerCase();
    return c.major.toLowerCase().includes(term) || c.sub.toLowerCase().includes(term);
  });

  const grouped = filteredCategories.reduce<Record<string, Category[]>>((acc, cat) => {
    if (!acc[cat.major]) acc[cat.major] = [];
    acc[cat.major].push(cat);
    return acc;
  }, {});

  return (
    <div className={cn("w-full relative", className)} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}
      <div 
        className={cn(
          'flex items-center justify-between h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm cursor-pointer dark:text-white dark:bg-slate-900',
          error && 'border-rose-500',
          isOpen && 'ring-2 ring-violet-500 border-violet-500',
          !displayValue && 'text-slate-500'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {displayValue || '카테고리 선택'}
        </span>
        <ChevronDown size={16} className="text-slate-400 shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 flex flex-col overflow-hidden">
          <div className="bg-white dark:bg-slate-800 p-2 border-b border-slate-100 dark:border-slate-700 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-1.5 text-sm border-none bg-slate-100 dark:bg-slate-900 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 dark:text-white"
                placeholder="검색..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          
          <div className="py-1 overflow-y-auto relative flex-1">
            {Object.keys(grouped).length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-500 text-center">검색 결과가 없습니다</div>
            ) : (
              Object.entries(grouped).map(([major, cats]) => (
                <div key={major}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                    {major}
                  </div>
                  {cats.map(c => (
                    <div
                      key={c.id}
                      className={cn(
                        "px-4 py-2 text-sm cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/30 flex items-center justify-between",
                        value === c.id ? "text-violet-600 dark:text-violet-400 font-medium bg-violet-50/50 dark:bg-violet-900/20" : "text-slate-700 dark:text-slate-300"
                      )}
                      onClick={() => {
                        onChange(c.id);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      {c.sub}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
}
