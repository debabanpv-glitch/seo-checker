'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Trash2, Edit2, Check, X, Key, Link, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TopicalMapKeywordAssign } from './topical-map-keyword-assign-table-with-gsc-stats-and-modal';
import { TopicalMapInternalLinks } from './topical-map-internal-links-table-with-pillar-status-and-warnings';
import { TopicalMapOverlapCheck } from './topical-map-overlap-check-cannibalization-warnings';

interface ClusterDetail {
  id: string;
  name: string;
  project_id: string;
  pillar_url: string | null;
  description: string | null;
}

interface ClusterStats {
  keywordCount: number;
  pageCount: number;
  avgPosition: number | null;
  totalClicks: number;
  totalImpressions: number;
  top10Count: number;
  top30Count: number;
  pagesWithLinkToPillar: number;
  linkHealthPct: number;
}

interface ClusterFullDetail {
  cluster: ClusterDetail;
  pages: PageRow[];
  keywords: KeywordRow[];
}

interface KeywordRow {
  id: string;
  keyword: string;
  current_position: number | null;
  previous_position: number | null;
  url: string | null;
  clicks: number | null;
  impressions: number | null;
}

interface PageRow {
  id: string;
  url: string;
  title: string | null;
  role: 'pillar' | 'supporting' | 'related';
  links_to_pillar: boolean;
  pillar_links_to_page: boolean;
  notes: string | null;
}

type DetailTab = 'keywords' | 'pages' | 'overlap';

const TABS: { key: DetailTab; label: string; icon: React.ElementType }[] = [
  { key: 'keywords', label: 'Từ khóa', icon: Key },
  { key: 'pages', label: 'Bài viết & Links', icon: Link },
  { key: 'overlap', label: 'Đánh giá', icon: AlertTriangle },
];

interface Props {
  clusterId: string;
  onRefresh: () => void;
}

export function TopicalMapClusterDetail({ clusterId, onRefresh }: Props) {
  const [cluster, setCluster] = useState<ClusterDetail | null>(null);
  const [stats, setStats] = useState<ClusterStats | null>(null);
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('keywords');

  // Inline edit state
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingPillar, setEditingPillar] = useState(false);
  const [editPillar, setEditPillar] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      const [detailRes, statsRes] = await Promise.all([
        fetch(`/api/v1/topic-clusters?id=${clusterId}`),
        fetch(`/api/v1/topic-clusters?id=${clusterId}&stats=true`),
      ]);
      const detailJson: ClusterFullDetail = await detailRes.json();
      const statsJson: ClusterStats = await statsRes.json();
      setCluster(detailJson.cluster || null);
      // Map keywords from detail API to component format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setKeywords((detailJson.keywords || []).map((kw: any) => ({
        id: kw.id as string,
        keyword: kw.keyword as string,
        current_position: (kw.position as number) || null,
        previous_position: null,
        url: (kw.url as string) || null,
        clicks: (kw.gsc_clicks as number) ?? null,
        impressions: (kw.gsc_impressions as number) ?? null,
      })));
      // Map pages from detail API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPages((detailJson.pages || []).map((p: any) => ({
        id: p.id as string,
        url: p.url as string,
        title: (p.title as string) || null,
        role: (p.role as 'pillar' | 'supporting' | 'related') || 'supporting',
        links_to_pillar: !!p.has_link_to_pillar,
        pillar_links_to_page: !!p.has_link_from_pillar,
        notes: (p.notes as string) || null,
      })));
      setStats(statsJson || null);
    } catch (e) {
      console.error('Failed to fetch cluster detail:', e);
    } finally {
      setIsLoading(false);
    }
  }, [clusterId]);

  useEffect(() => {
    fetchDetail();
    setActiveTab('keywords');
  }, [fetchDetail]);

  const handleSaveName = async () => {
    if (!editName.trim() || !cluster) return;
    setIsSaving(true);
    try {
      await fetch(`/api/v1/topic-clusters`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clusterId, name: editName.trim() }),
      });
      setCluster((prev) => prev ? { ...prev, name: editName.trim() } : prev);
      setEditingName(false);
      onRefresh();
    } catch (e) {
      console.error('Failed to save name:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePillar = async () => {
    if (!cluster) return;
    setIsSaving(true);
    try {
      await fetch(`/api/v1/topic-clusters`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clusterId, pillar_url: editPillar.trim() || null }),
      });
      setCluster((prev) => prev ? { ...prev, pillar_url: editPillar.trim() || null } : prev);
      setEditingPillar(false);
    } catch (e) {
      console.error('Failed to save pillar URL:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!cluster || !confirm(`Xóa cluster "${cluster.name}"? Hành động này không thể hoàn tác.`)) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/v1/topic-clusters?id=${clusterId}`, { method: 'DELETE' });
      onRefresh();
    } catch (e) {
      console.error('Failed to delete cluster:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[var(--text-muted)]">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Đang tải...
      </div>
    );
  }

  if (!cluster) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[var(--text-muted)]">
        Không tìm thấy cluster
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cluster header card */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Name */}
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                  className="flex-1 px-2 py-1 text-lg font-bold bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-[var(--text-primary)]"
                />
                <button onClick={handleSaveName} disabled={isSaving}
                  className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button onClick={() => setEditingName(false)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">{cluster.name}</h2>
                <button
                  onClick={() => { setEditName(cluster.name); setEditingName(true); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-blue-500 rounded transition-opacity"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Pillar URL */}
            {editingPillar ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="url"
                  value={editPillar}
                  onChange={(e) => setEditPillar(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSavePillar(); if (e.key === 'Escape') setEditingPillar(false); }}
                  placeholder="https://domain.com/pillar-page"
                  className="flex-1 px-2 py-1 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-[var(--text-primary)]"
                />
                <button onClick={handleSavePillar} disabled={isSaving}
                  className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded">
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setEditingPillar(false)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                {cluster.pillar_url ? (
                  <a href={cluster.pillar_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline truncate max-w-md">
                    {cluster.pillar_url}
                  </a>
                ) : (
                  <span className="text-sm text-[var(--text-muted)] italic">Chưa có pillar URL</span>
                )}
                <button
                  onClick={() => { setEditPillar(cluster.pillar_url || ''); setEditingPillar(true); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-blue-500 rounded transition-opacity"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span>{stats.keywordCount} từ khóa</span>
                <span>·</span>
                <span>{stats.pageCount} bài viết</span>
              </div>
            )}
          </div>

          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 border border-[var(--border)] rounded-lg transition-colors disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Xóa cluster
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden w-fit">
        {TABS.map(({ key, label, icon: TabIcon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === key
                ? 'bg-blue-600 text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            <TabIcon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'keywords' && (
        <TopicalMapKeywordAssign
          clusterId={clusterId}
          projectId={cluster.project_id}
          keywords={keywords}
          onRefresh={fetchDetail}
        />
      )}
      {activeTab === 'pages' && (
        <TopicalMapInternalLinks
          clusterId={clusterId}
          pages={pages}
          pillarUrl={cluster.pillar_url}
          onRefresh={fetchDetail}
        />
      )}
      {activeTab === 'overlap' && (
        <TopicalMapOverlapCheck clusterId={clusterId} />
      )}
    </div>
  );
}
