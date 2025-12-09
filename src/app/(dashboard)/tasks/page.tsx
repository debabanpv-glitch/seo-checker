'use client';

import { useState, useEffect } from 'react';
import { Search, ExternalLink, Filter, Calendar } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { formatDate, isOverdue, isDueSoon, truncate, cn } from '@/lib/utils';
import { Task, Project } from '@/types';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });
  const [filters, setFilters] = useState({
    project: '',
    pic: '',
    status: '',
    search: '',
  });
  const [pics, setPics] = useState<string[]>([]);

  // Generate month options
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      value: `${date.getMonth() + 1}-${date.getFullYear()}`,
      label: `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
    });
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [month, year] = selectedMonth.split('-');
      const [tasksRes, projectsRes] = await Promise.all([
        fetch(`/api/tasks?month=${month}&year=${year}`),
        fetch('/api/projects'),
      ]);

      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();

      setTasks(tasksData.tasks || []);
      setProjects(projectsData.projects || []);

      // Extract unique PICs
      const uniquePics = [...new Set((tasksData.tasks || []).map((t: Task) => t.pic).filter(Boolean))];
      setPics(uniquePics as string[]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    // Filter out empty tasks
    if (!task.title && !task.keyword_sub) return false;

    if (filters.project && task.project_id !== filters.project) return false;
    if (filters.pic && task.pic !== filters.pic) return false;
    if (filters.status) {
      const status = task.status_content || task.status_outline || '';
      if (!status.toLowerCase().includes(filters.status.toLowerCase())) return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const title = (task.title || '').toLowerCase();
      const keyword = (task.keyword_sub || '').toLowerCase();
      if (!title.includes(searchLower) && !keyword.includes(searchLower)) return false;
    }
    return true;
  });

  const getRowClass = (task: Task) => {
    if (task.status_content === '4. Publish') return 'bg-success/5';
    if (isOverdue(task.deadline)) return 'bg-danger/10';
    if (isDueSoon(task.deadline)) return 'bg-warning/10';
    return '';
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tasks</h1>
          <p className="text-[#8888a0] text-sm">Danh sách tất cả công việc</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#8888a0]" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-card border border-border rounded-lg text-[var(--text-primary)]"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-card border border-border rounded-xl">
        <div className="flex items-center gap-2 text-[#8888a0]">
          <Filter className="w-4 h-4" />
          <span className="text-sm">Lọc:</span>
        </div>

        <select
          value={filters.project}
          onChange={(e) => setFilters({ ...filters, project: e.target.value })}
          className="px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
        >
          <option value="">Tất cả dự án</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={filters.pic}
          onChange={(e) => setFilters({ ...filters, pic: e.target.value })}
          className="px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
        >
          <option value="">Tất cả PIC</option>
          {pics.map((pic) => (
            <option key={pic} value={pic}>
              {pic}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Doing">Đang làm</option>
          <option value="Fixing">Đang sửa</option>
          <option value="QC">Chờ QC</option>
          <option value="Done">Done</option>
          <option value="Publish">Đã Publish</option>
        </select>

        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888a0]" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Tìm kiếm..."
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      {filteredTasks.length > 0 ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr className="bg-secondary">
                  <th className="w-12">STT</th>
                  <th>Dự án</th>
                  <th className="min-w-[250px]">Title</th>
                  <th>PIC</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, index) => (
                  <tr key={task.id} className={getRowClass(task)}>
                    <td className="text-center font-mono text-[#8888a0]">
                      {task.stt || index + 1}
                    </td>
                    <td>
                      <span className="text-accent text-sm">
                        {task.project?.name || '-'}
                      </span>
                    </td>
                    <td>
                      <div className="max-w-[300px]">
                        <p className="text-[var(--text-primary)] font-medium truncate">
                          {truncate(task.title || task.keyword_sub || '', 50)}
                        </p>
                        {task.keyword_sub && task.title && (
                          <p className="text-xs text-[#8888a0] truncate">
                            {truncate(task.keyword_sub, 40)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="text-[var(--text-primary)]">{task.pic || '-'}</span>
                    </td>
                    <td>
                      <span
                        className={cn(
                          'font-mono text-sm',
                          isOverdue(task.deadline) && task.status_content !== '4. Publish'
                            ? 'text-danger'
                            : isDueSoon(task.deadline)
                            ? 'text-warning'
                            : 'text-[var(--text-primary)]'
                        )}
                      >
                        {formatDate(task.deadline)}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={task.status_content || task.status_outline || ''} />
                    </td>
                    <td>
                      {task.link_publish ? (
                        <a
                          href={task.link_publish}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-[#8888a0]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Không tìm thấy tasks"
          description="Thử thay đổi bộ lọc hoặc sync dữ liệu từ Google Sheets"
        />
      )}

      {/* Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-[#8888a0]">
        <span>Hiển thị {filteredTasks.length} / {tasks.filter(t => t.title || t.keyword_sub).length} tasks</span>
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-danger/30" /> Trễ deadline
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-warning/30" /> Sắp đến hạn
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-success/30" /> Đã publish
          </span>
        </div>
      </div>
    </div>
  );
}
