'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart2,
  MousePointerClick,
  Eye,
  TrendingUp,
  TrendingDown,
  Hash,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  X,
  Search,
  FileText,
  Zap,
  AlertTriangle,
  Award,
  Target,
  Lightbulb,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Shield,
  ArrowUpRight,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Project } from '@/types';
import { cn } from '@/lib/utils';
import {
  type GscQuery,
  type GscPage,
  type ComparedQuery,
  type ComparedPage,
  compareQueries,
  comparePages,
  findOpportunities,
  findAtRisk,
  generateInsights,
} from './gsc-comparison-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GscSnapshot {
  id: string;
  project_id: string;
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  top_queries?: GscQuery[];
  top_pages?: GscPage[];
  created_at: string;
}

type TabKey = 'overview' | 'queries' | 'pages' | 'analysis';
type QueryFilter = 'all' | 'winner' | 'loser' | 'new' | 'opportunity' | 'at_risk';
type PageFilter = 'all' | 'winner' | 'loser' | 'new';
type SortDir = 'asc' | 'desc';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function fmtDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtCtr(ctr: number): string {
  return `${(ctr * 100).toFixed(2)}%`;
}

function fmtPos(pos: number): string {
  return pos.toFixed(1);
}

function fmtNum(n: number): string {
  return n.toLocaleString('vi-VN');
}

function calcDelta(current: number, prev: number, invert = false): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (!prev) return { pct: 0, direction: 'flat' };
  const raw = ((current - prev) / prev) * 100;
  const pct = Math.abs(raw);
  const isPositive = invert ? raw < 0 : raw > 0;
  return { pct, direction: pct < 0.5 ? 'flat' : isPositive ? 'up' : 'down' };
}

// Short URL for display
function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === '/' ? u.hostname : u.pathname;
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  delta,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  delta?: { pct: number; direction: 'up' | 'down' | 'flat' };
  subtitle?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#8888a0]">{label}</p>
          <div className="flex items-center gap-1.5">
            <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
            {delta && delta.direction !== 'flat' && (
              <span className={cn('flex items-center gap-0.5 text-xs font-medium',
                delta.direction === 'up' ? 'text-green-400' : 'text-red-400'
              )}>
                {delta.direction === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {delta.pct.toFixed(1)}%
              </span>
            )}
            {delta && delta.direction === 'flat' && (
              <span className="flex items-center text-xs text-[#8888a0]"><Minus className="w-3 h-3" /></span>
            )}
          </div>
          {subtitle && <p className="text-[10px] text-[#8888a0] mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function DeltaBadge({ value, invert = false, suffix = '' }: { value: number; invert?: boolean; suffix?: string }) {
  if (Math.abs(value) < 0.01) return <span className="text-[#8888a0]">—</span>;
  // For position: negative delta = improvement (lower position = better)
  const isGood = invert ? value < 0 : value > 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium',
      isGood ? 'text-green-400' : 'text-red-400'
    )}>
      {isGood ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(value).toFixed(value % 1 === 0 ? 0 : 1)}{suffix}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    winner: { label: 'Tăng', cls: 'bg-green-500/15 text-green-400' },
    loser: { label: 'Giảm', cls: 'bg-red-500/15 text-red-400' },
    new: { label: 'Mới', cls: 'bg-blue-500/15 text-blue-400' },
    stable: { label: 'Ổn định', cls: 'bg-gray-500/15 text-gray-400' },
    opportunity: { label: 'Cơ hội', cls: 'bg-orange-500/15 text-orange-400' },
    at_risk: { label: 'Rủi ro', cls: 'bg-yellow-500/15 text-yellow-400' },
  };
  const c = config[status] ?? config.stable;
  return <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', c.cls)}>{c.label}</span>;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Sortable table header
function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: string;
  currentSort: string;
  currentDir: SortDir;
  onSort: (key: string) => void;
  align?: 'left' | 'right';
}) {
  const isActive = currentSort === sortKey;
  return (
    <th
      className={cn(
        'px-3 py-2 text-xs font-medium cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none',
        isActive ? 'text-[var(--text-primary)]' : 'text-[#8888a0]',
        align === 'right' ? 'text-right' : 'text-left',
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {isActive && (currentDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </span>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tab: Overview
// ---------------------------------------------------------------------------

function OverviewTab({
  snapshots,
  winners,
  losers,
  newKw,
  opportunities,
  atRisk,
  topQueries,
  topPages,
}: {
  snapshots: GscSnapshot[];
  winners: ComparedQuery[];
  losers: ComparedQuery[];
  newKw: ComparedQuery[];
  opportunities: ComparedQuery[];
  atRisk: ComparedQuery[];
  topQueries: ComparedQuery[];
  topPages: ComparedPage[];
}) {
  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Tăng', value: winners.length, icon: TrendingUp, cls: 'text-green-400' },
          { label: 'Giảm', value: losers.length, icon: TrendingDown, cls: 'text-red-400' },
          { label: 'Mới', value: newKw.length, icon: Zap, cls: 'text-blue-400' },
          { label: 'Cơ hội', value: opportunities.length, icon: Target, cls: 'text-orange-400' },
          { label: 'Rủi ro', value: atRisk.length, icon: AlertTriangle, cls: 'text-yellow-400' },
        ].map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
            <Icon className={cn('w-4 h-4 mx-auto mb-1', cls)} />
            <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
            <p className="text-[10px] text-[#8888a0]">{label}</p>
          </div>
        ))}
      </div>

      {/* SVG Line Chart — Clicks & Impressions (like GSC) */}
      <LineChart snapshots={snapshots} />

      {/* Top Queries */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Top Queries</h3>
          <span className="text-[10px] text-[#8888a0]">{topQueries.length} từ khóa</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['#', 'Query', 'Clicks', '+/-', 'Impr', 'CTR', 'Pos', '+/-', ''].map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left text-[#8888a0] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topQueries.slice(0, 15).map((q, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/30">
                  <td className="px-3 py-1.5 text-[#8888a0]">{i + 1}</td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)] font-medium max-w-[200px] truncate">{q.query}</td>
                  <td className="px-3 py-1.5 text-blue-400 font-medium">{fmtNum(q.clicks)}</td>
                  <td className="px-3 py-1.5"><DeltaBadge value={q.clicks_delta} /></td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)]">{fmtNum(q.impressions)}</td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)]">{fmtCtr(q.ctr)}</td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)] font-medium">{fmtPos(q.position)}</td>
                  <td className="px-3 py-1.5"><DeltaBadge value={q.position_delta} invert /></td>
                  <td className="px-3 py-1.5"><StatusBadge status={q.status} /></td>
                </tr>
              ))}
              {topQueries.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-4 text-center text-[#8888a0]">Chưa có dữ liệu queries.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Pages */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Top Pages</h3>
          <span className="text-[10px] text-[#8888a0]">{topPages.length} trang</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['#', 'URL', 'Clicks', '+/-', 'Impr', 'CTR', 'Pos', '+/-', ''].map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left text-[#8888a0] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topPages.slice(0, 10).map((p, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/30">
                  <td className="px-3 py-1.5 text-[#8888a0]">{i + 1}</td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)] font-medium max-w-[250px] truncate" title={p.page}>{shortUrl(p.page)}</td>
                  <td className="px-3 py-1.5 text-blue-400 font-medium">{fmtNum(p.clicks)}</td>
                  <td className="px-3 py-1.5"><DeltaBadge value={p.clicks_delta} /></td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)]">{fmtNum(p.impressions)}</td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)]">{fmtCtr(p.ctr)}</td>
                  <td className="px-3 py-1.5 text-[var(--text-primary)] font-medium">{fmtPos(p.position)}</td>
                  <td className="px-3 py-1.5"><DeltaBadge value={p.position_delta} invert /></td>
                  <td className="px-3 py-1.5"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
              {topPages.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-4 text-center text-[#8888a0]">Chưa có dữ liệu pages.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <div className="bg-card border border-orange-500/20 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cơ hội tối ưu (Pos 4-20, Impressions cao)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Từ khóa', 'Vị trí', 'Impressions', 'Clicks', 'CTR', 'Gợi ý'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[#8888a0] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {opportunities.slice(0, 10).map((q, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/50">
                    <td className="px-3 py-2 font-medium text-[var(--text-primary)] max-w-[200px] truncate">{q.query}</td>
                    <td className="px-3 py-2 text-orange-400 font-medium">{fmtPos(q.position)}</td>
                    <td className="px-3 py-2 text-[var(--text-primary)]">{fmtNum(q.impressions)}</td>
                    <td className="px-3 py-2 text-blue-400">{fmtNum(q.clicks)}</td>
                    <td className="px-3 py-2 text-[var(--text-primary)]">{fmtCtr(q.ctr)}</td>
                    <td className="px-3 py-2 text-[#8888a0]">
                      {q.position <= 10 ? 'Cải thiện content → top 3' : 'Tăng backlinks + content depth'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// SVG Line Chart — resembles GSC style (Clicks blue line, Impressions purple line)
function LineChart({ snapshots }: { snapshots: GscSnapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs text-[#8888a0]">Cần ít nhất 2 kỳ dữ liệu để hiển thị biểu đồ xu hướng.</p>
      </div>
    );
  }

  const W = 700;
  const H = 180;
  const PAD = { top: 20, right: 20, bottom: 30, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const maxClicks = Math.max(...snapshots.map((s) => s.clicks), 1);
  const maxImpr = Math.max(...snapshots.map((s) => s.impressions), 1);

  const xStep = snapshots.length > 1 ? plotW / (snapshots.length - 1) : 0;

  // Build path strings
  const clicksPoints = snapshots.map((s, i) => {
    const x = PAD.left + i * xStep;
    const y = PAD.top + plotH - (s.clicks / maxClicks) * plotH;
    return { x, y };
  });
  const imprPoints = snapshots.map((s, i) => {
    const x = PAD.left + i * xStep;
    const y = PAD.top + plotH - (s.impressions / maxImpr) * plotH;
    return { x, y };
  });

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const toArea = (pts: { x: number; y: number }[]) => {
    const base = PAD.top + plotH;
    return toPath(pts) + ` L${pts[pts.length - 1].x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Xu hướng</h2>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 rounded inline-block" /> Clicks</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-500 rounded inline-block" /> Impressions</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = PAD.top + plotH * (1 - pct);
          return <line key={pct} x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#333" strokeWidth="0.5" strokeDasharray="4 4" />;
        })}

        {/* Impressions area + line (behind) */}
        <path d={toArea(imprPoints)} fill="rgba(168,85,247,0.08)" />
        <path d={toPath(imprPoints)} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinejoin="round" />

        {/* Clicks area + line (front) */}
        <path d={toArea(clicksPoints)} fill="rgba(59,130,246,0.12)" />
        <path d={toPath(clicksPoints)} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />

        {/* Dots + labels for clicks */}
        {clicksPoints.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#3b82f6" stroke="#1e293b" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="600">
              {snapshots[i].clicks}
            </text>
          </g>
        ))}

        {/* X-axis date labels */}
        {snapshots.map((s, i) => {
          const x = PAD.left + i * xStep;
          return (
            <text key={i} x={x} y={H - 5} textAnchor="middle" fill="#666" fontSize="9">
              {fmtDate(s.date)}
            </text>
          );
        })}

        {/* Y-axis labels (clicks) */}
        {[0, 0.5, 1].map((pct) => {
          const y = PAD.top + plotH * (1 - pct);
          const val = Math.round(maxClicks * pct);
          return (
            <text key={pct} x={PAD.left - 6} y={y + 3} textAnchor="end" fill="#3b82f6" fontSize="8">
              {val}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Queries (Từ khóa)
// ---------------------------------------------------------------------------

function QueriesTab({
  queries,
  opportunities,
  atRisk,
}: {
  queries: ComparedQuery[];
  opportunities: ComparedQuery[];
  atRisk: ComparedQuery[];
}) {
  const [filter, setFilter] = useState<QueryFilter>('all');
  const [sortKey, setSortKey] = useState('clicks');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // Mark opportunities and at-risk
  const oppSet = new Set(opportunities.map((q) => q.query));
  const riskSet = new Set(atRisk.map((q) => q.query));

  const filtered = useMemo(() => {
    let list = queries;
    switch (filter) {
      case 'winner': list = queries.filter((q) => q.status === 'winner'); break;
      case 'loser': list = queries.filter((q) => q.status === 'loser'); break;
      case 'new': list = queries.filter((q) => q.status === 'new'); break;
      case 'opportunity': list = queries.filter((q) => oppSet.has(q.query)); break;
      case 'at_risk': list = queries.filter((q) => riskSet.has(q.query)); break;
    }

    return [...list].sort((a, b) => {
      const aVal = (a as unknown as Record<string, number>)[sortKey] ?? 0;
      const bVal = (b as unknown as Record<string, number>)[sortKey] ?? 0;
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [queries, filter, sortKey, sortDir, oppSet, riskSet]);

  const maxClicks = Math.max(...queries.map((q) => q.clicks), 1);

  const FILTERS: { key: QueryFilter; label: string; count: number; cls: string }[] = [
    { key: 'all', label: 'Tất cả', count: queries.length, cls: '' },
    { key: 'winner', label: 'Tăng', count: queries.filter((q) => q.status === 'winner').length, cls: 'text-green-400' },
    { key: 'loser', label: 'Giảm', count: queries.filter((q) => q.status === 'loser').length, cls: 'text-red-400' },
    { key: 'new', label: 'Mới', count: queries.filter((q) => q.status === 'new').length, cls: 'text-blue-400' },
    { key: 'opportunity', label: 'Cơ hội', count: opportunities.length, cls: 'text-orange-400' },
    { key: 'at_risk', label: 'Rủi ro', count: atRisk.length, cls: 'text-yellow-400' },
  ];

  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              filter === f.key
                ? 'bg-accent text-white'
                : 'bg-card border border-border text-[#8888a0] hover:text-[var(--text-primary)]',
            )}
          >
            <span className={filter !== f.key ? f.cls : ''}>{f.label}</span>
            {f.count > 0 && <span className="ml-1 opacity-70">{f.count}</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-medium text-[#8888a0] w-8">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[#8888a0]">Từ khóa</th>
                <SortHeader label="Clicks" sortKey="clicks" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <th className="px-3 py-2 text-right text-xs font-medium text-[#8888a0]">+/-</th>
                <SortHeader label="Impr" sortKey="impressions" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="CTR" sortKey="ctr" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="Vị trí" sortKey="position" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <th className="px-3 py-2 text-right text-xs font-medium text-[#8888a0]">+/-</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-[#8888a0]">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-[#8888a0]">Không có dữ liệu.</td></tr>
              ) : (
                filtered.map((q, i) => {
                  let displayStatus = q.status;
                  if (oppSet.has(q.query)) displayStatus = 'opportunity' as ComparedQuery['status'];
                  if (riskSet.has(q.query)) displayStatus = 'at_risk' as ComparedQuery['status'];

                  return (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="px-3 py-2 text-[#8888a0]">{i + 1}</td>
                      <td className="px-3 py-2 text-[var(--text-primary)] font-medium max-w-[250px]">
                        <span className="truncate block">{q.query}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <MiniBar value={q.clicks} max={maxClicks} color="bg-blue-500" />
                          <span className="text-blue-400 font-medium w-8 text-right">{fmtNum(q.clicks)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right"><DeltaBadge value={q.clicks_delta} /></td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)]">{fmtNum(q.impressions)}</td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)]">{fmtCtr(q.ctr)}</td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)] font-medium">{fmtPos(q.position)}</td>
                      <td className="px-3 py-2 text-right"><DeltaBadge value={q.position_delta} invert /></td>
                      <td className="px-3 py-2 text-center"><StatusBadge status={displayStatus} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Pages (Trang)
// ---------------------------------------------------------------------------

function PagesTab({ pages }: { pages: ComparedPage[] }) {
  const [filter, setFilter] = useState<PageFilter>('all');
  const [sortKey, setSortKey] = useState('clicks');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    let list = pages;
    switch (filter) {
      case 'winner': list = pages.filter((p) => p.status === 'winner'); break;
      case 'loser': list = pages.filter((p) => p.status === 'loser'); break;
      case 'new': list = pages.filter((p) => p.status === 'new'); break;
    }
    return [...list].sort((a, b) => {
      const aVal = (a as unknown as Record<string, number>)[sortKey] ?? 0;
      const bVal = (b as unknown as Record<string, number>)[sortKey] ?? 0;
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [pages, filter, sortKey, sortDir]);

  const maxClicks = Math.max(...pages.map((p) => p.clicks), 1);

  const FILTERS: { key: PageFilter; label: string; count: number; cls: string }[] = [
    { key: 'all', label: 'Tất cả', count: pages.length, cls: '' },
    { key: 'winner', label: 'Tăng', count: pages.filter((p) => p.status === 'winner').length, cls: 'text-green-400' },
    { key: 'loser', label: 'Giảm', count: pages.filter((p) => p.status === 'loser').length, cls: 'text-red-400' },
    { key: 'new', label: 'Mới', count: pages.filter((p) => p.status === 'new').length, cls: 'text-blue-400' },
  ];

  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              filter === f.key
                ? 'bg-accent text-white'
                : 'bg-card border border-border text-[#8888a0] hover:text-[var(--text-primary)]',
            )}
          >
            <span className={filter !== f.key ? f.cls : ''}>{f.label}</span>
            {f.count > 0 && <span className="ml-1 opacity-70">{f.count}</span>}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-medium text-[#8888a0] w-8">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[#8888a0]">URL</th>
                <SortHeader label="Clicks" sortKey="clicks" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <th className="px-3 py-2 text-right text-xs font-medium text-[#8888a0]">+/-</th>
                <SortHeader label="Impr" sortKey="impressions" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="CTR" sortKey="ctr" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="Vị trí" sortKey="position" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <th className="px-3 py-2 text-right text-xs font-medium text-[#8888a0]">+/-</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-[#8888a0]">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-[#8888a0]">Không có dữ liệu.</td></tr>
              ) : (
                filtered.map((p, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-3 py-2 text-[#8888a0]">{i + 1}</td>
                    <td className="px-3 py-2 text-[var(--text-primary)] font-medium max-w-[300px]">
                      <span className="truncate block" title={p.page}>{shortUrl(p.page)}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <MiniBar value={p.clicks} max={maxClicks} color="bg-blue-500" />
                        <span className="text-blue-400 font-medium w-8 text-right">{fmtNum(p.clicks)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right"><DeltaBadge value={p.clicks_delta} /></td>
                    <td className="px-3 py-2 text-right text-[var(--text-primary)]">{fmtNum(p.impressions)}</td>
                    <td className="px-3 py-2 text-right text-[var(--text-primary)]">{fmtCtr(p.ctr)}</td>
                    <td className="px-3 py-2 text-right text-[var(--text-primary)] font-medium">{fmtPos(p.position)}</td>
                    <td className="px-3 py-2 text-right"><DeltaBadge value={p.position_delta} invert /></td>
                    <td className="px-3 py-2 text-center"><StatusBadge status={p.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Analysis (Phân tích)
// ---------------------------------------------------------------------------

function AnalysisTab({
  insights,
  queries,
  pages,
  latest,
  prev,
}: {
  insights: string[];
  queries: ComparedQuery[];
  pages: ComparedPage[];
  latest: GscSnapshot;
  prev: GscSnapshot | null;
}) {
  // Position distribution
  const positionBuckets = useMemo(() => {
    const buckets = { '1-3': 0, '4-10': 0, '11-20': 0, '21-50': 0, '50+': 0 };
    for (const q of queries) {
      if (q.position <= 3) buckets['1-3']++;
      else if (q.position <= 10) buckets['4-10']++;
      else if (q.position <= 20) buckets['11-20']++;
      else if (q.position <= 50) buckets['21-50']++;
      else buckets['50+']++;
    }
    return buckets;
  }, [queries]);

  const totalQ = queries.length || 1;
  const bucketColors: Record<string, string> = {
    '1-3': 'bg-green-500',
    '4-10': 'bg-blue-500',
    '11-20': 'bg-orange-500',
    '21-50': 'bg-yellow-500',
    '50+': 'bg-red-500',
  };

  // CTR analysis: actual CTR vs expected by position
  const ctrByPosition = useMemo(() => {
    // Expected CTR curve (industry average)
    const expected: Record<string, number> = {
      '1': 0.28, '2': 0.15, '3': 0.11, '4': 0.08, '5': 0.06,
      '6': 0.04, '7': 0.03, '8': 0.03, '9': 0.02, '10': 0.02,
    };
    const results: { posRange: string; avgCtr: number; expectedCtr: number; count: number; verdict: string }[] = [];

    for (let pos = 1; pos <= 10; pos++) {
      const inRange = queries.filter((q) => Math.round(q.position) === pos);
      if (inRange.length === 0) continue;
      const avgCtr = inRange.reduce((sum, q) => sum + q.ctr, 0) / inRange.length;
      const exp = expected[String(pos)] ?? 0.02;
      const verdict = avgCtr >= exp ? 'Tốt' : avgCtr >= exp * 0.7 ? 'Trung bình' : 'Cần cải thiện title/meta';
      results.push({
        posRange: `Vị trí ${pos}`,
        avgCtr,
        expectedCtr: exp,
        count: inRange.length,
        verdict,
      });
    }
    return results;
  }, [queries]);

  // Detailed period comparison
  const periodDiff = prev ? {
    clicks: latest.clicks - prev.clicks,
    impressions: latest.impressions - prev.impressions,
    ctr: latest.ctr - prev.ctr,
    position: latest.position - prev.position,
  } : null;

  return (
    <div className="space-y-4">
      {/* Expert Insights */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Nhận định chuyên gia</h3>
        </div>
        {insights.length === 0 ? (
          <p className="text-xs text-[#8888a0]">Cần ít nhất 2 kỳ dữ liệu để phân tích xu hướng.</p>
        ) : (
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2">
                <ArrowUpRight className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Period Comparison */}
      {periodDiff && prev && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            So sánh: {fmtDateFull(prev.date)} vs {fmtDateFull(latest.date)}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Clicks', prev: prev.clicks, cur: latest.clicks, diff: periodDiff.clicks, fmt: fmtNum },
              { label: 'Impressions', prev: prev.impressions, cur: latest.impressions, diff: periodDiff.impressions, fmt: fmtNum },
              { label: 'CTR', prev: prev.ctr, cur: latest.ctr, diff: periodDiff.ctr, fmt: fmtCtr },
              { label: 'Vị trí TB', prev: prev.position, cur: latest.position, diff: periodDiff.position, fmt: fmtPos, invert: true },
            ].map(({ label, prev: pv, cur, diff, fmt, invert }) => (
              <div key={label} className="bg-secondary/30 rounded-lg p-3">
                <p className="text-[10px] text-[#8888a0] mb-1">{label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-[var(--text-primary)]">{fmt(cur)}</span>
                  <DeltaBadge value={diff} invert={invert} />
                </div>
                <p className="text-[10px] text-[#8888a0] mt-0.5">Trước: {fmt(pv)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Position Distribution */}
      {queries.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Phân bố vị trí từ khóa</h3>
          <div className="space-y-2">
            {Object.entries(positionBuckets).map(([range, count]) => {
              const pct = (count / totalQ) * 100;
              return (
                <div key={range} className="flex items-center gap-3">
                  <span className="text-xs text-[#8888a0] w-12 text-right">{range}</span>
                  <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', bucketColors[range])}
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-[var(--text-primary)] w-16 text-right">
                    {count} ({pct.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-[#8888a0]">
            Mục tiêu: tối đa từ khóa ở vị trí 1-3. Hiện có {positionBuckets['1-3']} từ khóa top 3
            ({((positionBuckets['1-3'] / totalQ) * 100).toFixed(0)}%).
          </p>
        </div>
      )}

      {/* CTR Analysis */}
      {ctrByPosition.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Phân tích CTR theo vị trí</h3>
          </div>
          <p className="text-[10px] text-[#8888a0]">So sánh CTR thực tế vs CTR trung bình ngành. CTR thấp = cần cải thiện title/meta description.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Vị trí', 'Số KW', 'CTR thực tế', 'CTR TB ngành', 'Đánh giá'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[#8888a0] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ctrByPosition.map((row) => (
                  <tr key={row.posRange} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-[var(--text-primary)] font-medium">{row.posRange}</td>
                    <td className="px-3 py-2 text-[var(--text-primary)]">{row.count}</td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        'font-medium',
                        row.avgCtr >= row.expectedCtr ? 'text-green-400' : 'text-red-400',
                      )}>
                        {fmtCtr(row.avgCtr)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[#8888a0]">{fmtCtr(row.expectedCtr)}</td>
                    <td className="px-3 py-2">
                      <span className={cn('text-xs',
                        row.verdict === 'Tốt' ? 'text-green-400' : row.verdict === 'Trung bình' ? 'text-yellow-400' : 'text-red-400',
                      )}>
                        {row.verdict}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Items */}
      <div className="bg-card border border-accent/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Hành động ưu tiên</h3>
        </div>
        <ActionItems queries={queries} pages={pages} ctrAnalysis={ctrByPosition} />
      </div>
    </div>
  );
}

// Generate prioritized action items
function ActionItems({
  queries,
  pages,
  ctrAnalysis,
}: {
  queries: ComparedQuery[];
  pages: ComparedPage[];
  ctrAnalysis: { posRange: string; verdict: string; count: number }[];
}) {
  const actions: { priority: 'high' | 'medium' | 'low'; text: string }[] = [];

  // High priority: losing keywords that had good traffic
  const bigLosers = queries
    .filter((q) => q.status === 'loser' && q.prev_clicks >= 5)
    .sort((a, b) => a.clicks_delta - b.clicks_delta)
    .slice(0, 3);

  for (const q of bigLosers) {
    actions.push({
      priority: 'high',
      text: `Khôi phục "${q.query}" — mất ${Math.abs(q.clicks_delta)} clicks, vị trí ${fmtPos(q.prev_position)} → ${fmtPos(q.position)}. Kiểm tra content freshness + competitor analysis.`,
    });
  }

  // High priority: CTR issues
  const ctrIssues = ctrAnalysis.filter((r) => r.verdict === 'Cần cải thiện title/meta' && r.count >= 2);
  for (const issue of ctrIssues) {
    actions.push({
      priority: 'high',
      text: `Cải thiện title & meta description cho ${issue.count} từ khóa ở ${issue.posRange} — CTR đang thấp hơn trung bình ngành.`,
    });
  }

  // Medium priority: Opportunities
  const opps = queries
    .filter((q) => q.position >= 4 && q.position <= 15 && q.impressions >= 50)
    .sort((a, b) => a.position - b.position)
    .slice(0, 3);

  for (const q of opps) {
    actions.push({
      priority: 'medium',
      text: `Đẩy "${q.query}" lên top 3 — đang ở vị trí ${fmtPos(q.position)} với ${fmtNum(q.impressions)} impressions. Thêm internal links + content depth.`,
    });
  }

  // Low: pages declining
  const decliningPages = pages
    .filter((p) => p.status === 'loser' && p.prev_clicks >= 3)
    .sort((a, b) => a.clicks_delta - b.clicks_delta)
    .slice(0, 2);

  for (const p of decliningPages) {
    actions.push({
      priority: 'low',
      text: `Review trang ${shortUrl(p.page)} — giảm ${Math.abs(p.clicks_delta)} clicks. Cập nhật nội dung + kiểm tra technical issues.`,
    });
  }

  if (actions.length === 0) {
    return <p className="text-xs text-[#8888a0]">Cần thêm dữ liệu so sánh để đưa ra hành động cụ thể.</p>;
  }

  const priorityConfig = {
    high: { label: 'Cao', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
    medium: { label: 'TB', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
    low: { label: 'Thấp', cls: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
  };

  return (
    <div className="space-y-2">
      {actions.map((a, i) => {
        const cfg = priorityConfig[a.priority];
        return (
          <div key={i} className="flex items-start gap-2">
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 mt-0.5', cfg.cls)}>
              {cfg.label}
            </span>
            <p className="text-xs text-[var(--text-primary)] leading-relaxed">{a.text}</p>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Snapshot Modal
// ---------------------------------------------------------------------------

function AddSnapshotModal({
  projects,
  defaultProjectId,
  onClose,
  onSaved,
}: {
  projects: Project[];
  defaultProjectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    project_slug: projects.find((p) => p.id === defaultProjectId)?.slug || projects[0]?.slug || '',
    date: new Date().toISOString().split('T')[0],
    clicks: '',
    impressions: '',
    ctr: '',
    position: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_slug || !form.date) { setError('Vui lòng điền đầy đủ.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/v1/gsc/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_slug: form.project_slug,
          date: form.date,
          period: 'weekly',
          clicks: parseInt(form.clicks) || 0,
          impressions: parseInt(form.impressions) || 0,
          ctr: parseFloat(form.ctr) || 0,
          position: parseFloat(form.position) || 0,
        }),
      });
      if (res.ok) { onSaved(); } else {
        const data = await res.json();
        setError(data.error || 'Lưu thất bại.');
      }
    } catch {
      setError('Có lỗi xảy ra.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Thêm GSC Snapshot</h2>
          <button onClick={onClose} className="p-1 text-[#8888a0] hover:text-[var(--text-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-[#8888a0] mb-1">Dự án *</label>
            <select
              value={form.project_slug}
              onChange={(e) => setForm({ ...form, project_slug: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
              required
            >
              {projects.map((p) => (
                <option key={p.id} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#8888a0] mb-1">Ngày *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#8888a0] mb-1">Clicks</label>
              <input type="number" value={form.clicks} onChange={(e) => setForm({ ...form, clicks: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1">Impressions</label>
              <input type="number" value={form.impressions} onChange={(e) => setForm({ ...form, impressions: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1">CTR (0-1)</label>
              <input type="number" step="0.001" value={form.ctr} onChange={(e) => setForm({ ...form, ctr: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm" placeholder="0.035" />
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1">Vị trí TB</label>
              <input type="number" step="0.1" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm" placeholder="15.2" />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 bg-secondary hover:bg-border rounded-lg text-[var(--text-primary)] text-sm font-medium transition-colors">
              Hủy
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors">
              {saving ? 'Đang lưu...' : 'Lưu snapshot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
