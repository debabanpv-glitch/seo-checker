'use client';

import { AlertTriangle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InternalLinkHealthProps {
  totalPages: number;
  linkedPages: number;
  orphanPages: number;
  avgInternalLinks: number;
  pillarCoverage: number;
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-secondary rounded-lg p-3 text-center">
      <p className={`text-lg font-bold ${valueColor ?? 'text-[var(--text-primary)]'}`}>{value}</p>
      <p className="text-[10px] text-[#8888a0] mt-0.5">{label}</p>
    </div>
  );
}

// ─── Pillar Coverage Bar ───────────────────────────────────────────────────────

function PillarCoverageBar({ coverage }: { coverage: number }) {
  const clamped = Math.min(100, Math.max(0, coverage));
  const barCol =
    clamped >= 70 ? 'bg-green-500' : clamped >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  const textCol =
    clamped >= 70 ? 'text-green-400' : clamped >= 40 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[var(--text-primary)]">Cụm có trang trụ cột</span>
        <span className={`text-[11px] font-semibold ${textCol}`}>{clamped}%</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barCol}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-[10px] text-[#8888a0] mt-1">{clamped}% cụm có trang trụ cột</p>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DashboardV2SeoStrengthInternalLinkHealthStats({
  totalPages,
  linkedPages,
  orphanPages,
  avgInternalLinks,
  pillarCoverage,
}: InternalLinkHealthProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">Sức khỏe Internal Links</h3>
        {orphanPages > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-yellow-400">
            <AlertTriangle className="w-3 h-3" />
            {orphanPages} trang mồ côi
          </span>
        )}
      </div>

      {/* 2x2 stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Tổng trang" value={totalPages.toLocaleString()} />
        <StatCard
          label="Có liên kết"
          value={linkedPages.toLocaleString()}
          valueColor="text-green-400"
        />
        <StatCard
          label="Trang mồ côi"
          value={orphanPages.toLocaleString()}
          valueColor={orphanPages > 0 ? 'text-yellow-400' : 'text-[var(--text-primary)]'}
        />
        <StatCard
          label="Liên kết TB"
          value={avgInternalLinks > 0 ? avgInternalLinks.toFixed(1) : '—'}
          valueColor="text-blue-400"
        />
      </div>

      <PillarCoverageBar coverage={pillarCoverage} />

      {orphanPages > 0 && (
        <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-yellow-300">
            Có <strong>{orphanPages}</strong> trang chưa được liên kết nội bộ — cần thêm internal link để tăng chỉ số PageRank.
          </p>
        </div>
      )}
    </div>
  );
}
