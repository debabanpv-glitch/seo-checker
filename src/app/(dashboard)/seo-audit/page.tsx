'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle,
  TrendingUp,
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
  const [activeTab, setActiveTab] = useState<'all' | 'content' | 'images' | 'technical'>('all');

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

  const checkedTasks = tasks.filter((t) => t.seoChecked);
  const avgScore = checkedTasks.length > 0
    ? Math.round(checkedTasks.reduce((sum, t) => sum + (t.seoScore || 0), 0) / checkedTasks.length)
    : 0;

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-4">
      {/* Header Compact */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">SEO Audit</h1>
          {checkedTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <ScoreBadge score={avgScore} size="sm" />
              <span className="text-xs text-[#8888a0]">
                {checkedTasks.length}/{tasks.length} checked
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-2 py-1.5 bg-card border border-border rounded-lg text-white text-sm"
          >
            <option value="">Tất cả</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

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
            {checkingAll ? 'Checking...' : 'Check All'}
          </button>
        </div>
      </div>

      {/* Tasks List */}
      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isExpanded={expandedTask === task.id}
              onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
              onCheck={() => checkSEO(task)}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="Không có bài viết"
          description="Không tìm thấy bài viết đã publish"
        />
      )}
    </div>
  );
}

function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const getColor = (s: number) => {
    if (s >= 80) return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
    if (s >= 60) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
    if (s >= 40) return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
    return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
  };

  const colors = getColor(score);
  const sizeClasses = {
    sm: 'text-sm px-2 py-0.5',
    md: 'text-base px-3 py-1',
    lg: 'text-xl px-4 py-2',
  };

  return (
    <span className={cn(
      "font-bold rounded-md border",
      colors.bg, colors.text, colors.border,
      sizeClasses[size]
    )}>
      {score}
    </span>
  );
}

function TaskRow({
  task,
  isExpanded,
  onToggle,
  onCheck,
  activeTab,
  setActiveTab,
}: {
  task: TaskWithSEO;
  isExpanded: boolean;
  onToggle: () => void;
  onCheck: () => void;
  activeTab: string;
  setActiveTab: (tab: 'all' | 'content' | 'images' | 'technical') => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Main Row */}
      <div className="flex items-center gap-3 p-3">
        {/* Expand Toggle */}
        {task.seoChecked && (
          <button onClick={onToggle} className="text-[#8888a0] hover:text-white">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
        {!task.seoChecked && <div className="w-4" />}

        {/* Score */}
        <div className="w-12 flex-shrink-0">
          {task.seoChecked ? (
            <ScoreBadge score={task.seoScore || 0} size="sm" />
          ) : task.seoLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
          ) : (
            <span className="text-[#8888a0] text-sm">--</span>
          )}
        </div>

        {/* Title & Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {task.title || task.keyword_sub}
          </p>
          <div className="flex items-center gap-2 text-xs text-[#8888a0]">
            <span>{task.pic}</span>
            {task.parent_keyword && (
              <>
                <span>•</span>
                <span className="truncate max-w-[150px]">{task.parent_keyword}</span>
              </>
            )}
          </div>
        </div>

        {/* Category Scores - Only show when checked */}
        {task.seoChecked && task.seoResult?.success && (
          <div className="hidden md:flex items-center gap-2">
            <MiniScore label="C" score={task.seoResult.categories.content} />
            <MiniScore label="I" score={task.seoResult.categories.images} />
            <MiniScore label="T" score={task.seoResult.categories.technical} />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          {!task.seoChecked && !task.seoLoading && (
            <button
              onClick={onCheck}
              className="px-2.5 py-1 bg-accent hover:bg-accent/90 rounded text-white text-xs font-medium"
            >
              Check
            </button>
          )}
          <a
            href={task.link_publish}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-[#8888a0] hover:text-accent rounded"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && task.seoResult?.success && (
        <div className="border-t border-border">
          {/* Category Tabs */}
          <div className="flex border-b border-border bg-secondary/30">
            {['all', 'content', 'images', 'technical'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'all' | 'content' | 'images' | 'technical')}
                className={cn(
                  "px-4 py-2 text-xs font-medium transition-colors",
                  activeTab === tab
                    ? "text-accent border-b-2 border-accent"
                    : "text-[#8888a0] hover:text-white"
                )}
              >
                {tab === 'all' ? 'Tất cả' : tab === 'content' ? 'Nội dung' : tab === 'images' ? 'Hình ảnh' : 'Kỹ thuật'}
              </button>
            ))}
          </div>

          {/* Checklist Grid */}
          <div className="p-3">
            <div className="grid gap-1.5">
              {task.seoResult.details
                .filter(d => activeTab === 'all' || d.category === activeTab)
                .map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
            </div>
          </div>
        </div>
      )}

      {isExpanded && task.seoResult && !task.seoResult.success && (
        <div className="border-t border-border p-4 text-center">
          <XCircle className="w-6 h-6 text-red-400 mx-auto mb-1" />
          <p className="text-red-400 text-sm">{task.seoResult.error}</p>
        </div>
      )}
    </div>
  );
}

function MiniScore({ label, score }: { label: string; score: CategoryResult }) {
  const pct = Math.round((score.score / score.maxScore) * 100);
  const color = pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="text-center">
      <span className={cn("text-xs font-bold", color)}>{pct}%</span>
      <span className="text-[10px] text-[#8888a0] block">{label}</span>
    </div>
  );
}

function CheckRow({ check }: { check: CheckDetail }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    pass: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
    warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    fail: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  };

  const config = statusConfig[check.status];
  const Icon = config.icon;
  const hasDetails = check.value || check.suggestion;

  return (
    <div className={cn("rounded-lg", config.bg)}>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2",
          hasDetails ? "cursor-pointer hover:bg-white/5" : ""
        )}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <Icon className={cn("w-4 h-4 flex-shrink-0", config.color)} />
        <span className="flex-1 text-sm text-white">{check.name}</span>
        <span className={cn("text-xs font-mono", config.color)}>
          {check.score}/{check.maxScore}
        </span>
        {hasDetails && (
          <ChevronDown className={cn(
            "w-3.5 h-3.5 text-[#8888a0] transition-transform",
            expanded && "rotate-180"
          )} />
        )}
      </div>

      {expanded && hasDetails && (
        <div className="px-3 pb-2 pt-0 space-y-1">
          {check.value && (
            <div className="text-xs text-[#8888a0] bg-black/20 px-2 py-1 rounded font-mono">
              {check.value}
            </div>
          )}
          {check.suggestion && (
            <div className="flex items-start gap-1.5 text-xs text-yellow-400">
              <TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{check.suggestion}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
