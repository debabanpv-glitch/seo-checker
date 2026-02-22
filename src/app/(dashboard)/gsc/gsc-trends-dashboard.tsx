'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  MousePointerClick,
  Eye,
  TrendingUp,
  Hash,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  X,
  Loader2,
  Search,
  FileText,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Project } from '@/types';
import { cn } from '@/lib/utils';

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

interface GscQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

type Period = 'weekly' | 'monthly';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatCtr(ctr: number): string {
  return `${(ctr * 100).toFixed(1)}%`;
}

function formatPosition(pos: number): string {
  return pos.toFixed(1);
}

// Delta: (current - prev) / prev * 100, inverted for position (lower = better)
function calcDelta(current: number, prev: number, invert = false): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (!prev) return { pct: 0, direction: 'flat' };
  const raw = ((current - prev) / prev) * 100;
  const pct = Math.abs(raw);
  const isPositive = invert ? raw < 0 : raw > 0;
  return { pct, direction: pct < 0.5 ? 'flat' : isPositive ? 'up' : 'down' };
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  delta?: { pct: number; direction: 'up' | 'down' | 'flat' };
}

function StatCard({ label, value, icon: Icon, color, delta }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
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
      </div>
    </div>
  );
}

export default function GscTrendsDashboard() {
  const [snapshots, setSnapshots] = useState<GscSnapshot[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [period, setPeriod] = useState<Period>('weekly');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'queries' | 'pages'>('overview');

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
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProjectId) params.set('project_id', selectedProjectId);
      params.set('period', period);

      // Try trends endpoint first, fall back to snapshot
      const res = await fetch(`/api/v1/gsc/trends?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots || data.trends || []);
      } else {
        const snapRes = await fetch(`/api/v1/gsc/snapshot?${params}`);
        if (snapRes.ok) {
          const data = await snapRes.json();
          setSnapshots(data.snapshots || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch GSC data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const maxClicks = Math.max(...snapshots.map((s) => s.clicks || 0), 1);
  const maxImpressions = Math.max(...snapshots.map((s) => s.impressions || 0), 1);

  // Deltas vs previous period
  const clicksDelta = prev ? calcDelta(latest?.clicks ?? 0, prev.clicks) : undefined;
  const impressionsDelta = prev ? calcDelta(latest?.impressions ?? 0, prev.impressions) : undefined;
  const ctrDelta = prev ? calcDelta(latest?.ctr ?? 0, prev.ctr) : undefined;
  const positionDelta = prev ? calcDelta(latest?.position ?? 0, prev.position, true) : undefined;

  // Top queries & pages from latest snapshot
  const topQueries = (latest?.top_queries as GscQuery[] | null) ?? [];
  const topPages = (latest?.top_pages as GscPage[] | null) ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Search Console</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm"
          >
            <option value="">Tất cả dự án</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="flex bg-card border border-border rounded-lg overflow-hidden text-sm">
            {(['weekly', 'monthly'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 font-medium transition-colors',
                  period === p
                    ? 'bg-accent text-white'
                    : 'text-[#8888a0] hover:text-[var(--text-primary)]'
                )}
              >
                {p === 'weekly' ? 'Tuần' : 'Tháng'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Thêm snapshot
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      {snapshots.length > 0 && (
        <div className="flex bg-card border border-border rounded-lg overflow-hidden text-sm w-fit">
          {([
            { key: 'overview', label: 'Tổng quan', icon: BarChart2 },
            { key: 'queries', label: 'Top Queries', icon: Search },
            { key: 'pages', label: 'Top Pages', icon: FileText },
          ] as const).map(({ key, label, icon: TabIcon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors',
                activeTab === key
                  ? 'bg-accent text-white'
                  : 'text-[#8888a0] hover:text-[var(--text-primary)]'
              )}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <PageLoading />
      ) : snapshots.length === 0 ? (
        <EmptyState
          icon={BarChart2}
          title="Chưa có dữ liệu GSC"
          description="Dữ liệu Google Search Console sẽ xuất hiện khi có snapshot được ghi nhận"
        />
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Clicks"
              value={latest?.clicks?.toLocaleString('vi-VN') ?? '—'}
              icon={MousePointerClick}
              color="bg-blue-500/20 text-blue-400"
              delta={clicksDelta}
            />
            <StatCard
              label="Impressions"
              value={latest?.impressions?.toLocaleString('vi-VN') ?? '—'}
              icon={Eye}
              color="bg-purple-500/20 text-purple-400"
              delta={impressionsDelta}
            />
            <StatCard
              label="CTR"
              value={latest ? formatCtr(latest.ctr) : '—'}
              icon={TrendingUp}
              color="bg-green-500/20 text-green-400"
              delta={ctrDelta}
            />
            <StatCard
              label="Vị trí TB"
              value={latest ? formatPosition(latest.position) : '—'}
              icon={Hash}
              color="bg-orange-500/20 text-orange-400"
              delta={positionDelta}
            />
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Trend Chart */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Xu hướng Clicks</h2>
                  <span className="text-xs text-[#8888a0]">{snapshots.length} điểm dữ liệu</span>
                </div>
                <div className="flex items-end gap-1.5 h-40 overflow-x-auto pb-1">
                  {snapshots.map((s) => {
                    const heightPct = maxClicks > 0 ? (s.clicks / maxClicks) : 0;
                    const heightPx = Math.max(Math.round(heightPct * 130), 2);
                    return (
                      <div key={s.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-[#8888a0] leading-none">
                          {s.clicks > 0 ? s.clicks : ''}
                        </span>
                        <div
                          className="w-8 bg-accent rounded-t transition-all"
                          style={{ height: `${heightPx}px` }}
                          title={`${formatDate(s.date)}: ${s.clicks} clicks`}
                        />
                        <span className="text-xs text-[#8888a0] whitespace-nowrap">
                          {formatDate(s.date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Impressions Chart */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Xu hướng Impressions</h2>
                <div className="flex items-end gap-1.5 h-40 overflow-x-auto pb-1">
                  {snapshots.map((s) => {
                    const heightPct = maxImpressions > 0 ? (s.impressions / maxImpressions) : 0;
                    const heightPx = Math.max(Math.round(heightPct * 130), 2);
                    return (
                      <div key={s.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-[#8888a0] leading-none">
                          {s.impressions > 0 ? s.impressions : ''}
                        </span>
                        <div
                          className="w-8 bg-purple-500 rounded-t transition-all"
                          style={{ height: `${heightPx}px` }}
                          title={`${formatDate(s.date)}: ${s.impressions} impressions`}
                        />
                        <span className="text-xs text-[#8888a0] whitespace-nowrap">
                          {formatDate(s.date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Snapshots Table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Chi tiết snapshot</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['Ngày', 'Clicks', 'Impressions', 'CTR', 'Vị trí TB'].map((col) => (
                          <th key={col} className="px-4 py-2.5 text-left text-xs font-medium text-[#8888a0]">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...snapshots].reverse().map((s, i) => (
                        <tr
                          key={s.id}
                          className={cn(
                            'border-b border-border last:border-0 hover:bg-secondary/50 transition-colors',
                            i === 0 ? 'bg-accent/5' : ''
                          )}
                        >
                          <td className="px-4 py-2.5 text-[var(--text-primary)] text-xs">
                            {new Date(s.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-2.5 text-[var(--text-primary)] font-medium text-xs">{s.clicks?.toLocaleString('vi-VN')}</td>
                          <td className="px-4 py-2.5 text-[var(--text-primary)] text-xs">{s.impressions?.toLocaleString('vi-VN')}</td>
                          <td className="px-4 py-2.5 text-[var(--text-primary)] text-xs">{formatCtr(s.ctr)}</td>
                          <td className="px-4 py-2.5 text-[var(--text-primary)] text-xs">{formatPosition(s.position)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Top Queries Tab */}
          {activeTab === 'queries' && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Top Queries {latest ? `— ${formatDate(latest.date)}` : ''}
                </h2>
              </div>
              {topQueries.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#8888a0]">
                  Chưa có dữ liệu top queries. Thêm snapshot với dữ liệu top_queries để hiển thị.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['#', 'Query', 'Clicks', 'Impressions', 'CTR', 'Vị trí'].map((col) => (
                          <th key={col} className="px-4 py-2.5 text-left text-xs font-medium text-[#8888a0]">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topQueries.slice(0, 25).map((q, i) => (
                        <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                          <td className="px-4 py-2 text-xs text-[#8888a0]">{i + 1}</td>
                          <td className="px-4 py-2 text-xs text-[var(--text-primary)] font-medium max-w-xs truncate">{q.query}</td>
                          <td className="px-4 py-2 text-xs text-blue-400 font-medium">{q.clicks?.toLocaleString('vi-VN')}</td>
                          <td className="px-4 py-2 text-xs text-[var(--text-primary)]">{q.impressions?.toLocaleString('vi-VN')}</td>
                          <td className="px-4 py-2 text-xs text-[var(--text-primary)]">{formatCtr(q.ctr)}</td>
                          <td className="px-4 py-2 text-xs text-[var(--text-primary)]">{formatPosition(q.position)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Top Pages Tab */}
          {activeTab === 'pages' && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Top Pages {latest ? `— ${formatDate(latest.date)}` : ''}
                </h2>
              </div>
              {topPages.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#8888a0]">
                  Chưa có dữ liệu top pages. Thêm snapshot với dữ liệu top_pages để hiển thị.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['#', 'Page', 'Clicks', 'Impressions', 'CTR', 'Vị trí'].map((col) => (
                          <th key={col} className="px-4 py-2.5 text-left text-xs font-medium text-[#8888a0]">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topPages.slice(0, 25).map((p, i) => (
                        <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                          <td className="px-4 py-2 text-xs text-[#8888a0]">{i + 1}</td>
                          <td className="px-4 py-2 text-xs text-[var(--text-primary)] font-medium max-w-sm truncate" title={p.page}>{p.page}</td>
                          <td className="px-4 py-2 text-xs text-blue-400 font-medium">{p.clicks?.toLocaleString('vi-VN')}</td>
                          <td className="px-4 py-2 text-xs text-[var(--text-primary)]">{p.impressions?.toLocaleString('vi-VN')}</td>
                          <td className="px-4 py-2 text-xs text-[var(--text-primary)]">{formatCtr(p.ctr)}</td>
                          <td className="px-4 py-2 text-xs text-[var(--text-primary)]">{formatPosition(p.position)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Snapshot Modal */}
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
