'use client';

import { useState } from 'react';
import { Plus, Loader2, FolderOpen, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface Props {
  projects: Project[];
  selectedProjectId: string;
  onProjectChange: (id: string) => void;
  clusters: Cluster[];
  selectedId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}

export function TopicalMapClusterList({
  projects,
  selectedProjectId,
  onProjectChange,
  clusters,
  selectedId,
  isLoading,
  onSelect,
  onRefresh,
}: Props) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClusterName, setNewClusterName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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
    } catch (e) {
      console.error('Failed to create cluster:', e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') { setShowCreateForm(false); setNewClusterName(''); }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
      {/* Project filter */}
      <div className="p-3 border-b border-[var(--border)]">
        <select
          value={selectedProjectId}
          onChange={(e) => onProjectChange(e.target.value)}
          className="w-full px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Header + create button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          Clusters ({clusters.length})
        </span>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-blue-600 hover:bg-blue-600/10 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Tạo cluster
        </button>
      </div>

      {/* Inline create form */}
      {showCreateForm && (
        <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-accent)]">
          <input
            autoFocus
            type="text"
            value={newClusterName}
            onChange={(e) => setNewClusterName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tên cluster..."
            className="w-full px-2 py-1.5 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={isCreating || !newClusterName.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Tạo
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setNewClusterName(''); }}
              className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Cluster list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-xs text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Đang tải...
          </div>
        ) : clusters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderOpen className="w-8 h-8 text-[var(--text-muted)] mb-2" />
            <p className="text-xs text-[var(--text-muted)]">Chưa có cluster nào</p>
            <p className="text-xs text-[var(--text-muted)]">Nhấn "+ Tạo cluster" để bắt đầu</p>
          </div>
        ) : (
          clusters.map((cluster) => (
            <button
              key={cluster.id}
              onClick={() => onSelect(cluster.id)}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-lg border transition-all',
                selectedId === cluster.id
                  ? 'border-blue-500 bg-blue-600/10 text-[var(--text-primary)]'
                  : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-accent)] text-[var(--text-secondary)]',
              )}
            >
              <p className={cn(
                'text-sm font-medium truncate',
                selectedId === cluster.id ? 'text-blue-500' : 'text-[var(--text-primary)]',
              )}>
                {cluster.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-[var(--text-muted)]">
                  {cluster.keywordCount} KW · {cluster.pageCount} bài
                </span>
                {cluster.pillar_url && (
                  <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)] truncate max-w-[120px]">
                    <Globe className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{cluster.pillar_url.replace(/^https?:\/\//, '')}</span>
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
