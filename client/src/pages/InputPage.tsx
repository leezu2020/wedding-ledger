import { useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';

export default function InputPage() {
  const { type } = useParams();
  const title = type === 'income' ? '수입 입력' : '지출 입력';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <Card>
        <div className="h-64 flex items-center justify-center text-slate-500">
          {title} 폼이 여기에 표시됩니다.
        </div>
      </Card>
    </div>
  );
}
