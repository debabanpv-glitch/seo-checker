'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Code,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { Project } from '@/types';

interface TaskWithSEO {
  id: string;
  title: string;
  keyword_sub: string;
  parent_keyword: string;
  link_publish: string;
  pic: string;
  project: { id: string; name: string } | null;
  seoScore?: number;
  seoChecked?: boolean;
  seoLoading?: boolean;
  seoResult?: SEOResult | null;
}

interface SEOResult {
  url: string;
  success: boolean;
  error?: string;
  score: number;
  maxScore: number;
  categories: {
    content: CategoryResult;
    images: CategoryResult;
    technical: CategoryResult;
  };
  details: CheckDetail[];
}

interface CategoryResult {
  name: string;
  score: number;
  maxScore: number;
  passed: number;
  total: number;
}

interface CheckDetail {
  id: string;
  category: 'content' | 'images' | 'technical';
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'warning';
  score: number;
  maxScore: number;
  value?: string | number;
  suggestion?: string;
}

export default function SEOAuditPage() {
  const [tasks, setTasks] = useState<TaskWithSEO[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });
  const [selectedProject, setSelectedProject] = useState('');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedProject]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const [month, year] = selectedMonth.split('-');
      const projectParam = selectedProject ? `&project=${selectedProject}` : '';
      const res = await fetch(`/api/tasks?month=${month}&year=${year}${projectParam}&published=true`);
      const data = await res.json();

      const publishedTasks = (data.tasks || []).filter(
        (t: TaskWithSEO) => t.link_publish && (t.title || t.keyword_sub)
      );

      setTasks(publishedTasks);

      const projectsRes = await fetch('/api/projects');
      const projectsData = await projectsRes.json();
      setProjects(projectsData.projects || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkSEO = async (task: TaskWithSEO) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, seoLoading: true } : t))
    );

    try {
      const res = await fetch('/api/seo-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: task.link_publish,
          keyword: task.parent_keyword || task.keyword_sub || '',
          subKeyword: task.keyword_sub || '',
        }),
      });

      const result = await res.json();

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                seoLoading: false,
                seoChecked: true,
                seoScore: result.score || 0,
                seoResult: result,
              }
            : t
        )
      );
    } catch (error) {
      console.error('SEO check failed:', error);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, seoLoading: false, seoChecked: true, seoScore: 0, seoResult: null }
            : t
        )
      );
    }
  };

  const checkAllSEO = async () => {
    setCheckingAll(true);
    const uncheckedTasks = tasks.filter((t) => !t.seoChecked && !t.seoLoading);

    for (const task of uncheckedTasks) {
      await checkSEO(task);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setCheckingAll(false);
  };

  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      value: `${date.getMonth() + 1}-${date.getFullYear()}`,
      label: `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
    });
  }

  const checkedTasks = tasks.filter((t) => t.seoChecked);
  const avgScore = checkedTasks.length > 0
    ? Math.round(checkedTasks.reduce((sum, t) => sum + (t.seoScore || 0), 0) / checkedTasks.length)
    : 0;
  const goodCount = checkedTasks.filter((t) => (t.seoScore || 0) >= 70).length;
  const warningCount = checkedTasks.filter((t) => (t.seoScore || 0) >= 50 && (t.seoScore || 0) < 70).length;
  const badCount = checkedTasks.filter((t) => (t.seoScore || 0) < 50).length;

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">SEO Audit</h1>
          <p className="text-[#8888a0] text-sm">Kiểm tra SEO on-page theo checklist chuẩn</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#8888a0]" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 bg-card border border-border rounded-lg text-white text-sm"
            >
              <option value="">Tất cả dự án</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-card border border-border rounded-lg text-white"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={checkAllSEO}
            disabled={checkingAll || tasks.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 rounded-lg text-white font-medium transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", checkingAll && "animate-spin")} />
            {checkingAll ? 'Đang check...' : 'Check tất cả'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-1">Tổng bài</p>
          <p className="text-2xl font-bold text-white">{tasks.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-1">Đã check</p>
          <p className="text-2xl font-bold text-accent">{checkedTasks.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-1">Điểm TB</p>
          <p className={cn(
            "text-2xl font-bold",
            avgScore >= 70 ? "text-success" : avgScore >= 50 ? "text-warning" : "text-danger"
          )}>
            {avgScore}/100
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-1">Tốt (≥70)</p>
          <p className="text-2xl font-bold text-success">{goodCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-1">Cần cải thiện</p>
          <p className="text-2xl font-bold text-warning">{warningCount + badCount}</p>
        </div>
      </div>

      {/* Checklist Info */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-white font-medium mb-3">Checklist SEO On-Page</h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-accent mt-0.5" />
            <div>
              <p className="text-white font-medium">Nội dung</p>
              <p className="text-[#8888a0] text-xs">Title, Meta, Keyword, Heading, Độ dài bài</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ImageIcon className="w-4 h-4 text-accent mt-0.5" />
            <div>
              <p className="text-white font-medium">Hình ảnh</p>
              <p className="text-[#8888a0] text-xs">Alt text, Số lượng ảnh, Keyword trong alt</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Code className="w-4 h-4 text-accent mt-0.5" />
            <div>
              <p className="text-white font-medium">Kỹ thuật</p>
              <p className="text-[#8888a0] text-xs">H1, Internal/External links, Canonical</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isExpanded={expandedTask === task.id}
              onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
              onCheck={() => checkSEO(task)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="Không có bài viết"
          description="Không tìm thấy bài viết đã publish trong tháng này"
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  isExpanded,
  onToggle,
  onCheck,
}: {
  task: TaskWithSEO;
  isExpanded: boolean;
  onToggle: () => void;
  onCheck: () => void;
}) {
  const score = task.seoScore || 0;
  const scoreColor = score >= 70 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-danger';
  const scoreBg = score >= 70 ? 'bg-success/20' : score >= 50 ? 'bg-warning/20' : 'bg-danger/20';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-white font-medium truncate">{task.title || task.keyword_sub}</p>
            {task.project && (
              <span className="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs flex-shrink-0">
                {task.project.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-[#8888a0]">
            <span>PIC: {task.pic || 'N/A'}</span>
            {task.parent_keyword && (
              <>
                <span>•</span>
                <span>KW: {task.parent_keyword}</span>
              </>
            )}
          </div>
        </div>

        {task.seoChecked ? (
          <button
            onClick={onToggle}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-bold",
              scoreBg,
              scoreColor
            )}
          >
            <span className="text-xl">{score}</span>
            <span className="text-sm font-normal">/100</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        ) : task.seoLoading ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-[#8888a0]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Đang check...</span>
          </div>
        ) : (
          <button
            onClick={onCheck}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium transition-colors"
          >
            <Search className="w-4 h-4" />
            Check SEO
          </button>
        )}

        <a
          href={task.link_publish}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-accent hover:bg-accent/20 rounded transition-colors"
        >
          <ExternalLink className="w-5 h-5" />
        </a>
      </div>

      {isExpanded && task.seoResult && (
        <div className="border-t border-border bg-secondary/30 p-4">
          {task.seoResult.success ? (
            <div className="space-y-4">
              {/* Category Summary */}
              <div className="grid sm:grid-cols-3 gap-4">
                {Object.entries(task.seoResult.categories).map(([key, cat]) => (
                  <CategoryCard key={key} category={cat} />
                ))}
              </div>

              {/* Details by Category */}
              <div className="space-y-4">
                <ChecklistSection
                  title="Nội dung"
                  icon={FileText}
                  checks={task.seoResult.details.filter(d => d.category === 'content')}
                />
                <ChecklistSection
                  title="Hình ảnh"
                  icon={ImageIcon}
                  checks={task.seoResult.details.filter(d => d.category === 'images')}
                />
                <ChecklistSection
                  title="Kỹ thuật"
                  icon={Code}
                  checks={task.seoResult.details.filter(d => d.category === 'technical')}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <XCircle className="w-8 h-8 text-danger mx-auto mb-2" />
              <p className="text-danger">{task.seoResult.error || 'Không thể kiểm tra URL này'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryCard({ category }: { category: CategoryResult }) {
  const percentage = Math.round((category.score / category.maxScore) * 100);
  const color = percentage >= 70 ? 'text-success' : percentage >= 50 ? 'text-warning' : 'text-danger';
  const bg = percentage >= 70 ? 'bg-success/20' : percentage >= 50 ? 'bg-warning/20' : 'bg-danger/20';

  return (
    <div className={cn("rounded-lg p-3", bg)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium">{category.name}</span>
        <span className={cn("font-bold", color)}>{percentage}%</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#8888a0]">
          {category.passed}/{category.total} đạt
        </span>
        <span className={color}>
          {category.score}/{category.maxScore} điểm
        </span>
      </div>
    </div>
  );
}

function ChecklistSection({
  title,
  icon: Icon,
  checks,
}: {
  title: string;
  icon: React.ElementType;
  checks: CheckDetail[];
}) {
  if (checks.length === 0) return null;

  return (
    <div className="bg-card rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-accent" />
        <h4 className="text-white font-medium">{title}</h4>
      </div>
      <div className="space-y-2">
        {checks.map((check) => (
          <CheckItem key={check.id} check={check} />
        ))}
      </div>
    </div>
  );
}

function CheckItem({ check }: { check: CheckDetail }) {
  const statusIcon = {
    pass: <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />,
    fail: <XCircle className="w-4 h-4 text-danger flex-shrink-0" />,
  };

  const statusBg = {
    pass: 'bg-success/10',
    warning: 'bg-warning/10',
    fail: 'bg-danger/10',
  };

  return (
    <div className={cn("rounded-lg p-3", statusBg[check.status])}>
      <div className="flex items-start gap-3">
        {statusIcon[check.status]}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-white text-sm font-medium">{check.name}</span>
            <span className={cn(
              "text-xs font-mono",
              check.status === 'pass' ? 'text-success' : check.status === 'warning' ? 'text-warning' : 'text-danger'
            )}>
              {check.score}/{check.maxScore}
            </span>
          </div>
          <p className="text-[#8888a0] text-xs mt-0.5">{check.description}</p>
          {check.value && (
            <p className="text-white text-xs mt-1 font-mono bg-secondary/50 px-2 py-1 rounded inline-block">
              {check.value}
            </p>
          )}
          {check.suggestion && (
            <p className="text-warning text-xs mt-1 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {check.suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
