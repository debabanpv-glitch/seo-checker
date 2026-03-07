'use client';

import { TrendingUp, TrendingDown, Zap, Target, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ComparedQuery, type ComparedPage } from './gsc-comparison-utils';
import { type GscSnapshot, fmtDate, fmtNum, fmtCtr, fmtPos } from './gsc-types-and-helpers';
import { DeltaBadge, StatusBadge } from './gsc-shared-sub-components';

// ---------------------------------------------------------------------------
// LineChart — SVG line chart resembling GSC style
// ---------------------------------------------------------------------------

export function LineChart({ snapshots }: { snapshots: GscSnapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs text-[#8888a0]">Cần ít nhất 2 kỳ dữ liệu để hiển thị biểu đồ xu hướng.</p>
      </div>
    );
  }

  const W = 700;
  const H = 220;
  const PAD = { top: 20, right: 20, bottom: 30, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const many = snapshots.length > 5; // compact mode for daily data

  const maxClicks = Math.max(...snapshots.map((s) => s.clicks), 1);
  const maxImpr = Math.max(...snapshots.map((s) => s.impressions), 1);

  const xStep = snapshots.length > 1 ? plotW / (snapshots.length - 1) : 0;

  const clicksPoints = snapshots.map((s, i) => {
    const x = PAD.left + i * xStep;
    const y = PAD.top + plotH - (s.clicks / maxClicks) * plotH;
    return { x, y };
  });
  const imprPoints = snapshots.map((s, i) => {
    const x = PAD.left + i * xStep;
    const y = PAD.top + plotH - (s.impressions / maxImpr) * plotH;
    return { x, y };
  });

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const toArea = (pts: { x: number; y: number }[]) => {
    const base = PAD.top + plotH;
    return toPath(pts) + ` L${pts[pts.length - 1].x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Xu hướng</h2>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 rounded inline-block" /> Lượt click</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-500 rounded inline-block" /> Hiển thị</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = PAD.top + plotH * (1 - pct);
          return <line key={pct} x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#333" strokeWidth="0.5" strokeDasharray="4 4" />;
        })}

        {/* Impressions area + line (behind) */}
        <path d={toArea(imprPoints)} fill="rgba(168,85,247,0.08)" />
        <path d={toPath(imprPoints)} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinejoin="round" />

        {/* Clicks area + line (front) */}
        <path d={toArea(clicksPoints)} fill="rgba(59,130,246,0.12)" />
        <path d={toPath(clicksPoints)} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />

        {/* Dots + labels for clicks */}
        {clicksPoints.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={many ? 2.5 : 3.5} fill="#3b82f6" stroke="#1e293b" strokeWidth="1.5" />
            {(!many || i === 0 || i === clicksPoints.length - 1 || snapshots[i].clicks === Math.max(...snapshots.map(s => s.clicks))) && (
              <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="600">
                {snapshots[i].clicks}
              </text>
            )}
          </g>
        ))}

        {/* X-axis date labels */}
        {snapshots.map((s, i) => {
          const x = PAD.left + i * xStep;
          // Show every other label when many points, always show first + last
          if (many && i !== 0 && i !== snapshots.length - 1 && i % 2 !== 0) return null;
          const d = new Date(s.date);
          const label = many ? `${d.getDate()}/${d.getMonth() + 1}` : fmtDate(s.date);
          return (
            <text key={i} x={x} y={H - 5} textAnchor="middle" fill="#666" fontSize={many ? 8 : 9}>
              {label}
            </text>
          );
        })}

        {/* Y-axis labels (clicks) */}
        {[0, 0.5, 1].map((pct) => {
          const y = PAD.top + plotH * (1 - pct);
          const val = Math.round(maxClicks * pct);
          return (
            <text key={pct} x={PAD.left - 6} y={y + 3} textAnchor="end" fill="#3b82f6" fontSize="8">
              {val}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OverviewTab
// ---------------------------------------------------------------------------

export function OverviewTab({
  snapshots,
  winners,
  losers,
  newKw,
  opportunities,
  atRisk,
  topQueries,
  topPages,
}: {
  snapshots: GscSnapshot[];
  winners: ComparedQuery[];
  losers: ComparedQuery[];
  newKw: ComparedQuery[];
  opportunities: ComparedQuery[];
  atRisk: ComparedQuery[];
  topQueries: ComparedQuery[];
  topPages: ComparedPage[];
}) {
  return (
    <div className="space-y-4">
      {/* Quick Stats — compact inline bar */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-1 mb-2">
          <h3 className="text-xs font-semibold text-[var(--text-primary)]">Biến động từ khóa</h3>
          <span className="text-[10px] text-[#8888a0] ml-auto">{topQueries.length} từ khóa</span>
        </div>
        <div className="flex gap-2">
          {[
            { label: 'Tăng', value: winners.length, icon: TrendingUp, cls: 'text-green-400', bg: 'bg-green-400/10' },
            { label: 'Giảm', value: losers.length, icon: TrendingDown, cls: 'text-red-400', bg: 'bg-red-400/10' },
            { label: 'Mới', value: newKw.length, icon: Zap, cls: 'text-blue-400', bg: 'bg-blue-400/10' },
            { label: 'Cơ hội', value: opportunities.length, icon: Target, cls: 'text-orange-400', bg: 'bg-orange-400/10' },
            { label: 'Rủi ro', value: atRisk.length, icon: AlertTriangle, cls: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          ].map(({ label, value, icon: Icon, cls, bg }) => (
            <div key={label} className={cn('flex-1 rounded-lg p-2.5 text-center', bg)}>
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Icon className={cn('w-3.5 h-3.5', cls)} />
                <span className={cn('text-lg font-bold', cls)}>{value}</span>
              </div>
              <p className="text-[10px] text-[#8888a0]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Line Chart */}
      <LineChart snapshots={snapshots} />

      {/* Top Queries */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Từ khóa hàng đầu</h3>
          <span className="text-[10px] text-[#8888a0]">{topQueries.length} từ khóa</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['#', 'Query', 'Clicks', '+/-', 'Impr', 'CTR', 'Pos', '+/-', ''].map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left text-[#8888a0] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topQueries.slice(0, 25).map((q, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/30">
                  <td className="px-3 py-1.5 text-[#8888a0]">{i + 1}</td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)] font-medium max-w-[200px] truncate">{q.query}</td>
                  <td className="px-3 py-1.5 text-blue-400 font-medium">{fmtNum(q.clicks)}</td>
                  <td className="px-3 py-1.5"><DeltaBadge value={q.clicks_delta} /></td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)]">{fmtNum(q.impressions)}</td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)]">{fmtCtr(q.ctr)}</td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)] font-medium">{fmtPos(q.position)}</td>
                  <td className="px-3 py-1.5"><DeltaBadge value={q.position_delta} invert /></td>
                  <td className="px-3 py-1.5"><StatusBadge status={q.status} /></td>
                </tr>
              ))}
              {topQueries.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-4 text-center text-[#8888a0]">Chưa có dữ liệu queries.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Pages */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Trang hàng đầu</h3>
          <span className="text-[10px] text-[#8888a0]">{topPages.length} trang</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['#', 'URL', 'Clicks', '+/-', 'Impr', 'CTR', 'Pos', '+/-', ''].map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left text-[#8888a0] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topPages.slice(0, 20).map((p, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/30">
                  <td className="px-3 py-1.5 text-[#8888a0]">{i + 1}</td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)] font-medium max-w-[250px] truncate" title={p.page}>{shortUrl(p.page)}</td>
                  <td className="px-3 py-1.5 text-blue-400 font-medium">{fmtNum(p.clicks)}</td>
                  <td className="px-3 py-1.5"><DeltaBadge value={p.clicks_delta} /></td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)]">{fmtNum(p.impressions)}</td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)]">{fmtCtr(p.ctr)}</td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)] font-medium">{fmtPos(p.position)}</td>
                  <td className="px-3 py-1.5"><DeltaBadge value={p.position_delta} invert /></td>
                  <td className="px-3 py-1.5"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
              {topPages.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-4 text-center text-[#8888a0]">Chưa có dữ liệu pages.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <div className="bg-card border border-orange-500/20 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cơ hội tối ưu (Pos 4-20, Impressions cao)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Từ khóa', 'Vị trí', 'Impressions', 'Clicks', 'CTR', 'Gợi ý'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[#8888a0] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {opportunities.slice(0, 10).map((q, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/50">
                    <td className="px-3 py-2 font-medium text-[var(--text-primary)] max-w-[200px] truncate">{q.query}</td>
                    <td className="px-3 py-2 text-orange-400 font-medium">{fmtPos(q.position)}</td>
                    <td className="px-3 py-2 text-[var(--text-primary)]">{fmtNum(q.impressions)}</td>
                    <td className="px-3 py-2 text-blue-400">{fmtNum(q.clicks)}</td>
                    <td className="px-3 py-2 text-[var(--text-primary)]">{fmtCtr(q.ctr)}</td>
                    <td className="px-3 py-2 text-[#8888a0]">
                      {q.position <= 10 ? 'Cải thiện content → top 3' : 'Tăng backlinks + content depth'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// shortUrl used locally in this file
function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === '/' ? u.hostname : u.pathname;
  } catch {
    return url;
  }
}
