'use client';

import { TrendingUp, TrendingDown, Hash, Star, MousePointerClick, Eye } from 'lucide-react';
import { type InsightsSummary, fmtNum } from './keyword-insights-types-and-helpers';

interface Props {
  summary: InsightsSummary;
}

export function SummaryStatsBar({ summary }: Props) {
  const cards: { label: string; value: string; icon: React.ElementType; color: string; sub?: string }[] = [
    { label: 'Tổng KW', value: String(summary.total), icon: Hash, color: 'text-blue-400' },
    { label: 'Tăng hạng', value: String(summary.improved), icon: TrendingUp, color: 'text-emerald-400', sub: summary.newToTop10 > 0 ? `${summary.newToTop10} vào Top 10` : undefined },
    { label: 'Giảm hạng', value: String(summary.declined), icon: TrendingDown, color: 'text-red-400', sub: summary.exitTop10 > 0 ? `${summary.exitTop10} rời Top 10` : undefined },
    { label: 'Theo dõi', value: `${summary.trackedInTop10}/${summary.trackedTotal}`, icon: Star, color: 'text-amber-400', sub: 'trong Top 10' },
    { label: 'Clicks', value: fmtNum(summary.totalClicks), icon: MousePointerClick, color: 'text-purple-400' },
    { label: 'Impressions', value: fmtNum(summary.totalImpressions), icon: Eye, color: 'text-sky-400' },
  ];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
      {cards.map((c) => (
        <div key={c.label} className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
            <span className="text-[11px] text-[#8888a0]">{c.label}</span>
          </div>
          <p className="text-lg font-bold text-[var(--text-primary)]">{c.value}</p>
          {c.sub && <p className="text-[10px] text-[#8888a0] mt-0.5">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}
