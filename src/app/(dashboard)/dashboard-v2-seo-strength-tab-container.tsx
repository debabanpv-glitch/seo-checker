'use client';

import { useState, useEffect } from 'react';
import { PageLoading } from '@/components/LoadingSpinner';
import DashboardV2SeoStrengthBacklinkProfile from './dashboard-v2-seo-strength-backlink-profile';
import DashboardV2SeoStrengthTopicalAuthorityClusters from './dashboard-v2-seo-strength-topical-authority-clusters';
import DashboardV2SeoStrengthOnPageAuditScoresBars from './dashboard-v2-seo-strength-onpage-audit-scores-bars';
import DashboardV2SeoStrengthInternalLinkHealthStats from './dashboard-v2-seo-strength-internal-link-health-stats';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnifiedSummary {
  backlinks: {
    total: number;
    alive: number;
    dead: number;
    newThisMonth: number;
    avgDR: number;
  };
  seoStrength: {
    auditScores: Record<string, number>;
    avgAuditScore: number;
    clusterCount: number;
    avgCompleteness: number;
    orphanPages: number;
  };
  projects: Array<{ id: string; name: string }>;
}

interface ClusterItem {
  id: string;
  name: string;
  keywordCount: number;
  pageCount: number;
  completenessScore: number;
}

// ─── Project Filter ────────────────────────────────────────────────────────────

function ProjectFilterBar({
  projects,
  selected,
  onChange,
}: {
  projects: Array<{ id: string; name: string }>;
  selected: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {projects.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            selected === p.id
              ? 'bg-accent border-border text-[var(--text-primary)] font-semibold'
              : 'border-border text-[#8888a0] hover:text-[var(--text-primary)]'
          }`}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}

// ─── Internal Link Stats Derived from Cluster Data ────────────────────────────

function deriveInternalLinkStats(clusters: ClusterItem[], orphanPages: number) {
  const totalPages = clusters.reduce((s, c) => s + c.pageCount, 0);
  const linkedPages = Math.max(0, totalPages - orphanPages);
  const avgInternalLinks = clusters.length > 0
    ? Math.round((clusters.reduce((s, c) => s + c.pageCount, 0) / clusters.length) * 10) / 10
    : 0;
  const pillarCoverage = clusters.length > 0
    ? Math.round((clusters.filter((c) => c.pageCount > 0).length / clusters.length) * 100)
    : 0;

  return { totalPages, linkedPages, orphanPages, avgInternalLinks, pillarCoverage };
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DashboardV2SeoStrengthTab() {
  const [projectFilter, setProjectFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<UnifiedSummary | null>(null);
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Default to first project
  useEffect(() => {
    if (!initialized) {
      fetch('/api/v1/projects')
        .then(r => r.json())
        .then(data => {
          const list = Array.isArray(data) ? data : Array.isArray(data?.projects) ? data.projects : [];
          if (list.length > 0) {
            setProjectFilter(list[0].id);
          }
          setInitialized(true);
        })
        .catch(() => setInitialized(true));
    }
  }, []);

  useEffect(() => {
    if (!initialized || !projectFilter) return;
    setLoading(true);

    const params = `?project_id=${projectFilter}`;
    const clusterParams = `?projectId=${projectFilter}`;

    Promise.all([
      fetch(`/api/v1/dashboard/unified-summary${params}`).then((r) => r.json()),
      fetch(`/api/v1/topic-clusters${clusterParams}`).then((r) => r.json()),
    ])
      .then(([summaryData, clusterData]) => {
        setSummary(summaryData);
        // listClusters returns array directly
        const list: ClusterItem[] = Array.isArray(clusterData)
          ? clusterData.map((c: Record<string, unknown>) => ({
              id: String(c.id ?? ''),
              name: String(c.name ?? ''),
              keywordCount: Number(c.keywordCount ?? c.keyword_count ?? 0),
              pageCount: Number(c.pageCount ?? c.page_count ?? 0),
              completenessScore: Number(c.completenessScore ?? c.completeness_score ?? 0),
            }))
          : [];
        setClusters(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectFilter]);

  if (loading) return <PageLoading />;
  if (!summary) return (
    <div className="flex items-center justify-center h-48">
      <p className="text-sm text-[#8888a0]">Không tải được dữ liệu</p>
    </div>
  );

  const internalStats = deriveInternalLinkStats(clusters, summary.seoStrength.orphanPages);

  return (
    <div className="space-y-4">
      {/* Project Filter */}
      {summary.projects.length > 0 && (
        <ProjectFilterBar
          projects={summary.projects}
          selected={projectFilter}
          onChange={setProjectFilter}
        />
      )}

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top-left: Backlink Profile */}
        <DashboardV2SeoStrengthBacklinkProfile
          total={summary.backlinks.total}
          alive={summary.backlinks.alive}
          dead={summary.backlinks.dead}
          newThisMonth={summary.backlinks.newThisMonth}
          avgDR={summary.backlinks.avgDR}
        />

        {/* Top-right: Topical Authority */}
        <DashboardV2SeoStrengthTopicalAuthorityClusters
          clusterCount={summary.seoStrength.clusterCount}
          avgCompleteness={summary.seoStrength.avgCompleteness}
          clusters={clusters}
        />

        {/* Bottom-left: On-Page Audit Scores */}
        <DashboardV2SeoStrengthOnPageAuditScoresBars
          scores={summary.seoStrength.auditScores}
          avgScore={summary.seoStrength.avgAuditScore}
        />

        {/* Bottom-right: Internal Link Health */}
        <DashboardV2SeoStrengthInternalLinkHealthStats
          totalPages={internalStats.totalPages}
          linkedPages={internalStats.linkedPages}
          orphanPages={internalStats.orphanPages}
          avgInternalLinks={internalStats.avgInternalLinks}
          pillarCoverage={internalStats.pillarCoverage}
        />
      </div>
    </div>
  );
}
