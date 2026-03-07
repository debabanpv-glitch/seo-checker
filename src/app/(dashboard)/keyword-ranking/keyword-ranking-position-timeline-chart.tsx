'use client';

// ---------------------------------------------------------------------------
// Position Timeline — SVG multi-line chart showing keyword count per tier
// over time (top5/top10/top30 lines). Inspired by SE Ranking distribution chart.
// ---------------------------------------------------------------------------

import { cn } from '@/lib/utils';

export interface GrowthSnapshot {
  date: string;
  top3: number;
  top10: number;
  top20: number;
  top30: number;
  total: number;
}

interface PositionTimelineChartProps {
  snapshots: GrowthSnapshot[];
}

const LINES = [
  { key: 'top3' as const, label: 'Top 3', color: '#34d399' },   // emerald-400
  { key: 'top10' as const, label: 'Top 10', color: '#d4a853' },  // accent
  { key: 'top30' as const, label: 'Top 30', color: '#38bdf8' },  // sky-400
  { key: 'total' as const, label: 'Tổng', color: '#8888a0' },    // secondary
] as const;

export function PositionTimelineChart({ snapshots }: PositionTimelineChartProps) {
  if (snapshots.length < 2) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs text-[#8888a0]">Cần ít nhất 2 kỳ dữ liệu để hiển thị biểu đồ.</p>
      </div>
    );
  }

  const W = 600;
  const H = 200;
  const PAD = { top: 15, right: 15, bottom: 28, left: 35 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // Find max across all lines for Y scale
  const maxVal = Math.max(
    ...snapshots.flatMap((s) => [s.top3, s.top10, s.top30, s.total]),
    1,
  );

  const xStep = snapshots.length > 1 ? plotW / (snapshots.length - 1) : 0;

  const getPoints = (key: keyof GrowthSnapshot) =>
    snapshots.map((s, i) => ({
      x: PAD.left + i * xStep,
      y: PAD.top + plotH - ((s[key] as number) / maxVal) * plotH,
    }));

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Xu hướng thứ hạng</h3>
        <div className="flex items-center gap-3 text-[10px]">
          {LINES.map((l) => (
            <span key={l.key} className="flex items-center gap-1">
              <span className="w-3 h-0.5 rounded inline-block" style={{ background: l.color }} />
              <span className="text-[#8888a0]">{l.label}</span>
            </span>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = PAD.top + plotH * (1 - pct);
          return (
            <line key={pct} x1={PAD.left} x2={W - PAD.right}
              y1={y} y2={y} stroke="#333" strokeWidth="0.5" strokeDasharray="4 4" />
          );
        })}

        {/* Lines (draw total first as background, then overlay smaller tiers) */}
        {[...LINES].reverse().map((l) => {
          const pts = getPoints(l.key);
          return (
            <path key={l.key} d={toPath(pts)} fill="none"
              stroke={l.color} strokeWidth={l.key === 'total' ? 1.5 : 2} strokeLinejoin="round"
              strokeDasharray={l.key === 'total' ? '4 3' : undefined}
              opacity={l.key === 'total' ? 0.5 : 1} />
          );
        })}

        {/* Dots for key lines */}
        {LINES.filter((l) => l.key !== 'total').map((l) => {
          const pts = getPoints(l.key);
          return pts.map((p, i) => (
            <circle key={`${l.key}-${i}`} cx={p.x} cy={p.y} r={2.5}
              fill={l.color} stroke="var(--bg-card)" strokeWidth="1.5" />
          ));
        })}

        {/* Value labels at last point */}
        {LINES.filter((l) => l.key !== 'total').map((l) => {
          const pts = getPoints(l.key);
          const last = pts[pts.length - 1];
          const val = snapshots[snapshots.length - 1][l.key];
          return (
            <text key={`label-${l.key}`} x={last.x + 4} y={last.y + 3}
              fill={l.color} fontSize="9" fontWeight="600">
              {val}
            </text>
          );
        })}

        {/* X-axis date labels */}
        {snapshots.map((s, i) => {
          const x = PAD.left + i * xStep;
          const d = new Date(s.date);
          const label = `${d.getDate()}/${d.getMonth() + 1}`;
          return (
            <text key={i} x={x} y={H - 5} textAnchor="middle" fill="#666" fontSize="8">
              {label}
            </text>
          );
        })}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((pct) => {
          const y = PAD.top + plotH * (1 - pct);
          const val = Math.round(maxVal * pct);
          return (
            <text key={pct} x={PAD.left - 6} y={y + 3} textAnchor="end" fill="#666" fontSize="8">
              {val}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
