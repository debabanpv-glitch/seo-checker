'use client';

import { TrendingUp, TrendingDown, Hash, Star, MousePointerClick, Eye, Calendar } from 'lucide-react';
import { type InsightsSummary, type InsightsResponse, fmtNum } from './keyword-insights-types-and-helpers';
import { cn } from '@/lib/utils';

interface Props {
  summary: InsightsSummary;
  meta: InsightsResponse['meta'];
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function SummaryStatsBar({ summary, meta }: Props) {
  const cards: { label: string; value: string; icon: React.ElementType; color: string; sub?: string }[] = [
    { label: 'Tổng KW', value: String(summary.total), icon: Hash, color: 'text-blue-400' },
    { label: 'Tăng hạng', value: String(summary.improved), icon: TrendingUp, color: 'text-emerald-400', sub: summary.newToTop10 > 0 ? `${summary.newToTop10} vào Top 10` : undefined },
    { label: 'Giảm hạng', value: String(summary.declined), icon: TrendingDown, color: 'text-red-400', sub: summary.exitTop10 > 0 ? `${summary.exitTop10} rời Top 10` : undefined },
    { label: 'Theo dõi', value: `${summary.trackedInTop10}/${summary.trackedTotal}`, icon: Star, color: 'text-amber-400', sub: 'trong Top 10' },
    { label: 'Clicks', value: fmtNum(summary.totalClicks), icon: MousePointerClick, color: 'text-purple-400' },
    { label: 'Impressions', value: fmtNum(summary.totalImpressions), icon: Eye, color: 'text-sky-400' },
  ];

  return (
    <div className="space-y-2">
      {/* Date comparison banner */}
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-card border border-border rounded-lg text-xs">
        <Calendar className="w-3.5 h-3.5 text-[#8888a0]" />
        <span className="text-[#8888a0]">
          Đợt mới nhất: <b className="text-[var(--text-primary)]">{fmtDate(meta.latestDate)}</b>
        </span>
        {meta.previousDate && (
          <>
            <span className="text-[#555570]">vs</span>
            <span className="text-[#8888a0]">
              Đợt trước: <b className="text-[var(--text-primary)]">{fmtDate(meta.previousDate)}</b>
            </span>
          </>
        )}
        <span className="text-[#555570]">·</span>
        <span className="text-[#8888a0]">{meta.checkDates.length} lần check</span>

        {/* Quick comparison */}
        {meta.previousDate && (
          <>
            <span className="text-[#555570]">·</span>
            {summary.improved > 0 && (
              <span className={cn('flex items-center gap-0.5', 'text-emerald-400')}>
                <TrendingUp className="w-3 h-3" /> {summary.improved} tăng
              </span>
            )}
            {summary.declined > 0 && (
              <span className={cn('flex items-center gap-0.5', 'text-red-400')}>
                <TrendingDown className="w-3 h-3" /> {summary.declined} giảm
              </span>
            )}
            {summary.stable > 0 && (
              <span className="text-[#8888a0]">{summary.stable} giữ nguyên</span>
            )}
          </>
        )}
      </div>

      {/* Stat cards */}
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
    </div>
  );
}
