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
      // Fetch all snapshots (daily + weekly) — daily for charts, weekly for keyword comparison
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

  // Daily snapshots for line chart (or all if no daily)
  const chartSnapshots = useMemo(() => {
    const daily = snapshots.filter((s) => s.period === 'daily');
    return daily.length > 0 ? daily : snapshots;
  }, [snapshots]);

  // Weekly snapshots for keyword comparison (have top_queries/top_pages)
  const weeklySnapshots = useMemo(
    () => snapshots.filter((s) => s.period === 'weekly'),
    [snapshots],
  );

  // Latest snapshot for KPI cards — prefer weekly (has more data)
  const latest = weeklySnapshots.length > 0
    ? weeklySnapshots[weeklySnapshots.length - 1]
    : snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const prev = weeklySnapshots.length > 1
    ? weeklySnapshots[weeklySnapshots.length - 2]
    : snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  // Comparison data — from weekly snapshots which have top_queries
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

  // Merge ALL queries across weekly snapshots (union) for richer keyword view
  const allQueriesWithHistory = useMemo(() => {
    const qMap = new Map<string, { query: string; clicks: number; impressions: number; ctr: number; position: number; history: { date: string; clicks: number; impressions: number; position: number }[] }>();
    for (const snap of weeklySnapshots) {
      const queries = (snap.top_queries ?? []) as GscQuery[];
      for (const q of queries) {
        const key = q.query.toLowerCase().trim();
        if (!qMap.has(key)) {
          qMap.set(key, { query: q.query, clicks: 0, impressions: 0, ctr: 0, position: 0, history: [] });
        }
        const entry = qMap.get(key)!;
        entry.history.push({ date: snap.date, clicks: q.clicks, impressions: q.impressions, position: q.position });
      }
    }
    // Set latest values
    qMap.forEach((entry) => {
      entry.history.sort((a, b) => a.date.localeCompare(b.date));
      const last = entry.history[entry.history.length - 1];
      entry.clicks = last.clicks;
      entry.impressions = last.impressions;
      entry.position = last.position;
      entry.ctr = entry.impressions > 0 ? entry.clicks / entry.impressions : 0;
    });
    return [...qMap.values()].sort((a, b) => b.clicks - a.clicks);
  }, [weeklySnapshots]);

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
  const periodLabel = chartSnapshots.length > 1
    ? `${fmtDate(chartSnapshots[0].date)} → ${fmtDate(chartSnapshots[chartSnapshots.length - 1].date)} (${chartSnapshots.length} ngày)`
    : latest ? fmtDateFull(latest.date) : '';

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Tổng quan', icon: BarChart2 },
    { key: 'queries', label: 'Từ khóa', icon: Search },
    { key: 'pages', label: 'Trang', icon: FileText },
    { key: 'analysis', label: 'Phân tích', icon: Lightbulb },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Search Console</h1>

          {/* Tabs — pill style matching keyword-ranking */}
          <div className="flex bg-secondary/50 rounded-lg p-0.5 border border-border">
            {TABS.map(({ key, label, icon: TabIcon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  activeTab === key
                    ? 'bg-accent text-white shadow-sm shadow-accent/30'
                    : 'text-[#8888a0] hover:text-[var(--text-primary)]',
                )}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-xs"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Period label */}
          {periodLabel && (
            <span className="text-[10px] px-2 py-1 rounded bg-secondary border border-border text-[#8888a0] font-mono hidden sm:inline">
              {periodLabel}
            </span>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm dữ liệu
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
              label="Lượt click"
              value={fmtNum(latest.clicks)}
              icon={MousePointerClick}
              color="bg-blue-500/20 text-blue-400"
              delta={clicksDelta}
              subtitle={prev ? `Kỳ trước: ${fmtNum(prev.clicks)}` : undefined}
            />
            <KpiCard
              label="Hiển thị"
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

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <OverviewTab
              snapshots={chartSnapshots}
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
            <QueriesTab queries={comparedQueries} opportunities={opportunities} atRisk={atRisk} allQueries={allQueriesWithHistory} />
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
