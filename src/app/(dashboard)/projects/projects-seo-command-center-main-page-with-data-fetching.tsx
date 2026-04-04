'use client';

// ---------------------------------------------------------------------------
// Projects — SEO Command Center Main Page
// Fetches data in parallel from unified-summary + health-check + tasks APIs,
// renders per-project cards + comparison table.
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { RefreshCw, LayoutGrid } from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import ProjectCardPerProjectSeoDashboard from './projects-card-per-project-seo-mini-dashboard';
import ProjectsComparisonSummaryTableAllProjectsSideBySide from './projects-comparison-summary-table-all-projects-side-by-side';
import type {
  MergedProjectData,
  ProjectWithStats,
  ProjectSummaryFromUnified,
  ProjectGoal,
  HealthAssessment,
  ProjectKeywordData,
} from './projects-seo-command-center-shared-types';

// ---------------------------------------------------------------------------
// API response shapes (minimal — only what we need)
// ---------------------------------------------------------------------------

interface ProjectsApiResponse {
  projects: ProjectWithStats[];
}

interface UnifiedSummaryApiResponse {
  projects: ProjectSummaryFromUnified[];
  projectGoals: Record<string, ProjectGoal>;
}

interface HealthCheckApiResponse {
  projects: HealthAssessment[];
}

interface KeywordInsightsApiResponse {
  summary: {
    total: number;
    improved: number;
    declined: number;
    trackedTotal: number;
    trackedInTop10: number;
  };
  tiers: {
    top5: unknown[];
    top10: unknown[];
    top15: unknown[];
    top30: unknown[];
    beyond30: unknown[];
  };
  movers: {
    surging: unknown[];
    dropping: unknown[];
  };
  boundary: unknown[];
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ProjectsSeoCommandCenterMainPageWithDataFetching() {
  const [mergedData, setMergedData] = useState<MergedProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAll = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // Fetch projects list + unified summary + health check in parallel
      const [projectsRes, unifiedRes, healthRes] = await Promise.all([
        fetch('/api/v1/projects').then(r => r.json()) as Promise<ProjectsApiResponse>,
        fetch('/api/v1/dashboard/unified-summary').then(r => r.json()) as Promise<UnifiedSummaryApiResponse>,
        fetch('/api/v1/health-check').then(r => r.json()) as Promise<HealthCheckApiResponse>,
      ]);

      const projectsList: ProjectWithStats[] = projectsRes.projects ?? [];
      const unifiedProjects: ProjectSummaryFromUnified[] = unifiedRes.projects ?? [];
      const goalMap: Record<string, ProjectGoal> = unifiedRes.projectGoals ?? {};
      const healthProjects: HealthAssessment[] = healthRes.projects ?? [];

      // Fetch keyword insights per project in parallel
      const kwResults = await Promise.all(
        projectsList.map(async (p) => {
          try {
            const res: KeywordInsightsApiResponse = await fetch(
              `/api/v1/keyword-insights?projectId=${p.id}`
            ).then(r => r.json());

            const kwData: ProjectKeywordData = {
              projectId: p.id,
              summary: {
                total: res.summary?.total ?? 0,
                improved: res.summary?.improved ?? 0,
                declined: res.summary?.declined ?? 0,
                trackedTotal: res.summary?.trackedTotal ?? 0,
                trackedInTop10: res.summary?.trackedInTop10 ?? 0,
              },
              tiers: {
                top3: res.tiers?.top5?.length ?? 0,
                top10: (res.tiers?.top10?.length ?? 0) + (res.tiers?.top5?.length ?? 0),
                top30: (res.tiers?.top30?.length ?? 0) + (res.tiers?.top15?.length ?? 0) + (res.tiers?.top10?.length ?? 0) + (res.tiers?.top5?.length ?? 0),
                beyond30: res.tiers?.beyond30?.length ?? 0,
              },
              movers: {
                surging: res.movers?.surging?.length ?? 0,
                dropping: res.movers?.dropping?.length ?? 0,
                boundary: res.boundary?.length ?? 0,
              },
            };
            return { projectId: p.id, kwData };
          } catch {
            return { projectId: p.id, kwData: null };
          }
        })
      );

      const kwMap = new Map<string, ProjectKeywordData | null>(
        kwResults.map(r => [r.projectId, r.kwData])
      );

      // Merge all data sources by project id
      const merged: MergedProjectData[] = projectsList.map(p => ({
        project: p,
        unified: unifiedProjects.find(u => u.id === p.id) ?? null,
        health: healthProjects.find(h => h.id === p.id) ?? null,
        goal: goalMap[p.id] ?? null,
        kwData: kwMap.get(p.id) ?? null,
      }));

      setMergedData(merged);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load projects command center data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) return <PageLoading />;

  if (mergedData.length === 0) {
    return (
      <EmptyState
        title="Chưa có dự án nào"
        description="Thêm dự án để bắt đầu theo dõi SEO."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-[#818cf8]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">SEO Command Center</h1>
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            Tổng quan toàn bộ dự án — sức khỏe SEO, nội dung, từ khóa, cảnh báo
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {lastUpdated && (
            <span className="text-[11px] text-[var(--text-secondary)]">
              Cập nhật {lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => loadAll(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-border hover:border-[#555570] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* ── Per-project Cards Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
        {mergedData.map(data => (
          <ProjectCardPerProjectSeoDashboard key={data.project.id} data={data} />
        ))}
      </div>

      {/* ── Comparison Table ─────────────────────────────────────────────── */}
      <ProjectsComparisonSummaryTableAllProjectsSideBySide projects={mergedData} />
    </div>
  );
}
