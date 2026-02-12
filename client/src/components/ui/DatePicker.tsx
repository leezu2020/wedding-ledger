import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface DatePickerProps {
  label?: string;
  error?: string;
  value?: string; // yyyy-MM-dd format
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
}

const datePickerStyles = `
  .date-picker-clean::-webkit-datetime-edit {
    overflow: hidden !important;
  }
  .date-picker-clean::-webkit-datetime-edit-day-of-week-field,
  .date-picker-clean::-webkit-datetime-edit-fields-wrapper > span:last-child {
    display: none !important;
    width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 0 !important;
  }
`;

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, error, value, onChange, min, max, ...props }, ref) => {
    return (
      <div className="w-full">
        <style>{datePickerStyles}</style>
        {label && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type="date"
          lang="en"
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          className={cn(
            'date-picker-clean flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white dark:bg-slate-900',
            error && 'border-rose-500 focus:ring-rose-500',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
