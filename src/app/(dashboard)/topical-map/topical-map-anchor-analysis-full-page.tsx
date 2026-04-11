'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { AnchorTextAnalysis } from './topical-map-anchor-text-analysis-table';

interface GraphNode {
  id: string;
  title: string;
  status: number;
  internalInLinks: number;
  internalOutLinks: number;
  externalOutLinks: number;
  group: string;
  clickDepth: number;
}

interface GraphEdge {
  source: string;
  target: string;
  anchor_text: string;
  position: string;
  nofollow: boolean;
}

interface Props {
  projectId: string;
}

export function TopicalMapAnchorAnalysisPage({ projectId }: Props) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/crawl?projectId=${projectId}&graph=true&linkType=internal`);
      if (!res.ok) {
        if (res.status === 404) {
          setNodes([]);
          setEdges([]);
          return;
        }
        throw new Error('Failed to load data');
      }
      const data = await res.json();
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-sm py-10 text-center">{error}</div>;
  }

  if (nodes.length === 0) {
    return (
      <div className="text-center py-20 text-[var(--text-muted)]">
        <p>Chưa có dữ liệu crawl. Chuyển sang tab Biểu đồ liên kết để import.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--text-secondary)]">
          <strong>{nodes.length}</strong> trang · <strong>{edges.length}</strong> liên kết nội bộ
        </div>
        <button onClick={fetchData} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <AnchorTextAnalysis nodes={nodes} edges={edges} />
    </div>
  );
}
