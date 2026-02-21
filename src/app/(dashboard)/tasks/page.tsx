'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Plus,
  FileText,
  AlertTriangle,
  TrendingUp,
  LayoutList,
} from 'lucide-react';
import { Task, Project } from '@/types';
import { isOverdue, cn } from '@/lib/utils';
import { isPublished } from '@/lib/task-helpers';
import { PageLoading } from '@/components/LoadingSpinner';
import TasksAddFormDialog from './tasks-add-form-dialog';
import { CATEGORIES } from './tasks-add-form-dialog';
import { TasksWeekView, TasksMonthView } from './tasks-week-view-grouped-by-day-and-month-view-grouped-by-category';
import TasksAllTabWithFiltersSearchAndSortableTable from './tasks-all-tab-with-filters-search-and-sortable-table';

type ActiveTab = 'week' | 'month' | 'all';

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  colorClass,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  colorClass: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'bg-card border rounded-xl p-3 text-left transition-all flex flex-col gap-1',
        active ? `border-current ring-2 ring-current/20 ${colorClass}` : 'border-border hover:border-accent/40'
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn('w-7 h-7 flex items-center justify-center rounded-lg', active ? 'bg-white/10' : 'bg-secondary')}>
          {icon}
        </span>
        <span className={cn('text-xs', active ? 'opacity-80' : 'text-[#8888a0]')}>{label}</span>
      </div>
      <p className={cn('text-2xl font-bold', active ? '' : 'text-[var(--text-primary)]')}>{value}</p>
      {sub && <p className={cn('text-xs', active ? 'opacity-70' : 'text-[#8888a0]')}>{sub}</p>}
    </button>
  );
}

// ─── Category Mini Bar ────────────────────────────────────────────────────────

function CategoryMiniBreakdown({ tasks }: { tasks: Task[] }) {
  const counts = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      ...cat,
      count: tasks.filter((t) => t.category === cat.value).length,
    })).filter((c) => c.count > 0);
  }, [tasks]);

  const max = Math.max(...counts.map((c) => c.count), 1);

  if (counts.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-3 flex flex-col gap-2">
      <span className="text-xs text-[#8888a0] font-medium flex items-center gap-1.5">
        <LayoutList className="w-3.5 h-3.5" /> Danh mục
      </span>
      <div className="flex flex-col gap-1.5">
        {counts.map((cat) => (
          <div key={cat.value} className="flex items-center gap-2">
            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap', cat.color)}>
              {cat.label}
            </span>
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-accent/60 transition-all"
                style={{ width: `${(cat.count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-[var(--text-primary)] font-medium w-4 text-right">{cat.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('week');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });

  // Month options
  const monthOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push({
        value: `${d.getMonth() + 1}-${d.getFullYear()}`,
        label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`,
      });
    }
    return opts;
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [month, year] = selectedMonth.split('-');
      const [tasksRes, projectsRes] = await Promise.all([
        fetch(`/api/v1/tasks?month=${month}&year=${year}`),
        fetch('/api/v1/projects'),
      ]);
      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();
      setTasks(tasksData.tasks || []);
      setProjects(projectsData.projects || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  // Stats
  const stats = useMemo(() => {
    const valid = tasks.filter((t) => t.title || t.keyword_sub);
    const done = valid.filter((t) => isPublished(t));
    const overdue = valid.filter((t) => !isPublished(t) && isOverdue(t.deadline));
    const pct = valid.length > 0 ? Math.round((done.length / valid.length) * 100) : 0;
    return { total: valid.length, done: done.length, overdue: overdue.length, pct };
  }, [tasks]);

  // Current week tasks (for "Tuần này" tab)
  const weekTasks = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return tasks.filter((t) => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      return d >= monday && d <= sunday;
    });
  }, [tasks]);

  const pics = useMemo(() => {
    return [...new Set(tasks.map((t) => t.pic).filter(Boolean))] as string[];
  }, [tasks]);

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'week', label: 'Tuần này' },
    { id: 'month', label: 'Tháng này' },
    { id: 'all', label: 'Tổng' },
  ];

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Kế hoạch công việc</h1>
          <p className="text-[#8888a0] text-sm">
            Quản lý SEO tasks — T{selectedMonth.replace('-', '/')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#8888a0]" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm"
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              showAddForm
                ? 'bg-secondary text-[#8888a0]'
                : 'bg-accent text-white hover:bg-accent/80'
            )}
          >
            <Plus className="w-4 h-4" />
            Thêm task
          </button>
        </div>
      </div>

      {/* ── Add Form (inline, collapsible) ── */}
      {showAddForm && (
        <TasksAddFormDialog
          projects={projects}
          onSuccess={() => {
            setShowAddForm(false);
            fetchData();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* ── Dashboard stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<FileText className="w-4 h-4 text-accent" />}
          label="Tổng tasks"
          value={stats.total}
          colorClass="text-accent"
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4 text-danger" />}
          label="Trễ deadline"
          value={stats.overdue}
          sub={stats.overdue > 0 ? 'Cần xử lý!' : 'Không có'}
          colorClass="text-danger"
          active={stats.overdue > 0}
        />
        <CategoryMiniBreakdown tasks={tasks.filter((t) => t.title || t.keyword_sub)} />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-success" />}
          label="Tiến độ tháng"
          value={`${stats.pct}%`}
          sub={`${stats.done}/${stats.total} hoàn thành`}
          colorClass="text-success"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-accent text-white'
                : 'text-[#8888a0] hover:text-[var(--text-primary)]'
            )}
          >
            {tab.label}
            {tab.id === 'week' && weekTasks.length > 0 && (
              <span className={cn(
                'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                activeTab === 'week' ? 'bg-white/20' : 'bg-secondary'
              )}>
                {weekTasks.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'week' && <TasksWeekView tasks={weekTasks} />}
      {activeTab === 'month' && <TasksMonthView tasks={tasks.filter((t) => t.title || t.keyword_sub)} />}
      {activeTab === 'all' && (
        <TasksAllTabWithFiltersSearchAndSortableTable
          tasks={tasks}
          projects={projects}
          pics={pics}
        />
      )}
    </div>
  );
}
