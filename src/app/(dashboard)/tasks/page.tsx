'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import {
  FileText,
  AlertTriangle,
  TrendingUp,
  Filter,
  LayoutGrid,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project } from '@/types';
import { PageLoading } from '@/components/LoadingSpinner';
import TasksStrategyActionsTab from './tasks-strategy-actions-tab';
import TasksProgressCharts from './tasks-progress-charts-timeline-category-status';

// ── Notion Task type ─────────────────────────────────────────────────────────

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

type ActiveTab = 'all' | 'week' | 'month' | 'strategy';

// ── Constants ────────────────────────────────────────────────────────────────

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

const STATUS_ORDER = ['🔄 Đang làm', '👀 Chờ review', '📥 Backlog', '❌ Bị chặn', '✅ Hoàn thành'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function isOverdue(deadline: string | null, status: string | null): boolean {
  if (!deadline || status === '✅ Hoàn thành') return false;
  return new Date(deadline) < new Date();
}

function getMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getSunday(monday: Date): Date {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, colorClass, active }: {
  icon: React.ReactNode; label: string; value: number | string;
  sub?: string; colorClass: string; active?: boolean;
}) {
  return (
    <div className={cn(
      'bg-card border rounded-xl p-3 flex flex-col gap-1',
      active ? `border-current ring-2 ring-current/20 ${colorClass}` : 'border-border'
    )}>
      <div className="flex items-center justify-between">
        <span className={cn('w-7 h-7 flex items-center justify-center rounded-lg', active ? 'bg-white/10' : 'bg-secondary')}>
          {icon}
        </span>
        <span className={cn('text-xs', active ? 'opacity-80' : 'text-[#8888a0]')}>{label}</span>
      </div>
      <p className={cn('text-2xl font-bold', active ? '' : 'text-[var(--text-primary)]')}>{value}</p>
      {sub && <p className={cn('text-xs', active ? 'opacity-70' : 'text-[#8888a0]')}>{sub}</p>}
    </div>
  );
}

// ── Task Detail Panel (shared between table and kanban) ──────────────────────

function TaskDetailPanel({ task }: { task: NotionTask }) {
  return (
    <div className="bg-secondary/50 p-3 rounded-lg space-y-2 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div><span className="text-[#8888a0] text-xs">Dự án:</span> <span className="text-[var(--text-primary)]">{task.project || '—'}</span></div>
        <div><span className="text-[#8888a0] text-xs">Danh mục:</span>{' '}
          {task.category ? <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', CATEGORY_COLORS[task.category] || 'bg-gray-100 text-gray-600')}>{task.category}</span> : '—'}
        </div>
        <div><span className="text-[#8888a0] text-xs">Trạng thái:</span>{' '}
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[task.status || ''] || 'bg-gray-100 text-gray-600')}>{task.status || '—'}</span>
        </div>
        <div><span className="text-[#8888a0] text-xs">Ưu tiên:</span>{' '}
          <span className={cn('text-xs font-medium', PRIORITY_COLORS[task.priority || ''] || 'text-[#8888a0]')}>{task.priority || '—'}</span>
        </div>
        <div><span className="text-[#8888a0] text-xs">Deadline:</span>{' '}
          {task.deadline ? (
            <span className={cn('text-xs', isOverdue(task.deadline, task.status) ? 'text-red-500 font-medium' : 'text-[var(--text-primary)]')}>
              {new Date(task.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              {isOverdue(task.deadline, task.status) && ' ⚠️ Trễ'}
            </span>
          ) : '—'}
        </div>
        {task.assignee && <div><span className="text-[#8888a0] text-xs">Người làm:</span> <span className="text-[var(--text-primary)]">{task.assignee}</span></div>}
      </div>
      {task.notes && (
        <div className="pt-1 border-t border-border/50">
          <span className="text-[#8888a0] text-xs block mb-1">Ghi chú:</span>
          <p className="text-[var(--text-primary)] text-sm whitespace-pre-wrap">{task.notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Task Table ───────────────────────────────────────────────────────────────

function TaskTable({ tasks, showStatus = true }: { tasks: NotionTask[]; showStatus?: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (tasks.length === 0) {
    return <div className="text-center py-8 text-[#8888a0] text-sm">Không có task nào</div>;
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-[#8888a0] text-xs">
            <th className="text-left p-2 pl-3 font-medium">Task</th>
            <th className="text-left p-2 font-medium w-32">Dự án</th>
            <th className="text-left p-2 font-medium w-28">Danh mục</th>
            {showStatus && <th className="text-left p-2 font-medium w-28">Trạng thái</th>}
            <th className="text-left p-2 font-medium w-24">Ưu tiên</th>
            <th className="text-left p-2 font-medium w-24">Deadline</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => {
            const isExpanded = expandedId === task.notion_page_id;
            return (
              <Fragment key={task.notion_page_id}>
                <tr onClick={() => setExpandedId(isExpanded ? null : task.notion_page_id)}
                  className={cn('border-b border-border/50 cursor-pointer transition-colors', isExpanded ? 'bg-secondary/40' : 'hover:bg-secondary/30')}>
                  <td className="p-2 pl-3">
                    <div className="font-medium text-[var(--text-primary)]">{task.task_name}</div>
                    {!isExpanded && task.notes && <div className="text-xs text-[#8888a0] mt-0.5 line-clamp-1">{task.notes}</div>}
                  </td>
                  <td className="p-2 text-xs text-[#8888a0]">{task.project || '—'}</td>
                  <td className="p-2">
                    {task.category && (
                      <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', CATEGORY_COLORS[task.category] || 'bg-gray-100 text-gray-600')}>
                        {task.category}
                      </span>
                    )}
                  </td>
                  {showStatus && (
                    <td className="p-2">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[task.status || ''] || 'bg-gray-100 text-gray-600')}>
                        {task.status || '—'}
                      </span>
                    </td>
                  )}
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
                {isExpanded && (
                  <tr><td colSpan={showStatus ? 6 : 5} className="p-2 pl-3 pr-3"><TaskDetailPanel task={task} /></td></tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Kanban View ──────────────────────────────────────────────────────────────

function KanbanView({ tasks }: { tasks: NotionTask[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups: Record<string, NotionTask[]> = {};
    for (const s of STATUS_ORDER) groups[s] = [];
    for (const t of tasks) {
      const s = t.status || '📥 Backlog';
      if (!groups[s]) groups[s] = [];
      groups[s].push(t);
    }
    return groups;
  }, [tasks]);

  if (tasks.length === 0) {
    return <div className="text-center py-8 text-[#8888a0] text-sm">Không có task nào</div>;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STATUS_ORDER.map(status => {
        const group = grouped[status];
        if (!group || group.length === 0) return null;
        return (
          <div key={status} className="flex-shrink-0 w-80">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[status])}>{status}</span>
              <span className="text-xs text-[#8888a0]">{group.length}</span>
            </div>
            <div className="space-y-2">
              {group.map(task => {
                const isExpanded = expandedId === task.notion_page_id;
                return (
                  <div key={task.notion_page_id}
                    onClick={() => setExpandedId(isExpanded ? null : task.notion_page_id)}
                    className={cn(
                      'bg-card border rounded-xl p-3 space-y-2 transition-all cursor-pointer',
                      isExpanded ? 'ring-2 ring-accent/30 shadow-md' : 'hover:shadow-md',
                      isOverdue(task.deadline, task.status) ? 'border-red-300' : 'border-border'
                    )}>
                    <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">{task.task_name}</p>
                    {!isExpanded && (
                      <>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {task.category && (
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', CATEGORY_COLORS[task.category] || 'bg-gray-100 text-gray-600')}>
                              {task.category}
                            </span>
                          )}
                          {task.priority && (
                            <span className={cn('text-[10px] font-medium', PRIORITY_COLORS[task.priority] || 'text-[#8888a0]')}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#8888a0]">
                          <span>{task.project || ''}</span>
                          {task.deadline && (
                            <span className={cn(isOverdue(task.deadline, task.status) ? 'text-red-500 font-medium' : '')}>
                              {new Date(task.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                              {isOverdue(task.deadline, task.status) && ' ⚠️'}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                    {isExpanded && <TaskDetailPanel task={task} />}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── View Toggle ──────────────────────────────────────────────────────────────

function ViewToggle({ mode, onChange }: { mode: 'kanban' | 'table'; onChange: (m: 'kanban' | 'table') => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
      <button onClick={() => onChange('kanban')}
        className={cn('p-1.5 rounded-md transition-colors', mode === 'kanban' ? 'bg-card shadow-sm' : 'text-[#8888a0] hover:text-[var(--text-primary)]')}>
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button onClick={() => onChange('table')}
        className={cn('p-1.5 rounded-md transition-colors', mode === 'table' ? 'bg-card shadow-sm' : 'text-[#8888a0] hover:text-[var(--text-primary)]')}>
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Task List with dual view ─────────────────────────────────────────────────

function TaskDualView({ tasks, viewMode, subtitle }: { tasks: NotionTask[]; viewMode: 'kanban' | 'table'; subtitle?: string }) {
  return (
    <div>
      {subtitle && <p className="text-xs text-[#8888a0] mb-2">{subtitle}</p>}
      {viewMode === 'kanban' ? <KanbanView tasks={tasks} /> : <TaskTable tasks={tasks} />}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [notionTasks, setNotionTasks] = useState<NotionTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterWeek, setFilterWeek] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/notion-sync/tasks').then(r => r.json()),
      fetch('/api/v1/projects').then(r => r.json()),
    ]).then(([tasksData, projectsData]) => {
      setNotionTasks(tasksData.tasks || []);
      setProjects(projectsData.projects || []);
    }).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  // Unique projects for filter
  const projectOptions = useMemo(() =>
    [...new Set(notionTasks.map(t => t.project).filter(Boolean))] as string[]
  , [notionTasks]);

  // Filtered tasks (applied globally — includes chart filters)
  const filtered = useMemo(() => {
    let result = notionTasks;
    if (filterProject) result = result.filter(t => t.project === filterProject);
    if (filterStatus) result = result.filter(t => t.status === filterStatus);
    if (filterCategory) result = result.filter(t => (t.category || 'Khác') === filterCategory);
    if (filterWeek) {
      const weekStart = new Date(filterWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      result = result.filter(t => {
        if (!t.deadline) return false;
        const d = new Date(t.deadline);
        return d >= weekStart && d <= weekEnd;
      });
    }
    return result;
  }, [notionTasks, filterProject, filterStatus, filterCategory, filterWeek]);

  // Week tasks — deadline in current week
  const weekTasks = useMemo(() => {
    const monday = getMonday();
    const sunday = getSunday(monday);
    return filtered.filter(t => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      return d >= monday && d <= sunday;
    });
  }, [filtered]);

  // Month tasks — deadline in current month
  const monthTasks = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    return filtered.filter(t => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      return d.getMonth() === m && d.getFullYear() === y;
    });
  }, [filtered]);

  // Stats (from all notion tasks, ignoring filters)
  const stats = useMemo(() => {
    const all = notionTasks;
    const done = all.filter(t => t.status === '✅ Hoàn thành');
    const overdue = all.filter(t => isOverdue(t.deadline, t.status));
    const active = all.filter(t => t.status === '🔄 Đang làm' || t.status === '👀 Chờ review');
    const pct = all.length > 0 ? Math.round((done.length / all.length) * 100) : 0;
    return { total: all.length, done: done.length, overdue: overdue.length, active: active.length, pct };
  }, [notionTasks]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of notionTasks) {
      const c = t.category || 'Khác';
      counts[c] = (counts[c] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [notionTasks]);

  const tabs: { id: ActiveTab; label: string; count?: number }[] = [
    { id: 'all', label: 'Tổng', count: filtered.length },
    { id: 'week', label: 'Tuần này', count: weekTasks.length },
    { id: 'month', label: 'Tháng này', count: monthTasks.length },
    { id: 'strategy', label: 'Chiến lược' },
  ];

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Công việc</h1>
        <p className="text-[#8888a0] text-sm">
          {stats.total} tasks từ Notion · {stats.done} hoàn thành · {stats.overdue > 0 ? `${stats.overdue} trễ deadline` : 'không trễ'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<FileText className="w-4 h-4 text-accent" />} label="Tổng tasks" value={stats.total} colorClass="text-accent" />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4 text-danger" />} label="Trễ deadline"
          value={stats.overdue} sub={stats.overdue > 0 ? 'Cần xử lý!' : 'Không có'}
          colorClass="text-danger" active={stats.overdue > 0}
        />
        {/* Category mini bar */}
        <div className="bg-card border border-border rounded-xl p-3 flex flex-col gap-2">
          <span className="text-xs text-[#8888a0] font-medium">Danh mục</span>
          <div className="flex flex-col gap-1">
            {categoryBreakdown.slice(0, 5).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap', CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-600')}>{cat}</span>
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-accent/60" style={{ width: `${(count / stats.total) * 100}%` }} />
                </div>
                <span className="text-xs text-[var(--text-primary)] font-medium w-4 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-success" />} label="Tiến độ"
          value={`${stats.pct}%`} sub={`${stats.done}/${stats.total} hoàn thành`}
          colorClass="text-success"
        />
      </div>

      {/* Progress Charts — click to filter */}
      <TasksProgressCharts
        tasks={notionTasks}
        activeStatus={filterStatus}
        activeCategory={filterCategory}
        activeWeek={filterWeek}
        onFilterStatus={(s) => { setFilterStatus(s); setFilterCategory(''); setFilterWeek(''); }}
        onFilterCategory={(c) => { setFilterCategory(c); setFilterStatus(''); setFilterWeek(''); }}
        onFilterWeek={(w) => { setFilterWeek(w); setFilterStatus(''); setFilterCategory(''); }}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-[#8888a0]" />
        <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}
          className="px-2 py-1 bg-card border border-border rounded-lg text-sm text-[var(--text-primary)]">
          <option value="">Tất cả dự án</option>
          {projectOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-2 py-1 bg-card border border-border rounded-lg text-sm text-[var(--text-primary)]">
          <option value="">Tất cả trạng thái</option>
          {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filterProject || filterStatus || filterCategory || filterWeek) && (
          <button onClick={() => { setFilterProject(''); setFilterStatus(''); setFilterCategory(''); setFilterWeek(''); }}
            className="text-xs text-accent hover:underline">Xóa bộ lọc</button>
        )}
        {(filterCategory || filterWeek) && (
          <span className="text-xs text-[var(--text-primary)] bg-accent/10 px-2 py-0.5 rounded-full">
            {filterCategory && `📌 ${filterCategory}`}
            {filterWeek && `📅 Tuần ${new Date(filterWeek).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`}
          </span>
        )}
      </div>

      {/* Tabs + View Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab.id ? 'bg-accent text-white' : 'text-[#8888a0] hover:text-[var(--text-primary)]'
              )}>
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn('ml-1.5 text-xs px-1.5 py-0.5 rounded-full', activeTab === tab.id ? 'bg-white/20' : 'bg-secondary')}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        {activeTab !== 'strategy' && <ViewToggle mode={viewMode} onChange={setViewMode} />}
      </div>

      {/* Tab content */}
      {activeTab === 'all' && <TaskDualView tasks={filtered} viewMode={viewMode} />}

      {activeTab === 'week' && (
        <TaskDualView tasks={weekTasks} viewMode={viewMode}
          subtitle={`Deadline tuần ${getMonday().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} — ${getSunday(getMonday()).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`}
        />
      )}

      {activeTab === 'month' && (
        <TaskDualView tasks={monthTasks} viewMode={viewMode}
          subtitle={`Deadline tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`}
        />
      )}

      {activeTab === 'strategy' && <TasksStrategyActionsTab projects={projects} />}
    </div>
  );
}
