'use client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DailyPoint {
  date: string;
  clicks: number;
  impressions: number;
}

// ---------------------------------------------------------------------------
// DashboardTrafficTrendMiniChart — SVG line chart for clicks + impressions
// ---------------------------------------------------------------------------

export default function DashboardTrafficTrendMiniChart({ dailyTrend }: { dailyTrend: DailyPoint[] }) {
  if (dailyTrend.length < 2) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-center h-full min-h-[160px]">
        <p className="text-xs text-[#8888a0] text-center">Cần ít nhất 2 điểm dữ liệu<br />để hiển thị biểu đồ xu hướng</p>
      </div>
    );
  }

  const W = 600;
  const H = 180;
  const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const maxClicks = Math.max(...dailyTrend.map((d) => d.clicks), 1);
  const maxImpr = Math.max(...dailyTrend.map((d) => d.impressions), 1);
  const xStep = dailyTrend.length > 1 ? plotW / (dailyTrend.length - 1) : 0;
  const many = dailyTrend.length > 6;

  const clicksPts = dailyTrend.map((d, i) => ({
    x: PAD.left + i * xStep,
    y: PAD.top + plotH - (d.clicks / maxClicks) * plotH,
    v: d.clicks,
  }));
  const imprPts = dailyTrend.map((d, i) => ({
    x: PAD.left + i * xStep,
    y: PAD.top + plotH - (d.impressions / maxImpr) * plotH,
  }));

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const toArea = (pts: { x: number; y: number }[]) => {
    const base = PAD.top + plotH;
    return toPath(pts)
      + ` L${pts[pts.length - 1].x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Xu hướng traffic</h3>
        <div className="flex items-center gap-3 text-[10px] text-[#8888a0]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-blue-500 rounded" /> Clicks
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-purple-500 rounded" /> Impressions
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.5, 1].map((pct) => {
          const y = PAD.top + plotH * (1 - pct);
          return (
            <line key={pct} x1={PAD.left} x2={W - PAD.right}
              y1={y} y2={y} stroke="#333" strokeWidth="0.5" strokeDasharray="4 4" />
          );
        })}

        {/* Impressions area + line */}
        <path d={toArea(imprPts)} fill="rgba(168,85,247,0.07)" />
        <path d={toPath(imprPts)} fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinejoin="round" />

        {/* Clicks area + line */}
        <path d={toArea(clicksPts)} fill="rgba(59,130,246,0.1)" />
        <path d={toPath(clicksPts)} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />

        {/* Dots for clicks */}
        {clicksPts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={many ? 2 : 3} fill="#3b82f6" stroke="#1e293b" strokeWidth="1" />
            {(!many || i === 0 || i === clicksPts.length - 1) && (
              <text x={p.x} y={p.y - 6} textAnchor="middle" fill="#93c5fd" fontSize="8" fontWeight="600">
                {p.v}
              </text>
            )}
          </g>
        ))}

        {/* X-axis labels */}
        {dailyTrend.map((d, i) => {
          if (many && i !== 0 && i !== dailyTrend.length - 1 && i % 2 !== 0) return null;
          const x = PAD.left + i * xStep;
          const dt = new Date(d.date);
          const label = `${dt.getDate()}/${dt.getMonth() + 1}`;
          return (
            <text key={i} x={x} y={H - 4} textAnchor="middle" fill="#555" fontSize="8">
              {label}
            </text>
          );
        })}

        {/* Y-axis labels (clicks) */}
        {[0, 0.5, 1].map((pct) => {
          const y = PAD.top + plotH * (1 - pct);
          return (
            <text key={pct} x={PAD.left - 5} y={y + 3} textAnchor="end" fill="#3b82f6" fontSize="7">
              {Math.round(maxClicks * pct)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
