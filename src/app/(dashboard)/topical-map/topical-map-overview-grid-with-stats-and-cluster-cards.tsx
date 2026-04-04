'use client';

import { useState, useEffect } from 'react';
import { Network, FileText, Key, Plus, Loader2, FolderOpen, TrendingUp, AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClusterOverview {
  id: string;
  name: string;
  pillar_url: string | null;
  description: string | null;
  keywordCount: number;
  pageCount: number;
  clicks: number;
  impressions: number;
  top3: number;
  top10: number;
  top30: number;
  noRank: number;
  rankingPct: number;
  health: 'strong' | 'growing' | 'weak' | 'empty';
  hasPillar: boolean;
  contentStatus: 'not_planned' | 'planned' | 'in_progress' | 'completed';
  targetPages: number;
  executionNotes: string;
}

const STATUS_CONFIG = {
  in_progress: { label: 'Đang triển khai', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  planned: { label: 'Đã lên KH', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  not_planned: { label: 'Chưa có KH', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
  completed: { label: 'Hoàn thành', color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
};

interface Props {
  clusters: { id: string; name: string; project_id: string; pillar_url: string | null; description: string | null; keywordCount: number; pageCount: number }[];
  isLoading: boolean;
  selectedProjectId: string;
  onSelectCluster: (id: string) => void;
  onRefresh: () => void;
}

const HEALTH_CONFIG = {
  strong: { label: 'Mạnh', color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-300', icon: CheckCircle2 },
  growing: { label: 'Đang phát triển', color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-300', icon: TrendingUp },
  weak: { label: 'Yếu', color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-300', icon: AlertTriangle },
  empty: { label: 'Trống', color: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-300', icon: Target },
};

function RankingBar({ top3, top10, top30, noRank, total }: { top3: number; top10: number; top30: number; noRank: number; total: number }) {
  if (total === 0) return <div className="h-2 bg-gray-100 rounded-full" />;
  const rest = total - top3 - top10 - top30 - noRank;
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
      {top3 > 0 && <div className="bg-green-500" style={{ width: `${(top3 / total) * 100}%` }} title={`Top 3: ${top3}`} />}
      {top10 > 0 && <div className="bg-blue-500" style={{ width: `${(top10 / total) * 100}%` }} title={`Top 4-10: ${top10}`} />}
      {top30 > 0 && <div className="bg-yellow-400" style={{ width: `${(top30 / total) * 100}%` }} title={`Top 11-30: ${top30}`} />}
      {rest > 0 && <div className="bg-orange-300" style={{ width: `${(rest / total) * 100}%` }} title={`Top 30+: ${rest}`} />}
      {noRank > 0 && <div className="bg-gray-300" style={{ width: `${(noRank / total) * 100}%` }} title={`Chưa rank: ${noRank}`} />}
    </div>
  );
}

export function TopicalMapOverviewGrid({ clusters: _basicClusters, isLoading, selectedProjectId, onSelectCluster, onRefresh }: Props) {
  const [enrichedClusters, setEnrichedClusters] = useState<ClusterOverview[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClusterName, setNewClusterName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch enriched data
  useEffect(() => {
    if (!selectedProjectId) return;
    setLoadingOverview(true);
    fetch(`/api/v1/topic-clusters?projectId=${selectedProjectId}&overview=true`)
      .then(r => r.json())
      .then(d => setEnrichedClusters(d.clusters || []))
      .catch(console.error)
      .finally(() => setLoadingOverview(false));
  }, [selectedProjectId, _basicClusters]);

  const handleCreate = async () => {
    if (!newClusterName.trim() || !selectedProjectId) return;
    setIsCreating(true);
    try {
      await fetch('/api/v1/topic-clusters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClusterName.trim(), project_id: selectedProjectId }),
      });
      setNewClusterName('');
      setShowCreateForm(false);
      onRefresh();
    } catch (e) { console.error(e); }
    finally { setIsCreating(false); }
  };

  const clusters = enrichedClusters.length > 0 ? enrichedClusters : [];

  if (isLoading || loadingOverview) {
    return <div className="flex items-center justify-center py-20 text-sm text-[#8888a0]"><Loader2 className="w-5 h-5 animate-spin mr-2" />Đang tải...</div>;
  }

  if (clusters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FolderOpen className="w-12 h-12 text-[#8888a0] mb-3" />
        <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Chưa có cluster nào</p>
        <button onClick={() => setShowCreateForm(true)} className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80">
          <Plus className="w-4 h-4" />Tạo cluster
        </button>
      </div>
    );
  }

  // Aggregate stats
  const totalKW = clusters.reduce((s, c) => s + c.keywordCount, 0);
  const totalPages = clusters.reduce((s, c) => s + c.pageCount, 0);
  const totalTop10 = clusters.reduce((s, c) => s + c.top3 + c.top10, 0);
  const healthCounts = { strong: 0, growing: 0, weak: 0, empty: 0 };
  clusters.forEach(c => healthCounts[c.health]++);

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-[#8888a0] text-xs mb-1"><Network className="w-3.5 h-3.5" /> Clusters</div>
          <p className="text-xl font-bold text-[var(--text-primary)]">{clusters.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-purple-500 text-xs mb-1"><Key className="w-3.5 h-3.5" /> Từ khóa</div>
          <p className="text-xl font-bold text-[var(--text-primary)]">{totalKW}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-emerald-500 text-xs mb-1"><FileText className="w-3.5 h-3.5" /> Bài viết</div>
          <p className="text-xl font-bold text-[var(--text-primary)]">{totalPages}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-blue-500 text-xs mb-1"><TrendingUp className="w-3.5 h-3.5" /> Top 10</div>
          <p className="text-xl font-bold text-[var(--text-primary)]">{totalTop10}</p>
        </div>
        {/* Execution status distribution */}
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-[#8888a0] text-xs mb-1">Triển khai</div>
          <div className="flex flex-wrap items-center gap-1">
            {(['in_progress', 'planned', 'not_planned'] as const).map(s => {
              const count = clusters.filter(c => c.contentStatus === s).length;
              if (count === 0) return null;
              const sc = STATUS_CONFIG[s];
              return <span key={s} className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', sc.bg, sc.color)}>{count} {sc.label}</span>;
            })}
          </div>
        </div>
      </div>

      {/* Ranking legend */}
      <div className="flex items-center gap-4 text-[10px] text-[#8888a0]">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500" />Top 3</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500" />Top 4-10</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-400" />Top 11-30</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-300" />30+</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gray-300" />Chưa rank</span>
        <button onClick={() => setShowCreateForm(true)} className="ml-auto flex items-center gap-1 px-2 py-1 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/80">
          <Plus className="w-3 h-3" />Tạo cluster
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-card border border-accent/30 rounded-xl p-3 flex gap-2">
          <input autoFocus value={newClusterName} onChange={e => setNewClusterName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreateForm(false); }}
            placeholder="Tên cluster mới..." className="flex-1 px-3 py-1.5 text-sm bg-secondary border border-border rounded-lg text-[var(--text-primary)]" />
          <button onClick={handleCreate} disabled={isCreating || !newClusterName.trim()} className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tạo'}
          </button>
          <button onClick={() => setShowCreateForm(false)} className="px-2 py-1.5 text-sm text-[#8888a0]">Hủy</button>
        </div>
      )}

      {/* Cluster table — much more useful than cards */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-[#8888a0] text-xs">
              <th className="text-left p-2 pl-3 font-medium">Cluster</th>
              <th className="text-center p-2 font-medium w-14">KW</th>
              <th className="text-center p-2 font-medium w-14">Bài</th>
              <th className="text-center p-2 font-medium w-28">Triển khai</th>
              <th className="text-left p-2 font-medium w-40">Phân bổ ranking</th>
              <th className="text-center p-2 font-medium w-16">Top 10</th>
              <th className="text-center p-2 font-medium w-20">Sức khỏe</th>
            </tr>
          </thead>
          <tbody>
            {clusters.map(c => {
              const hc = HEALTH_CONFIG[c.health];
              const Icon = hc.icon;
              return (
                <tr key={c.id} onClick={() => onSelectCluster(c.id)}
                  className="border-b border-border/50 cursor-pointer hover:bg-secondary/30 transition-colors">
                  <td className="p-2 pl-3">
                    <div className="font-medium text-[var(--text-primary)]">{c.name}</div>
                    {c.pillar_url && <div className="text-[10px] text-[#8888a0] truncate max-w-[250px]">{c.pillar_url.replace(/^https?:\/\/[^/]+/, '')}</div>}
                  </td>
                  <td className="p-2 text-center">
                    <span className={cn('text-sm font-bold', c.keywordCount > 0 ? 'text-[var(--text-primary)]' : 'text-[#8888a0]')}>{c.keywordCount}</span>
                  </td>
                  <td className="p-2 text-center">
                    <span className={cn('text-sm font-bold', c.pageCount > 0 ? 'text-[var(--text-primary)]' : 'text-red-400')}>{c.pageCount}</span>
                    {c.pageCount === 0 && c.keywordCount > 0 && <div className="text-[9px] text-red-400">thiếu</div>}
                  </td>
                  <td className="p-2 text-center">
                    {(() => {
                      const sc = STATUS_CONFIG[c.contentStatus];
                      return (
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', sc.bg, sc.color)}>
                          {sc.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="p-2">
                    <RankingBar top3={c.top3} top10={c.top10} top30={c.top30} noRank={c.noRank} total={c.keywordCount} />
                    <div className="flex justify-between text-[9px] text-[#8888a0] mt-0.5">
                      <span>{c.top3} top3</span>
                      <span>{c.top10} top10</span>
                      <span>{c.noRank} N/A</span>
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    <span className={cn('text-sm font-bold', c.rankingPct >= 40 ? 'text-green-600' : c.rankingPct >= 15 ? 'text-blue-600' : 'text-[#8888a0]')}>
                      {c.rankingPct}%
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', hc.bg, hc.color)}>
                      <Icon className="w-3 h-3" />{hc.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
