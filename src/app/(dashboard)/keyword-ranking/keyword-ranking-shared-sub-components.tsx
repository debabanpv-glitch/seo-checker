'use client';

// ---------------------------------------------------------------------------
// Keyword Ranking — Shared Sub-Components (ScoreCard, ChangeIndicator, TrafficCard)
// ---------------------------------------------------------------------------

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// ScoreCard — summary metric card with optional progress bar
// ---------------------------------------------------------------------------
export function ScoreCard({ label, value, total, color, bgColor, icon }: {
  label: string; value: number; total?: number; color: string; bgColor?: string; icon?: React.ReactNode;
}) {
  const pct = total && total > 0 ? Math.round((value / total) * 100) : null;
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#8888a0] text-xs">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn('text-2xl font-bold font-mono', color)}>{value}</span>
        {pct !== null && <span className="text-xs text-[#8888a0]">({pct}%)</span>}
      </div>
      {total && bgColor && (
        <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', bgColor)} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChangeIndicator — arrow + delta value for position change
// ---------------------------------------------------------------------------
export function ChangeIndicator({ change }: { change: number | null }) {
  if (change === null) return <Minus className="w-3.5 h-3.5 text-[#666680] mx-auto" />;
  if (change === 0) return <span className="text-xs text-[#666680] font-mono">0</span>;

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-mono font-medium',
      change > 0 ? 'text-emerald-400' : 'text-red-400'
    )}>
      {change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(change)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// TrafficCard — GSC metric card with delta comparison
// ---------------------------------------------------------------------------
export function TrafficCard({
  label, value, delta, positiveIsGood, deltaLabel = '', icon, color, borderColor, bgColor,
}: {
  label: string;
  value: string;
  delta: number | null;
  positiveIsGood: boolean;
  deltaLabel?: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgColor: string;
}) {
  const isImproved = delta !== null ? (positiveIsGood ? delta > 0 : delta < 0) : null;
  const isWorse = delta !== null ? (positiveIsGood ? delta < 0 : delta > 0) : null;

  return (
    <div className={cn('border rounded-xl p-4 space-y-1', bgColor, borderColor)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#8888a0]">{label}</span>
        <span className={cn('opacity-60', color)}>{icon}</span>
      </div>
      <div className={cn('text-2xl font-bold font-mono', color)}>{value}</div>
      {delta !== null && delta !== 0 && (
        <div className={cn(
          'flex items-center gap-0.5 text-[11px] font-mono',
          isImproved ? 'text-emerald-400' : isWorse ? 'text-red-400' : 'text-[#666680]'
        )}>
          {isImproved ? <ArrowUp className="w-3 h-3" /> : isWorse ? <ArrowDown className="w-3 h-3" /> : null}
          {delta > 0 ? '+' : ''}{delta}{deltaLabel}
          <span className="text-[#666680] ml-1">vs ky truoc</span>
        </div>
      )}
      {(delta === null || delta === 0) && (
        <div className="text-[11px] text-[#555570]">{delta === 0 ? 'Khong doi' : 'Chua co ky truoc'}</div>
      )}
    </div>
  );
}
