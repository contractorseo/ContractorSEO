import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Button } from './Button';

interface UpgradePromptProps {
  message: string;
}

export function UpgradePrompt({ message }: UpgradePromptProps) {
  return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
        <Zap size={16} className="text-amber-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900">{message}</p>
      </div>
      <Link to="/dashboard/settings">
        <Button size="sm">Upgrade</Button>
      </Link>
    </div>
  );
}
