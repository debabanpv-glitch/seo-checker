'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Loader2,
  Check,
  Clock,
  Calendar,
  Filter,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { cn, formatDate } from '@/lib/utils';
import { Project } from '@/types';

interface TaskWithSEO {
  id: string;
  title: string;
  keyword_sub: string;
  keywords_list: string[];  // Parsed array of keywords (each line = 1 keyword)
  parent_keyword: string;
  link_publish: string;
  pic: string;
  publish_date: string | null;
  project: { id: string; name: string } | null;
  // SEO result from database
  seoResult?: SEOResultDB | null;
  // Local state for checking
  seoLoading?: boolean;
}

interface SEOResultDB {
  id: string;
  task_id: string;
  url: string;
  score: number;
  max_score: number;
  content_score: number;
  content_max: number;
  images_score: number;
  images_max: number;
  technical_score: number;
  technical_max: number;
  details: CheckDetail[];
  checked_at: string;
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

type FilterStatus = 'all' | 'unchecked' | 'passed' | 'failed';

export default function SEOAuditPage() {
  const [tasks, setTasks] = useState<TaskWithSEO[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedTask, setSelectedTask] = useState<TaskWithSEO | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [checkAllProgress, setCheckAllProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    fetchTasks();
  }, [selectedProject]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      // Fetch all published tasks (không giới hạn tháng)
      const projectParam = selectedProject ? `&project=${selectedProject}` : '';
      const res = await fetch(`/api/tasks?published=true${projectParam}`);
      const data = await res.json();

      const publishedTasks: TaskWithSEO[] = (data.tasks || []).filter(
        (t: TaskWithSEO) => t.link_publish && (t.title || t.keyword_sub)
      );

      // Fetch SEO results for these tasks
      const seoRes = await fetch('/api/seo-results');
      const seoData = await seoRes.json();
      const seoResults: SEOResultDB[] = seoData.results || [];

      // Map SEO results to tasks by URL (not task_id, because task_id changes on sync)
      const tasksWithSEO = publishedTasks.map((task) => {
        const seoResult = seoResults.find((r) => r.url === task.link_publish);
        return { ...task, seoResult };
      });

      setTasks(tasksWithSEO);

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
    // Mark as loading
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, seoLoading: true } : t))
    );

    try {
      // Use keywords_list (parsed array) instead of raw keyword_sub string
      // Also handle merged keywords (no delimiters)
      let subKeywords = task.keywords_list?.length > 0
        ? task.keywords_list
        : (task.keyword_sub || '').split(/[\r\n]+|\\n|,|;/).map(k => k.trim()).filter(k => k);

      // If only 1 long keyword, try splitting on case boundaries
      if (subKeywords.length === 1 && subKeywords[0].length > 50) {
        const merged = subKeywords[0];
        const split = merged.split(/(?<=[a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ])(?=[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐM])/);
        if (split.length > 1) {
          subKeywords = split.map(k => k.trim()).filter(k => k);
        }
      }

      // Call SEO check API
      const res = await fetch('/api/seo-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: task.link_publish,
          keyword: task.parent_keyword || subKeywords[0] || '',
          subKeywords: subKeywords,  // Send as array
        }),
      });

      const result = await res.json();

      // Save to database (by URL, not task_id - so results persist across syncs)
      await fetch('/api/seo-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: task.link_publish,
          result,
        }),
      });

      // Update local state
      const seoResult: SEOResultDB = {
        id: '',
        task_id: task.id,
        url: task.link_publish,
        score: result.score || 0,
        max_score: result.maxScore || 100,
        content_score: result.categories?.content?.score || 0,
        content_max: result.categories?.content?.maxScore || 0,
        images_score: result.categories?.images?.score || 0,
        images_max: result.categories?.images?.maxScore || 0,
        technical_score: result.categories?.technical?.score || 0,
        technical_max: result.categories?.technical?.maxScore || 0,
        details: result.details || [],
        checked_at: new Date().toISOString(),
      };

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, seoLoading: false, seoResult }
            : t
        )
      );

      // Update selected task if it's the one being checked
      if (selectedTask?.id === task.id) {
        setSelectedTask({ ...task, seoLoading: false, seoResult });
      }

      return true; // Success
    } catch (error) {
      console.error('SEO check failed:', error);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, seoLoading: false } : t
        )
      );
      return false; // Failed
    }
  };

  // Check all unchecked tasks (filtered by current view)
  const checkAllTasks = async () => {
    // Get unchecked tasks from current filtered view
    const uncheckedTasks = filteredTasks.filter((t) => !t.seoResult && !t.seoLoading);

    if (uncheckedTasks.length === 0) return;

    setIsCheckingAll(true);
    setCheckAllProgress({ current: 0, total: uncheckedTasks.length });

    // Process tasks sequentially to avoid overwhelming the server
    for (let i = 0; i < uncheckedTasks.length; i++) {
      const task = uncheckedTasks[i];
      setCheckAllProgress({ current: i + 1, total: uncheckedTasks.length });

      await checkSEO(task);

      // Small delay between requests
      if (i < uncheckedTasks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsCheckingAll(false);
    setCheckAllProgress({ current: 0, total: 0 });
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Filter by status
    if (filterStatus === 'unchecked' && task.seoResult) return false;
    if (filterStatus === 'passed' && (!task.seoResult || task.seoResult.score < 70)) return false;
    if (filterStatus === 'failed' && (!task.seoResult || task.seoResult.score >= 70)) return false;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const title = (task.title || task.keyword_sub || '').toLowerCase();
      const pic = (task.pic || '').toLowerCase();
      const url = (task.link_publish || '').toLowerCase();
      if (!title.includes(query) && !pic.includes(query) && !url.includes(query)) {
        return false;
      }
    }

    return true;
  });

  // Stats
  const totalTasks = tasks.length;
  const checkedTasks = tasks.filter((t) => t.seoResult).length;
  const passedTasks = tasks.filter((t) => t.seoResult && t.seoResult.score >= 70).length;
  const failedTasks = tasks.filter((t) => t.seoResult && t.seoResult.score < 70).length;
  const uncheckedTasks = totalTasks - checkedTasks;

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-500/20';
    if (score >= 50) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">SEO Audit</h1>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888a0]" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề, PIC, URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm placeholder:text-[#8888a0]"
            />
          </div>
        </div>

        {/* Check All Button */}
        <button
          onClick={checkAllTasks}
          disabled={isCheckingAll || filteredTasks.filter((t) => !t.seoResult).length === 0}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors",
            isCheckingAll
              ? "bg-accent/50 text-white cursor-wait"
              : filteredTasks.filter((t) => !t.seoResult).length === 0
              ? "bg-secondary text-[#8888a0] cursor-not-allowed"
              : "bg-accent text-white hover:bg-accent/90"
          )}
        >
          {isCheckingAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang check {checkAllProgress.current}/{checkAllProgress.total}</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>
                Check All {selectedProject ? `(${projects.find((p) => p.id === selectedProject)?.name})` : ''}
                {filteredTasks.filter((t) => !t.seoResult).length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                    {filteredTasks.filter((t) => !t.seoResult).length}
                  </span>
                )}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Project Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedProject('')}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
            selectedProject === ''
              ? "bg-accent text-white"
              : "bg-card border border-border text-[#8888a0] hover:text-[var(--text-primary)]"
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
                : "bg-card border border-border text-[#8888a0] hover:text-[var(--text-primary)]"
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <button
          onClick={() => setFilterStatus('all')}
          className={cn(
            "bg-card border rounded-lg p-3 text-left transition-colors",
            filterStatus === 'all' ? "border-accent" : "border-border hover:border-accent/50"
          )}
        >
          <div className="text-2xl font-bold text-[var(--text-primary)]">{totalTasks}</div>
          <div className="text-xs text-[#8888a0]">Tổng link</div>
        </button>
        <button
          onClick={() => setFilterStatus('unchecked')}
          className={cn(
            "bg-card border rounded-lg p-3 text-left transition-colors",
            filterStatus === 'unchecked' ? "border-accent" : "border-border hover:border-accent/50"
          )}
        >
          <div className="text-2xl font-bold text-[#8888a0]">{uncheckedTasks}</div>
          <div className="text-xs text-[#8888a0]">Chưa check</div>
        </button>
        <button
          onClick={() => setFilterStatus('all')}
          className={cn(
            "bg-card border rounded-lg p-3 text-left transition-colors",
            filterStatus === 'all' && checkedTasks > 0 ? "border-accent" : "border-border"
          )}
        >
          <div className="text-2xl font-bold text-accent">{checkedTasks}</div>
          <div className="text-xs text-[#8888a0]">Đã check</div>
        </button>
        <button
          onClick={() => setFilterStatus('passed')}
          className={cn(
            "bg-card border rounded-lg p-3 text-left transition-colors",
            filterStatus === 'passed' ? "border-green-500" : "border-border hover:border-green-500/50"
          )}
        >
          <div className="text-2xl font-bold text-green-400">{passedTasks}</div>
          <div className="text-xs text-[#8888a0]">Đạt (≥70)</div>
        </button>
        <button
          onClick={() => setFilterStatus('failed')}
          className={cn(
            "bg-card border rounded-lg p-3 text-left transition-colors",
            filterStatus === 'failed' ? "border-red-500" : "border-border hover:border-red-500/50"
          )}
        >
          <div className="text-2xl font-bold text-red-400">{failedTasks}</div>
          <div className="text-xs text-[#8888a0]">Chưa đạt</div>
        </button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Không có bài viết"
          description="Không tìm thấy bài viết đã publish"
        />
      ) : (
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left: Task List */}
          <div className="w-1/2 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Danh sách bài viết ({filteredTasks.length})
              </span>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#8888a0]" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                  className="px-2 py-1 bg-card border border-border rounded text-xs text-[var(--text-primary)]"
                >
                  <option value="all">Tất cả</option>
                  <option value="unchecked">Chưa check</option>
                  <option value="passed">Đạt</option>
                  <option value="failed">Chưa đạt</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredTasks.map((task) => {
                const hasResult = !!task.seoResult;
                const score = task.seoResult?.score || 0;
                const isSelected = selectedTask?.id === task.id;

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 border-b border-border cursor-pointer transition-colors",
                      isSelected ? "bg-accent/10" : "hover:bg-white/5"
                    )}
                    onClick={() => setSelectedTask(task)}
                  >
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {task.seoLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                      ) : hasResult ? (
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                          getScoreBg(score),
                          getScoreColor(score)
                        )}>
                          {score}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#8888a0]/20 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-[#8888a0]" />
                        </div>
                      )}
                    </div>

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[var(--text-primary)] truncate">
                        {task.title || task.keyword_sub || 'Không có tiêu đề'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#8888a0] mt-0.5">
                        <span className="text-accent">{task.pic}</span>
                        <span>•</span>
                        <span>{task.project?.name}</span>
                        {task.seoResult && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(task.seoResult.checked_at)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Check Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        checkSEO(task);
                      }}
                      disabled={task.seoLoading}
                      className={cn(
                        "px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5",
                        hasResult
                          ? "bg-secondary text-[#8888a0] hover:text-[var(--text-primary)]"
                          : "bg-accent text-white hover:bg-accent/90"
                      )}
                    >
                      <RefreshCw className={cn("w-3 h-3", task.seoLoading && "animate-spin")} />
                      {hasResult ? 'Check lại' : 'Check'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Task Detail */}
          <div className="w-1/2 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
            {selectedTask ? (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-border bg-secondary/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[var(--text-primary)] font-medium truncate">
                        {selectedTask.title || selectedTask.keyword_sub}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-[#8888a0] mt-1">
                        <span>{selectedTask.pic}</span>
                        <span>•</span>
                        <span>{selectedTask.project?.name}</span>
                      </div>
                    </div>
                    <a
                      href={selectedTask.link_publish}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-[#8888a0] hover:text-accent"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  {/* URL */}
                  <div className="mt-2 px-2 py-1.5 bg-black/30 rounded text-xs text-[#8888a0] truncate">
                    {selectedTask.link_publish}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {selectedTask.seoLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
                        <p className="text-sm text-[#8888a0]">Đang kiểm tra SEO...</p>
                      </div>
                    </div>
                  ) : selectedTask.seoResult ? (
                    <div className="space-y-4">
                      {/* Overall Score */}
                      <div className="text-center py-4">
                        <div className={cn(
                          "text-5xl font-bold",
                          getScoreColor(selectedTask.seoResult.score)
                        )}>
                          {selectedTask.seoResult.score}
                        </div>
                        <div className="text-sm text-[#8888a0] mt-1">
                          / {selectedTask.seoResult.max_score} điểm
                        </div>
                        <div className="text-xs text-[#8888a0] mt-2 flex items-center justify-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Kiểm tra lúc {formatDate(selectedTask.seoResult.checked_at)}
                        </div>
                      </div>

                      {/* Category Scores */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-secondary rounded-lg p-3 text-center">
                          <div className="text-xs text-[#8888a0] mb-1">Nội dung (C)</div>
                          <div className={cn(
                            "text-lg font-bold",
                            getScoreColor(Math.round((selectedTask.seoResult.content_score / selectedTask.seoResult.content_max) * 100))
                          )}>
                            {selectedTask.seoResult.content_score}/{selectedTask.seoResult.content_max}
                          </div>
                        </div>
                        <div className="bg-secondary rounded-lg p-3 text-center">
                          <div className="text-xs text-[#8888a0] mb-1">Hình ảnh (I)</div>
                          <div className={cn(
                            "text-lg font-bold",
                            getScoreColor(Math.round((selectedTask.seoResult.images_score / selectedTask.seoResult.images_max) * 100))
                          )}>
                            {selectedTask.seoResult.images_score}/{selectedTask.seoResult.images_max}
                          </div>
                        </div>
                        <div className="bg-secondary rounded-lg p-3 text-center">
                          <div className="text-xs text-[#8888a0] mb-1">Kỹ thuật (T)</div>
                          <div className={cn(
                            "text-lg font-bold",
                            getScoreColor(Math.round((selectedTask.seoResult.technical_score / selectedTask.seoResult.technical_max) * 100))
                          )}>
                            {selectedTask.seoResult.technical_score}/{selectedTask.seoResult.technical_max}
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      {selectedTask.seoResult.details && selectedTask.seoResult.details.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-[var(--text-primary)]">Chi tiết kiểm tra</h4>
                          {selectedTask.seoResult.details.map((detail, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "p-3 rounded-lg border",
                                detail.status === 'pass'
                                  ? "bg-green-500/10 border-green-500/30"
                                  : detail.status === 'warning'
                                  ? "bg-yellow-500/10 border-yellow-500/30"
                                  : "bg-red-500/10 border-red-500/30"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                {detail.status === 'pass' ? (
                                  <Check className="w-4 h-4 text-green-400 mt-0.5" />
                                ) : detail.status === 'warning' ? (
                                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-[var(--text-primary)]">{detail.name}</div>
                                  {detail.value && (
                                    <div className="text-xs text-[#8888a0] mt-1 truncate">
                                      Giá trị: {detail.value}
                                    </div>
                                  )}
                                  {detail.suggestion && (
                                    <div className="text-xs text-yellow-400 mt-1">
                                      💡 {detail.suggestion}
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-[#8888a0]">
                                  {detail.score}/{detail.maxScore}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Clock className="w-12 h-12 text-[#8888a0] mx-auto mb-3 opacity-50" />
                        <p className="text-[var(--text-primary)] font-medium mb-2">Chưa kiểm tra SEO</p>
                        <p className="text-sm text-[#8888a0] mb-4">
                          Nhấn nút &quot;Check&quot; để kiểm tra SEO cho bài viết này
                        </p>
                        <button
                          onClick={() => checkSEO(selectedTask)}
                          className="px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium"
                        >
                          <RefreshCw className="w-4 h-4 inline mr-2" />
                          Check SEO
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#8888a0]">
                <div className="text-center">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Chọn một bài viết từ danh sách bên trái</p>
                  <p className="text-xs mt-1">để xem chi tiết kết quả SEO</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
