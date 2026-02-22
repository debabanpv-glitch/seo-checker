'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  ExternalLink,
  X,
  ChevronDown,
  Loader2,
  CheckCircle,
  AlertCircle,
  Settings2,
  Plus,
  Trash2,
  Search,
  Target,
  Eye,
  Zap,
  MousePointerClick,
  BarChart2,
  Percent,
  Crosshair,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { Project } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface KeywordRanking {
  id: string;
  keyword: string;
  url: string;
  position: number;
  date: string;
  project_id: string | null;
  ranking_tier?: string | null;
  keyword_type?: string | null;
}

interface KeywordTrend {
  keyword: string;
  url: string;
  currentPosition: number;
  previousPosition: number | null;
  change: number | null;
  history: { date: string; position: number }[];
  ranking_tier?: string | null;
  keyword_type?: string | null;
  // GSC traffic data (merged from top_queries)
  gscClicks?: number;
  gscImpressions?: number;
  gscCtr?: number;
  gscPosition?: number;
}

interface SheetConfig {
  url: string;
  project_id: string;
  label: string;
}

interface GscSnapshot {
  id: string;
  project_id: string;
  date: string;
  period: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  top_queries: string | null;
  top_pages: string | null;
}

interface TopQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

type ViewTab = 'all' | 'cam_ket' | 'blog' | 'opportunity' | 'declining' | 'gsc_only';

// Build a map of keyword → GSC traffic from top_queries JSON
function buildGscQueryMap(snapshots: GscSnapshot[]): Map<string, TopQuery> {
  const map = new Map<string, TopQuery>();
  if (snapshots.length === 0) return map;
  const latest = snapshots[0];
  try {
    const raw = latest.top_queries;
    if (!raw) return map;
    const queries: TopQuery[] = typeof raw === 'string' ? JSON.parse(raw) : (raw as TopQuery[]);
    if (!Array.isArray(queries)) return map;
    for (const q of queries) {
      map.set(q.query.toLowerCase().trim(), q);
    }
  } catch { /* ignore */ }
  return map;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const posColor = (pos: number) => {
  if (pos <= 3) return 'text-emerald-400';
  if (pos <= 10) return 'text-accent';
  if (pos <= 20) return 'text-sky-400';
  if (pos <= 30) return 'text-amber-400';
  return 'text-[#666680]';
};

const posBg = (pos: number) => {
  if (pos <= 3) return 'bg-emerald-400/10 border-emerald-400/20';
  if (pos <= 10) return 'bg-accent/10 border-accent/20';
  if (pos <= 20) return 'bg-sky-400/10 border-sky-400/20';
  if (pos <= 30) return 'bg-amber-400/10 border-amber-400/20';
  return 'bg-[#666680]/10 border-[#666680]/20';
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
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

      // Merge GSC traffic data
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
          keyword: q.query,
          url: '',
          currentPosition: Math.round(q.position * 10) / 10,
          previousPosition: null,
          change: null,
          history: [],
          gscClicks: q.clicks,
          gscImpressions: q.impressions,
          gscCtr: q.ctr,
          gscPosition: q.position,
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
    const top30 = keywordTrends.filter((t) => t.currentPosition <= 30).length;
    const improved = keywordTrends.filter((t) => t.change !== null && t.change > 0).length;
    const declined = keywordTrends.filter((t) => t.change !== null && t.change < 0).length;
    const camKet = keywordTrends.filter((t) => t.keyword_type === 'KW Cam kết').length;
    const blog = keywordTrends.filter((t) => t.keyword_type === 'KW Blog').length;
    const opportunity = keywordTrends.filter((t) => t.currentPosition >= 11 && t.currentPosition <= 20).length;
    const totalClicks = keywordTrends.reduce((s, t) => s + (t.gscClicks ?? 0), 0);
    const totalImpressions = keywordTrends.reduce((s, t) => s + (t.gscImpressions ?? 0), 0);
    const hasGscData = gscQueryMap.size > 0;
    const gscOnlyCount = gscOnlyQueries.length;
    return { total, top3, top10, top30, improved, declined, camKet, blog, opportunity, totalClicks, totalImpressions, hasGscData, gscOnlyCount };
  }, [keywordTrends, gscQueryMap, gscOnlyQueries]);

  // ── Filter + Sort ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    // GSC-only tab uses different data source
    if (activeTab === 'gsc_only') {
      let result = [...gscOnlyQueries];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter((t) => t.keyword.toLowerCase().includes(q));
      }
      // Sort GSC-only by clicks desc by default
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

    // Tab filter
    switch (activeTab) {
      case 'cam_ket': result = result.filter((t) => t.keyword_type === 'KW Cam kết'); break;
      case 'blog': result = result.filter((t) => t.keyword_type === 'KW Blog'); break;
      case 'opportunity': result = result.filter((t) => t.currentPosition >= 11 && t.currentPosition <= 20); break;
      case 'declining': result = result.filter((t) => t.change !== null && t.change < 0); break;
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.keyword.toLowerCase().includes(q) || t.url.toLowerCase().includes(q));
    }

    // Sort
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

  // ── Column sort toggle ────────────────────────────────────────────────
  const toggleSort = (col: 'position' | 'change' | 'keyword' | 'clicks') => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(col === 'position'); }
  };

  // ── Dates info ────────────────────────────────────────────────────────
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
          <p className="text-[#8888a0] text-sm">
            {stats.total > 0
              ? `${stats.total} từ khóa · ${dates.length} lần check · Cập nhật: ${latestDate ? new Date(latestDate).toLocaleDateString('vi-VN') : '—'}`
              : 'Chưa có dữ liệu. Cấu hình Google Sheet để bắt đầu.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {syncResult && (
            <span className={cn('text-xs px-2 py-1 rounded animate-in fade-in', syncResult.success ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400')}>
              {syncResult.success ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <AlertCircle className="w-3 h-3 inline mr-1" />}
              {syncResult.message}
            </span>
          )}
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-lg text-white font-medium text-sm transition-colors"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? 'Syncing...' : sheetConfigs.length > 0 ? 'Sync' : 'Cấu hình Sheet'}
          </button>
          <button
            onClick={() => { setEditConfigs([...sheetConfigs]); setShowConfigModal(true); }}
            className="p-2 hover:bg-secondary border border-border rounded-lg text-[#8888a0] transition-colors"
            title="Cấu hình Sheets"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {stats.total === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Chưa có dữ liệu keyword ranking"
          description="Nhấn 'Cấu hình Sheet' để thêm Google Sheet URL, sau đó bấm Sync"
        />
      ) : (
        <>
          {/* ── Score Cards ──────────────────────────────────────────── */}
          <div className={cn('grid gap-3', stats.hasGscData ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4')}>
            <ScoreCard label="Top 3" value={stats.top3} total={stats.total} color="text-emerald-400" bgColor="bg-emerald-400" />
            <ScoreCard label="Top 10" value={stats.top10} total={stats.total} color="text-accent" bgColor="bg-accent" />
            <ScoreCard label="Tăng hạng" value={stats.improved} icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} color="text-emerald-400" />
            <ScoreCard label="Giảm hạng" value={stats.declined} icon={<TrendingDown className="w-4 h-4 text-red-400" />} color="text-red-400" />
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
                { key: 'all' as ViewTab, label: 'Tất cả', count: stats.total, icon: null as React.ReactNode },
                { key: 'cam_ket' as ViewTab, label: 'Cam kết', count: stats.camKet, icon: <Target className="w-3 h-3" /> as React.ReactNode },
                { key: 'blog' as ViewTab, label: 'Blog', count: stats.blog, icon: <Eye className="w-3 h-3" /> as React.ReactNode },
                { key: 'opportunity' as ViewTab, label: 'Cơ hội', count: stats.opportunity, icon: <Zap className="w-3 h-3" /> as React.ReactNode },
                { key: 'declining' as ViewTab, label: 'Giảm', count: stats.declined, icon: <TrendingDown className="w-3 h-3" /> as React.ReactNode },
                ...(stats.hasGscData ? [{ key: 'gsc_only' as ViewTab, label: 'GSC', count: stats.gscOnlyCount, icon: <BarChart2 className="w-3 h-3" /> as React.ReactNode }] : []),
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    activeTab === tab.key
                      ? 'bg-card text-[var(--text-primary)] shadow-sm'
                      : 'text-[#8888a0] hover:text-[var(--text-primary)]'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  <span className={cn('text-[10px] px-1 py-0.5 rounded', activeTab === tab.key ? 'bg-accent/15 text-accent' : 'bg-secondary')}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-1">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-xs"
              >
                <option value="">Tất cả dự án</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8888a0]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm keyword / URL..."
                  className="w-full pl-8 pr-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-xs"
                />
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
                    Từ khóa {sortBy === 'keyword' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="px-3 py-2.5 text-center w-20 cursor-pointer hover:text-[var(--text-primary)]" onClick={() => toggleSort('position')}>
                    Vị trí {sortBy === 'position' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="px-3 py-2.5 text-center w-20 cursor-pointer hover:text-[var(--text-primary)]" onClick={() => toggleSort('change')}>
                    +/- {sortBy === 'change' && (sortAsc ? '↑' : '↓')}
                  </th>
                  {stats.hasGscData && (
                    <>
                      <th className="px-3 py-2.5 text-center w-20 cursor-pointer hover:text-[var(--text-primary)] hidden sm:table-cell" onClick={() => toggleSort('clicks')}>
                        Clicks {sortBy === 'clicks' && (sortAsc ? '↑' : '↓')}
                      </th>
                      <th className="px-3 py-2.5 text-center w-24 hidden lg:table-cell">
                        Impr.
                      </th>
                    </>
                  )}
                  <th className="px-3 py-2.5 text-left hidden md:table-cell">URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((trend, idx) => (
                  <KeywordRow
                    key={trend.keyword}
                    trend={trend}
                    idx={idx}
                    expanded={expandedKw === trend.keyword}
                    onToggle={() => setExpandedKw(expandedKw === trend.keyword ? null : trend.keyword)}
                    showGsc={stats.hasGscData}
                  />
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="p-8 text-center text-[#8888a0] text-sm">Không có kết quả phù hợp</div>
            )}
          </div>

          <p className="text-[10px] text-[#666680] text-right">
            {filtered.length} / {activeTab === 'gsc_only' ? stats.gscOnlyCount : stats.total} từ khóa
            {activeTab === 'gsc_only' && ' (chỉ từ Google Search Console)'}
          </p>
        </>
      )}

      {/* ── Sheet Config Modal ──────────────────────────────────────── */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowConfigModal(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Cấu hình Google Sheets</h2>
                <p className="text-xs text-[#8888a0] mt-0.5">Sheet phải public. Cần cột: Keyword, Top/Position. Tùy chọn: URL, Date, Ranking, Type</p>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="p-1.5 hover:bg-secondary rounded-lg"><X className="w-4 h-4 text-[#8888a0]" /></button>
            </div>

            <div className="p-5 space-y-3 max-h-[50vh] overflow-y-auto">
              {editConfigs.map((cfg, i) => (
                <div key={i} className="flex gap-2 items-start bg-secondary/30 rounded-lg p-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text" value={cfg.label}
                        onChange={(e) => { const c = [...editConfigs]; c[i] = { ...c[i], label: e.target.value }; setEditConfigs(c); }}
                        placeholder="Tên sheet"
                        className="flex-1 px-2 py-1 bg-secondary border border-border rounded text-[var(--text-primary)] placeholder-[#8888a0] text-xs"
                      />
                      <select
                        value={cfg.project_id}
                        onChange={(e) => { const c = [...editConfigs]; c[i] = { ...c[i], project_id: e.target.value }; setEditConfigs(c); }}
                        className="px-2 py-1 bg-secondary border border-border rounded text-[var(--text-primary)] text-xs"
                      >
                        <option value="">Dự án</option>
                        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <input
                      type="text" value={cfg.url}
                      onChange={(e) => { const c = [...editConfigs]; c[i] = { ...c[i], url: e.target.value }; setEditConfigs(c); }}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="w-full px-2 py-1 bg-secondary border border-border rounded text-[var(--text-primary)] placeholder-[#8888a0] text-[10px] font-mono"
                    />
                  </div>
                  <button onClick={() => setEditConfigs(editConfigs.filter((_, j) => j !== i))} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEditConfigs([...editConfigs, { url: '', project_id: '', label: '' }])}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-accent hover:bg-accent/10 rounded-lg transition-colors w-full justify-center border border-dashed border-accent/30"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm sheet
              </button>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <button onClick={() => setShowConfigModal(false)} className="px-3 py-1.5 text-xs text-[#8888a0] hover:bg-secondary rounded-lg">Hủy</button>
              <button onClick={handleSaveConfigs} className="px-4 py-1.5 bg-accent hover:bg-accent/90 rounded-lg text-white text-xs font-medium">
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScoreCard
// ---------------------------------------------------------------------------
function ScoreCard({ label, value, total, color, bgColor, icon }: {
  label: string; value: number; total?: number; color: string; bgColor?: string; icon?: React.ReactNode;
}) {
  const pct = total && total > 0 ? Math.round((value / total) * 100) : null;
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#8888a0] text-xs">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn('text-2xl font-bold font-mono', color)}>{value}</span>
        {pct !== null && <span className="text-xs text-[#8888a0]">({pct}%)</span>}
      </div>
      {total && bgColor && (
        <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', bgColor)} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KeywordRow (with inline expand)
// ---------------------------------------------------------------------------
function KeywordRow({ trend, idx, expanded, onToggle, showGsc }: {
  trend: KeywordTrend; idx: number; expanded: boolean; onToggle: () => void; showGsc?: boolean;
}) {
  const colSpan = showGsc ? 7 : 5;
  return (
    <>
      <tr className={cn('hover:bg-secondary/30 transition-colors cursor-pointer text-sm', expanded && 'bg-accent/5')} onClick={onToggle}>
        <td className="px-3 py-2.5 text-[#8888a0] text-xs font-mono">{idx + 1}</td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-primary)] font-medium text-sm">{trend.keyword}</span>
            {trend.keyword_type && (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full border',
                trend.keyword_type === 'KW Cam kết' ? 'bg-accent/10 text-accent border-accent/20' : 'bg-sky-400/10 text-sky-400 border-sky-400/20'
              )}>
                {trend.keyword_type === 'KW Cam kết' ? 'CK' : 'Blog'}
              </span>
            )}
            <ChevronDown className={cn('w-3 h-3 text-[#8888a0] transition-transform', expanded && 'rotate-180')} />
          </div>
        </td>
        <td className="px-3 py-2.5 text-center">
          <span className={cn('inline-flex items-center justify-center w-9 h-7 rounded-md border text-sm font-bold font-mono', posBg(trend.currentPosition), posColor(trend.currentPosition))}>
            {trend.currentPosition}
          </span>
        </td>
        <td className="px-3 py-2.5 text-center">
          <ChangeIndicator change={trend.change} />
        </td>
        {showGsc && (
          <>
            <td className="px-3 py-2.5 text-center hidden sm:table-cell">
              {trend.gscClicks !== undefined ? (
                <span className="text-xs font-mono text-sky-400">{trend.gscClicks.toLocaleString('vi-VN')}</span>
              ) : (
                <span className="text-[10px] text-[#555570]">—</span>
              )}
            </td>
            <td className="px-3 py-2.5 text-center hidden lg:table-cell">
              {trend.gscImpressions !== undefined ? (
                <span className="text-xs font-mono text-[#8888a0]">{trend.gscImpressions.toLocaleString('vi-VN')}</span>
              ) : (
                <span className="text-[10px] text-[#555570]">—</span>
              )}
            </td>
          </>
        )}
        <td className="px-3 py-2.5 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
          {trend.url ? (
            <a href={trend.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-accent hover:underline max-w-[280px] truncate">
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{trend.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
            </a>
          ) : (
            <span className="text-[11px] text-[#666680]">—</span>
          )}
        </td>
      </tr>

      {/* Expanded history */}
      {expanded && (
        <tr>
          <td colSpan={colSpan} className="px-3 py-3 bg-secondary/20">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-[10px] text-[#8888a0] uppercase tracking-wider">Lịch sử:</span>
              {trend.history.map((h, i) => {
                const prev = trend.history[i - 1];
                const delta = prev ? prev.position - h.position : null;
                return (
                  <div key={h.date} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#8888a0]">{new Date(h.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                    <span className={cn('text-xs font-bold font-mono', posColor(h.position))}>{h.position}</span>
                    {delta !== null && delta !== 0 && (
                      <span className={cn('text-[10px] font-mono', delta > 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    )}
                    {i < trend.history.length - 1 && <span className="text-[#666680]">→</span>}
                  </div>
                );
              })}
            </div>
            {/* GSC detail on expand */}
            {showGsc && trend.gscClicks !== undefined && (
              <div className="flex items-center gap-4 mt-2 sm:hidden">
                <span className="text-[10px] text-[#8888a0] uppercase tracking-wider">GSC:</span>
                <span className="text-xs text-sky-400 font-mono">{trend.gscClicks} clicks</span>
                <span className="text-xs text-[#8888a0] font-mono">{trend.gscImpressions} impr</span>
                {trend.gscCtr !== undefined && (
                  <span className="text-xs text-amber-400 font-mono">CTR {(trend.gscCtr * 100).toFixed(1)}%</span>
                )}
              </div>
            )}
            {/* Mobile URL */}
            {trend.url && (
              <a href={trend.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-accent hover:underline mt-2 md:hidden">
                <ExternalLink className="w-3 h-3" />
                <span className="truncate">{trend.url.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// ChangeIndicator
// ---------------------------------------------------------------------------
function ChangeIndicator({ change }: { change: number | null }) {
  if (change === null) return <Minus className="w-3.5 h-3.5 text-[#666680] mx-auto" />;
  if (change === 0) return <span className="text-xs text-[#666680] font-mono">0</span>;

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-mono font-medium',
      change > 0 ? 'text-emerald-400' : 'text-red-400'
    )}>
      {change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(change)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// GscTrafficSection — hiển thị traffic overview từ GSC snapshots
// ---------------------------------------------------------------------------
function GscTrafficSection({ snapshots }: { snapshots: GscSnapshot[] }) {
  const latest = snapshots[0];
  const previous = snapshots[1] ?? null;

  const clicksDelta = previous ? latest.clicks - previous.clicks : null;
  const impressionsDelta = previous ? latest.impressions - previous.impressions : null;
  const ctrDelta = previous ? latest.ctr - previous.ctr : null;
  // position: nhỏ hơn = tốt hơn → delta âm = tốt hơn
  const positionDelta = previous ? latest.position - previous.position : null;

  const topQueries: TopQuery[] = (() => {
    try {
      if (!latest.top_queries) return [];
      const parsed = typeof latest.top_queries === 'string'
        ? JSON.parse(latest.top_queries)
        : latest.top_queries;
      return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
    } catch {
      return [];
    }
  })();

  const formatDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-[#8888a0]" />
          <span className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Google Search Console</span>
          <span className="text-[10px] text-[#666680]">· {formatDate(latest.date)}</span>
        </div>
        {previous && (
          <span className="text-[10px] text-[#666680]">So sánh với {formatDate(previous.date)}</span>
        )}
      </div>

      {/* Traffic cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TrafficCard
          label="Clicks"
          value={latest.clicks.toLocaleString('vi-VN')}
          delta={clicksDelta}
          positiveIsGood={true}
          icon={<MousePointerClick className="w-4 h-4" />}
          color="text-sky-400"
          borderColor="border-sky-400/20"
          bgColor="bg-sky-400/5"
        />
        <TrafficCard
          label="Impressions"
          value={latest.impressions.toLocaleString('vi-VN')}
          delta={impressionsDelta}
          positiveIsGood={true}
          icon={<Eye className="w-4 h-4" />}
          color="text-purple-400"
          borderColor="border-purple-400/20"
          bgColor="bg-purple-400/5"
        />
        <TrafficCard
          label="CTR"
          value={`${(latest.ctr * 100).toFixed(1)}%`}
          delta={ctrDelta !== null ? +(ctrDelta * 100).toFixed(2) : null}
          positiveIsGood={true}
          deltaLabel="%"
          icon={<Percent className="w-4 h-4" />}
          color="text-amber-400"
          borderColor="border-amber-400/20"
          bgColor="bg-amber-400/5"
        />
        <TrafficCard
          label="Vị trí TB"
          value={latest.position.toFixed(1)}
          delta={positionDelta !== null ? +positionDelta.toFixed(1) : null}
          positiveIsGood={false}
          deltaLabel=""
          icon={<Crosshair className="w-4 h-4" />}
          color="text-emerald-400"
          borderColor="border-emerald-400/20"
          bgColor="bg-emerald-400/5"
        />
      </div>

      {/* Top queries — hidden here, merged into keyword table */}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrafficCard — card hiển thị 1 metric GSC với delta
// ---------------------------------------------------------------------------
function TrafficCard({
  label, value, delta, positiveIsGood, deltaLabel = '', icon, color, borderColor, bgColor,
}: {
  label: string;
  value: string;
  delta: number | null;
  positiveIsGood: boolean;
  deltaLabel?: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgColor: string;
}) {
  const isImproved = delta !== null ? (positiveIsGood ? delta > 0 : delta < 0) : null;
  const isWorse = delta !== null ? (positiveIsGood ? delta < 0 : delta > 0) : null;

  return (
    <div className={cn('border rounded-xl p-4 space-y-1', bgColor, borderColor)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#8888a0]">{label}</span>
        <span className={cn('opacity-60', color)}>{icon}</span>
      </div>
      <div className={cn('text-2xl font-bold font-mono', color)}>{value}</div>
      {delta !== null && delta !== 0 && (
        <div className={cn(
          'flex items-center gap-0.5 text-[11px] font-mono',
          isImproved ? 'text-emerald-400' : isWorse ? 'text-red-400' : 'text-[#666680]'
        )}>
          {isImproved ? <ArrowUp className="w-3 h-3" /> : isWorse ? <ArrowDown className="w-3 h-3" /> : null}
          {delta > 0 ? '+' : ''}{delta}{deltaLabel}
          <span className="text-[#666680] ml-1">vs kỳ trước</span>
        </div>
      )}
      {(delta === null || delta === 0) && (
        <div className="text-[11px] text-[#555570]">{delta === 0 ? 'Không đổi' : 'Chưa có kỳ trước'}</div>
      )}
    </div>
  );
}
