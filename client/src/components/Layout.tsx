import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Wallet, 
  PiggyBank, 
  TrendingUp, 
  Menu, 
  X,
  CreditCard
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: '대시보드', href: '/', icon: LayoutDashboard },
    { label: '월별 가계부', href: '/sheet', icon: CalendarDays },
    { label: '수입 입력', href: '/input/income', icon: CreditCard },
    { label: '지출 입력', href: '/input/expense', icon: CreditCard },
    { label: '저축/적금', href: '/input/savings', icon: PiggyBank },
    { label: '통계', href: '/statistics', icon: TrendingUp },
    { label: '예산 관리', href: '/budgets', icon: Wallet },
    { label: '주식/투자', href: '/stocks', icon: TrendingUp },
    { label: '자산(계좌)', href: '/accounts', icon: CreditCard },
    { label: '설정', href: '/settings', icon: Menu },
  ];

  const closeSidebar = () => setIsSidebarOpen(false);

  // Helper to check active state (including sub-routes if needed)
  const isLinkActive = (href: string) => {
    if (href === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex text-slate-900 dark:text-slate-100">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out lg:transform-none flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <Link to="/" onClick={closeSidebar}>
            <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent cursor-pointer">
              Wedding Ledger
            </h1>
          </Link>
          <button 
            className="lg:hidden p-2 -mr-2 text-slate-500"
            onClick={closeSidebar}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isLinkActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto h-screen flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden h-16 flex items-center px-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={20} />
          </Button>
          <Link to="/" className="ml-4">
             <span className="font-semibold text-lg">
               {navItems.find(i => isLinkActive(i.href))?.label || 'Wedding Ledger'}
             </span>
          </Link>
        </div>

        <div className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
