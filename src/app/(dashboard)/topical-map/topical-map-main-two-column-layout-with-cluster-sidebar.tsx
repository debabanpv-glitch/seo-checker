'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, LayoutGrid, Network, Type } from 'lucide-react';
import { TopicalMapOverviewGrid } from './topical-map-overview-grid-with-stats-and-cluster-cards';
import { TopicalMapClusterDetail } from './topical-map-cluster-detail-with-tabs-keywords-pages-overlap';
import { TopicalMapForceGraph } from './topical-map-force-graph-d3-visualization-with-controls';
import { TopicalMapAnchorAnalysisPage } from './topical-map-anchor-analysis-full-page';

type ViewMode = 'clusters' | 'graph' | 'anchors';

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
  const [viewMode, setViewMode] = useState<ViewMode>('clusters');

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

        <div className="flex items-center gap-3">
          {/* View mode tabs — only in overview (no cluster selected) */}
          {!selectedClusterId && (
            <div className="flex bg-[var(--bg-accent)] rounded-lg p-0.5 border border-[var(--border)]">
              <button
                onClick={() => setViewMode('clusters')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  viewMode === 'clusters'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Clusters
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  viewMode === 'graph'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Network className="w-4 h-4" />
                Biểu đồ liên kết
              </button>
              <button
                onClick={() => setViewMode('anchors')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  viewMode === 'anchors'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Type className="w-4 h-4" />
                Anchor Text
              </button>
            </div>
          )}

          {/* Project filter */}
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
      </div>

      {/* Content: cluster detail / overview grid / force graph */}
      {selectedClusterId ? (
        <TopicalMapClusterDetail
          clusterId={selectedClusterId}
          onRefresh={handleRefresh}
        />
      ) : viewMode === 'graph' ? (
        <TopicalMapForceGraph projectId={selectedProjectId} />
      ) : viewMode === 'anchors' ? (
        <TopicalMapAnchorAnalysisPage projectId={selectedProjectId} />
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
