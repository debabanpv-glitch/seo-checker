'use client';

import { ArrowUp, ArrowDown, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SortDir } from './gsc-types-and-helpers';

// ---------------------------------------------------------------------------
// KpiCard
// ---------------------------------------------------------------------------

export function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  delta,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  delta?: { pct: number; direction: 'up' | 'down' | 'flat' };
  subtitle?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#8888a0]">{label}</p>
          <div className="flex items-center gap-1.5">
            <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
            {delta && delta.direction !== 'flat' && (
              <span className={cn('flex items-center gap-0.5 text-xs font-medium',
                delta.direction === 'up' ? 'text-green-400' : 'text-red-400'
              )}>
                {delta.direction === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {delta.pct.toFixed(1)}%
              </span>
            )}
            {delta && delta.direction === 'flat' && (
              <span className="flex items-center text-xs text-[#8888a0]"><Minus className="w-3 h-3" /></span>
            )}
          </div>
          {subtitle && <p className="text-[10px] text-[#8888a0] mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DeltaBadge
// ---------------------------------------------------------------------------

export function DeltaBadge({ value, invert = false, suffix = '' }: { value: number; invert?: boolean; suffix?: string }) {
  if (Math.abs(value) < 0.01) return <span className="text-[#8888a0]">—</span>;
  // For position: negative delta = improvement (lower position = better)
  const isGood = invert ? value < 0 : value > 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium',
      isGood ? 'text-green-400' : 'text-red-400'
    )}>
      {isGood ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(value).toFixed(value % 1 === 0 ? 0 : 1)}{suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    winner: { label: 'Tăng', cls: 'bg-green-500/15 text-green-400' },
    loser: { label: 'Giảm', cls: 'bg-red-500/15 text-red-400' },
    new: { label: 'Mới', cls: 'bg-blue-500/15 text-blue-400' },
    stable: { label: 'Ổn định', cls: 'bg-gray-500/15 text-gray-400' },
    opportunity: { label: 'Cơ hội', cls: 'bg-orange-500/15 text-orange-400' },
    at_risk: { label: 'Rủi ro', cls: 'bg-yellow-500/15 text-yellow-400' },
  };
  const c = config[status] ?? config.stable;
  return <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', c.cls)}>{c.label}</span>;
}

// ---------------------------------------------------------------------------
// MiniBar
// ---------------------------------------------------------------------------

export function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SortHeader — sortable table header
// ---------------------------------------------------------------------------

export function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: string;
  currentSort: string;
  currentDir: SortDir;
  onSort: (key: string) => void;
  align?: 'left' | 'right';
}) {
  const isActive = currentSort === sortKey;
  return (
    <th
      className={cn(
        'px-3 py-2 text-xs font-medium cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none',
        isActive ? 'text-[var(--text-primary)]' : 'text-[#8888a0]',
        align === 'right' ? 'text-right' : 'text-left',
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {isActive && (currentDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </span>
    </th>
  );
}
