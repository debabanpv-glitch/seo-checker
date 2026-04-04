'use client';

import { useState, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DailyPoint {
  date: string;
  clicks: number;
  impressions: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: DailyPoint | null;
}

// ---------------------------------------------------------------------------
// DashboardV2GrowthTrendCharts — SVG dual line chart for clicks + impressions
// ---------------------------------------------------------------------------

export default function DashboardV2GrowthTrendCharts({ gscData }: { gscData: DailyPoint[] }) {
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, data: null });
  const svgRef = useRef<SVGSVGElement>(null);

  if (!gscData || gscData.length < 2) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Xu hướng 7 ngày gần nhất</h3>
        <div className="flex items-center justify-center min-h-[160px]">
          <p className="text-xs text-[#8888a0] text-center">Chưa có dữ liệu GSC</p>
        </div>
      </div>
    );
  }

  const W = 600;
  const H = 200;
  const PAD = { top: 20, right: 20, bottom: 32, left: 44 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const maxClicks = Math.max(...gscData.map((d) => d.clicks), 1);
  const maxImpr = Math.max(...gscData.map((d) => d.impressions), 1);
  const xStep = gscData.length > 1 ? plotW / (gscData.length - 1) : 0;
  const many = gscData.length > 6;

  const clicksPts = gscData.map((d, i) => ({
    x: PAD.left + i * xStep,
    y: PAD.top + plotH - (d.clicks / maxClicks) * plotH,
    v: d.clicks,
    date: d.date,
    impressions: d.impressions,
  }));
  const imprPts = gscData.map((d, i) => ({
    x: PAD.left + i * xStep,
    y: PAD.top + plotH - (d.impressions / maxImpr) * plotH,
  }));

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const toArea = (pts: { x: number; y: number }[]) => {
    const base = PAD.top + plotH;
    return (
      toPath(pts) +
      ` L${pts[pts.length - 1].x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`
    );
  };

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    // Find closest point
    let closest = 0;
    let minDist = Infinity;
    clicksPts.forEach((p, i) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });

    const pt = clicksPts[closest];
    setTooltip({
      visible: true,
      x: pt.x,
      y: pt.y,
      data: gscData[closest],
    });
  }

  function handleMouseLeave() {
    setTooltip({ visible: false, x: 0, y: 0, data: null });
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Xu hướng 7 ngày gần nhất</h3>
        <div className="flex items-center gap-3 text-[10px] text-[#8888a0]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-blue-500 rounded" /> Clicks
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-purple-500 rounded" /> Impressions
          </span>
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: 'crosshair' }}
        >
          {/* Grid lines */}
          {[0, 0.5, 1].map((pct) => {
            const y = PAD.top + plotH * (1 - pct);
            return (
              <line
                key={pct}
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                stroke="#333"
                strokeWidth="0.5"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Impressions area + line */}
          <path d={toArea(imprPts)} fill="rgba(168,85,247,0.07)" />
          <path
            d={toPath(imprPts)}
            fill="none"
            stroke="#a855f7"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Clicks area + line */}
          <path d={toArea(clicksPts)} fill="rgba(59,130,246,0.1)" />
          <path
            d={toPath(clicksPts)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Dots for clicks */}
          {clicksPts.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={many ? 2 : 3}
                fill="#3b82f6"
                stroke="#1e293b"
                strokeWidth="1"
              />
              {(!many || i === 0 || i === clicksPts.length - 1) && (
                <text
                  x={p.x}
                  y={p.y - 6}
                  textAnchor="middle"
                  fill="#93c5fd"
                  fontSize="8"
                  fontWeight="600"
                >
                  {p.v}
                </text>
              )}
            </g>
          ))}

          {/* Dots for impressions */}
          {imprPts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={many ? 1.5 : 2.5}
              fill="#a855f7"
              stroke="#1e293b"
              strokeWidth="1"
            />
          ))}

          {/* Tooltip crosshair */}
          {tooltip.visible && (
            <line
              x1={tooltip.x}
              x2={tooltip.x}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="#ffffff30"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}

          {/* X-axis labels */}
          {gscData.map((d, i) => {
            if (many && i !== 0 && i !== gscData.length - 1 && i % 2 !== 0) return null;
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
              <text
                key={pct}
                x={PAD.left - 5}
                y={y + 3}
                textAnchor="end"
                fill="#3b82f6"
                fontSize="7"
              >
                {Math.round(maxClicks * pct)}
              </text>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {tooltip.visible && tooltip.data && (
          <div
            className="absolute pointer-events-none z-10 bg-[#1a1a2e] border border-border rounded-lg px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${(tooltip.x / W) * 100}%`,
              top: `${(tooltip.y / H) * 100}%`,
              transform: 'translate(-50%, -120%)',
            }}
          >
            <p className="text-[#8888a0] mb-1">
              {new Date(tooltip.data.date).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
              })}
            </p>
            <p className="text-blue-400 font-medium">Clicks: {tooltip.data.clicks.toLocaleString()}</p>
            <p className="text-purple-400 font-medium">Impr: {tooltip.data.impressions.toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
