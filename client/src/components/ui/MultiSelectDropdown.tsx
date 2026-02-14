import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Filter } from 'lucide-react';

export interface MultiSelectOption {
  id: number | string;
  label: string;
}

interface MultiSelectDropdownProps {
  label: string;
  options: MultiSelectOption[];
  selectedIds: (number | string)[];
  onChange: (ids: any[]) => void;
  className?: string;
  align?: 'left' | 'right';
  trigger?: React.ReactNode;
}

export function MultiSelectDropdown({
  label,
  options,
  selectedIds,
  onChange,
  className = '',
  align = 'right',
  trigger
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allSelected = options.length > 0 && selectedIds.length === options.length;

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(options.map(o => o.id));
    }
  };

  const toggle = (id: number | string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const buttonLabel = allSelected
    ? `전체 ${label}`
    : selectedIds.length === 0
      ? `${label} 선택`
      : `${selectedIds.length}개 ${label}`;

  return (
    <div className={`relative ${className}`} ref={ref}>
      {trigger ? (
        <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer inline-flex">
          {trigger}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Filter size={14} className="text-slate-500" />
          <span>{buttonLabel}</span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {isOpen && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 w-56 bg-white dark:bg-slate-800 shadow-xl rounded-lg border border-slate-200 dark:border-slate-700 py-1 z-50 max-h-[300px] overflow-y-auto`}>
          {/* Select All */}
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 font-medium border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              allSelected
                ? 'bg-violet-500 border-violet-500 text-white'
                : 'border-slate-300 dark:border-slate-600'
            }`}>
              {allSelected && <Check size={12} />}
            </div>
            전체 {allSelected ? '해제' : '선택'}
          </button>
          
          {/* Individual Options */}
          {options.length > 0 ? (
            options.map(opt => {
              const checked = selectedIds.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggle(opt.id)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    checked
                      ? 'bg-violet-500 border-violet-500 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {checked && <Check size={12} />}
                  </div>
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-4 text-xs text-center text-slate-400">
              옵션이 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}
