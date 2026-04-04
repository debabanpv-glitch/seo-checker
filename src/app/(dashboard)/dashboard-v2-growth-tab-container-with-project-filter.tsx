'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import DashboardV2GrowthTrendCharts from './dashboard-v2-growth-trend-charts';
import DashboardV2GrowthTopKeywordMoversSurgingDropping from './dashboard-v2-growth-top-keyword-movers-surging-dropping';
import DashboardV2GrowthMonthOverMonthMetricsComparisonCards from './dashboard-v2-growth-month-over-month-metrics-comparison-cards';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Project {
  id: string;
  name: string;
}

interface UnifiedSummary {
  traffic: {
    totalClicks: number;
    totalImpressions: number;
    clicksTrend: number;
    impressionsTrend: number;
  };
  keywords: {
    top10: number;
    moversUp: number;
    moversDown: number;
  };
  content: {
    publishedThisMonth: number;
  };
  backlinks: {
    newThisMonth: number;
  };
  projects: Array<{
    id: string;
    name: string;
    clicks: number;
    kwTop10: number;
    contentPublished: number;
  }>;
}

interface GscSnapshot {
  date: string;
  clicks: number;
  impressions: number;
  period: string;
}

interface KeywordMover {
  keyword: string;
  position: number;
  change: number;
}

interface KeywordInsightsResponse {
  movers: {
    surging: Array<{ keyword: string; currentPosition: number; change: number | null }>;
    dropping: Array<{ keyword: string; currentPosition: number; change: number | null }>;
  };
  summary: {
    totalClicks: number;
    totalImpressions: number;
    total: number;
    trackedInTop10: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildGscTimeSeries(snapshots: GscSnapshot[]): Array<{ date: string; clicks: number; impressions: number }> {
  // Take weekly snapshots only, sorted by date asc, last 7 entries
  const weekly = snapshots
    .filter((s) => s.period === 'weekly')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);
  return weekly.map((s) => ({ date: s.date, clicks: s.clicks, impressions: s.impressions }));
}

function buildSurgingMovers(data: KeywordInsightsResponse['movers']['surging']): KeywordMover[] {
  return data
    .filter((k) => k.change !== null && k.change > 0)
    .map((k) => ({
      keyword: k.keyword,
      position: k.currentPosition,
      change: k.change ?? 0,
    }))
    .slice(0, 10);
}

function buildDroppingMovers(data: KeywordInsightsResponse['movers']['dropping']): KeywordMover[] {
  return data
    .filter((k) => k.change !== null && k.change < 0)
    .map((k) => ({
      keyword: k.keyword,
      position: k.currentPosition,
      change: Math.abs(k.change ?? 0),
    }))
    .slice(0, 10);
}

// ---------------------------------------------------------------------------
// Project filter dropdown
// ---------------------------------------------------------------------------

function ProjectFilterDropdown({
  projects,
  selected,
  onChange,
}: {
  projects: Project[];
  selected: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="relative inline-block">
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-secondary border border-border rounded-lg pl-3 pr-8 py-1.5 text-sm text-[var(--text-primary)] cursor-pointer focus:outline-none focus:border-accent"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8888a0] pointer-events-none" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardV2GrowthTabContainerWithProjectFilter — main Growth tab
// ---------------------------------------------------------------------------

export default function DashboardV2GrowthTabContainerWithProjectFilter({ selectedMonth, selectedYear }: { selectedMonth?: number; selectedYear?: number }) {
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<UnifiedSummary | null>(null);
  const [gscTimeSeries, setGscTimeSeries] = useState<Array<{ date: string; clicks: number; impressions: number }>>([]);
  const [surging, setSurging] = useState<KeywordMover[]>([]);
  const [dropping, setDropping] = useState<KeywordMover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Fetch projects list once, then default to first project
  useEffect(() => {
    fetch('/api/v1/projects')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data?.projects) ? data.projects : Array.isArray(data) ? data : [];
        setProjects(list);
        if (list.length > 0 && !initialized) {
          setProjectFilter(list[0].id);
          setInitialized(true);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch data on filter change
  useEffect(() => {
    if (!projectFilter) return; // wait for project to be selected
    setLoading(true);
    setError(null);

    const pid = projectFilter;
    const summaryUrl = `/api/v1/dashboard/unified-summary?project_id=${pid}`;

    const fetches: Promise<void>[] = [];

    // 1. Unified summary
    fetches.push(
      fetch(summaryUrl)
        .then((r) => r.json())
        .then((data: UnifiedSummary) => setSummary(data))
        .catch(() => setError('Không thể tải dữ liệu tổng quan'))
    );

    // 2. GSC snapshots for time series
    fetches.push(
      fetch(`/api/v1/gsc/snapshot?project_id=${pid}&limit=14`)
        .then((r) => r.json())
        .then((data: { snapshots: GscSnapshot[] }) => {
          setGscTimeSeries(buildGscTimeSeries(data.snapshots ?? []));
        })
        .catch(() => setGscTimeSeries([]))
    );

    // 3. Keyword insights for movers
    fetches.push(
      fetch(`/api/v1/keyword-insights?projectId=${pid}`)
        .then((r) => r.json())
        .then((data: KeywordInsightsResponse) => {
          setSurging(buildSurgingMovers(data.movers?.surging ?? []));
          setDropping(buildDroppingMovers(data.movers?.dropping ?? []));
        })
        .catch(() => { setSurging([]); setDropping([]); })
    );

    Promise.all(fetches).finally(() => setLoading(false));
  }, [projectFilter]);

  // ---------------------------------------------------------------------------
  // Build comparison metrics from unified summary
  // ---------------------------------------------------------------------------

  const currentMetrics = summary
    ? {
        clicks: summary.traffic.totalClicks,
        impressions: summary.traffic.totalImpressions,
        kwTop10: summary.keywords.top10,
        contentPublished: summary.content.publishedThisMonth,
        backlinkNew: summary.backlinks.newThisMonth,
      }
    : { clicks: 0, impressions: 0, kwTop10: 0, contentPublished: 0, backlinkNew: 0 };

  // Previous period derived from trend percentages
  const previousMetrics = summary
    ? {
        clicks: summary.traffic.clicksTrend !== 0
          ? Math.round(summary.traffic.totalClicks / (1 + summary.traffic.clicksTrend / 100))
          : summary.traffic.totalClicks,
        impressions: summary.traffic.impressionsTrend !== 0
          ? Math.round(summary.traffic.totalImpressions / (1 + summary.traffic.impressionsTrend / 100))
          : summary.traffic.totalImpressions,
        kwTop10: 0,
        contentPublished: 0,
        backlinkNew: 0,
      }
    : { clicks: 0, impressions: 0, kwTop10: 0, contentPublished: 0, backlinkNew: 0 };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header + filter */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Tăng trưởng</h2>
        <ProjectFilterDropdown
          projects={projects}
          selected={projectFilter}
          onChange={setProjectFilter}
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* GSC trend chart */}
      <DashboardV2GrowthTrendCharts gscData={gscTimeSeries} />

      {/* Month-over-month comparison */}
      <DashboardV2GrowthMonthOverMonthMetricsComparisonCards
        current={currentMetrics}
        previous={previousMetrics}
      />

      {/* Top keyword movers */}
      <DashboardV2GrowthTopKeywordMoversSurgingDropping
        surging={surging}
        dropping={dropping}
      />

    </div>
  );
}
