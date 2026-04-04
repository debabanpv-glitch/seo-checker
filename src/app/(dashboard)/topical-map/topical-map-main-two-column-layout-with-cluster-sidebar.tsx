'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { TopicalMapOverviewGrid } from './topical-map-overview-grid-with-stats-and-cluster-cards';
import { TopicalMapClusterDetail } from './topical-map-cluster-detail-with-tabs-keywords-pages-overlap';

interface Project {
  id: string;
  name: string;
}

interface Cluster {
  id: string;
  name: string;
  project_id: string;
  pillar_url: string | null;
  description: string | null;
  keywordCount: number;
  pageCount: number;
}

export default function TopicalMapMain() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [isLoadingClusters, setIsLoadingClusters] = useState(false);

  // Fetch projects once
  useEffect(() => {
    fetch('/api/v1/projects')
      .then((r) => r.json())
      .then((d) => {
        const list: Project[] = d.projects || [];
        setProjects(list);
        if (list.length > 0) setSelectedProjectId(list[0].id);
      })
      .catch(console.error);
  }, []);

  // Fetch clusters when project changes
  const fetchClusters = useCallback(async () => {
    if (!selectedProjectId) return;
    setIsLoadingClusters(true);
    try {
      const res = await fetch(`/api/v1/topic-clusters?projectId=${selectedProjectId}`);
      const json = await res.json();
      setClusters(json.clusters || []);
    } catch (e) {
      console.error('Failed to fetch clusters:', e);
    } finally {
      setIsLoadingClusters(false);
    }
  }, [selectedProjectId]);

  useEffect(() => { fetchClusters(); }, [fetchClusters]);

  const handleRefresh = useCallback(() => {
    fetchClusters();
  }, [fetchClusters]);

  const selectedCluster = clusters.find((c) => c.id === selectedClusterId);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedClusterId && (
            <button
              onClick={() => setSelectedClusterId(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Tổng quan
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {selectedClusterId && selectedCluster
                ? selectedCluster.name
                : 'Topical Map'}
            </h1>
            {!selectedClusterId && (
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                Quản lý cụm chủ đề, từ khóa và liên kết nội bộ
              </p>
            )}
          </div>
        </div>

        {/* Project filter — only in overview mode */}
        {projects.length > 1 && !selectedClusterId && (
          <select
            value={selectedProjectId}
            onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedClusterId(null); }}
            className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Content: overview grid or cluster detail */}
      {selectedClusterId ? (
        <TopicalMapClusterDetail
          clusterId={selectedClusterId}
          onRefresh={handleRefresh}
        />
      ) : (
        <TopicalMapOverviewGrid
          clusters={clusters}
          isLoading={isLoadingClusters}
          selectedProjectId={selectedProjectId}
          onSelectCluster={setSelectedClusterId}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
