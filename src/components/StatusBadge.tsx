import { getStatusColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  if (!status) return <span className="text-[#8888a0]">-</span>;

  const colorClass = getStatusColor(status);
  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={cn('status-badge whitespace-nowrap', colorClass, sizeClass)}>
      {status}
    </span>
  );
}
