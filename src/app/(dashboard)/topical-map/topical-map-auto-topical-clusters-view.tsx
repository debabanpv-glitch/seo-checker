'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react';

interface ClusterData {
  name: string;
  tourCount: number;
  contentCount: number;
  foodCount: number;
  guideCount: number;
  pages: Array<{ url: string; title: string; type: string }>;
}

interface Props {
  projectId: string;
}

export function TopicalMapAutoClusterView({ projectId }: Props) {
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [assignedPages, setAssignedPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!projectId) return;
    setIsLoading(true);
    fetch(`/api/v1/crawl?projectId=${projectId}&topicalClusters=true`)
      .then(r => r.json())
      .then(d => {
        setClusters(d.clusters || []);
        setTotalPages(d.totalPages || 0);
        setAssignedPages(d.assignedPages || 0);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [projectId]);

  const toggle = (name: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const typeColors = {
    tour: 'bg-blue-100 text-blue-700',
    content: 'bg-gray-100 text-gray-600',
    food: 'bg-amber-100 text-amber-700',
    guide: 'bg-green-100 text-green-700',
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;

  if (clusters.length === 0) return <div className="text-center py-20 text-[var(--text-muted)]">Chưa có dữ liệu crawl</div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
        <span><strong>{clusters.length}</strong> cụm chủ đề</span>
        <span><strong>{assignedPages}</strong>/{totalPages} trang đã phân cụm</span>
        <span className="text-[var(--text-muted)]">{totalPages - assignedPages} chưa phân loại</span>
      </div>

      {/* Cluster table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--bg-accent)] text-[var(--text-secondary)] text-xs">
              <th className="text-left px-4 py-2.5 w-8"></th>
              <th className="text-left px-4 py-2.5">Cụm chủ đề</th>
              <th className="text-center px-3 py-2.5 w-16">Tổng</th>
              <th className="text-center px-3 py-2.5 w-16">Tour</th>
              <th className="text-center px-3 py-2.5 w-16">Content</th>
              <th className="text-center px-3 py-2.5 w-16">Food</th>
              <th className="text-center px-3 py-2.5 w-16">Guide</th>
              <th className="text-left px-4 py-2.5 w-48">Đánh giá</th>
            </tr>
          </thead>
          <tbody>
            {clusters.map(c => {
              const total = c.pages.length;
              const isOpen = expanded.has(c.name);
              // Evaluate cluster health
              let evaluation = '';
              let evalColor = '';
              if (c.tourCount > 0 && (c.contentCount + c.foodCount + c.guideCount) > 0) {
                evaluation = 'Tốt — đủ tour + content';
                evalColor = 'text-green-600';
              } else if (c.tourCount > 0 && (c.contentCount + c.foodCount + c.guideCount) === 0) {
                evaluation = '⚠ Thiếu content hỗ trợ';
                evalColor = 'text-amber-600';
              } else if (c.tourCount === 0 && total > 0) {
                evaluation = '⚠ Chỉ content, không tour';
                evalColor = 'text-amber-600';
              }
              if (total < 5) {
                evaluation += evaluation ? ' · Ít trang' : '⚠ Ít trang';
                evalColor = evalColor || 'text-amber-600';
              }

              return (
                <>
                  <tr
                    key={c.name}
                    onClick={() => toggle(c.name)}
                    className="border-t border-[var(--border)]/50 cursor-pointer hover:bg-[var(--bg-accent)] transition-colors"
                  >
                    <td className="px-4 py-2.5 text-[var(--text-muted)]">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{c.name}</td>
                    <td className="text-center px-3 py-2.5 font-bold">{total}</td>
                    <td className="text-center px-3 py-2.5">
                      {c.tourCount > 0 ? <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">{c.tourCount}</span> : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="text-center px-3 py-2.5">
                      {c.contentCount > 0 ? <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{c.contentCount}</span> : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="text-center px-3 py-2.5">
                      {c.foodCount > 0 ? <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">{c.foodCount}</span> : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="text-center px-3 py-2.5">
                      {c.guideCount > 0 ? <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">{c.guideCount}</span> : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className={`px-4 py-2.5 text-xs ${evalColor}`}>{evaluation}</td>
                  </tr>
                  {isOpen && c.pages.map((p, i) => (
                    <tr key={`${c.name}-${i}`} className="bg-[var(--bg-accent)]/30">
                      <td></td>
                      <td colSpan={2} className="px-4 py-1.5 text-xs">
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                          {p.title.slice(0, 70)}{p.title.length > 70 ? '...' : ''}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                      <td colSpan={4} className="px-3 py-1.5 text-[9px] text-[var(--text-muted)] truncate">
                        {new URL(p.url).pathname}
                      </td>
                      <td className="px-4 py-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeColors[p.type as keyof typeof typeColors] || 'bg-gray-100'}`}>
                          {p.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
