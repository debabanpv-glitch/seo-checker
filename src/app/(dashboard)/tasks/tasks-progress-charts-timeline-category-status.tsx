'use client';

import { useMemo } from 'react';
import { BarChart3, PieChart, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotionTask {
  notion_page_id: string;
  task_name: string;
  project: string | null;
  category: string | null;
  status: string | null;
  priority: string | null;
  deadline: string | null;
  synced_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  '✅ Hoàn thành': '#10b981',
  '🔄 Đang làm': '#3b82f6',
  '👀 Chờ review': '#f59e0b',
  '📥 Backlog': '#9ca3af',
  '❌ Bị chặn': '#ef4444',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Content': '#f59e0b',
  'Onpage': '#3b82f6',
  'Technical Audit': '#6b7280',
  'Backlink': '#10b981',
  'Keyword Research': '#8b5cf6',
  'Report': '#f97316',
  'Competitor Analysis': '#ef4444',
};

interface Props {
  tasks: NotionTask[];
  activeStatus?: string;
  activeCategory?: string;
  activeWeek?: string;
  onFilterStatus?: (status: string) => void;
  onFilterCategory?: (category: string) => void;
  onFilterWeek?: (weekStart: string) => void;
}

export default function TasksProgressCharts({ tasks, activeStatus, activeCategory, activeWeek, onFilterStatus, onFilterCategory, onFilterWeek }: Props) {
  // ── Status distribution ──
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      const s = t.status || '📥 Backlog';
      counts[s] = (counts[s] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [tasks]);

  // ── Category distribution ──
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      const c = t.category || 'Khác';
      counts[c] = (counts[c] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [tasks]);

  // ── Timeline: tasks by deadline week ──
  const timelineData = useMemo(() => {
    const weeks: Record<string, { total: number; done: number; doing: number; backlog: number }> = {};

    for (const t of tasks) {
      if (!t.deadline) continue;
      // Get week start (Monday)
      const d = new Date(t.deadline);
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      const weekKey = monday.toISOString().slice(0, 10);

      if (!weeks[weekKey]) weeks[weekKey] = { total: 0, done: 0, doing: 0, backlog: 0 };
      weeks[weekKey].total++;
      if (t.status === '✅ Hoàn thành') weeks[weekKey].done++;
      else if (t.status === '🔄 Đang làm' || t.status === '👀 Chờ review') weeks[weekKey].doing++;
      else weeks[weekKey].backlog++;
    }

    return Object.entries(weeks)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8); // Last 8 weeks
  }, [tasks]);

  // ── Today's progress ──
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayTasks = tasks.filter(t => t.synced_at?.startsWith(today) && t.status === '✅ Hoàn thành');
    return todayTasks.length;
  }, [tasks]);

  const maxTimeline = Math.max(...timelineData.map(([, d]) => d.total), 1);
  const maxCategory = Math.max(...categoryData.map(([, c]) => c), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* ── Status Donut (CSS) ── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <PieChart className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Trạng thái</span>
          {todayStats > 0 && (
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              +{todayStats} hôm nay
            </span>
          )}
        </div>
        {/* Horizontal stacked bar */}
        <div className="flex h-4 rounded-full overflow-hidden mb-3">
          {statusData.map(([status, count]) => (
            <div
              key={status}
              style={{ width: `${(count / tasks.length) * 100}%`, background: STATUS_COLORS[status] || '#9ca3af' }}
              title={`${status}: ${count}`}
            />
          ))}
        </div>
        {/* Legend */}
        <div className="space-y-1.5">
          {statusData.map(([status, count]) => (
            <button key={status} onClick={() => onFilterStatus?.(activeStatus === status ? '' : status)}
              className={cn('flex items-center justify-between text-xs w-full rounded px-1 py-0.5 transition-colors',
                activeStatus === status ? 'bg-accent/10 ring-1 ring-accent/30' : 'hover:bg-secondary')}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[status] || '#9ca3af' }} />
                <span className="text-[var(--text-primary)]">{status}</span>
              </div>
              <span className="text-[#8888a0] font-medium">{count} ({Math.round(count / tasks.length * 100)}%)</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Category Bar Chart ── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Danh mục</span>
        </div>
        <div className="space-y-2">
          {categoryData.map(([cat, count]) => (
            <button key={cat} onClick={() => onFilterCategory?.(activeCategory === cat ? '' : cat)}
              className={cn('flex items-center gap-2 w-full rounded px-1 py-0.5 transition-colors',
                activeCategory === cat ? 'bg-accent/10 ring-1 ring-accent/30' : 'hover:bg-secondary')}>
              <span className="text-[10px] text-[var(--text-primary)] w-24 truncate shrink-0 text-left">{cat}</span>
              <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(count / maxCategory) * 100}%`, background: CATEGORY_COLORS[cat] || '#6b7280' }}
                />
              </div>
              <span className="text-[10px] text-[#8888a0] w-6 text-right font-medium">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Timeline Chart ── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Timeline (theo tuần)</span>
        </div>
        {timelineData.length === 0 ? (
          <div className="text-xs text-[#8888a0] text-center py-4">Chưa có dữ liệu deadline</div>
        ) : (
          <>
            {/* Stacked bar chart */}
            <div className="flex items-end gap-1 h-24 mb-2">
              {timelineData.map(([week, data]) => {
                const isCurrentWeek = (() => {
                  const now = new Date();
                  const day = now.getDay();
                  const monday = new Date(now);
                  monday.setDate(now.getDate() - ((day + 6) % 7));
                  return week === monday.toISOString().slice(0, 10);
                })();

                return (
                  <div key={week} onClick={() => onFilterWeek?.(activeWeek === week ? '' : week)}
                    className={cn('flex-1 flex flex-col justify-end gap-[1px] cursor-pointer rounded transition-all',
                      activeWeek === week ? 'ring-2 ring-accent/40 bg-accent/5' : 'hover:bg-secondary/30')}
                    title={`Tuần ${week}: ${data.total} tasks (${data.done} done)`}>
                    {data.backlog > 0 && (
                      <div className="rounded-t" style={{ height: `${(data.backlog / maxTimeline) * 100}%`, background: '#9ca3af', minHeight: data.backlog > 0 ? '2px' : 0 }} />
                    )}
                    {data.doing > 0 && (
                      <div style={{ height: `${(data.doing / maxTimeline) * 100}%`, background: '#3b82f6', minHeight: data.doing > 0 ? '2px' : 0 }} />
                    )}
                    {data.done > 0 && (
                      <div className="rounded-b" style={{ height: `${(data.done / maxTimeline) * 100}%`, background: '#10b981', minHeight: data.done > 0 ? '2px' : 0 }} />
                    )}
                    {data.total === 0 && <div className="h-1 bg-secondary rounded" />}
                    {isCurrentWeek && <div className="h-0.5 bg-accent rounded mt-0.5" />}
                  </div>
                );
              })}
            </div>
            {/* Week labels */}
            <div className="flex gap-1">
              {timelineData.map(([week]) => (
                <div key={week} className="flex-1 text-center">
                  <span className="text-[8px] text-[#8888a0]">
                    {new Date(week).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 mt-2 text-[9px] text-[#8888a0]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#10b981]" />Done</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#3b82f6]" />Doing</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#9ca3af]" />Backlog</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
