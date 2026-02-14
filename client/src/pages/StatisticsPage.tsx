import { Card } from '../components/ui/Card';

export default function StatisticsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">통계</h2>
      <Card>
        <div className="h-64 flex items-center justify-center text-slate-500">
          통계 차트가 여기에 표시됩니다.
        </div>
      </Card>
    </div>
  );
}
