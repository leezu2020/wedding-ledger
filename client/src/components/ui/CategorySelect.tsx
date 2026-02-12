import { type SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { type Category } from '../../types';

interface CategorySelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  categories: Category[];
}

export const CategorySelect = forwardRef<HTMLSelectElement, CategorySelectProps>(
  ({ className, label, error, categories, ...props }, ref) => {
    // Group categories by major
    const grouped = categories.reduce<Record<string, Category[]>>((acc, cat) => {
      if (!acc[cat.major]) acc[cat.major] = [];
      acc[cat.major].push(cat);
      return acc;
    }, {});

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white dark:bg-slate-900',
            error && 'border-rose-500 focus:ring-rose-500',
            className
          )}
          {...props}
        >
          <option value="">카테고리 선택</option>
          {Object.entries(grouped).map(([major, cats]) => (
            <optgroup key={major} label={major}>
              {cats
                .filter(c => c.sub)
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.sub}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
      </div>
    );
  }
);

CategorySelect.displayName = 'CategorySelect';
