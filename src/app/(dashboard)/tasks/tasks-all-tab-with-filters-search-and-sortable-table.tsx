'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, Pencil } from 'lucide-react';
import { Task, Project } from '@/types';
import { formatDate, isOverdue, isDueSoon, truncate, cn } from '@/lib/utils';
import { isPublished } from '@/lib/task-helpers';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { CATEGORIES, PRIORITIES } from './tasks-add-form-dialog';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CategoryBadge({ value }: { value: string }) {
  const meta = CATEGORIES.find((c) => c.value === value);
  if (!meta) return null;
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', meta.color)}>
      {meta.label}
    </span>
  );
}

function PriorityBadge({ value }: { value: string }) {
  const meta = PRIORITIES.find((p) => p.value === value);
  if (!meta) return null;
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap', meta.color)}>
      {meta.label}
    </span>
  );
}

function SourceIcon({ source }: { source: string }) {
  if (source === 'sheets') {
    return (
      <span title="Google Sheets" className="inline-flex items-center">
        <FileSpreadsheet className="w-3.5 h-3.5 text-green-400" />
      </span>
    );
  }
  if (source === 'manual') {
    return (
      <span title="Thêm thủ công" className="inline-flex items-center">
        <Pencil className="w-3.5 h-3.5 text-[#8888a0]" />
      </span>
    );
  }
  return null;
}

type SortField = 'deadline' | 'priority' | 'category' | 'title';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface TasksAllTabProps {
  tasks: Task[];
  projects: Project[];
  pics: string[];
}

export default function TasksAllTabWithFiltersSearchAndSortableTable({
  tasks,
  projects,
  pics,
}: TasksAllTabProps) {
  const [filters, setFilters] = useState({
    project: '',
    pic: '',
    status: '',
    category: '',
    priority: '',
    search: '',
  });
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({
    field: 'deadline',
    dir: 'asc',
  });

  const setFilter = (key: keyof typeof filters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const toggleSort = (field: SortField) => {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' }
    );
  };

  const filteredAndSorted = useMemo(() => {
    let result = tasks.filter((task) => {
      if (!task.title && !task.keyword_sub) return false;
      if (filters.project && task.project_id !== filters.project) return false;
      if (filters.pic && task.pic !== filters.pic) return false;
      if (filters.category && task.category !== filters.category) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.status) {
        const status = (task.status_content || task.status_outline || '').toLowerCase();
        if (!status.includes(filters.status.toLowerCase())) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const title = (task.title || '').toLowerCase();
        const kw = (task.keyword_sub || '').toLowerCase();
        if (!title.includes(q) && !kw.includes(q)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sort.field) {
        case 'deadline': {
          const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
          const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
          cmp = da - db;
          break;
        }
        case 'priority':
          cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
          break;
        case 'category':
          cmp = (a.category || '').localeCompare(b.category || '');
          break;
        case 'title':
          cmp = (a.title || a.keyword_sub || '').localeCompare(b.title || b.keyword_sub || '');
          break;
      }
      return sort.dir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [tasks, filters, sort]);

  const hasFilters = Object.values(filters).some(Boolean);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sort.dir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-accent" />
      : <ArrowDown className="w-3 h-3 text-accent" />;
  };

  const thClass = 'px-3 py-2.5 text-left text-xs font-semibold text-[#8888a0] uppercase tracking-wide';
  const thSortClass = cn(thClass, 'cursor-pointer hover:text-[var(--text-primary)] select-none');

  return (
    <div className="space-y-3">
      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 p-3 bg-card border border-border rounded-xl items-center">
        <Filter className="w-4 h-4 text-[#8888a0] flex-shrink-0" />

        <select
          value={filters.project}
          onChange={(e) => setFilter('project', e.target.value)}
          className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
        >
          <option value="">Tất cả dự án</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={filters.pic}
          onChange={(e) => setFilter('pic', e.target.value)}
          className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
        >
          <option value="">Tất cả PIC</option>
          {pics.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          value={filters.category}
          onChange={(e) => setFilter('category', e.target.value)}
          className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
        >
          <option value="">Tất cả danh mục</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <select
          value={filters.priority}
          onChange={(e) => setFilter('priority', e.target.value)}
          className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
        >
          <option value="">Tất cả ưu tiên</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="doing">Đang làm</option>
          <option value="fixing">Đang sửa</option>
          <option value="qc">Chờ QC</option>
          <option value="done">Done</option>
          <option value="publish">Đã Publish</option>
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8888a0]" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Tìm kiếm task..."
            className="w-full pl-8 pr-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm focus:outline-none focus:border-accent"
          />
        </div>

        {hasFilters && (
          <button
            onClick={() => setFilters({ project: '', pic: '', status: '', category: '', priority: '', search: '' })}
            className="text-xs text-accent hover:underline px-1"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {filteredAndSorted.length === 0 ? (
        <EmptyState
          title="Không tìm thấy task"
          description="Thử thay đổi bộ lọc hoặc thêm task mới"
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary border-b border-border">
                  <th className={thClass} style={{ width: 36 }}>#</th>

                  <th
                    className={thSortClass}
                    onClick={() => toggleSort('title')}
                  >
                    <span className="flex items-center gap-1">
                      Tiêu đề <SortIcon field="title" />
                    </span>
                  </th>

                  <th
                    className={thSortClass}
                    onClick={() => toggleSort('category')}
                  >
                    <span className="flex items-center gap-1">
                      Danh mục <SortIcon field="category" />
                    </span>
                  </th>

                  <th
                    className={thSortClass}
                    onClick={() => toggleSort('priority')}
                  >
                    <span className="flex items-center gap-1">
                      Ưu tiên <SortIcon field="priority" />
                    </span>
                  </th>

                  <th className={thClass}>Dự án</th>
                  <th className={thClass}>PIC</th>

                  <th
                    className={thSortClass}
                    onClick={() => toggleSort('deadline')}
                  >
                    <span className="flex items-center gap-1">
                      Deadline <SortIcon field="deadline" />
                    </span>
                  </th>

                  <th className={thClass}>Trạng thái</th>
                  <th className={thClass}>Nguồn</th>
                  <th className={thClass}>Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAndSorted.map((task, idx) => {
                  const isPubl = isPublished(task);
                  const overdue = !isPubl && isOverdue(task.deadline);
                  const dueSoon = !isPubl && !overdue && isDueSoon(task.deadline);

                  return (
                    <tr
                      key={task.id}
                      className={cn(
                        'hover:bg-secondary/50 transition-colors',
                        isPubl && 'bg-success/5',
                        overdue && 'bg-danger/5',
                        dueSoon && 'bg-warning/5'
                      )}
                    >
                      {/* # */}
                      <td className="px-3 py-2.5 text-center text-xs font-mono text-[#8888a0]">
                        {idx + 1}
                      </td>

                      {/* Title */}
                      <td className="px-3 py-2.5 max-w-[280px]">
                        <p className="text-[var(--text-primary)] text-sm font-medium truncate">
                          {truncate(task.title || task.keyword_sub || '', 55)}
                        </p>
                        {task.keyword_sub && task.title && (
                          <p className="text-xs text-[#8888a0] truncate mt-0.5">
                            {truncate(task.keyword_sub, 40)}
                          </p>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-3 py-2.5">
                        {task.category ? <CategoryBadge value={task.category} /> : <span className="text-[#8888a0] text-xs">–</span>}
                      </td>

                      {/* Priority */}
                      <td className="px-3 py-2.5">
                        {task.priority ? <PriorityBadge value={task.priority} /> : <span className="text-[#8888a0] text-xs">–</span>}
                      </td>

                      {/* Project */}
                      <td className="px-3 py-2.5">
                        <span className="text-accent text-sm truncate max-w-[120px] block">
                          {task.project?.name || '–'}
                        </span>
                      </td>

                      {/* PIC */}
                      <td className="px-3 py-2.5">
                        <span className="text-[var(--text-primary)] text-sm">{task.pic || '–'}</span>
                      </td>

                      {/* Deadline */}
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            'text-sm font-mono',
                            overdue ? 'text-danger' : dueSoon ? 'text-warning' : 'text-[var(--text-primary)]'
                          )}
                        >
                          {formatDate(task.deadline)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5">
                        <StatusBadge status={task.status_content || task.status_outline || ''} />
                      </td>

                      {/* Source */}
                      <td className="px-3 py-2.5 text-center">
                        <SourceIcon source={task.source} />
                      </td>

                      {/* Link */}
                      <td className="px-3 py-2.5 text-center">
                        {task.link_publish ? (
                          <a
                            href={task.link_publish}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent/70 inline-flex"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-[#8888a0]">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div className="px-4 py-2.5 border-t border-border bg-secondary/30 flex items-center justify-between text-xs text-[#8888a0]">
            <span>
              Hiển thị <span className="text-accent font-medium">{filteredAndSorted.length}</span> / {tasks.filter((t) => t.title || t.keyword_sub).length} tasks
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-danger/40" /> Trễ deadline
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-warning/40" /> Sắp đến hạn
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-success/40" /> Đã publish
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
