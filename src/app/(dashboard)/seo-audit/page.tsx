'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  FileText,
  Image,
  Link2,
  Type,
  Code,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
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
  checks: {
    title: CheckResult;
    metaDescription: CheckResult;
    headings: HeadingResult;
    images: ImageResult;
    content: ContentResult;
    links: LinkResult;
    technical: TechResult;
  };
}

interface CheckResult {
  exists: boolean;
  content: string;
  length: number;
  hasKeyword: boolean;
  score: number;
  issues: string[];
}

interface HeadingResult {
  h1Count: number;
  h1Content: string[];
  h2Count: number;
  h3Count: number;
  hasKeywordInH1: boolean;
  score: number;
  issues: string[];
}

interface ImageResult {
  total: number;
  withAlt: number;
  withoutAlt: number;
  altWithKeyword: number;
  score: number;
  issues: string[];
}

interface ContentResult {
  wordCount: number;
  keywordCount: number;
  keywordDensity: number;
  subKeywordCount: number;
  score: number;
  issues: string[];
}

interface LinkResult {
  internal: number;
  external: number;
  total: number;
  score: number;
  issues: string[];
}

interface TechResult {
  hasCanonical: boolean;
  hasViewport: boolean;
  hasCharset: boolean;
  score: number;
  issues: string[];
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

      // Filter only published tasks with links
      const publishedTasks = (data.tasks || []).filter(
        (t: TaskWithSEO) => t.link_publish && (t.title || t.keyword_sub)
      );

      setTasks(publishedTasks);

      // Fetch projects
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
    // Update loading state
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
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setCheckingAll(false);
  };

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

  // Stats
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
          <p className="text-[#8888a0] text-sm">Kiểm tra SEO on-page cho các bài đã publish</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Project Filter */}
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

          {/* Month Selector */}
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

          {/* Check All Button */}
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

      {/* Score Legend */}
      <div className="flex items-center gap-6 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-success" />
          <span className="text-[#8888a0]">Tốt (≥70)</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-warning" />
          <span className="text-[#8888a0]">Trung bình (50-69)</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-danger" />
          <span className="text-[#8888a0]">Cần cải thiện (&lt;50)</span>
        </span>
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

// Task Card Component
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
      {/* Header */}
      <div className="p-4 flex items-center gap-4">
        {/* Title & Info */}
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

        {/* Score or Check Button */}
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

        {/* External Link */}
        <a
          href={task.link_publish}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-accent hover:bg-accent/20 rounded transition-colors"
        >
          <ExternalLink className="w-5 h-5" />
        </a>
      </div>

      {/* Expanded Details */}
      {isExpanded && task.seoResult && (
        <div className="border-t border-border bg-secondary/30 p-4">
          {task.seoResult.success ? (
            <div className="space-y-4">
              {/* Check Categories */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <CheckCategory
                  icon={Type}
                  title="Title"
                  score={task.seoResult.checks.title.score}
                  maxScore={15}
                  details={[
                    `"${task.seoResult.checks.title.content.substring(0, 50)}${task.seoResult.checks.title.content.length > 50 ? '...' : ''}"`,
                    `Độ dài: ${task.seoResult.checks.title.length} ký tự`,
                    task.seoResult.checks.title.hasKeyword ? '✓ Có keyword' : '✗ Thiếu keyword',
                  ]}
                  issues={task.seoResult.checks.title.issues}
                />
                <CheckCategory
                  icon={FileText}
                  title="Meta Description"
                  score={task.seoResult.checks.metaDescription.score}
                  maxScore={15}
                  details={[
                    `Độ dài: ${task.seoResult.checks.metaDescription.length} ký tự`,
                    task.seoResult.checks.metaDescription.hasKeyword ? '✓ Có keyword' : '✗ Thiếu keyword',
                  ]}
                  issues={task.seoResult.checks.metaDescription.issues}
                />
                <CheckCategory
                  icon={Type}
                  title="Headings"
                  score={task.seoResult.checks.headings.score}
                  maxScore={15}
                  details={[
                    `H1: ${task.seoResult.checks.headings.h1Count}`,
                    `H2: ${task.seoResult.checks.headings.h2Count}`,
                    `H3: ${task.seoResult.checks.headings.h3Count}`,
                    task.seoResult.checks.headings.hasKeywordInH1 ? '✓ H1 có keyword' : '✗ H1 thiếu keyword',
                  ]}
                  issues={task.seoResult.checks.headings.issues}
                />
                <CheckCategory
                  icon={Image}
                  title="Images"
                  score={task.seoResult.checks.images.score}
                  maxScore={10}
                  details={[
                    `Tổng: ${task.seoResult.checks.images.total} ảnh`,
                    `Có alt: ${task.seoResult.checks.images.withAlt}`,
                    `Alt có KW: ${task.seoResult.checks.images.altWithKeyword}`,
                  ]}
                  issues={task.seoResult.checks.images.issues}
                />
                <CheckCategory
                  icon={FileText}
                  title="Content"
                  score={task.seoResult.checks.content.score}
                  maxScore={20}
                  details={[
                    `${task.seoResult.checks.content.wordCount} từ`,
                    `KW xuất hiện: ${task.seoResult.checks.content.keywordCount} lần`,
                    `Mật độ: ${task.seoResult.checks.content.keywordDensity}%`,
                    `KW phụ: ${task.seoResult.checks.content.subKeywordCount} lần`,
                  ]}
                  issues={task.seoResult.checks.content.issues}
                />
                <CheckCategory
                  icon={Link2}
                  title="Links"
                  score={task.seoResult.checks.links.score}
                  maxScore={10}
                  details={[
                    `Internal: ${task.seoResult.checks.links.internal}`,
                    `External: ${task.seoResult.checks.links.external}`,
                  ]}
                  issues={task.seoResult.checks.links.issues}
                />
                <CheckCategory
                  icon={Code}
                  title="Technical"
                  score={task.seoResult.checks.technical.score}
                  maxScore={15}
                  details={[
                    task.seoResult.checks.technical.hasCanonical ? '✓ Canonical' : '✗ Canonical',
                    task.seoResult.checks.technical.hasViewport ? '✓ Viewport' : '✗ Viewport',
                    task.seoResult.checks.technical.hasCharset ? '✓ Charset' : '✗ Charset',
                  ]}
                  issues={task.seoResult.checks.technical.issues}
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

// Check Category Component
function CheckCategory({
  icon: Icon,
  title,
  score,
  maxScore,
  details,
  issues,
}: {
  icon: React.ElementType;
  title: string;
  score: number;
  maxScore: number;
  details: string[];
  issues: string[];
}) {
  const percentage = Math.round((score / maxScore) * 100);
  const color = percentage >= 70 ? 'text-success' : percentage >= 50 ? 'text-warning' : 'text-danger';

  return (
    <div className="bg-card rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent" />
          <span className="text-white font-medium text-sm">{title}</span>
        </div>
        <span className={cn("font-bold text-sm", color)}>
          {score}/{maxScore}
        </span>
      </div>

      <div className="space-y-1 text-xs">
        {details.map((detail, idx) => (
          <p key={idx} className="text-[#8888a0]">{detail}</p>
        ))}
      </div>

      {issues.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border space-y-1">
          {issues.map((issue, idx) => (
            <div key={idx} className="flex items-start gap-1 text-xs">
              <AlertTriangle className="w-3 h-3 text-warning flex-shrink-0 mt-0.5" />
              <span className="text-warning">{issue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
