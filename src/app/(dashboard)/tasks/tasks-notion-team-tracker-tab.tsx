'use client';

import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Users, Clock, CheckCircle2, AlertCircle, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotionTask {
  notion_page_id: string;
  task_name: string;
  project: string | null;
  category: string | null;
  status: string | null;
  priority: string | null;
  deadline: string | null;
  assignee: string | null;
  notes: string | null;
  synced_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  '📥 Backlog': 'bg-gray-100 text-gray-700',
  '🔄 Đang làm': 'bg-blue-100 text-blue-700',
  '👀 Chờ review': 'bg-yellow-100 text-yellow-700',
  '✅ Hoàn thành': 'bg-green-100 text-green-700',
  '❌ Bị chặn': 'bg-red-100 text-red-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  '🔴 Cao': 'text-red-600',
  '🟡 Trung bình': 'text-yellow-600',
  '🟢 Thấp': 'text-green-600',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Keyword Research': 'bg-purple-100 text-purple-700',
  'Content': 'bg-yellow-100 text-yellow-700',
  'Onpage': 'bg-blue-100 text-blue-700',
  'Technical Audit': 'bg-gray-100 text-gray-700',
  'Backlink': 'bg-green-100 text-green-700',
  'Report': 'bg-orange-100 text-orange-700',
  'Competitor Analysis': 'bg-red-100 text-red-700',
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[status] || 'bg-gray-100 text-gray-600')}>
      {status}
    </span>
  );
}

function isOverdue(deadline: string | null, status: string | null): boolean {
  if (!deadline || status === '✅ Hoàn thành') return false;
  return new Date(deadline) < new Date();
}

export default function TasksNotionTeamTrackerTab() {
  const [tasks, setTasks] = useState<NotionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/notion-sync/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
      if (data.tasks?.length > 0) {
        setLastSync(data.tasks[0].synced_at);
      }
    } catch (err) {
      console.error('Failed to fetch notion tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  // Unique project names for filter
  const projectOptions = useMemo(() => {
    return [...new Set(tasks.map(t => t.project).filter(Boolean))] as string[];
  }, [tasks]);

  // Filtered tasks
  const filtered = useMemo(() => {
    let result = tasks;
    if (filterProject) result = result.filter(t => t.project === filterProject);
    if (filterStatus) result = result.filter(t => t.status === filterStatus);
    return result;
  }, [tasks, filterProject, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const active = tasks.filter(t => t.status !== '✅ Hoàn thành');
    const done = tasks.filter(t => t.status === '✅ Hoàn thành');
    const overdue = tasks.filter(t => isOverdue(t.deadline, t.status));
    const inProgress = tasks.filter(t => t.status === '🔄 Đang làm');
    return { total: tasks.length, active: active.length, done: done.length, overdue: overdue.length, inProgress: inProgress.length };
  }, [tasks]);

  // Group by status for kanban-like view
  const statusOrder = ['🔄 Đang làm', '👀 Chờ review', '📥 Backlog', '❌ Bị chặn', '✅ Hoàn thành'];
  const grouped = useMemo(() => {
    const groups: Record<string, NotionTask[]> = {};
    for (const s of statusOrder) groups[s] = [];
    for (const t of filtered) {
      const s = t.status || '📥 Backlog';
      if (!groups[s]) groups[s] = [];
      groups[s].push(t);
    }
    return groups;
  }, [filtered]);

  if (loading) {
    return <div className="text-center py-12 text-[#8888a0]">Đang tải tasks từ Notion...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-[#8888a0] text-xs mb-1"><Users className="w-3.5 h-3.5" /> Tổng</div>
          <p className="text-xl font-bold text-[var(--text-primary)]">{stats.total}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-blue-500 text-xs mb-1"><RefreshCw className="w-3.5 h-3.5" /> Đang làm</div>
          <p className="text-xl font-bold text-[var(--text-primary)]">{stats.inProgress}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-[#8888a0] text-xs mb-1"><Clock className="w-3.5 h-3.5" /> Chờ xử lý</div>
          <p className="text-xl font-bold text-[var(--text-primary)]">{stats.active - stats.inProgress}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-green-500 text-xs mb-1"><CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành</div>
          <p className="text-xl font-bold text-[var(--text-primary)]">{stats.done}</p>
        </div>
        <div className={cn('bg-card border rounded-xl p-3', stats.overdue > 0 ? 'border-red-300' : 'border-border')}>
          <div className="flex items-center gap-2 text-red-500 text-xs mb-1"><AlertCircle className="w-3.5 h-3.5" /> Trễ deadline</div>
          <p className={cn('text-xl font-bold', stats.overdue > 0 ? 'text-red-500' : 'text-[var(--text-primary)]')}>{stats.overdue}</p>
        </div>
      </div>

      {/* Filters + sync info */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-[#8888a0]" />
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="px-2 py-1 bg-card border border-border rounded-lg text-sm text-[var(--text-primary)]"
        >
          <option value="">Tất cả dự án</option>
          {projectOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-2 py-1 bg-card border border-border rounded-lg text-sm text-[var(--text-primary)]"
        >
          <option value="">Tất cả trạng thái</option>
          {statusOrder.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {lastSync && (
          <span className="text-xs text-[#8888a0] ml-auto">
            Sync: {lastSync}
          </span>
        )}
      </div>

      {/* Task groups by status */}
      <div className="space-y-4">
        {statusOrder.map(status => {
          const group = grouped[status];
          if (!group || group.length === 0) return null;
          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                <span className="text-xs text-[#8888a0]">{group.length} tasks</span>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-[#8888a0] text-xs">
                      <th className="text-left p-2 pl-3 font-medium">Task</th>
                      <th className="text-left p-2 font-medium w-32">Dự án</th>
                      <th className="text-left p-2 font-medium w-28">Danh mục</th>
                      <th className="text-left p-2 font-medium w-24">Ưu tiên</th>
                      <th className="text-left p-2 font-medium w-24">Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map(task => (
                      <tr key={task.notion_page_id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="p-2 pl-3">
                          <div className="font-medium text-[var(--text-primary)]">{task.task_name}</div>
                          {task.notes && <div className="text-xs text-[#8888a0] mt-0.5 line-clamp-1">{task.notes}</div>}
                        </td>
                        <td className="p-2 text-xs text-[#8888a0]">{task.project || '—'}</td>
                        <td className="p-2">
                          {task.category && (
                            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', CATEGORY_COLORS[task.category] || 'bg-gray-100 text-gray-600')}>
                              {task.category}
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          <span className={cn('text-xs font-medium', PRIORITY_COLORS[task.priority || ''] || 'text-[#8888a0]')}>
                            {task.priority || '—'}
                          </span>
                        </td>
                        <td className="p-2">
                          {task.deadline ? (
                            <span className={cn('text-xs', isOverdue(task.deadline, task.status) ? 'text-red-500 font-medium' : 'text-[#8888a0]')}>
                              {new Date(task.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                              {isOverdue(task.deadline, task.status) && ' ⚠️'}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
