'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link2, Upload, Trash2, Loader2 } from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import type { Project } from '@/types';
import type { Backlink, BacklinkStats } from './backlinks-types-and-helpers';
import { BacklinksImportModal } from './backlinks-import-modal';
import { BacklinksStatsCards } from './backlinks-stats-cards';
import { BacklinksKeywordSummaryTable } from './backlinks-keyword-summary-table';
import { BacklinksDomainDistributionChart } from './backlinks-domain-distribution-chart';
import { BacklinksDetailTable } from './backlinks-detail-table';

export default function BacklinksPage() {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [stats, setStats] = useState<BacklinkStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // GSC data for keyword positions
  const [gscSnapshots, setGscSnapshots] = useState<{ top_queries?: { query: string; clicks: number; impressions: number; position: number }[] }[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = selectedProject ? `?project_id=${selectedProject}` : '';
      const fetches = [
        fetch(`/api/v1/backlinks${qs}`),
        fetch(`/api/v1/backlinks?mode=stats${selectedProject ? `&project_id=${selectedProject}` : ''}`),
        fetch('/api/v1/projects'),
      ];
      if (selectedProject) {
        fetches.push(fetch(`/api/v1/gsc/snapshot?project_id=${selectedProject}&limit=1`));
      }
      const responses = await Promise.all(fetches);
      const [blData, statsData, projData] = await Promise.all([
        responses[0].json(), responses[1].json(), responses[2].json(),
      ]);
      setBacklinks(blData.backlinks ?? []);
      setStats(statsData);
      setProjects(projData.projects ?? []);
      if (selectedProject && responses[3]) {
        const gscData = await responses[3].json();
        setGscSnapshots(gscData.snapshots ?? []);
      } else {
        setGscSnapshots([]);
      }
    } catch (e) {
      console.error('Failed to fetch backlinks:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build GSC keyword map from snapshots
  const gscMap = useMemo(() => {
    const map = new Map<string, { clicks: number; impressions: number; position: number }>();
    for (const snap of gscSnapshots) {
      for (const q of snap.top_queries ?? []) {
        const key = q.query.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, { clicks: q.clicks, impressions: q.impressions, position: q.position });
        }
      }
    }
    return map;
  }, [gscSnapshots]);

  const handleDelete = async () => {
    if (!confirm(selectedProject ? 'Xóa tất cả backlinks của dự án này?' : 'Xóa TẤT CẢ backlinks?')) return;
    setDeleting(true);
    try {
      await fetch(`/api/v1/backlinks${selectedProject ? `?project_id=${selectedProject}` : ''}`, { method: 'DELETE' });
      fetchData();
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Backlinks</h1>
          <p className="text-[#8888a0] text-sm mt-0.5">
            {stats?.totalBacklinks ? `${stats.totalBacklinks} backlinks · ${stats.uniqueDomains} domains · ${stats.uniqueKeywords} keywords` : 'Chưa có dữ liệu'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-xs">
            <option value="">Tất cả dự án</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {backlinks.length > 0 && (
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 border border-border rounded-lg transition-colors">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Xóa
            </button>
          )}
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white font-medium text-sm transition-colors">
            <Upload className="w-4 h-4" /> Import
          </button>
        </div>
      </div>

      {!stats || stats.totalBacklinks === 0 ? (
        <EmptyState icon={Link2} title="Chưa có backlinks"
          description="Import file XLS/CSV từ dịch vụ backlinks để bắt đầu theo dõi" />
      ) : (
        <>
          {/* Stats */}
          <BacklinksStatsCards stats={stats} />

          {/* Keyword summary + Domain chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <BacklinksKeywordSummaryTable keywords={stats.keywordSummary} gscData={gscMap} />
            </div>
            <div>
              <BacklinksDomainDistributionChart domains={stats.domainSummary} />
            </div>
          </div>

          {/* Detail table */}
          <BacklinksDetailTable backlinks={backlinks} />
        </>
      )}

      {/* Import modal */}
      {showImport && (
        <BacklinksImportModal
          projects={projects}
          onImported={() => { setShowImport(false); fetchData(); }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
