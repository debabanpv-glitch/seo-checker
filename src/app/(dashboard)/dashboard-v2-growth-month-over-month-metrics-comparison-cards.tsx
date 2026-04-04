'use client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PeriodMetrics {
  clicks: number;
  impressions: number;
  kwTop10: number;
  contentPublished: number;
  backlinkNew: number;
}

interface Props {
  current: PeriodMetrics;
  previous: PeriodMetrics;
}

// ---------------------------------------------------------------------------
// Delta calculation helper
// ---------------------------------------------------------------------------

function calcDelta(current: number, previous: number): { pct: number | null; isNew: boolean } {
  if (previous === 0) return { pct: null, isNew: current > 0 };
  const pct = Math.round(((current - previous) / previous) * 100 * 10) / 10;
  return { pct, isNew: false };
}

// ---------------------------------------------------------------------------
// Single metric comparison card
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  current,
  previous,
}: {
  label: string;
  current: number;
  previous: number;
}) {
  const { pct, isNew } = calcDelta(current, previous);
  const isPositive = pct !== null ? pct > 0 : false;
  const isZero = pct === 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1 min-w-0">
      <span className="text-[11px] text-[#8888a0] font-medium truncate">{label}</span>

      <div className="flex items-end gap-2 flex-wrap">
        <span className="text-2xl font-bold text-[var(--text-primary)] leading-tight">
          {current.toLocaleString()}
        </span>

        {isNew ? (
          <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 mb-0.5">
            Mới
          </span>
        ) : pct !== null && !isZero ? (
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full mb-0.5 ${
              isPositive
                ? 'bg-green-500/15 text-green-400'
                : 'bg-red-500/15 text-red-400'
            }`}
          >
            {isPositive ? '▲' : '▼'} {Math.abs(pct)}%
          </span>
        ) : pct === 0 ? (
          <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-secondary text-[#8888a0] mb-0.5">
            =
          </span>
        ) : null}
      </div>

      <span className="text-[10px] text-[#8888a0]">
        Kỳ trước: {previous.toLocaleString()}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardV2GrowthMonthOverMonthMetricsComparisonCards
// ---------------------------------------------------------------------------

export default function DashboardV2GrowthMonthOverMonthMetricsComparisonCards({
  current,
  previous,
}: Props) {
  const metrics: Array<{ label: string; key: keyof PeriodMetrics }> = [
    { label: 'Clicks', key: 'clicks' },
    { label: 'Impressions', key: 'impressions' },
    { label: 'KW Top 10', key: 'kwTop10' },
    { label: 'Nội dung', key: 'contentPublished' },
    { label: 'Backlinks mới', key: 'backlinkNew' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
        So sánh kỳ này vs kỳ trước
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metrics.map(({ label, key }) => (
          <MetricCard
            key={key}
            label={label}
            current={current[key]}
            previous={previous[key]}
          />
        ))}
      </div>
    </div>
  );
}
