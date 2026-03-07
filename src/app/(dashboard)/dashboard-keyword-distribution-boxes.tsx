'use client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Distribution {
  top3: number;
  top10: number;
  top20: number;
  top50: number;
  beyond50: number;
}

// ---------------------------------------------------------------------------
// DashboardKeywordDistributionBoxes — 5-box keyword tier visualization
// ---------------------------------------------------------------------------

export default function DashboardKeywordDistributionBoxes({ distribution }: { distribution: Distribution }) {
  const total = distribution.top3 + distribution.top10 + distribution.top20 + distribution.top50 + distribution.beyond50;

  const tiers = [
    { label: 'Top 1-3', count: distribution.top3, color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' },
    { label: 'Top 4-10', count: distribution.top10, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
    { label: 'Top 11-20', count: distribution.top20, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    { label: 'Top 21-50', count: distribution.top50, color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
    { label: '50+', count: distribution.beyond50, color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Phân bố từ khóa</h3>
        <span className="text-[10px] text-[#8888a0] bg-secondary px-2 py-0.5 rounded-full">{total} tổng</span>
      </div>

      {/* 5 tier boxes */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        {tiers.map((tier) => {
          const pct = total > 0 ? Math.round((tier.count / total) * 100) : 0;
          return (
            <div
              key={tier.label}
              className="flex flex-col items-center rounded-xl p-2 text-center"
              style={{ background: tier.bg, border: `1px solid ${tier.border}` }}
            >
              <p className="text-lg font-bold" style={{ color: tier.color }}>{tier.count}</p>
              <p className="text-[9px] text-[#8888a0] mt-0.5 leading-tight">{tier.label}</p>
              <p className="text-[9px] font-medium mt-0.5" style={{ color: tier.color }}>{pct}%</p>
            </div>
          );
        })}
      </div>

      {/* Stacked bar */}
      {total > 0 && (
        <div className="h-2 rounded-full overflow-hidden flex">
          {tiers.map((tier) => {
            const pct = (tier.count / total) * 100;
            if (pct < 0.5) return null;
            return (
              <div
                key={tier.label}
                className="h-full transition-all"
                style={{ width: `${pct}%`, background: tier.color }}
                title={`${tier.label}: ${tier.count} (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
