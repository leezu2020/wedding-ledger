import { Info } from 'lucide-react';

type HelpTooltipProps = {
  content: string;
};

export function HelpTooltip({ content }: HelpTooltipProps) {
  return (
    <div className="group relative flex items-center">
      <Info size={16} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-help transition-colors" />
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-max max-w-[200px] hidden group-hover:block z-50">
        <div className="bg-slate-800 text-white text-xs rounded py-1 px-2 shadow-lg relative">
          {content}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800"></div>
        </div>
      </div>
    </div>
  );
}
