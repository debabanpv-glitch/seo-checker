'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart2,
  MousePointerClick,
  Eye,
  TrendingUp,
  Hash,
  Plus,
  Search,
  FileText,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Project } from '@/types';
import { cn } from '@/lib/utils';
import {
  type GscQuery,
  type GscPage,
  compareQueries,
  comparePages,
  findOpportunities,
  findAtRisk,
  generateInsights,
} from './gsc-comparison-utils';
import {
  type GscSnapshot,
  type TabKey,
  fmtDate,
  fmtDateFull,
  fmtNum,
  fmtCtr,
  fmtPos,
  calcDelta,
} from './gsc-types-and-helpers';
import { KpiCard } from './gsc-shared-sub-components';
import { OverviewTab } from './gsc-overview-tab-with-linechart';
import { QueriesTab } from './gsc-queries-tab-sortable-filtered-table';
import { PagesTab } from './gsc-pages-tab-sortable-filtered-table';
import { AnalysisTab } from './gsc-analysis-tab-with-insights-ctr-position-actions';
import { AddSnapshotModal } from './gsc-add-snapshot-form-modal';

export default function GscTrendsDashboard() {
  const [rawSnapshots, setRawSnapshots] = useState<GscSnapshot[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

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

  const fetchData = useCallback(async () => {
    if (!selectedProjectId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/gsc/trends?project_id=${selectedProjectId}`);
      if (res.ok) {
        const data = await res.json();
        setRawSnapshots(data.trends || data.snapshots || []);
      }
    } catch (err) {
      console.error('Failed to fetch GSC data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Chronological order (oldest first) for charts; API returns desc
  const snapshots = useMemo(() => [...rawSnapshots].reverse(), [rawSnapshots]);
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const prev = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  // Comparison data
  const comparedQueries = useMemo(() => {
    const cur = (latest?.top_queries ?? []) as GscQuery[];
    const prv = (prev?.top_queries ?? []) as GscQuery[];
    return compareQueries(cur, prv);
  }, [latest, prev]);

  const comparedPages = useMemo(() => {
    const cur = (latest?.top_pages ?? []) as GscPage[];
    const prv = (prev?.top_pages ?? []) as GscPage[];
    return comparePages(cur, prv);
  }, [latest, prev]);

  const opportunities = useMemo(() => findOpportunities(comparedQueries), [comparedQueries]);
  const atRisk = useMemo(() => findAtRisk(comparedQueries), [comparedQueries]);

  const insights = useMemo(() => {
    if (!latest) return [];
    return generateInsights(comparedQueries, comparedPages, latest, prev);
  }, [comparedQueries, comparedPages, latest, prev]);

  // Deltas
  const clicksDelta = prev ? calcDelta(latest?.clicks ?? 0, prev.clicks) : undefined;
  const impressionsDelta = prev ? calcDelta(latest?.impressions ?? 0, prev.impressions) : undefined;
  const ctrDelta = prev ? calcDelta(latest?.ctr ?? 0, prev.ctr) : undefined;
  const positionDelta = prev ? calcDelta(latest?.position ?? 0, prev.position, true) : undefined;

  // Stats
  const winners = comparedQueries.filter((q) => q.status === 'winner');
  const losers = comparedQueries.filter((q) => q.status === 'loser');
  const newKw = comparedQueries.filter((q) => q.status === 'new');

  const projectName = projects.find((p) => p.id === selectedProjectId)?.name ?? '';
  const periodLabel = prev && latest
    ? `${fmtDate(prev.date)} → ${fmtDate(latest.date)}`
    : latest ? fmtDateFull(latest.date) : '';

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Tổng quan', icon: BarChart2 },
    { key: 'queries', label: 'Từ khóa', icon: Search },
    { key: 'pages', label: 'Trang', icon: FileText },
    { key: 'analysis', label: 'Phân tích', icon: Lightbulb },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Search Console</h1>
          {periodLabel && (
            <p className="text-xs text-[#8888a0] mt-0.5">{projectName} — {periodLabel}</p>
          )}
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
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Snapshot
          </button>
        </div>
      </div>

      {isLoading ? (
        <PageLoading />
      ) : !latest ? (
        <EmptyState
          icon={BarChart2}
          title="Chưa có dữ liệu GSC"
          description="Thêm snapshot từ Google Search Console để bắt đầu phân tích"
        />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Clicks"
              value={fmtNum(latest.clicks)}
              icon={MousePointerClick}
              color="bg-blue-500/20 text-blue-400"
              delta={clicksDelta}
              subtitle={prev ? `Kỳ trước: ${fmtNum(prev.clicks)}` : undefined}
            />
            <KpiCard
              label="Impressions"
              value={fmtNum(latest.impressions)}
              icon={Eye}
              color="bg-purple-500/20 text-purple-400"
              delta={impressionsDelta}
              subtitle={prev ? `Kỳ trước: ${fmtNum(prev.impressions)}` : undefined}
            />
            <KpiCard
              label="CTR"
              value={fmtCtr(latest.ctr)}
              icon={TrendingUp}
              color="bg-green-500/20 text-green-400"
              delta={ctrDelta}
              subtitle={prev ? `Kỳ trước: ${fmtCtr(prev.ctr)}` : undefined}
            />
            <KpiCard
              label="Vị trí TB"
              value={fmtPos(latest.position)}
              icon={Hash}
              color="bg-orange-500/20 text-orange-400"
              delta={positionDelta}
              subtitle={prev ? `Kỳ trước: ${fmtPos(prev.position)}` : undefined}
            />
          </div>

          {/* Expert Assessment Banner */}
          {insights.length > 0 && (
            <div className="bg-card border border-accent/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Đánh giá chuyên gia</p>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">{insights[0]}</p>
                  {insights[1] && (
                    <p className="text-sm text-[#8888a0] mt-1">{insights[1]}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
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
                {key === 'queries' && comparedQueries.length > 0 && (
                  <span className="text-[10px] opacity-70">({comparedQueries.length})</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <OverviewTab
              snapshots={snapshots}
              winners={winners}
              losers={losers}
              newKw={newKw}
              opportunities={opportunities}
              atRisk={atRisk}
              topQueries={comparedQueries}
              topPages={comparedPages}
            />
          )}
          {activeTab === 'queries' && (
            <QueriesTab queries={comparedQueries} opportunities={opportunities} atRisk={atRisk} />
          )}
          {activeTab === 'pages' && (
            <PagesTab pages={comparedPages} />
          )}
          {activeTab === 'analysis' && (
            <AnalysisTab
              insights={insights}
              queries={comparedQueries}
              pages={comparedPages}
              latest={latest}
              prev={prev}
            />
          )}
        </>
      )}

      {showAddModal && (
        <AddSnapshotModal
          projects={projects}
          defaultProjectId={selectedProjectId}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchData(); }}
        />
      )}
    </div>
  );
}
