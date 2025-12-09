'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Loader2,
  ChevronRight,
  FileText,
  Image,
  Settings2,
  AlertOctagon,
  Check,
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

// Issue type for grouping
interface SEOIssue {
  checkId: string;
  checkName: string;
  category: 'content' | 'images' | 'technical';
  status: 'fail' | 'warning';
  tasks: {
    task: TaskWithSEO;
    value?: string | number;
    suggestion?: string;
  }[];
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
  const [checkingAll, setCheckingAll] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

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
      label: `T${date.getMonth() + 1}/${date.getFullYear()}`,
    });
  }

  // Calculate stats
  const checkedTasks = tasks.filter((t) => t.seoChecked && t.seoResult?.success);
  const passedTasks = checkedTasks.filter((t) => (t.seoScore || 0) >= 70);
  const failedTasks = checkedTasks.filter((t) => (t.seoScore || 0) < 70);

  // Group issues by check type
  const issuesByCheck: SEOIssue[] = [];
  checkedTasks.forEach((task) => {
    if (!task.seoResult?.details) return;
    task.seoResult.details.forEach((detail) => {
      if (detail.status === 'pass') return;

      let issue = issuesByCheck.find((i) => i.checkId === detail.id);
      if (!issue) {
        issue = {
          checkId: detail.id,
          checkName: detail.name,
          category: detail.category,
          status: detail.status,
          tasks: [],
        };
        issuesByCheck.push(issue);
      }
      issue.tasks.push({
        task,
        value: detail.value,
        suggestion: detail.suggestion,
      });
    });
  });

  // Sort by number of affected tasks
  issuesByCheck.sort((a, b) => b.tasks.length - a.tasks.length);

  // Categories for sidebar
  const categories = [
    { id: 'content', name: 'Nội dung', icon: FileText },
    { id: 'images', name: 'Hình ảnh', icon: Image },
    { id: 'technical', name: 'Kỹ thuật', icon: Settings2 },
  ];

  // Filter issues by category
  const filteredIssues = selectedCategory
    ? issuesByCheck.filter((i) => i.category === selectedCategory)
    : issuesByCheck;

  // Get selected issue details
  const currentIssue = selectedIssue
    ? issuesByCheck.find((i) => i.checkId === selectedIssue)
    : null;

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h1 className="text-xl font-bold text-white">SEO Audit</h1>

        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2 py-1.5 bg-card border border-border rounded-lg text-white text-sm"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            onClick={checkAllSEO}
            disabled={checkingAll || tasks.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 disabled:bg-accent/50 rounded-lg text-white text-sm font-medium"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", checkingAll && "animate-spin")} />
            {checkingAll ? 'Đang check...' : `Check tất cả (${tasks.length})`}
          </button>
        </div>
      </div>

      {/* Project Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedProject('')}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
            selectedProject === ''
              ? "bg-accent text-white"
              : "bg-card border border-border text-[#8888a0] hover:text-white"
          )}
        >
          Tất cả
        </button>
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProject(p.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              selectedProject === p.id
                ? "bg-accent text-white"
                : "bg-card border border-border text-[#8888a0] hover:text-white"
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-2xl font-bold text-white">{tasks.length}</div>
          <div className="text-xs text-[#8888a0]">Tổng bài viết</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-2xl font-bold text-accent">{checkedTasks.length}</div>
          <div className="text-xs text-[#8888a0]">Đã kiểm tra</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-2xl font-bold text-green-400">{passedTasks.length}</div>
          <div className="text-xs text-[#8888a0]">Đạt (&ge;70)</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-2xl font-bold text-red-400">{failedTasks.length}</div>
          <div className="text-xs text-[#8888a0]">Chưa đạt (&lt;70)</div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Không có bài viết"
          description="Không tìm thấy bài viết đã publish trong tháng này"
        />
      ) : checkedTasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertOctagon className="w-12 h-12 text-[#8888a0] mx-auto mb-3" />
            <p className="text-white font-medium mb-2">Chưa có dữ liệu SEO</p>
            <p className="text-[#8888a0] text-sm mb-4">Nhấn &quot;Check tất cả&quot; để kiểm tra SEO cho {tasks.length} bài viết</p>
            <button
              onClick={checkAllSEO}
              disabled={checkingAll}
              className="px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white font-medium"
            >
              <RefreshCw className={cn("w-4 h-4 inline mr-2", checkingAll && "animate-spin")} />
              {checkingAll ? 'Đang check...' : 'Bắt đầu check'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left Sidebar - Categories & Issues */}
          <div className="w-72 flex-shrink-0 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
            {/* Category Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => { setSelectedCategory(null); setSelectedIssue(null); }}
                className={cn(
                  "flex-1 px-3 py-2 text-xs font-medium",
                  !selectedCategory ? "bg-accent text-white" : "text-[#8888a0] hover:text-white"
                )}
              >
                Tất cả
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setSelectedIssue(null); }}
                  className={cn(
                    "flex-1 px-3 py-2 text-xs font-medium",
                    selectedCategory === cat.id ? "bg-accent text-white" : "text-[#8888a0] hover:text-white"
                  )}
                >
                  <cat.icon className="w-3.5 h-3.5 mx-auto" />
                </button>
              ))}
            </div>

            {/* Issues List */}
            <div className="flex-1 overflow-y-auto">
              {filteredIssues.length === 0 ? (
                <div className="p-4 text-center text-[#8888a0] text-sm">
                  <Check className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  Không có lỗi nào!
                </div>
              ) : (
                filteredIssues.map((issue) => (
                  <button
                    key={issue.checkId}
                    onClick={() => setSelectedIssue(issue.checkId)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2.5 text-left border-b border-border hover:bg-white/5 transition-colors",
                      selectedIssue === issue.checkId && "bg-white/10"
                    )}
                  >
                    {issue.status === 'fail' ? (
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{issue.checkName}</div>
                      <div className="text-xs text-[#8888a0]">
                        {issue.tasks.length} bài viết
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8888a0]" />
                  </button>
                ))
              )}
            </div>

            {/* Issue Summary */}
            <div className="border-t border-border p-3 bg-secondary/30">
              <div className="flex justify-between text-xs">
                <span className="text-[#8888a0]">Tổng lỗi:</span>
                <span className="text-white font-medium">{issuesByCheck.length}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-red-400">Nghiêm trọng:</span>
                <span className="text-red-400">{issuesByCheck.filter(i => i.status === 'fail').length}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-yellow-400">Cảnh báo:</span>
                <span className="text-yellow-400">{issuesByCheck.filter(i => i.status === 'warning').length}</span>
              </div>
            </div>
          </div>

          {/* Right Panel - Issue Details */}
          <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
            {currentIssue ? (
              <>
                {/* Issue Header */}
                <div className="px-4 py-3 border-b border-border bg-secondary/30">
                  <div className="flex items-center gap-2">
                    {currentIssue.status === 'fail' ? (
                      <XCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    )}
                    <h2 className="text-white font-medium">{currentIssue.checkName}</h2>
                    <span className={cn(
                      "ml-auto px-2 py-0.5 rounded text-xs font-medium",
                      currentIssue.status === 'fail' ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                    )}>
                      {currentIssue.tasks.length} bài
                    </span>
                  </div>
                </div>

                {/* Affected Tasks List */}
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-secondary/50">
                      <tr className="text-xs text-[#8888a0]">
                        <th className="text-left px-4 py-2 font-medium">Bài viết</th>
                        <th className="text-left px-4 py-2 font-medium">Giá trị hiện tại</th>
                        <th className="text-left px-4 py-2 font-medium">Đề xuất</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentIssue.tasks.map(({ task, value, suggestion }) => (
                        <tr key={task.id} className="border-t border-border hover:bg-white/5">
                          <td className="px-4 py-3">
                            <div className="text-sm text-white truncate max-w-[250px]">
                              {task.title || task.keyword_sub}
                            </div>
                            <div className="text-xs text-[#8888a0]">{task.pic}</div>
                          </td>
                          <td className="px-4 py-3">
                            {value ? (
                              <code className="text-xs bg-black/30 px-2 py-1 rounded text-[#c0c0d0] block max-w-[200px] truncate">
                                {value}
                              </code>
                            ) : (
                              <span className="text-xs text-[#8888a0]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {suggestion ? (
                              <span className="text-xs text-yellow-400">{suggestion}</span>
                            ) : (
                              <span className="text-xs text-[#8888a0]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={task.link_publish}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-[#8888a0] hover:text-accent"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#8888a0]">
                <div className="text-center">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Chọn một lỗi từ danh sách bên trái</p>
                  <p className="text-xs mt-1">để xem chi tiết các bài viết cần sửa</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom: All tasks quick view */}
      {checkedTasks.length > 0 && (
        <div className="mt-4 bg-card border border-border rounded-lg">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-white">Tất cả bài viết đã check ({checkedTasks.length})</span>
            <div className="flex gap-2 text-xs">
              <span className="text-green-400">{passedTasks.length} đạt</span>
              <span className="text-[#8888a0]">•</span>
              <span className="text-red-400">{failedTasks.length} chưa đạt</span>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary/50 text-xs text-[#8888a0]">
                <tr>
                  <th className="text-left px-4 py-2">Điểm</th>
                  <th className="text-left px-4 py-2">Bài viết</th>
                  <th className="text-left px-4 py-2">Keyword</th>
                  <th className="text-left px-4 py-2">PIC</th>
                  <th className="text-center px-4 py-2">C</th>
                  <th className="text-center px-4 py-2">I</th>
                  <th className="text-center px-4 py-2">T</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {checkedTasks
                  .sort((a, b) => (a.seoScore || 0) - (b.seoScore || 0))
                  .map((task) => {
                    const score = task.seoScore || 0;
                    const scoreColor = score >= 70 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
                    const cats = task.seoResult?.categories;

                    return (
                      <tr key={task.id} className="border-t border-border hover:bg-white/5">
                        <td className="px-4 py-2">
                          <span className={cn("font-bold", scoreColor)}>{score}</span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-white truncate block max-w-[200px]">
                            {task.title || task.keyword_sub}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-[#8888a0] truncate block max-w-[150px]">
                            {task.parent_keyword}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-[#8888a0]">{task.pic}</td>
                        <td className="px-4 py-2 text-center">
                          {cats && (
                            <MiniCatScore score={cats.content.score} max={cats.content.maxScore} />
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {cats && (
                            <MiniCatScore score={cats.images.score} max={cats.images.maxScore} />
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {cats && (
                            <MiniCatScore score={cats.technical.score} max={cats.technical.maxScore} />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <a
                            href={task.link_publish}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#8888a0] hover:text-accent"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading overlay for individual checks */}
      {tasks.some((t) => t.seoLoading) && (
        <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          <span className="text-sm text-white">
            Đang check... ({tasks.filter((t) => t.seoChecked).length}/{tasks.length})
          </span>
        </div>
      )}
    </div>
  );
}

function MiniCatScore({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <span className={cn("text-xs font-mono", color)}>
      {score}/{max}
    </span>
  );
}
