'use client';

import { MousePointerClick, Eye, Hash, Crosshair } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GscTotals {
  clicks: number;
  impressions: number;
  totalKeywords: number;
  keywordsInTop10: number;
  improved?: number;
  declined?: number;
  prevClicks?: number | null;
  prevImpressions?: number | null;
}

interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  gradientFrom: string;
  iconColor: string;
  delta?: { current: number; prev: number | null | undefined; invert?: boolean };
}

// ---------------------------------------------------------------------------
// Delta badge helper
// ---------------------------------------------------------------------------

function DeltaBadge({ current, prev, invert = false }: { current: number; prev: number | null | undefined; invert?: boolean }) {
  if (prev == null || prev === 0) return null;
  const diff = current - prev;
  const pct = Math.abs((diff / prev) * 100);
  if (pct < 0.01) return null;
  const isGood = invert ? diff < 0 : diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
      isGood ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
    }`}>
      {isGood ? '▲' : '▼'} {pct.toFixed(0)}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single KPI Card
// ---------------------------------------------------------------------------

function KpiCard({ label, value, subtitle, icon: Icon, gradientFrom, iconColor, delta }: KpiCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} to-transparent pointer-events-none`} />
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#8888a0] text-xs font-medium">{label}</span>
        <div className={`p-1.5 rounded-lg ${iconColor}/10`}>
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        {delta && <DeltaBadge current={delta.current} prev={delta.prev} invert={delta.invert} />}
      </div>
      {subtitle && <p className="text-[10px] text-[#8888a0] mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardSeoKpiCardsRow — Row 1 of SE Ranking-style dashboard
// ---------------------------------------------------------------------------

export default function DashboardSeoKpiCardsRow({ totals, prevTotals }: {
  totals: GscTotals;
  prevTotals?: { clicks: number; impressions: number } | null;
}) {
  const top10Pct = totals.totalKeywords > 0
    ? Math.round((totals.keywordsInTop10 / totals.totalKeywords) * 100)
    : 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-[var(--text-primary)]">Tổng hợp tất cả dự án</span>
        <span className="text-[10px] text-[#8888a0] bg-secondary px-2 py-0.5 rounded-full">7 ngày gần nhất</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        label="Tổng lượt click"
        value={totals.clicks.toLocaleString()}
        subtitle="từ Google Search"
        icon={MousePointerClick}
        gradientFrom="from-blue-500/5"
        iconColor="text-blue-400"
        delta={{ current: totals.clicks, prev: prevTotals?.clicks ?? totals.prevClicks }}
      />
      <KpiCard
        label="Hiển thị (Impressions)"
        value={totals.impressions.toLocaleString()}
        subtitle="lượt xuất hiện trên Google"
        icon={Eye}
        gradientFrom="from-purple-500/5"
        iconColor="text-purple-400"
        delta={{ current: totals.impressions, prev: prevTotals?.impressions ?? totals.prevImpressions }}
      />
      <KpiCard
        label="Từ khóa Top 10"
        value={totals.keywordsInTop10.toLocaleString()}
        subtitle={`${top10Pct}% trong tổng ${totals.totalKeywords} từ khóa`}
        icon={Hash}
        gradientFrom="from-green-500/5"
        iconColor="text-green-400"
      />
      <KpiCard
        label="Từ khóa đang theo dõi"
        value={totals.totalKeywords.toLocaleString()}
        subtitle={`▲ ${totals.improved ?? 0} tăng · ▼ ${totals.declined ?? 0} giảm`}
        icon={Crosshair}
        gradientFrom="from-orange-500/5"
        iconColor="text-orange-400"
      />
      </div>
    </div>
  );
}
