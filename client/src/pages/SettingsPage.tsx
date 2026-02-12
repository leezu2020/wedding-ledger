import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">설정</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/categories">
          <Card className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-lg text-violet-600 dark:text-violet-400">
                <Menu size={24} />
              </div>
              <div>
                <h3 className="font-bold">카테고리 관리</h3>
                <p className="text-sm text-slate-500">수입/지출 카테고리 설정</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
