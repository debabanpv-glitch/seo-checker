'use client';

import { useMemo } from 'react';
import { Task } from '@/types';
import { formatDate, isOverdue, isDueSoon, cn } from '@/lib/utils';
import { isPublished } from '@/lib/task-helpers';
import { CATEGORIES, PRIORITIES } from './tasks-add-form-dialog';
import StatusBadge from '@/components/StatusBadge';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCategoryMeta(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? { label: value, color: 'bg-secondary text-[#8888a0]' };
}

function getPriorityMeta(value: string) {
  return PRIORITIES.find((p) => p.value === value) ?? { label: value, color: 'bg-secondary text-[#8888a0]' };
}

function getPriorityDotColor(value: string): string {
  switch (value) {
    case 'critical': return 'bg-red-400';
    case 'high': return 'bg-orange-400';
    case 'medium': return 'bg-gray-400';
    case 'low': return 'bg-gray-600';
    default: return 'bg-gray-500';
  }
}

// ─── Task Card (shared) ──────────────────────────────────────────────────────

function TaskCard({ task }: { task: Task }) {
  const cat = getCategoryMeta(task.category);
  const isPubl = isPublished(task);
  const overdue = !isPubl && isOverdue(task.deadline);
  const dueSoon = !isPubl && !overdue && isDueSoon(task.deadline);

  return (
    <div
      className={cn(
        'rounded-lg border p-3 flex flex-col gap-1.5 text-sm transition-colors',
        isPubl
          ? 'bg-success/5 border-success/20'
          : overdue
          ? 'bg-danger/5 border-danger/20'
          : dueSoon
          ? 'bg-warning/5 border-warning/20'
          : 'bg-secondary border-border'
      )}
    >
      {/* Top row: category badge + priority dot */}
      <div className="flex items-center gap-2 flex-wrap">
        {task.category && (
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cat.color)}>
            {cat.label}
          </span>
        )}
        {task.priority && (
          <span className="flex items-center gap-1 text-xs text-[#8888a0]">
            <span className={cn('w-1.5 h-1.5 rounded-full', getPriorityDotColor(task.priority))} />
            {getPriorityMeta(task.priority).label}
          </span>
        )}
        {isPubl && (
          <span className="ml-auto text-xs text-success font-medium">Done</span>
        )}
      </div>

      {/* Title */}
      <p className="text-[var(--text-primary)] font-medium leading-snug line-clamp-2">
        {task.title || task.keyword_sub || '(Không có tiêu đề)'}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-[#8888a0] flex-wrap">
        {task.project?.name && (
          <span className="text-accent">{task.project.name}</span>
        )}
        {task.pic && <span>{task.pic}</span>}
        {task.deadline && (
          <span
            className={cn(
              overdue ? 'text-danger' : dueSoon ? 'text-warning' : ''
            )}
          >
            {formatDate(task.deadline)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Week View ───────────────────────────────────────────────────────────────

interface WeekViewProps {
  tasks: Task[];
}

const WEEKDAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

export function TasksWeekView({ tasks }: WeekViewProps) {
  const { weekDays, tasksByDay } = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    // Monday = start of week
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));

    const days: Date[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    const byDay: Record<string, Task[]> = {};
    days.forEach((d) => {
      byDay[d.toISOString().split('T')[0]] = [];
    });

    tasks.forEach((task) => {
      if (!task.deadline) return;
      const key = task.deadline.split('T')[0];
      if (byDay[key]) byDay[key].push(task);
    });

    return { weekDays: days, tasksByDay: byDay };
  }, [tasks]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
      {weekDays.map((day, idx) => {
        const key = day.toISOString().split('T')[0];
        const dayTasks = tasksByDay[key] ?? [];
        const isToday = key === todayStr;

        return (
          <div
            key={key}
            className={cn(
              'rounded-xl border flex flex-col gap-2 min-h-[120px]',
              isToday ? 'border-accent/50 bg-accent/5' : 'border-border bg-card'
            )}
          >
            {/* Day header */}
            <div
              className={cn(
                'px-3 py-2 border-b flex items-center justify-between',
                isToday ? 'border-accent/30' : 'border-border'
              )}
            >
              <span
                className={cn(
                  'text-xs font-semibold',
                  isToday ? 'text-accent' : 'text-[#8888a0]'
                )}
              >
                {WEEKDAY_LABELS[idx]}
              </span>
              <span
                className={cn(
                  'text-xs font-mono',
                  isToday ? 'text-accent font-bold' : 'text-[#8888a0]'
                )}
              >
                {day.getDate()}/{day.getMonth() + 1}
              </span>
            </div>

            {/* Tasks */}
            <div className="px-2 pb-2 flex flex-col gap-1.5">
              {dayTasks.length === 0 ? (
                <p className="text-xs text-[#8888a0]/50 text-center py-2">–</p>
              ) : (
                dayTasks.map((task) => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Month View ──────────────────────────────────────────────────────────────

interface MonthViewProps {
  tasks: Task[];
}

export function TasksMonthView({ tasks }: MonthViewProps) {
  const { categoryGroups, totalDone, totalAll } = useMemo(() => {
    const groups: Record<string, { tasks: Task[]; done: number }> = {};

    // Include 'uncategorized' bucket
    const allCats = [...CATEGORIES.map((c) => c.value), '__other__'];

    allCats.forEach((cat) => {
      groups[cat] = { tasks: [], done: 0 };
    });

    tasks.forEach((task) => {
      const cat = task.category && groups[task.category] ? task.category : '__other__';
      groups[cat].tasks.push(task);
      if (isPublished(task)) groups[cat].done++;
    });

    // Remove empty groups
    Object.keys(groups).forEach((k) => {
      if (groups[k].tasks.length === 0) delete groups[k];
    });

    const totalDone = tasks.filter((t) => isPublished(t)).length;
    return { categoryGroups: groups, totalDone, totalAll: tasks.length };
  }, [tasks]);

  return (
    <div className="space-y-5">
      {/* Overall progress */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">Tiến độ tháng</span>
          <span className="text-sm font-bold text-accent">
            {totalDone}/{totalAll} ({totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0}%)
          </span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all"
            style={{ width: `${totalAll > 0 ? (totalDone / totalAll) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Per-category groups */}
      {Object.entries(categoryGroups).map(([catKey, { tasks: catTasks, done }]) => {
        const meta = catKey === '__other__'
          ? { label: 'Khác', color: 'bg-secondary text-[#8888a0]' }
          : getCategoryMeta(catKey);
        const pct = catTasks.length > 0 ? Math.round((done / catTasks.length) * 100) : 0;

        return (
          <div key={catKey} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Category header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', meta.color)}>
                  {meta.label}
                </span>
                <span className="text-xs text-[#8888a0]">
                  {done}/{catTasks.length} hoàn thành
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-[var(--text-primary)]">{pct}%</span>
              </div>
            </div>

            {/* Task list */}
            <div className="divide-y divide-border">
              {catTasks.map((task) => {
                const isPubl = isPublished(task);
                const overdue = !isPubl && isOverdue(task.deadline);

                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors"
                  >
                    {/* Status dot */}
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        isPubl ? 'bg-success' : overdue ? 'bg-danger' : 'bg-[#8888a0]/40'
                      )}
                    />

                    {/* Title */}
                    <p className="flex-1 text-sm text-[var(--text-primary)] truncate">
                      {task.title || task.keyword_sub || '–'}
                    </p>

                    {/* Priority */}
                    {task.priority && (
                      <span
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          getPriorityMeta(task.priority).color
                        )}
                      >
                        {getPriorityMeta(task.priority).label}
                      </span>
                    )}

                    {/* PIC */}
                    {task.pic && (
                      <span className="text-xs text-[#8888a0] w-20 truncate text-right">
                        {task.pic}
                      </span>
                    )}

                    {/* Status badge */}
                    <StatusBadge status={task.status_content || task.status_outline || ''} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {Object.keys(categoryGroups).length === 0 && (
        <div className="text-center py-10 text-[#8888a0] text-sm">Không có task nào trong tháng này</div>
      )}
    </div>
  );
}
