'use client';

import { useState, useEffect } from 'react';
import DashboardV2ExecutionTaskSummary from './dashboard-v2-execution-task-summary';
import DashboardV2ExecutionContentTrackerTable, {
  ContentItem,
  ContentSource,
} from './dashboard-v2-execution-content-tracker-table';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  selectedMonth: number;
  selectedYear: number;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

type SourceFilter = 'all' | 'notion' | 'sheet';
type CategoryFilter = string; // 'all' | specific category name

interface TaskSummaryData {
  total: number;
  done: number;
  inProgress: number;
  overdue: number;
  byCategory: Record<string, { total: number; done: number }>;
}

interface ExecutionTask {
  id: string;
  title: string;
  source: 'sheet' | 'notion';
  category: string;
  status: string;
  assignee?: string;
  deadline?: string;
  publishUrl?: string;
  publishDate?: string;
  priority?: string;
}

// ─── Status mapping for display ──────────────────────────────────────────────

function mapStatusForDisplay(status: string): string {
  switch (status) {
    case 'done': return 'Đã đăng';
    case 'in_progress': return 'Đang làm';
    case 'review': return 'Chờ review';
    case 'backlog': return 'Backlog';
    default: return status;
  }
}

// ─── Category pills ──────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Content: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Onpage: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Technical: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  Backlink: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  Report: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  'Keyword Research': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  Competitor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

// ─── Filter Bar ───────────────────────────────────────────────────────────────

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: 'all',    label: 'Tất cả' },
  { value: 'notion', label: 'Notion' },
  { value: 'sheet',  label: 'Sheet' },
];

function FilterBar({
  projects,
  projectFilter,
  sourceFilter,
  categoryFilter,
  categories,
  onProjectChange,
  onSourceChange,
  onCategoryChange,
}: {
  projects: Project[];
  projectFilter: string;
  sourceFilter: SourceFilter;
  categoryFilter: CategoryFilter;
  categories: string[];
  onProjectChange: (v: string) => void;
  onSourceChange: (v: SourceFilter) => void;
  onCategoryChange: (v: CategoryFilter) => void;
}) {
  return (
    <div className="space-y-3 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Project dropdown */}
        <select
          value={projectFilter}
          onChange={(e) => onProjectChange(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Source filter pills */}
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSourceChange(opt.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                sourceFilter === opt.value
                  ? 'bg-card text-[var(--text-primary)] shadow-sm'
                  : 'text-[#8888a0] hover:text-[var(--text-primary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter pills */}
      {categories.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onCategoryChange('all')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
              categoryFilter === 'all'
                ? 'bg-accent/15 text-accent border-accent/30'
                : 'text-[#8888a0] border-border hover:text-[var(--text-primary)]'
            }`}
          >
            Tất cả
          </button>
          {categories.map((cat) => {
            const colorClass = CATEGORY_COLORS[cat] || 'bg-gray-500/15 text-gray-400 border-gray-500/30';
            const isActive = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                  isActive ? colorClass : 'text-[#8888a0] border-border hover:text-[var(--text-primary)]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardV2ExecutionTab({ selectedMonth, selectedYear }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFilter, setProjectFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskSummaryData>({ total: 0, done: 0, inProgress: 0, overdue: 0, byCategory: {} });
  const [allItems, setAllItems] = useState<ExecutionTask[]>([]);

  // Fetch projects list once, default to first project
  useEffect(() => {
    setLoading(true);
    fetch('/api/v1/projects')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.projects) ? data.projects : [];
        setProjects(list);
        if (list.length > 0) setProjectFilter(list[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch data whenever filters / month / year change
  useEffect(() => {
    if (!projectFilter) return;
    setLoading(true);

    const params = new URLSearchParams({ project_id: projectFilter, year: String(selectedYear) });
    if (selectedMonth > 0) params.set('month', String(selectedMonth));

    fetch(`/api/v1/dashboard/execution-tasks?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setTasks(data.summary ?? { total: 0, done: 0, inProgress: 0, overdue: 0, byCategory: {} });
        setAllItems(data.items ?? []);
      })
      .catch(() => {
        setTasks({ total: 0, done: 0, inProgress: 0, overdue: 0, byCategory: {} });
        setAllItems([]);
      })
      .finally(() => setLoading(false));
  }, [projectFilter, selectedMonth, selectedYear]);

  // Derive unique categories from data
  const categories = [...new Set(allItems.map((i) => i.category))].sort();

  // Apply source + category filters
  const visibleItems = allItems
    .filter((item) => sourceFilter === 'all' || item.source === sourceFilter)
    .filter((item) => categoryFilter === 'all' || item.category === categoryFilter);

  // Convert to ContentItem format for table
  const contentItems: ContentItem[] = visibleItems.map((item) => ({
    id: item.id,
    title: item.title,
    source: item.source as ContentSource,
    status: mapStatusForDisplay(item.status),
    assignee: item.assignee,
    deadline: item.deadline,
    publishUrl: item.publishUrl,
    publishDate: item.publishDate,
  }));

  return (
    <div>
      <FilterBar
        projects={projects}
        projectFilter={projectFilter}
        sourceFilter={sourceFilter}
        categoryFilter={categoryFilter}
        categories={categories}
        onProjectChange={setProjectFilter}
        onSourceChange={setSourceFilter}
        onCategoryChange={setCategoryFilter}
      />

      <div className="space-y-4">
        <DashboardV2ExecutionTaskSummary tasks={tasks} />
        <DashboardV2ExecutionContentTrackerTable items={contentItems} loading={loading} />
      </div>
    </div>
  );
}
