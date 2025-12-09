import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'accent' | 'success' | 'warning' | 'danger';
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const colorClasses = {
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

export default function ProgressBar({
  value,
  max,
  showLabel = true,
  size = 'md',
  color,
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  // Determine color based on percentage if not provided
  const barColor = color || (
    percentage >= 100 ? 'success' :
    percentage >= 70 ? 'accent' :
    percentage >= 40 ? 'warning' : 'danger'
  );

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-[#8888a0]">{value}/{max}</span>
          <span className="font-mono text-[var(--text-primary)]">{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-border rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('progress-bar rounded-full', sizeClasses[size], colorClasses[barColor])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
