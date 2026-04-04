'use client';

import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClusterItem {
  name: string;
  keywordCount: number;
  pageCount: number;
  completenessScore: number;
}

interface TopicalAuthorityProps {
  clusterCount: number;
  avgCompleteness: number;
  clusters: ClusterItem[];
}

// ─── Bar Color Helper ─────────────────────────────────────────────────────────

function barColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

// ─── Cluster Bar Row ──────────────────────────────────────────────────────────

function ClusterBarRow({ cluster }: { cluster: ClusterItem }) {
  const score = Math.min(100, Math.max(0, cluster.completenessScore));
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--text-primary)] truncate max-w-[55%]">{cluster.name}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-[#8888a0]">
            {cluster.keywordCount} KW · {cluster.pageCount} trang
          </span>
          <span className={`text-[11px] font-semibold ${scoreColor(score)}`}>{score}%</span>
        </div>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DashboardV2SeoStrengthTopicalAuthorityClusters({
  clusterCount,
  avgCompleteness,
  clusters,
}: TopicalAuthorityProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">Topical Authority</h3>
        <Link
          href="/topical-map"
          className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
        >
          Xem chi tiết →
        </Link>
      </div>

      {clusterCount > 0 ? (
        <>
          <p className="text-[11px] text-[#8888a0] mb-3">
            <span className="font-semibold text-[var(--text-primary)]">{clusterCount}</span> cụm chủ đề,
            hoàn thiện TB{' '}
            <span className={`font-semibold ${scoreColor(avgCompleteness)}`}>
              {Math.round(avgCompleteness)}%
            </span>
          </p>

          <div className="divide-y divide-border">
            {clusters.slice(0, 6).map((cluster, i) => (
              <ClusterBarRow key={i} cluster={cluster} />
            ))}
          </div>

          {clusters.length > 6 && (
            <p className="text-[10px] text-[#8888a0] mt-2 text-center">
              +{clusters.length - 6} cụm khác
            </p>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-32">
          <p className="text-xs text-[#8888a0]">Chưa có dữ liệu cụm chủ đề</p>
        </div>
      )}
    </div>
  );
}
