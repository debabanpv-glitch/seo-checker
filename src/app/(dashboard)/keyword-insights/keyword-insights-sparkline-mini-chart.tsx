'use client';

// SVG sparkline: position over time (lower position = higher on chart)

interface SparklineProps {
  data: { date: string; position: number }[];
  width?: number;
  height?: number;
}

export function Sparkline({ data, width = 80, height = 24 }: SparklineProps) {
  if (data.length < 2) {
    return <span className="text-[10px] text-[#666680]">—</span>;
  }

  const positions = data.map((d) => d.position);
  const maxPos = Math.max(...positions, 30); // cap at 30 for scale
  const minPos = Math.min(...positions, 1);
  const range = maxPos - minPos || 1;

  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * innerW;
    // Invert Y: lower position (better) = higher on chart
    const y = pad + ((d.position - minPos) / range) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Color based on trend: first vs last
  const first = positions[0];
  const last = positions[positions.length - 1];
  const stroke = last < first ? '#34d399' : last > first ? '#f87171' : '#666680';

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Latest point dot */}
      {data.length > 0 && (() => {
        const lastX = pad + ((data.length - 1) / (data.length - 1)) * innerW;
        const lastY = pad + ((last - minPos) / range) * innerH;
        return <circle cx={lastX} cy={lastY} r={2} fill={stroke} />;
      })()}
    </svg>
  );
}
