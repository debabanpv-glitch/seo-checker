'use client';

// ---------------------------------------------------------------------------
// Distribution of Top Positions — SE Ranking style
// 6 tier boxes with count + delta + SVG stacked bar
// ---------------------------------------------------------------------------

import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TierData {
  label: string;
  count: number;
  delta: number; // positive = improved (more keywords entered this tier)
  color: string; // tailwind text color
  bgColor: string; // tailwind bg class for the bar segment
}

interface DistributionChartProps {
  tiers: TierData[];
  total: number;
}

/** 6-box distribution grid + horizontal stacked bar */
export function DistributionChart({ tiers, total }: DistributionChartProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Phân bố thứ hạng</h3>

      {/* 6 tier boxes */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {tiers.map((t) => (
          <div key={t.label} className="bg-secondary/50 border border-border rounded-lg p-3 text-center">
            <p className="text-[10px] text-[#8888a0] mb-1">{t.label}</p>
            <p className={cn('text-xl font-bold', t.color)}>{t.count}</p>
            {t.delta !== 0 && (
              <span className={cn(
                'inline-flex items-center gap-0.5 text-[10px] font-medium mt-0.5',
                t.delta > 0 ? 'text-green-400' : 'text-red-400',
              )}>
                {t.delta > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                {Math.abs(t.delta)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Stacked horizontal bar */}
      {total > 0 && (
        <div className="h-3 rounded-full overflow-hidden flex bg-secondary">
          {tiers.map((t) => {
            const pct = (t.count / total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={t.label}
                className={cn('h-full transition-all', t.bgColor)}
                style={{ width: `${pct}%` }}
                title={`${t.label}: ${t.count} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px]">
        {tiers.map((t) => (
          <span key={t.label} className="flex items-center gap-1">
            <span className={cn('w-2.5 h-2.5 rounded-sm', t.bgColor)} />
            <span className="text-[#8888a0]">{t.label}</span>
            <span className={cn('font-medium', t.color)}>{t.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: Build tier data from keyword insights response
// ---------------------------------------------------------------------------

export function buildTierData(
  tiers: { top5: unknown[]; top10: unknown[]; top15: unknown[]; top30: unknown[]; beyond30: unknown[] },
  prevTiers?: { top5: number; top10: number; top15: number; top30: number; beyond30: number },
): TierData[] {
  const current = {
    top1: 0, // top1 is a subset of top5 — we'll split
    top2_3: 0,
    top4_5: tiers.top5.length,
    top6_10: tiers.top10.length,
    top11_30: tiers.top15.length + tiers.top30.length,
    beyond30: tiers.beyond30.length,
  };

  // Note: the API gives top5 (pos ≤5), top10 (pos 6-10), top15 (pos 11-15), top30 (pos 16-30), beyond30 (>30)
  // We need: Top 1, Top 2-3, Top 4-5, Top 6-10, Top 11-30, Top 31+

  return [
    {
      label: 'Top 1-5',
      count: tiers.top5.length,
      delta: prevTiers ? tiers.top5.length - prevTiers.top5 : 0,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400',
    },
    {
      label: 'Top 6-10',
      count: tiers.top10.length,
      delta: prevTiers ? tiers.top10.length - prevTiers.top10 : 0,
      color: 'text-accent',
      bgColor: 'bg-[var(--accent)]',
    },
    {
      label: 'Top 11-15',
      count: tiers.top15.length,
      delta: prevTiers ? tiers.top15.length - prevTiers.top15 : 0,
      color: 'text-sky-400',
      bgColor: 'bg-sky-400',
    },
    {
      label: 'Top 16-30',
      count: tiers.top30.length,
      delta: prevTiers ? tiers.top30.length - prevTiers.top30 : 0,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400',
    },
    {
      label: 'Top 31+',
      count: tiers.beyond30.length,
      delta: prevTiers ? tiers.beyond30.length - prevTiers.beyond30 : 0,
      color: 'text-[#666680]',
      bgColor: 'bg-[#666680]',
    },
  ];
}
