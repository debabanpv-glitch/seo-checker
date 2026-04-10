'use client';

// ---------------------------------------------------------------------------
// Keyword Ranking Page — Orchestrator (SE Ranking style)
// Two tabs: Summary (overview charts) + Detailed (filterable keyword table)
// Data: keyword-insights API + growth API + projects + sheet configs
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BarChart3, List, RefreshCw, Loader2, CheckCircle, AlertCircle, Settings2, Star, Eye, FileText,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { Project } from '@/types';

import type { KeywordInsightsResponse } from '@/lib/services/keyword-insights-aggregator.service';
import type { GrowthSnapshot } from './keyword-ranking-position-timeline-chart';
import { type SheetConfig } from './keyword-ranking-types-and-helpers';
import { SheetConfigModal } from './keyword-ranking-sheet-config-modal';
import { RankingSummaryTab } from './keyword-ranking-summary-tab';
import { RankingDetailedTab } from './keyword-ranking-detailed-tab';
import { RankingTopPagesTab } from './keyword-ranking-top-pages-tab';

type MainTab = 'summary' | 'detailed' | 'top-pages';

export default function KeywordRankingPage() {
  const searchParams = useSearchParams();
  const kwType = searchParams.get('type'); // 'committed' | 'follow' | null (all)
  const [mainTab, setMainTab] = useState<MainTab>('summary');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Data
  const [insights, setInsights] = useState<KeywordInsightsResponse | null>(null);
  const [growthSnapshots, setGrowthSnapshots] = useState<GrowthSnapshot[]>([]);

  // Sync state
  const [sheetConfigs, setSheetConfigs] = useState<SheetConfig[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editConfigs, setEditConfigs] = useState<SheetConfig[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  // ── Data fetching ───────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Always fetch projects + sheet configs
      const [projectsRes, configRes] = await Promise.all([
        fetch('/api/v1/projects'),
        fetch('/api/v1/keyword-rankings/sync-all'),
      ]);
      const projectsData = await projectsRes.json();
      const configData = await configRes.json();
      setProjects(projectsData.projects || []);
      setSheetConfigs(configData.configs || []);

      // Auto-select first project if none selected
      const projList: Project[] = projectsData.projects || [];
      const projId = selectedProject || projList[0]?.id || '';
      if (!selectedProject && projId) setSelectedProject(projId);

      // Fetch insights + growth for selected project
      if (projId) {
        const [insightsRes, growthRes] = await Promise.all([
          fetch(`/api/v1/keyword-insights?projectId=${projId}`),
          fetch(`/api/v1/keyword-rankings/growth?projectId=${projId}&days=90`),
        ]);
        const insightsData = await insightsRes.json();
        const growthData = await growthRes.json();
        setInsights(insightsData.error ? null : insightsData);
        setGrowthSnapshots(growthData.snapshots || []);
      } else {
        setInsights(null);
        setGrowthSnapshots([]);
      }
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Sync ────────────────────────────────────────────────────────────────
  const handleSyncAll = async () => {
    if (sheetConfigs.length === 0) { setEditConfigs([]); setShowConfigModal(true); return; }
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/v1/keyword-rankings/sync-all', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      const data = await res.json();
      setSyncResult({ success: data.success, message: data.message });
      if (data.success) fetchData();
      setTimeout(() => setSyncResult(null), 5000);
    } catch {
      setSyncResult({ success: false, message: 'Lỗi kết nối' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveConfigs = async () => {
    const valid = editConfigs.filter((c) => c.url.trim());
    await fetch('/api/v1/keyword-rankings/sync-all', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configs: valid }),
    });
    setSheetConfigs(valid);
    setShowConfigModal(false);
  };

  // ── Toggle tracked ───────────────────────────────────────────────────────
  const handleToggleTracked = async (keyword: string, projectId: string, tracked: boolean) => {
    try {
      await fetch('/api/v1/keyword-insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, project_id: projectId, is_tracked: tracked }),
      });
      fetchData(); // refresh
    } catch (error) {
      console.error('Toggle tracked failed:', error);
    }
  };

  // ── Computed ────────────────────────────────────────────────────────────
  const rawKeywords = insights
    ? [...insights.tiers.top5, ...insights.tiers.top10, ...insights.tiers.top15, ...insights.tiers.top30, ...insights.tiers.beyond30]
    : [];
  // Filter by type query param
  const allKeywords = kwType === 'committed'
    ? rawKeywords.filter(k => k.is_tracked)
    : kwType === 'follow'
    ? rawKeywords.filter(k => !k.is_tracked)
    : rawKeywords;
  const hasData = insights !== null && allKeywords.length > 0;
  const pageTitle = kwType === 'committed' ? 'Từ khóa Cam kết' : kwType === 'follow' ? 'Từ khóa Tự follow' : 'Thứ hạng từ khóa';
  const PageIcon = kwType === 'committed' ? Star : kwType === 'follow' ? Eye : null;

  // Build filtered insights when kwType is set
  const filteredInsights = insights && kwType ? {
    ...insights,
    summary: {
      ...insights.summary,
      total: allKeywords.length,
      trackedInTop10: allKeywords.filter(k => k.is_tracked && k.currentPosition > 0 && k.currentPosition <= 10).length,
    },
    tiers: {
      top5: allKeywords.filter(k => k.currentPosition >= 1 && k.currentPosition <= 5),
      top10: allKeywords.filter(k => k.currentPosition > 5 && k.currentPosition <= 10),
      top15: allKeywords.filter(k => k.currentPosition > 10 && k.currentPosition <= 15),
      top30: allKeywords.filter(k => k.currentPosition > 15 && k.currentPosition <= 30),
      beyond30: allKeywords.filter(k => k.currentPosition > 30 || k.currentPosition === 0),
    },
    movers: {
      surging: (insights.movers?.surging ?? []).filter(k => kwType === 'committed' ? k.is_tracked : !k.is_tracked),
      dropping: (insights.movers?.dropping ?? []).filter(k => kwType === 'committed' ? k.is_tracked : !k.is_tracked),
    },
  } : insights;

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            {PageIcon && <PageIcon className="w-5 h-5 text-accent" />}
            {pageTitle}
            {kwType && <span className="text-xs font-normal text-[#8888a0] bg-secondary px-2 py-0.5 rounded-full">{allKeywords.length} KW</span>}
          </h1>

          {/* Main tabs: Summary / Detailed */}
          <div className="flex bg-secondary/50 rounded-lg p-0.5 border border-border">
            {([
              { key: 'summary' as MainTab, label: 'Tổng quan', icon: BarChart3 },
              { key: 'detailed' as MainTab, label: 'Chi tiết', icon: List },
              { key: 'top-pages' as MainTab, label: 'Top Pages', icon: FileText },
            ]).map((tab) => (
              <button key={tab.key} onClick={() => setMainTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  mainTab === tab.key
                    ? 'bg-accent text-white shadow-sm shadow-accent/30'
                    : 'text-[#8888a0] hover:text-[var(--text-primary)]',
                )}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Project selector */}
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-xs">
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {/* Check dates */}
          {insights?.meta.checkDates && insights.meta.checkDates.length > 0 && (
            <div className="flex items-center gap-1 hidden sm:flex">
              {insights.meta.checkDates.slice(-4).map((d) => (
                <span key={d} className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded border font-mono',
                  d === insights.meta.latestDate
                    ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400'
                    : 'bg-secondary border-border text-[#8888a0]',
                )}>
                  {new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                </span>
              ))}
            </div>
          )}

          {/* Sync result */}
          {syncResult && (
            <span className={cn('text-xs px-2 py-1 rounded animate-in fade-in',
              syncResult.success ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400')}>
              {syncResult.success ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <AlertCircle className="w-3 h-3 inline mr-1" />}
              {syncResult.message}
            </span>
          )}

          {/* Sync button */}
          <button onClick={handleSyncAll} disabled={syncing}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-lg text-white font-medium text-xs transition-colors">
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {syncing ? 'Đồng bộ...' : 'Đồng bộ'}
          </button>

          {/* Settings */}
          <button onClick={() => { setEditConfigs([...sheetConfigs]); setShowConfigModal(true); }}
            className="p-1.5 hover:bg-secondary border border-border rounded-lg text-[#8888a0] transition-colors" title="Cấu hình Sheets">
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {!hasData ? (
        <EmptyState icon={BarChart3} title="Chưa có dữ liệu thứ hạng"
          description={selectedProject
            ? "Nhấn 'Đồng bộ' để lấy dữ liệu từ Google Sheet"
            : "Chọn dự án và đồng bộ dữ liệu từ Google Sheet"
          } />
      ) : mainTab === 'summary' ? (
        <RankingSummaryTab insights={filteredInsights!} growthSnapshots={growthSnapshots} />
      ) : mainTab === 'top-pages' ? (
        <RankingTopPagesTab keywords={allKeywords} />
      ) : (
        <RankingDetailedTab
          keywords={allKeywords}
          checkDates={insights!.meta.checkDates}
          projectId={selectedProject}
          onToggleTracked={handleToggleTracked}
        />
      )}

      {/* ── Sheet Config Modal ──────────────────────────────────────────── */}
      {showConfigModal && (
        <SheetConfigModal
          configs={editConfigs}
          projects={projects}
          onConfigsChange={setEditConfigs}
          onSave={handleSaveConfigs}
          onClose={() => setShowConfigModal(false)}
        />
      )}
    </div>
  );
}
