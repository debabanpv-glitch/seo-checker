'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  FileText,
  Search,
  BarChart2,
  Wrench,
  MessageSquare,
  Filter,
  Clock,
  FolderKanban,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Project } from '@/types';
import { cn } from '@/lib/utils';

interface ClaudeLogEntry {
  id: string;
  activity_type: 'content_draft' | 'seo_audit' | 'analysis' | 'technical_fix' | 'general';
  title: string;
  description?: string;
  project_slug?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

const ACTIVITY_TYPE_CONFIG: Record<
  ClaudeLogEntry['activity_type'] | 'all',
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  all: { label: 'Tất cả', icon: Bot, color: 'text-[#8888a0]', bg: 'bg-secondary' },
  content_draft: { label: 'Content Draft', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  seo_audit: { label: 'SEO Audit', icon: Search, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  analysis: { label: 'Phân tích', icon: BarChart2, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  technical_fix: { label: 'Technical Fix', icon: Wrench, color: 'text-red-400', bg: 'bg-red-500/10' },
  general: { label: 'Chung', icon: MessageSquare, color: 'text-green-400', bg: 'bg-green-500/10' },
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

export default function ClaudeActivityLogTimelineFeed() {
  const [logs, setLogs] = useState<ClaudeLogEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedType, setSelectedType] = useState<ClaudeLogEntry['activity_type'] | 'all'>('all');
  const [selectedProjectSlug, setSelectedProjectSlug] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(console.error);
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (selectedType !== 'all') params.set('activity_type', selectedType);
      if (selectedProjectSlug) params.set('project_slug', selectedProjectSlug);

      const res = await fetch(`/api/v1/claude/log?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch claude logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, selectedProjectSlug]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const activityTypeKeys = Object.keys(ACTIVITY_TYPE_CONFIG) as (keyof typeof ACTIVITY_TYPE_CONFIG)[];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Claude Log</h1>
        <div className="flex items-center gap-2 text-xs text-[#8888a0]">
          <Bot className="w-4 h-4 text-accent" />
          <span>{logs.length} hoạt động</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-[#8888a0] flex-shrink-0" />

        {/* Activity type tabs */}
        <div className="flex flex-wrap gap-1">
          {activityTypeKeys.map((type) => {
            const config = ACTIVITY_TYPE_CONFIG[type];
            const Icon = config.icon;
            const isActive = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type as ClaudeLogEntry['activity_type'] | 'all')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? `${config.bg} ${config.color}`
                    : 'text-[#8888a0] hover:text-[var(--text-primary)] hover:bg-secondary'
                )}
              >
                <Icon className="w-3 h-3" />
                {config.label}
              </button>
            );
          })}
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Project filter */}
        <select
          value={selectedProjectSlug}
          onChange={(e) => setSelectedProjectSlug(e.target.value)}
          className="px-2.5 py-1 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-xs"
        >
          <option value="">Tất cả dự án</option>
          {projects.map((p) => (
            <option key={p.id} value={p.sheet_name || p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline Feed */}
      {isLoading ? (
        <PageLoading />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="Chưa có hoạt động nào"
          description="Claude chưa ghi lại hoạt động nào. Thử thay đổi bộ lọc."
        />
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-3">
            {logs.map((log, index) => {
              const config = ACTIVITY_TYPE_CONFIG[log.activity_type] || ACTIVITY_TYPE_CONFIG.general;
              const Icon = config.icon;

              return (
                <div key={log.id || index} className="relative flex gap-4">
                  {/* Icon bubble on timeline */}
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 border-[var(--bg-primary,#0f0f1a)]',
                      config.bg
                    )}
                  >
                    <Icon className={cn('w-5 h-5', config.color)} />
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-card border border-border rounded-xl p-4 hover:border-accent/30 transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            config.bg,
                            config.color
                          )}
                        >
                          {config.label}
                        </span>
                        {log.project_slug && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded text-xs">
                            <FolderKanban className="w-3 h-3" />
                            {log.project_slug}
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-xs text-[#8888a0] flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(log.created_at)}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                      {log.title}
                    </h3>
                    {log.description && (
                      <p className="text-xs text-[#8888a0] mt-1 leading-relaxed">
                        {log.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
