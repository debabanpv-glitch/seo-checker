'use client';

// ---------------------------------------------------------------------------
// Keyword Ranking Page — Orchestrator
// Imports: types, shared components, GSC section, keyword row, sheet modal
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Settings2,
  Search,
  Target,
  Eye,
  Zap,
  MousePointerClick,
  BarChart2,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { Project } from '@/types';

import {
  type KeywordRanking,
  type KeywordTrend,
  type SheetConfig,
  type GscSnapshot,
  type ViewTab,
  buildGscQueryMap,
} from './keyword-ranking-types-and-helpers';
import { ScoreCard } from './keyword-ranking-shared-sub-components';
import { GscTrafficSection } from './keyword-ranking-gsc-traffic-overview-section';
import { KeywordRow } from './keyword-ranking-keyword-row-with-expand';
import { SheetConfigModal } from './keyword-ranking-sheet-config-modal';

export default function KeywordRankingPage() {
  const [rankings, setRankings] = useState<KeywordRanking[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [expandedKw, setExpandedKw] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'position' | 'change' | 'keyword' | 'clicks'>('position');
  const [sortAsc, setSortAsc] = useState(true);

  // Sync state
  const [sheetConfigs, setSheetConfigs] = useState<SheetConfig[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editConfigs, setEditConfigs] = useState<SheetConfig[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  // GSC state
  const [gscSnapshots, setGscSnapshots] = useState<GscSnapshot[]>([]);

  // ── Data fetching ─────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetches: Promise<Response>[] = [
        fetch(`/api/v1/keyword-rankings?limit=5000${selectedProject ? `&projectId=${selectedProject}` : ''}`),
        fetch('/api/v1/projects'),
        fetch('/api/v1/keyword-rankings/sync-all'),
      ];
      if (selectedProject) {
        fetches.push(fetch(`/api/v1/gsc/snapshot?project_id=${selectedProject}&limit=2`));
      }
      const responses = await Promise.all(fetches);
      const [rankingsData, projectsData, configData] = await Promise.all([
        responses[0].json(), responses[1].json(), responses[2].json(),
      ]);
      setRankings(rankingsData.rankings || []);
      setProjects(projectsData.projects || []);
      setSheetConfigs(configData.configs || []);
      if (selectedProject && responses[3]) {
        const gscData = await responses[3].json();
        setGscSnapshots(gscData.snapshots || []);
      } else {
        setGscSnapshots([]);
      }
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Sync ──────────────────────────────────────────────────────────────
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
      setSyncResult({ success: false, message: 'Loi ket noi' });
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

  // ── GSC query map ────────────────────────────────────────────────────
  const gscQueryMap = useMemo(() => buildGscQueryMap(gscSnapshots), [gscSnapshots]);

  // ── Process trends ────────────────────────────────────────────────────
  const keywordTrends = useMemo(() => {
    const keywordMap = new Map<string, KeywordRanking[]>();
    rankings.forEach((r) => {
      const key = r.keyword.toLowerCase();
      if (!keywordMap.has(key)) keywordMap.set(key, []);
      keywordMap.get(key)!.push(r);
    });

    const trends: KeywordTrend[] = [];
    keywordMap.forEach((records) => {
      const sorted = records.sort((a, b) => b.date.localeCompare(a.date));
      const latest = sorted[0];
      const previous = sorted[1];

      const history: { date: string; position: number }[] = [];
      const seenDates = new Set<string>();
      sorted.forEach((r) => {
        if (!seenDates.has(r.date)) {
          seenDates.add(r.date);
          history.push({ date: r.date, position: r.position });
        }
      });
      history.sort((a, b) => a.date.localeCompare(b.date));

      const gscData = gscQueryMap.get(latest.keyword.toLowerCase().trim());

      trends.push({
        keyword: latest.keyword,
        url: latest.url,
        currentPosition: latest.position,
        previousPosition: previous?.position ?? null,
        change: previous ? previous.position - latest.position : null,
        history,
        ranking_tier: latest.ranking_tier,
        keyword_type: latest.keyword_type,
        gscClicks: gscData?.clicks,
        gscImpressions: gscData?.impressions,
        gscCtr: gscData?.ctr,
        gscPosition: gscData?.position,
      });
    });
    return trends;
  }, [rankings, gscQueryMap]);

  // ── GSC-only queries (in console but not tracked in sheet) ───────────
  const gscOnlyQueries = useMemo(() => {
    if (gscQueryMap.size === 0) return [];
    const trackedKeys = new Set(keywordTrends.map((t) => t.keyword.toLowerCase().trim()));
    const result: KeywordTrend[] = [];
    gscQueryMap.forEach((q, key) => {
      if (!trackedKeys.has(key)) {
        result.push({
          keyword: q.query, url: '', currentPosition: Math.round(q.position * 10) / 10,
          previousPosition: null, change: null, history: [],
          gscClicks: q.clicks, gscImpressions: q.impressions, gscCtr: q.ctr, gscPosition: q.position,
        });
      }
    });
    return result.sort((a, b) => (b.gscClicks ?? 0) - (a.gscClicks ?? 0));
  }, [gscQueryMap, keywordTrends]);

  // ── Stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = keywordTrends.length;
    const top3 = keywordTrends.filter((t) => t.currentPosition <= 3).length;
    const top10 = keywordTrends.filter((t) => t.currentPosition <= 10).length;
    const improved = keywordTrends.filter((t) => t.change !== null && t.change > 0).length;
    const declined = keywordTrends.filter((t) => t.change !== null && t.change < 0).length;
    const camKet = keywordTrends.filter((t) => t.keyword_type === 'KW Cam kết').length;
    const blog = keywordTrends.filter((t) => t.keyword_type === 'KW Blog').length;
    const opportunity = keywordTrends.filter((t) => t.currentPosition >= 11 && t.currentPosition <= 20).length;
    const totalClicks = keywordTrends.reduce((s, t) => s + (t.gscClicks ?? 0), 0);
    const totalImpressions = keywordTrends.reduce((s, t) => s + (t.gscImpressions ?? 0), 0);
    const hasGscData = gscQueryMap.size > 0;
    const gscOnlyCount = gscOnlyQueries.length;
    return { total, top3, top10, improved, declined, camKet, blog, opportunity, totalClicks, totalImpressions, hasGscData, gscOnlyCount };
  }, [keywordTrends, gscQueryMap, gscOnlyQueries]);

  // ── Filter + Sort ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (activeTab === 'gsc_only') {
      let result = [...gscOnlyQueries];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter((t) => t.keyword.toLowerCase().includes(q));
      }
      result.sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'clicks') cmp = (b.gscClicks ?? 0) - (a.gscClicks ?? 0);
        else if (sortBy === 'position') cmp = a.currentPosition - b.currentPosition;
        else if (sortBy === 'keyword') cmp = a.keyword.localeCompare(b.keyword);
        else cmp = (b.gscClicks ?? 0) - (a.gscClicks ?? 0);
        return sortAsc ? cmp : -cmp;
      });
      return result;
    }

    let result = [...keywordTrends];
    switch (activeTab) {
      case 'cam_ket': result = result.filter((t) => t.keyword_type === 'KW Cam kết'); break;
      case 'blog': result = result.filter((t) => t.keyword_type === 'KW Blog'); break;
      case 'opportunity': result = result.filter((t) => t.currentPosition >= 11 && t.currentPosition <= 20); break;
      case 'declining': result = result.filter((t) => t.change !== null && t.change < 0); break;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.keyword.toLowerCase().includes(q) || t.url.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'position') cmp = a.currentPosition - b.currentPosition;
      else if (sortBy === 'change') cmp = (b.change ?? 0) - (a.change ?? 0);
      else if (sortBy === 'clicks') cmp = (b.gscClicks ?? 0) - (a.gscClicks ?? 0);
      else cmp = a.keyword.localeCompare(b.keyword);
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [keywordTrends, gscOnlyQueries, activeTab, searchQuery, sortBy, sortAsc]);

  const toggleSort = (col: 'position' | 'change' | 'keyword' | 'clicks') => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(col === 'position'); }
  };

  const dates = useMemo(() => {
    const s = new Set(rankings.map((r) => r.date));
    return Array.from(s).sort();
  }, [rankings]);
  const latestDate = dates[dates.length - 1];

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Keyword Ranking</h1>
          {stats.total > 0 ? (
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-[#8888a0] text-sm">{stats.total} từ khóa</span>
              {selectedProject ? (
                <>
                  <span className="text-[#555570]">·</span>
                  <span className="text-sm font-medium text-emerald-400">
                    Check mới nhất: {latestDate ? new Date(latestDate).toLocaleDateString('vi-VN') : '—'}
                  </span>
                  <span className="text-[#555570]">·</span>
                  <div className="flex items-center gap-1">
                    {dates.map((d) => (
                      <span key={d} className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded border font-mono',
                        d === latestDate ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400' : 'bg-secondary border-border text-[#8888a0]'
                      )}>
                        {new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <span className="text-[#8888a0] text-sm">· Chọn dự án để xem ngày check</span>
              )}
            </div>
          ) : (
            <p className="text-[#8888a0] text-sm mt-0.5">Chưa có dữ liệu. Cấu hình Google Sheet để bắt đầu.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {syncResult && (
            <span className={cn('text-xs px-2 py-1 rounded animate-in fade-in', syncResult.success ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400')}>
              {syncResult.success ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <AlertCircle className="w-3 h-3 inline mr-1" />}
              {syncResult.message}
            </span>
          )}
          <button onClick={handleSyncAll} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-lg text-white font-medium text-sm transition-colors">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? 'Syncing...' : sheetConfigs.length > 0 ? 'Sync' : 'Cau hinh Sheet'}
          </button>
          <button onClick={() => { setEditConfigs([...sheetConfigs]); setShowConfigModal(true); }}
            className="p-2 hover:bg-secondary border border-border rounded-lg text-[#8888a0] transition-colors" title="Cau hinh Sheets">
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {stats.total === 0 ? (
        <EmptyState icon={TrendingUp} title="Chua co du lieu keyword ranking"
          description="Nhan 'Cau hinh Sheet' de them Google Sheet URL, sau do bam Sync" />
      ) : (
        <>
          {/* ── Score Cards ──────────────────────────────────────────── */}
          <div className={cn('grid gap-3', stats.hasGscData ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4')}>
            <ScoreCard label="Top 3" value={stats.top3} total={stats.total} color="text-emerald-400" bgColor="bg-emerald-400" />
            <ScoreCard label="Top 10" value={stats.top10} total={stats.total} color="text-accent" bgColor="bg-accent" />
            <ScoreCard label="Tang hang" value={stats.improved} icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} color="text-emerald-400" />
            <ScoreCard label="Giam hang" value={stats.declined} icon={<TrendingDown className="w-4 h-4 text-red-400" />} color="text-red-400" />
            {stats.hasGscData && (
              <>
                <ScoreCard label="Clicks" value={stats.totalClicks} icon={<MousePointerClick className="w-4 h-4 text-sky-400" />} color="text-sky-400" />
                <ScoreCard label="Impressions" value={stats.totalImpressions} icon={<Eye className="w-4 h-4 text-purple-400" />} color="text-purple-400" />
              </>
            )}
          </div>

          {/* ── GSC Traffic Overview ─────────────────────────────────── */}
          {selectedProject && gscSnapshots.length > 0 && (
            <GscTrafficSection snapshots={gscSnapshots} />
          )}

          {/* ── Tabs + Search + Project ──────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1 overflow-x-auto">
              {([
                { key: 'all' as ViewTab, label: 'Tat ca', count: stats.total, icon: null as React.ReactNode },
                { key: 'cam_ket' as ViewTab, label: 'Cam ket', count: stats.camKet, icon: <Target className="w-3 h-3" /> as React.ReactNode },
                { key: 'blog' as ViewTab, label: 'Blog', count: stats.blog, icon: <Eye className="w-3 h-3" /> as React.ReactNode },
                { key: 'opportunity' as ViewTab, label: 'Co hoi', count: stats.opportunity, icon: <Zap className="w-3 h-3" /> as React.ReactNode },
                { key: 'declining' as ViewTab, label: 'Giam', count: stats.declined, icon: <TrendingDown className="w-3 h-3" /> as React.ReactNode },
                ...(stats.hasGscData ? [{ key: 'gsc_only' as ViewTab, label: 'GSC', count: stats.gscOnlyCount, icon: <BarChart2 className="w-3 h-3" /> as React.ReactNode }] : []),
              ]).map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    activeTab === tab.key ? 'bg-card text-[var(--text-primary)] shadow-sm' : 'text-[#8888a0] hover:text-[var(--text-primary)]')}>
                  {tab.icon}
                  {tab.label}
                  <span className={cn('text-[10px] px-1 py-0.5 rounded', activeTab === tab.key ? 'bg-accent/15 text-accent' : 'bg-secondary')}>{tab.count}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-1">
              <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}
                className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-xs">
                <option value="">Tat ca du an</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8888a0]" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tim keyword / URL..."
                  className="w-full pl-8 pr-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-xs" />
              </div>
            </div>
          </div>

          {/* ── Table ────────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-[#8888a0]">
                  <th className="px-3 py-2.5 text-left w-10">#</th>
                  <th className="px-3 py-2.5 text-left cursor-pointer hover:text-[var(--text-primary)]" onClick={() => toggleSort('keyword')}>
                    Tu khoa {sortBy === 'keyword' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="px-3 py-2.5 text-center w-20 cursor-pointer hover:text-[var(--text-primary)]" onClick={() => toggleSort('position')}>
                    Vi tri {sortBy === 'position' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="px-3 py-2.5 text-center w-20 cursor-pointer hover:text-[var(--text-primary)]" onClick={() => toggleSort('change')}>
                    +/- {sortBy === 'change' && (sortAsc ? '↑' : '↓')}
                  </th>
                  {stats.hasGscData && (
                    <>
                      <th className="px-3 py-2.5 text-center w-20 cursor-pointer hover:text-[var(--text-primary)] hidden sm:table-cell" onClick={() => toggleSort('clicks')}>
                        Clicks {sortBy === 'clicks' && (sortAsc ? '↑' : '↓')}
                      </th>
                      <th className="px-3 py-2.5 text-center w-24 hidden lg:table-cell">Impr.</th>
                    </>
                  )}
                  <th className="px-3 py-2.5 text-left hidden md:table-cell">URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((trend, idx) => (
                  <KeywordRow key={trend.keyword} trend={trend} idx={idx}
                    expanded={expandedKw === trend.keyword}
                    onToggle={() => setExpandedKw(expandedKw === trend.keyword ? null : trend.keyword)}
                    showGsc={stats.hasGscData} />
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-[#8888a0] text-sm">Khong co ket qua phu hop</div>
            )}
          </div>

          <p className="text-[10px] text-[#666680] text-right">
            {filtered.length} / {activeTab === 'gsc_only' ? stats.gscOnlyCount : stats.total} tu khoa
            {activeTab === 'gsc_only' && ' (chi tu Google Search Console)'}
          </p>
        </>
      )}

      {/* ── Sheet Config Modal ──────────────────────────────────────── */}
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
