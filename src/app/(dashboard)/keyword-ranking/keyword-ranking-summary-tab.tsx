'use client';

// ---------------------------------------------------------------------------
// Rankings Summary Tab — SE Ranking style overview
// Metric cards + Distribution chart + SERP changes + Keyword overview table
// ---------------------------------------------------------------------------

import { useState, useMemo } from 'react';
import {
  MousePointerClick, Eye, Crosshair, TrendingUp, TrendingDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KeywordInsightsResponse, KeywordInsight } from '@/lib/services/keyword-insights-aggregator.service';
import { DistributionChart, buildTierData } from './keyword-ranking-distribution-chart';
import { SerpChangesBar } from './keyword-ranking-serp-changes-bar';
import { PositionTimelineChart, type GrowthSnapshot } from './keyword-ranking-position-timeline-chart';
import { posColor } from './keyword-ranking-types-and-helpers';

interface SummaryTabProps {
  insights: KeywordInsightsResponse;
  growthSnapshots: GrowthSnapshot[];
}

type OverviewSubTab = 'top' | 'jumped' | 'dropped';

export function RankingSummaryTab({ insights, growthSnapshots }: SummaryTabProps) {
  const [overviewTab, setOverviewTab] = useState<OverviewSubTab>('top');
  const { summary, tiers, movers } = insights;

  // Build distribution tier data
  const tierData = useMemo(() => buildTierData(tiers), [tiers]);

  // Compute SERP changes breakdown by tier
  const serpChanges = useMemo(() => {
    const allKw = [
      ...tiers.top5, ...tiers.top10, ...tiers.top15, ...tiers.top30, ...tiers.beyond30,
    ];

    const jumped = allKw.filter((k) => k.change !== null && k.change > 0);
    const dropped = allKw.filter((k) => k.change !== null && k.change < 0);
    const unchanged = allKw.filter((k) => k.change === null || k.change === 0);

    const tierBreakdown = (list: KeywordInsight[]) => ({
      top5: list.filter((k) => k.currentPosition <= 5).length,
      top10: list.filter((k) => k.currentPosition > 5 && k.currentPosition <= 10).length,
      top15: list.filter((k) => k.currentPosition > 10 && k.currentPosition <= 15).length,
      top30: list.filter((k) => k.currentPosition > 15 && k.currentPosition <= 30).length,
      beyond30: list.filter((k) => k.currentPosition > 30).length,
    });

    return {
      jumped: jumped.length,
      dropped: dropped.length,
      unchanged: unchanged.length,
      jumpedByTier: tierBreakdown(jumped),
      droppedByTier: tierBreakdown(dropped),
      unchangedByTier: tierBreakdown(unchanged),
    };
  }, [tiers]);

  // Keywords for overview table
  const overviewKeywords = useMemo(() => {
    const allKw = [
      ...tiers.top5, ...tiers.top10, ...tiers.top15, ...tiers.top30, ...tiers.beyond30,
    ];

    switch (overviewTab) {
      case 'jumped':
        return movers.surging.slice(0, 20);
      case 'dropped':
        return movers.dropping.slice(0, 20);
      default: // top — sort by position ascending
        return [...allKw].sort((a, b) => a.currentPosition - b.currentPosition).slice(0, 20);
    }
  }, [tiers, movers, overviewTab]);

  const totalKw = summary.total;
  const top10Count = tiers.top5.length + tiers.top10.length;
  const top10Pct = totalKw > 0 ? ((top10Count / totalKw) * 100).toFixed(0) : '0';

  return (
    <div className="space-y-4">
      {/* Row 1 — Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Tổng từ khóa"
          value={totalKw}
          icon={Crosshair}
          color="text-[var(--text-primary)]"
          iconBg="bg-secondary"
        />
        <MetricCard
          label="Top 10"
          value={`${top10Count}`}
          subtitle={`${top10Pct}% tổng`}
          icon={TrendingUp}
          color="text-accent"
          iconBg="bg-accent/10"
          delta={summary.newToTop10 > 0 ? { value: summary.newToTop10, label: 'mới vào' } : undefined}
        />
        <MetricCard
          label="Clicks"
          value={summary.totalClicks}
          icon={MousePointerClick}
          color="text-sky-400"
          iconBg="bg-sky-400/10"
        />
        <MetricCard
          label="Impressions"
          value={formatNum(summary.totalImpressions)}
          icon={Eye}
          color="text-purple-400"
          iconBg="bg-purple-400/10"
        />
      </div>

      {/* Row 2 — Distribution + Timeline side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DistributionChart tiers={tierData} total={totalKw} />
        <PositionTimelineChart snapshots={growthSnapshots} />
      </div>

      {/* Row 3 — SERP Changes */}
      <SerpChangesBar {...serpChanges} />

      {/* Row 4 — Keyword Overview Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tổng quan từ khóa</h3>
          {/* Sub-tabs */}
          <div className="flex bg-secondary/50 rounded-lg p-0.5 text-[11px]">
            {([
              { key: 'top' as OverviewSubTab, label: 'Top', icon: Crosshair },
              { key: 'jumped' as OverviewSubTab, label: 'Tăng', icon: TrendingUp },
              { key: 'dropped' as OverviewSubTab, label: 'Giảm', icon: TrendingDown },
            ]).map((t) => (
              <button key={t.key} onClick={() => setOverviewTab(t.key)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors',
                  overviewTab === t.key ? 'bg-card text-[var(--text-primary)] shadow-sm' : 'text-[#8888a0]',
                )}>
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[#8888a0]">
                <th className="px-3 py-2 text-left w-8">#</th>
                <th className="px-3 py-2 text-left">Từ khóa</th>
                <th className="px-3 py-2 text-center w-16">Vị trí</th>
                <th className="px-3 py-2 text-center w-16">+/-</th>
                <th className="px-3 py-2 text-center w-16 hidden sm:table-cell">Clicks</th>
                <th className="px-3 py-2 text-center w-20 hidden md:table-cell">Impr.</th>
                <th className="px-3 py-2 text-left hidden lg:table-cell">URL</th>
              </tr>
            </thead>
            <tbody>
              {overviewKeywords.map((kw, i) => (
                <tr key={kw.keyword} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                  <td className="px-3 py-2 text-[#8888a0]">{i + 1}</td>
                  <td className="px-3 py-2 text-[var(--text-primary)] font-medium max-w-[200px] truncate">
                    {kw.keyword}
                    {kw.is_tracked && (
                      <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-accent/15 text-accent">cam kết</span>
                    )}
                  </td>
                  <td className={cn('px-3 py-2 text-center font-bold', posColor(kw.currentPosition))}>
                    {kw.currentPosition > 0 ? kw.currentPosition : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {kw.change !== null && kw.change !== 0 ? (
                      <span className={cn('inline-flex items-center gap-0.5 font-medium',
                        kw.change > 0 ? 'text-green-400' : 'text-red-400')}>
                        {kw.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {Math.abs(kw.change)}
                      </span>
                    ) : (
                      <span className="text-[#666680]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center text-sky-400 font-medium hidden sm:table-cell">
                    {kw.gscClicks > 0 ? kw.gscClicks : '—'}
                  </td>
                  <td className="px-3 py-2 text-center text-[#8888a0] hidden md:table-cell">
                    {kw.gscImpressions > 0 ? formatNum(kw.gscImpressions) : '—'}
                  </td>
                  <td className="px-3 py-2 text-[#8888a0] text-[10px] max-w-[200px] truncate hidden lg:table-cell">
                    {kw.url ? shortUrl(kw.url) : '—'}
                  </td>
                </tr>
              ))}
              {overviewKeywords.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-[#8888a0]">Không có dữ liệu</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricCard — compact stat card with icon
// ---------------------------------------------------------------------------

function MetricCard({
  label, value, subtitle, icon: Icon, color, iconBg, delta,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  iconBg: string;
  delta?: { value: number; label: string };
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', iconBg)}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[#8888a0] uppercase tracking-wider">{label}</p>
          <div className="flex items-center gap-1.5">
            <p className={cn('text-lg font-bold', color)}>{value}</p>
            {delta && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium text-green-400">
                +{delta.value} {delta.label}
              </span>
            )}
          </div>
          {subtitle && <p className="text-[10px] text-[#8888a0]">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === '/' ? u.hostname : u.pathname;
  } catch {
    return url;
  }
}
