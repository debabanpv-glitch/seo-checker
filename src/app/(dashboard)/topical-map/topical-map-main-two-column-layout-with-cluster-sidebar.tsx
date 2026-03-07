'use client';

import { useState, useEffect, useCallback } from 'react';
import { Network } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { TopicalMapClusterList } from './topical-map-cluster-list-with-project-filter-and-create-form';
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
      setSelectedClusterId(null);
    } catch (e) {
      console.error('Failed to fetch clusters:', e);
    } finally {
      setIsLoadingClusters(false);
    }
  }, [selectedProjectId]);

  useEffect(() => { fetchClusters(); }, [fetchClusters]);

  const handleClusterCreated = useCallback(() => {
    fetchClusters();
  }, [fetchClusters]);

  const handleClusterDetailRefresh = useCallback(() => {
    fetchClusters();
  }, [fetchClusters]);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Topical Map</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Quản lý cụm chủ đề, từ khóa và liên kết nội bộ
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 h-[calc(100vh-180px)] min-h-0">
        {/* Left sidebar: cluster list */}
        <div className="w-72 shrink-0 flex flex-col min-h-0">
          <TopicalMapClusterList
            projects={projects}
            selectedProjectId={selectedProjectId}
            onProjectChange={(id) => { setSelectedProjectId(id); setSelectedClusterId(null); }}
            clusters={clusters}
            selectedId={selectedClusterId}
            isLoading={isLoadingClusters}
            onSelect={setSelectedClusterId}
            onRefresh={handleClusterCreated}
          />
        </div>

        {/* Right content: cluster detail */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {selectedClusterId ? (
            <TopicalMapClusterDetail
              clusterId={selectedClusterId}
              onRefresh={handleClusterDetailRefresh}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <EmptyState
                icon={Network}
                title="Chọn một cluster để xem chi tiết"
                description="Hoặc tạo cluster mới từ danh sách bên trái"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
