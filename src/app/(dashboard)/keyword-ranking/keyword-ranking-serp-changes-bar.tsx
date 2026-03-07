'use client';

// ---------------------------------------------------------------------------
// SERP Changes — Jumped / Dropped / Unchanged stacked bar + breakdown tables
// Inspired by SE Ranking "Keywords in SERP" section
// ---------------------------------------------------------------------------

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SerpChangesProps {
  jumped: number;
  dropped: number;
  unchanged: number;
  /** Breakdown: count of keywords that jumped INTO each tier */
  jumpedByTier: TierBreakdown;
  /** Breakdown: count of keywords that dropped FROM each tier */
  droppedByTier: TierBreakdown;
  /** Breakdown: count of unchanged keywords in each tier */
  unchangedByTier: TierBreakdown;
}

interface TierBreakdown {
  top5: number;
  top10: number;
  top15: number;
  top30: number;
  beyond30: number;
}

const TIER_LABELS = ['Top 1-5', 'Top 6-10', 'Top 11-15', 'Top 16-30', 'Top 31+'] as const;
const TIER_KEYS: (keyof TierBreakdown)[] = ['top5', 'top10', 'top15', 'top30', 'beyond30'];

export function SerpChangesBar({
  jumped, dropped, unchanged,
  jumpedByTier, droppedByTier, unchangedByTier,
}: SerpChangesProps) {
  const total = jumped + dropped + unchanged;
  if (total === 0) return null;

  const jumpedPct = (jumped / total) * 100;
  const droppedPct = (dropped / total) * 100;

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Biến động từ khóa</h3>
        <span className="text-xs text-[#8888a0]">{total} từ khóa</span>
      </div>

      {/* Stacked bar */}
      <div className="space-y-2">
        <div className="h-4 rounded-full overflow-hidden flex bg-secondary">
          {jumpedPct > 0 && (
            <div className="h-full bg-green-400 transition-all" style={{ width: `${jumpedPct}%` }}
              title={`Tăng: ${jumped}`} />
          )}
          {droppedPct > 0 && (
            <div className="h-full bg-red-400 transition-all" style={{ width: `${droppedPct}%` }}
              title={`Giảm: ${dropped}`} />
          )}
          {/* remaining = unchanged, fills naturally */}
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-400" />
            <span className="text-[#8888a0]">Tăng</span>
            <span className="font-semibold text-green-400">{jumped}</span>
            <span className="text-[#666680]">({jumpedPct.toFixed(0)}%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-400" />
            <span className="text-[#8888a0]">Giảm</span>
            <span className="font-semibold text-red-400">{dropped}</span>
            <span className="text-[#666680]">({droppedPct.toFixed(0)}%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#555570]" />
            <span className="text-[#8888a0]">Giữ nguyên</span>
            <span className="font-semibold text-[#8888a0]">{unchanged}</span>
            <span className="text-[#666680]">({(100 - jumpedPct - droppedPct).toFixed(0)}%)</span>
          </span>
        </div>
      </div>

      {/* 3 breakdown mini-tables */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <BreakdownTable
          title="Tăng" count={jumped} icon={TrendingUp}
          color="text-green-400" bgColor="bg-green-400/10"
          breakdown={jumpedByTier}
        />
        <BreakdownTable
          title="Giảm" count={dropped} icon={TrendingDown}
          color="text-red-400" bgColor="bg-red-400/10"
          breakdown={droppedByTier}
        />
        <BreakdownTable
          title="Giữ nguyên" count={unchanged} icon={Minus}
          color="text-[#8888a0]" bgColor="bg-secondary/50"
          breakdown={unchangedByTier}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini breakdown table per category (Jumped / Dropped / Unchanged)
// ---------------------------------------------------------------------------

function BreakdownTable({
  title, count, icon: Icon, color, bgColor, breakdown,
}: {
  title: string;
  count: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  breakdown: TierBreakdown;
}) {
  return (
    <div className={cn('rounded-lg p-3', bgColor)}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={cn('w-3.5 h-3.5', color)} />
        <span className={cn('text-xs font-semibold', color)}>{title}</span>
        <span className={cn('text-xs font-bold ml-auto', color)}>{count}</span>
      </div>
      <table className="w-full text-[11px]">
        <tbody>
          {TIER_KEYS.map((key, i) => (
            <tr key={key} className="border-b border-border/30 last:border-0">
              <td className="py-1 text-[#8888a0]">{TIER_LABELS[i]}</td>
              <td className="py-1 text-right font-medium text-[var(--text-primary)]">
                {breakdown[key]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
