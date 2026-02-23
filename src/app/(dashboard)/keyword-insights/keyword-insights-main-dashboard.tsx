'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lightbulb, Layers, TrendingUp, AlertCircle, Star, RefreshCw } from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { type InsightsResponse, type SectionTab } from './keyword-insights-types-and-helpers';
import { SummaryStatsBar } from './keyword-insights-summary-stats-bar';
import { TierDistributionSection } from './keyword-insights-tier-distribution-section';
import { MoversSection } from './keyword-insights-movers-surging-and-dropping-section';
import { BoundarySection } from './keyword-insights-boundary-near-page-one-section';
import { TrackedKeywordsSection } from './keyword-insights-tracked-keywords-section';
import { ExpertPanel } from './keyword-insights-expert-analysis-panel';
import { cn } from '@/lib/utils';

interface Project { id: string; name: string }

const TABS: { key: SectionTab; label: string; icon: React.ElementType }[] = [
  { key: 'tiers', label: 'Phân tầng', icon: Layers },
  { key: 'movers', label: 'Biến động', icon: TrendingUp },
  { key: 'boundary', label: 'Trên vòng', icon: AlertCircle },
  { key: 'tracked', label: 'Theo dõi', icon: Star },
];

export default function KeywordInsightsMainDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SectionTab>('tiers');

  // Fetch projects
  useEffect(() => {
    fetch('/api/v1/projects')
      .then((r) => r.json())
      .then((d) => {
        const list = d.projects || [];
        setProjects(list);
        if (list.length > 0) setSelectedProjectId(list[0].id);
      })
      .catch(console.error);
  }, []);

  // Fetch insights
  const fetchData = useCallback(async () => {
    if (!selectedProjectId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/keyword-insights?projectId=${selectedProjectId}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('Failed to fetch keyword insights:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Toggle tracked — optimistic update + API call
  const handleToggleTracked = useCallback(async (keyword: string, currentTracked: boolean) => {
    if (!data) return;
    const newTracked = !currentTracked;

    // Optimistic: update all occurrences in data
    const updateKw = (kw: typeof data.tracked[0]) =>
      kw.keyword === keyword ? { ...kw, is_tracked: newTracked } : kw;

    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tiers: {
          top5: prev.tiers.top5.map(updateKw),
          top10: prev.tiers.top10.map(updateKw),
          top15: prev.tiers.top15.map(updateKw),
          top30: prev.tiers.top30.map(updateKw),
          beyond30: prev.tiers.beyond30.map(updateKw),
        },
        movers: {
          surging: prev.movers.surging.map(updateKw),
          dropping: prev.movers.dropping.map(updateKw),
        },
        boundary: prev.boundary.map(updateKw),
        tracked: newTracked
          ? [...prev.tracked, ...findKwInAll(prev, keyword)].filter((k, i, arr) => arr.findIndex((x) => x.keyword === k.keyword) === i)
          : prev.tracked.filter((k) => k.keyword !== keyword),
        summary: {
          ...prev.summary,
          trackedTotal: prev.summary.trackedTotal + (newTracked ? 1 : -1),
          trackedInTop10: prev.summary.trackedInTop10 + (newTracked && findKwPos(prev, keyword) <= 10 ? 1 : !newTracked && findKwPos(prev, keyword) <= 10 ? -1 : 0),
        },
      };
    });

    // API call
    await fetch('/api/v1/keyword-insights', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, project_id: selectedProjectId, is_tracked: newTracked }),
    }).catch(console.error);
  }, [data, selectedProjectId]);

  const projectName = projects.find((p) => p.id === selectedProjectId)?.name ?? '';
  const dateLabel = data?.meta.latestDate
    ? `Check: ${new Date(data.meta.latestDate).toLocaleDateString('vi-VN')} (${data.meta.checkDates.length} lần)`
    : '';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Keyword Insights</h1>
          {dateLabel && <p className="text-xs text-[#8888a0] mt-0.5">{projectName} — {dateLabel}</p>}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-[var(--text-primary)] text-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <PageLoading />
      ) : !data || data.summary.total === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Chưa có dữ liệu keyword"
          description="Đồng bộ từ khóa từ Google Sheets trong trang Keywords trước"
        />
      ) : (
        <>
          {/* Summary stats */}
          <SummaryStatsBar summary={data.summary} meta={data.meta} />

          {/* Section tabs */}
          <div className="flex bg-card border border-border rounded-lg overflow-hidden text-sm w-fit">
            {TABS.map(({ key, label, icon: TabIcon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors',
                  activeTab === key ? 'bg-accent text-white' : 'text-[#8888a0] hover:text-[var(--text-primary)]',
                )}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {label}
                {key === 'boundary' && data.boundary.length > 0 && (
                  <span className="text-[10px] px-1 rounded bg-amber-500/20 text-amber-400">{data.boundary.length}</span>
                )}
                {key === 'movers' && (data.movers.surging.length + data.movers.dropping.length) > 0 && (
                  <span className="text-[10px] opacity-70">({data.movers.surging.length + data.movers.dropping.length})</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'tiers' && (
            <TierDistributionSection tiers={data.tiers} onToggleTracked={handleToggleTracked} />
          )}
          {activeTab === 'movers' && (
            <MoversSection surging={data.movers.surging} dropping={data.movers.dropping} onToggleTracked={handleToggleTracked} />
          )}
          {activeTab === 'boundary' && (
            <BoundarySection boundary={data.boundary} onToggleTracked={handleToggleTracked} />
          )}
          {activeTab === 'tracked' && (
            <TrackedKeywordsSection tracked={data.tracked} onToggleTracked={handleToggleTracked} />
          )}

          {/* Expert panel — always visible */}
          <ExpertPanel insights={data.expertInsights} />
        </>
      )}
    </div>
  );
}

// Helpers for optimistic update
function findKwInAll(data: InsightsResponse, keyword: string) {
  const all = [
    ...data.tiers.top5, ...data.tiers.top10, ...data.tiers.top15,
    ...data.tiers.top30, ...data.tiers.beyond30,
  ];
  return all.filter((k) => k.keyword === keyword);
}

function findKwPos(data: InsightsResponse, keyword: string): number {
  const all = [
    ...data.tiers.top5, ...data.tiers.top10, ...data.tiers.top15,
    ...data.tiers.top30, ...data.tiers.beyond30,
  ];
  return all.find((k) => k.keyword === keyword)?.currentPosition ?? 999;
}
