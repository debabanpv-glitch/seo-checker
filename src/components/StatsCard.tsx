import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'accent' | 'success' | 'warning' | 'danger';
}

const colorClasses = {
  accent: 'bg-accent/20 text-accent',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  danger: 'bg-danger/20 text-danger',
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'accent',
}: StatsCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#8888a0] text-sm">{title}</p>
          <p className="text-2xl font-bold mt-1 font-mono">{value}</p>
          {subtitle && (
            <p className="text-xs text-[#8888a0] mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-xs mt-2',
                trend.isPositive ? 'text-success' : 'text-danger'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% so với tháng trước
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
