'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  MousePointerClick,
  Eye,
  TrendingUp,
  Hash,
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
  created_at: string;
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

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-[#8888a0]">{label}</p>
        <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
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
  const maxClicks = Math.max(...snapshots.map((s) => s.clicks || 0), 1);
  const maxImpressions = Math.max(...snapshots.map((s) => s.impressions || 0), 1);

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
        </div>
      </div>

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
            />
            <StatCard
              label="Impressions"
              value={latest?.impressions?.toLocaleString('vi-VN') ?? '—'}
              icon={Eye}
              color="bg-purple-500/20 text-purple-400"
            />
            <StatCard
              label="CTR"
              value={latest ? formatCtr(latest.ctr) : '—'}
              icon={TrendingUp}
              color="bg-green-500/20 text-green-400"
            />
            <StatCard
              label="Vị trí TB"
              value={latest ? formatPosition(latest.position) : '—'}
              icon={Hash}
              color="bg-orange-500/20 text-orange-400"
            />
          </div>

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
                      <th
                        key={col}
                        className="px-4 py-2.5 text-left text-xs font-medium text-[#8888a0]"
                      >
                        {col}
                      </th>
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
                        {new Date(s.date).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-primary)] font-medium text-xs">
                        {s.clicks?.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-primary)] text-xs">
                        {s.impressions?.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-primary)] text-xs">
                        {formatCtr(s.ctr)}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-primary)] text-xs">
                        {formatPosition(s.position)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
