'use client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BacklinkProfileProps {
  total: number;
  alive: number;
  dead: number;
  newThisMonth: number;
  avgDR: number;
}

// ─── SVG Donut Chart ──────────────────────────────────────────────────────────

function DonutChart({ alive, dead, total }: { alive: number; dead: number; total: number }) {
  const size = 100;
  const cx = size / 2;
  const cy = size / 2;
  const r = 36;
  const stroke = 12;
  const circumference = 2 * Math.PI * r;

  const aliveRatio = total > 0 ? alive / total : 0;
  const deadRatio = total > 0 ? dead / total : 0;
  const unknownRatio = total > 0 ? Math.max(0, 1 - aliveRatio - deadRatio) : 1;

  const aliveLen = aliveRatio * circumference;
  const deadLen = deadRatio * circumference;
  const unknownLen = unknownRatio * circumference;

  // Start from top (-90 deg = -PI/2), go clockwise
  const aliveOffset = 0;
  const deadOffset = -(aliveLen);
  const unknownOffset = -(aliveLen + deadLen);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth={stroke}
      />
      {/* Unknown (gray) */}
      {unknownLen > 0.5 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#555577"
          strokeWidth={stroke}
          strokeDasharray={`${unknownLen} ${circumference - unknownLen}`}
          strokeDashoffset={circumference / 4 - unknownOffset}
          strokeLinecap="butt"
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
        />
      )}
      {/* Dead (red) */}
      {deadLen > 0.5 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#ef4444"
          strokeWidth={stroke}
          strokeDasharray={`${deadLen} ${circumference - deadLen}`}
          strokeDashoffset={circumference / 4 - deadOffset}
          strokeLinecap="butt"
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
        />
      )}
      {/* Alive (green) */}
      {aliveLen > 0.5 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#22c55e"
          strokeWidth={stroke}
          strokeDasharray={`${aliveLen} ${circumference - aliveLen}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="butt"
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
        />
      )}
      {/* Center text */}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="14" fontWeight="bold" fill="var(--text-primary)">
        {total > 0 ? `${Math.round(aliveRatio * 100)}%` : '—'}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="7" fill="#8888a0">
        sống
      </text>
    </svg>
  );
}

// ─── Health Label ──────────────────────────────────────────────────────────────

function HealthLabel({ alive, total }: { alive: number; total: number }) {
  if (total === 0) return <span className="text-xs text-[#8888a0]">Chưa có dữ liệu</span>;
  const pct = (alive / total) * 100;
  if (pct >= 80) return <span className="text-xs font-semibold text-green-400">Tốt</span>;
  if (pct >= 60) return <span className="text-xs font-semibold text-yellow-400">Trung bình</span>;
  return <span className="text-xs font-semibold text-red-400">Cần cải thiện</span>;
}

// ─── Stat Item ─────────────────────────────────────────────────────────────────

function StatItem({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="text-center">
      <p className={`text-sm font-semibold ${valueColor ?? 'text-[var(--text-primary)]'}`}>{value}</p>
      <p className="text-[10px] text-[#8888a0] mt-0.5">{label}</p>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DashboardV2SeoStrengthBacklinkProfile({
  total,
  alive,
  dead,
  newThisMonth,
  avgDR,
}: BacklinkProfileProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">Hồ sơ Backlink</h3>
        <HealthLabel alive={alive} total={total} />
      </div>

      <div className="flex items-center justify-center mb-4">
        <DonutChart alive={alive} dead={dead} total={total} />
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
        <StatItem label="Tổng" value={total.toLocaleString()} />
        <StatItem label="Sống" value={alive.toLocaleString()} valueColor="text-green-400" />
        <StatItem label="Chết" value={dead.toLocaleString()} valueColor="text-red-400" />
        <StatItem label="Mới tháng này" value={`+${newThisMonth}`} valueColor="text-blue-400" />
        <StatItem label="DR TB" value={avgDR > 0 ? avgDR.toFixed(1) : '—'} />
        <StatItem
          label="Tỷ lệ sống"
          value={total > 0 ? `${Math.round((alive / total) * 100)}%` : '—'}
          valueColor={total > 0 && alive / total >= 0.8 ? 'text-green-400' : total > 0 && alive / total >= 0.6 ? 'text-yellow-400' : 'text-red-400'}
        />
      </div>
    </div>
  );
}
