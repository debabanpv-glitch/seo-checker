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
  Link2,
  Tag,
  ChevronDown,
  ChevronUp,
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

interface LinkInfo {
  url: string;
  text: string;
  isDoFollow: boolean;
  isDuplicate?: boolean;
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
  links?: {
    internal: LinkInfo[];
    external: LinkInfo[];
  };
  keywords?: {
    primary: string;
    sub: string[];
  };
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

// Score Bar Component
function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const percent = max > 0 ? (score / max) * 100 : 0;
  const color = percent >= 70 ? 'bg-green-400' : percent >= 50 ? 'bg-yellow-400' : 'bg-red-400';
  const textColor = percent >= 70 ? 'text-green-400' : percent >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 text-xs text-[#8888a0]">{label}</div>
      <div className="flex-1 h-2 bg-[#8888a0]/20 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className={cn("text-xs font-medium w-12 text-right", textColor)}>
        {score}/{max}
      </div>
    </div>
  );
}

// Group check details by logical categories
function SEODetailsGrouped({ details }: { details: CheckDetail[] }) {
  // Group details by semantic categories (not just API category)
  const groups: Record<string, { title: string; icon: React.ReactNode; items: CheckDetail[] }> = {
    title: { title: 'Title', icon: <Tag className="w-4 h-4" />, items: [] },
    meta: { title: 'Meta Description', icon: <Search className="w-4 h-4" />, items: [] },
    headings: { title: 'Headings (H1-H6)', icon: <ChevronUp className="w-4 h-4" />, items: [] },
    content: { title: 'Nội dung', icon: <Check className="w-4 h-4" />, items: [] },
    images: { title: 'Hình ảnh', icon: <ExternalLink className="w-4 h-4" />, items: [] },
    technical: { title: 'Kỹ thuật', icon: <Link2 className="w-4 h-4" />, items: [] },
  };

  // Categorize each detail by name/id
  details.forEach((detail) => {
    const name = detail.name.toLowerCase();
    const id = detail.id.toLowerCase();

    if (name.includes('title') || id.includes('title')) {
      groups.title.items.push(detail);
    } else if (name.includes('meta') || id.includes('meta')) {
      groups.meta.items.push(detail);
    } else if (name.includes('heading') || name.includes('h1') || name.includes('h2') || id.includes('heading')) {
      groups.headings.items.push(detail);
    } else if (detail.category === 'images' || name.includes('image') || name.includes('alt')) {
      groups.images.items.push(detail);
    } else if (detail.category === 'technical' || name.includes('url') || name.includes('schema') || name.includes('canonical') || name.includes('open graph')) {
      groups.technical.items.push(detail);
    } else {
      groups.content.items.push(detail);
    }
  });

  // Calculate score for each group
  const getGroupScore = (items: CheckDetail[]) => {
    const total = items.reduce((sum, d) => sum + d.score, 0);
    const max = items.reduce((sum, d) => sum + d.maxScore, 0);
    return { total, max, percent: max > 0 ? Math.round((total / max) * 100) : 0 };
  };

  // Get color based on pass/fail ratio
  const getGroupStatus = (items: CheckDetail[]) => {
    const passed = items.filter((d) => d.status === 'pass').length;
    const total = items.length;
    if (passed === total) return 'pass';
    if (passed === 0) return 'fail';
    return 'warning';
  };

  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([key, group]) => {
        if (group.items.length === 0) return null;

        const score = getGroupScore(group.items);
        const status = getGroupStatus(group.items);
        const passCount = group.items.filter((d) => d.status === 'pass').length;
        const failCount = group.items.filter((d) => d.status === 'fail').length;
        const warnCount = group.items.filter((d) => d.status === 'warning').length;

        return (
          <SEOGroupCard
            key={key}
            title={group.title}
            icon={group.icon}
            items={group.items}
            score={score}
            status={status}
            passCount={passCount}
            failCount={failCount}
            warnCount={warnCount}
          />
        );
      })}
    </div>
  );
}

// Individual Group Card with expand/collapse
function SEOGroupCard({
  title,
  icon,
  items,
  score,
  status,
  passCount,
  failCount,
  warnCount,
}: {
  title: string;
  icon: React.ReactNode;
  items: CheckDetail[];
  score: { total: number; max: number; percent: number };
  status: 'pass' | 'fail' | 'warning';
  passCount: number;
  failCount: number;
  warnCount: number;
}) {
  const [isExpanded, setIsExpanded] = useState(status !== 'pass'); // Auto expand if not all passed

  const statusColors = {
    pass: 'border-green-500/50 bg-green-500/5',
    warning: 'border-yellow-500/50 bg-yellow-500/5',
    fail: 'border-red-500/50 bg-red-500/5',
  };

  const headerColors = {
    pass: 'text-green-400',
    warning: 'text-yellow-400',
    fail: 'text-red-400',
  };

  return (
    <div className={cn("rounded-xl border overflow-hidden", statusColors[status])}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
      >
        <div className={cn("p-1.5 rounded-lg", status === 'pass' ? 'bg-green-500/20 text-green-400' : status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400')}>
          {icon}
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
            <div className="flex items-center gap-1">
              {passCount > 0 && (
                <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px] font-medium">
                  {passCount} pass
                </span>
              )}
              {warnCount > 0 && (
                <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[10px] font-medium">
                  {warnCount} warn
                </span>
              )}
              {failCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px] font-medium">
                  {failCount} fail
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("text-lg font-bold", headerColors[status])}>
            {score.total}/{score.max}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#8888a0]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8888a0]" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {items.map((detail, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-start gap-3 p-2.5 rounded-lg",
                detail.status === 'pass'
                  ? "bg-green-500/10"
                  : detail.status === 'warning'
                  ? "bg-yellow-500/10"
                  : "bg-red-500/10"
              )}
            >
              <div className="mt-0.5">
                {detail.status === 'pass' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : detail.status === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[var(--text-primary)] font-medium">{detail.name}</div>
                {detail.value && (
                  <div className="text-xs text-[#8888a0] mt-1 break-words line-clamp-2">
                    {detail.value}
                  </div>
                )}
                {detail.suggestion && detail.status !== 'pass' && (
                  <div className="text-xs text-yellow-400 mt-1.5 flex items-start gap-1">
                    <span>💡</span>
                    <span>{detail.suggestion}</span>
                  </div>
                )}
              </div>
              <div className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded",
                detail.status === 'pass'
                  ? "bg-green-500/20 text-green-400"
                  : detail.status === 'warning'
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-red-500/20 text-red-400"
              )}>
                {detail.score}/{detail.maxScore}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Links Section Component
function LinksSection({ links }: { links: { internal: LinkInfo[]; external: LinkInfo[] } }) {
  const [showInternal, setShowInternal] = useState(false);
  const [showExternal, setShowExternal] = useState(false);

  const internalDoFollow = links.internal.filter(l => l.isDoFollow).length;
  const internalNoFollow = links.internal.filter(l => !l.isDoFollow).length;
  const internalDupes = links.internal.filter(l => l.isDuplicate).length;

  const externalDoFollow = links.external.filter(l => l.isDoFollow).length;
  const externalNoFollow = links.external.filter(l => !l.isDoFollow).length;
  const externalDupes = links.external.filter(l => l.isDuplicate).length;

  return (
    <div className="space-y-3">
      {/* Internal Links */}
      <div className="bg-secondary/50 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowInternal(!showInternal)}
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-secondary/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Internal Links ({links.internal.length})
            </span>
            <div className="flex gap-1">
              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                {internalDoFollow} do
              </span>
              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                {internalNoFollow} no
              </span>
              {internalDupes > 0 && (
                <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                  {internalDupes} trùng
                </span>
              )}
            </div>
          </div>
          {showInternal ? (
            <ChevronUp className="w-4 h-4 text-[#8888a0]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8888a0]" />
          )}
        </button>
        {showInternal && links.internal.length > 0 && (
          <div className="px-3 pb-3 space-y-1 max-h-48 overflow-y-auto">
            {links.internal.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-black/20 transition-colors group",
                  link.isDuplicate && "bg-yellow-500/10"
                )}
              >
                <span className={cn(
                  "px-1 rounded text-[10px] font-medium",
                  link.isDoFollow ? "bg-green-500/30 text-green-400" : "bg-red-500/30 text-red-400"
                )}>
                  {link.isDoFollow ? 'DO' : 'NO'}
                </span>
                <span className="flex-1 truncate text-[#8888a0] group-hover:text-[var(--text-primary)]">
                  {link.text || link.url}
                </span>
                {link.isDuplicate && (
                  <span className="text-yellow-400 text-[10px]">trùng</span>
                )}
                <ExternalLink className="w-3 h-3 text-[#8888a0] opacity-0 group-hover:opacity-100" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* External Links */}
      <div className="bg-secondary/50 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowExternal(!showExternal)}
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-secondary/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              External Links ({links.external.length})
            </span>
            <div className="flex gap-1">
              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                {externalDoFollow} do
              </span>
              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                {externalNoFollow} no
              </span>
              {externalDupes > 0 && (
                <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                  {externalDupes} trùng
                </span>
              )}
            </div>
          </div>
          {showExternal ? (
            <ChevronUp className="w-4 h-4 text-[#8888a0]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8888a0]" />
          )}
        </button>
        {showExternal && links.external.length > 0 && (
          <div className="px-3 pb-3 space-y-1 max-h-48 overflow-y-auto">
            {links.external.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-black/20 transition-colors group",
                  link.isDuplicate && "bg-yellow-500/10"
                )}
              >
                <span className={cn(
                  "px-1 rounded text-[10px] font-medium",
                  link.isDoFollow ? "bg-green-500/30 text-green-400" : "bg-red-500/30 text-red-400"
                )}>
                  {link.isDoFollow ? 'DO' : 'NO'}
                </span>
                <span className="flex-1 truncate text-[#8888a0] group-hover:text-[var(--text-primary)]">
                  {link.text || link.url}
                </span>
                {link.isDuplicate && (
                  <span className="text-yellow-400 text-[10px]">trùng</span>
                )}
                <ExternalLink className="w-3 h-3 text-[#8888a0] opacity-0 group-hover:opacity-100" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SEOAuditPage() {
  const [tasks, setTasks] = useState<TaskWithSEO[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedTask, setSelectedTask] = useState<TaskWithSEO | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [checkAllProgress, setCheckAllProgress] = useState({ current: 0, total: 0 });
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Generate month options (last 12 months)
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
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, selectedMonth]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      // Fetch published tasks filtered by month
      const [month, year] = selectedMonth.split('-');
      const projectParam = selectedProject ? `&project=${selectedProject}` : '';
      const res = await fetch(`/api/tasks?published=true&month=${month}&year=${year}${projectParam}`);
      const data = await res.json();

      const publishedTasks: TaskWithSEO[] = (data.tasks || []).filter(
        (t: TaskWithSEO) => t.link_publish && (t.title || t.keyword_sub)
      );

      // Fetch SEO results only for URLs of current tasks (optimized - minimal fields for listing)
      const urls = publishedTasks.map((t) => t.link_publish).filter(Boolean);
      // Use POST to avoid URL length limits
      const seoRes = await fetch('/api/seo-results/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, minimal: true }),
      });
      const seoData = await seoRes.json();
      const seoResults: SEOResultDB[] = seoData.results || [];

      // Map SEO results to tasks by URL (not task_id, because task_id changes on sync)
      const tasksWithSEO = publishedTasks.map((task) => {
        const seoResult = seoResults.find((r) => r.url === task.link_publish);
        return { ...task, seoResult };
      });

      // Sort by publish_date descending (newest first)
      tasksWithSEO.sort((a, b) => {
        if (!a.publish_date) return 1;
        if (!b.publish_date) return -1;
        return new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime();
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

  // Fetch full SEO details for a specific task (lazy loading)
  const fetchFullSEODetails = async (task: TaskWithSEO) => {
    if (!task.seoResult || task.seoResult.details) {
      // Already have full details or no SEO result
      setSelectedTask(task);
      return;
    }

    setIsLoadingDetails(true);
    setSelectedTask(task);

    try {
      const res = await fetch(`/api/seo-results?url=${encodeURIComponent(task.link_publish)}`);
      const data = await res.json();
      const fullResult = data.results?.[0];

      if (fullResult) {
        const updatedTask = { ...task, seoResult: fullResult };
        setSelectedTask(updatedTask);
        // Also update in tasks list
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? updatedTask : t))
        );
      }
    } catch (error) {
      console.error('Failed to fetch SEO details:', error);
    } finally {
      setIsLoadingDetails(false);
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
        links: result.links || { internal: [], external: [] },
        keywords: result.keywords || { primary: '', sub: [] },
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

  // Check selected tasks or all unchecked tasks
  const checkSelectedTasks = async () => {
    // If tasks are selected, check those; otherwise check all unchecked
    const tasksToCheck = selectedTaskIds.size > 0
      ? filteredTasks.filter((t) => selectedTaskIds.has(t.id) && !t.seoLoading)
      : filteredTasks.filter((t) => !t.seoResult && !t.seoLoading);

    if (tasksToCheck.length === 0) return;

    setIsCheckingAll(true);
    setCheckAllProgress({ current: 0, total: tasksToCheck.length });

    // Process tasks sequentially to avoid overwhelming the server
    for (let i = 0; i < tasksToCheck.length; i++) {
      const task = tasksToCheck[i];
      setCheckAllProgress({ current: i + 1, total: tasksToCheck.length });

      await checkSEO(task);

      // Small delay between requests
      if (i < tasksToCheck.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsCheckingAll(false);
    setCheckAllProgress({ current: 0, total: 0 });
    setSelectedTaskIds(new Set()); // Clear selection after checking
  };

  // Toggle task selection
  const toggleTaskSelection = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTaskIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // Select/deselect all visible tasks
  const toggleSelectAll = () => {
    if (selectedTaskIds.size === filteredTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map((t) => t.id)));
    }
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

        {/* Month Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#8888a0]" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

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

        {/* Check Selected/All Button */}
        <button
          onClick={checkSelectedTasks}
          disabled={isCheckingAll || (selectedTaskIds.size === 0 && filteredTasks.filter((t) => !t.seoResult).length === 0)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors",
            isCheckingAll
              ? "bg-accent/50 text-white cursor-wait"
              : (selectedTaskIds.size === 0 && filteredTasks.filter((t) => !t.seoResult).length === 0)
              ? "bg-secondary text-[#8888a0] cursor-not-allowed"
              : "bg-accent text-white hover:bg-accent/90"
          )}
        >
          {isCheckingAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang check {checkAllProgress.current}/{checkAllProgress.total}</span>
            </>
          ) : selectedTaskIds.size > 0 ? (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>
                Check đã chọn
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                  {selectedTaskIds.size}
                </span>
              </span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>
                Check chưa có điểm
                {filteredTasks.filter((t) => !t.seoResult).length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                    {filteredTasks.filter((t) => !t.seoResult).length}
                  </span>
                )}
              </span>
            </>
          )}
        </button>

        {/* Clear selection */}
        {selectedTaskIds.size > 0 && !isCheckingAll && (
          <button
            onClick={() => setSelectedTaskIds(new Set())}
            className="px-3 py-2 text-sm text-[#8888a0] hover:text-[var(--text-primary)] transition-colors"
          >
            Bỏ chọn
          </button>
        )}
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
              <div className="flex items-center gap-3">
                {/* Select All Checkbox */}
                <button
                  onClick={toggleSelectAll}
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0
                      ? "bg-accent border-accent"
                      : selectedTaskIds.size > 0
                      ? "bg-accent/50 border-accent"
                      : "border-[#8888a0] hover:border-accent"
                  )}
                >
                  {selectedTaskIds.size > 0 && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </button>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Danh sách bài viết ({filteredTasks.length})
                  {selectedTaskIds.size > 0 && (
                    <span className="ml-2 text-accent">• {selectedTaskIds.size} đã chọn</span>
                  )}
                </span>
              </div>
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
                const isChecked = selectedTaskIds.has(task.id);

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 border-b border-border cursor-pointer transition-colors",
                      isSelected ? "bg-accent/10" : isChecked ? "bg-accent/5" : "hover:bg-white/5"
                    )}
                    onClick={() => fetchFullSEODetails(task)}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => toggleTaskSelection(task.id, e)}
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0",
                        isChecked
                          ? "bg-accent border-accent"
                          : "border-[#8888a0] hover:border-accent"
                      )}
                    >
                      {isChecked && <Check className="w-3 h-3 text-white" />}
                    </button>

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
                        {task.publish_date && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(task.publish_date)}
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
                        {selectedTask.publish_date && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(selectedTask.publish_date)}
                            </span>
                          </>
                        )}
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

                  {/* Keywords from Task */}
                  {(selectedTask.parent_keyword || selectedTask.keyword_sub) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {selectedTask.parent_keyword && (
                        <span className="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs font-medium">
                          KW: {selectedTask.parent_keyword}
                        </span>
                      )}
                      {selectedTask.keyword_sub && selectedTask.keyword_sub !== selectedTask.parent_keyword && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs truncate max-w-[200px]">
                          Sub: {selectedTask.keyword_sub.split(/[\r\n]+|\\n/)[0]}
                          {selectedTask.keyword_sub.split(/[\r\n]+|\\n/).length > 1 && '...'}
                        </span>
                      )}
                    </div>
                  )}
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
                  ) : isLoadingDetails ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
                        <p className="text-sm text-[#8888a0]">Đang tải chi tiết...</p>
                      </div>
                    </div>
                  ) : selectedTask.seoResult ? (
                    <div className="space-y-4">
                      {/* Score Overview - Redesigned */}
                      <div className="bg-gradient-to-br from-secondary to-secondary/50 rounded-2xl p-5">
                        <div className="flex items-center gap-6">
                          {/* Main Score Circle */}
                          <div className="relative">
                            <svg className="w-24 h-24 transform -rotate-90">
                              <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-[#8888a0]/20"
                              />
                              <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={`${(selectedTask.seoResult.score / selectedTask.seoResult.max_score) * 251.2} 251.2`}
                                strokeLinecap="round"
                                className={cn(
                                  selectedTask.seoResult.score >= 70 ? "text-green-400" :
                                  selectedTask.seoResult.score >= 50 ? "text-yellow-400" : "text-red-400"
                                )}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className={cn(
                                  "text-2xl font-bold",
                                  getScoreColor(selectedTask.seoResult.score)
                                )}>
                                  {selectedTask.seoResult.score}
                                </div>
                                <div className="text-[10px] text-[#8888a0]">/{selectedTask.seoResult.max_score}</div>
                              </div>
                            </div>
                          </div>

                          {/* Category Bars */}
                          <div className="flex-1 space-y-3">
                            <ScoreBar
                              label="Nội dung"
                              score={selectedTask.seoResult.content_score}
                              max={selectedTask.seoResult.content_max}
                            />
                            <ScoreBar
                              label="Hình ảnh"
                              score={selectedTask.seoResult.images_score}
                              max={selectedTask.seoResult.images_max}
                            />
                            <ScoreBar
                              label="Kỹ thuật"
                              score={selectedTask.seoResult.technical_score}
                              max={selectedTask.seoResult.technical_max}
                            />
                          </div>
                        </div>

                        {/* Check time */}
                        <div className="text-xs text-[#8888a0] mt-4 pt-3 border-t border-[#8888a0]/20 flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3" />
                          Kiểm tra lúc {formatDate(selectedTask.seoResult.checked_at)}
                        </div>
                      </div>

                      {/* Keywords Display */}
                      {(selectedTask.seoResult.keywords?.primary || (selectedTask.seoResult.keywords?.sub && selectedTask.seoResult.keywords.sub.length > 0)) && (
                        <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                            <Tag className="w-4 h-4 text-accent" />
                            Keywords
                          </div>
                          {selectedTask.seoResult.keywords?.primary && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#8888a0]">Chính:</span>
                              <span className="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs font-medium">
                                {selectedTask.seoResult.keywords.primary}
                              </span>
                            </div>
                          )}
                          {selectedTask.seoResult.keywords?.sub && selectedTask.seoResult.keywords.sub.length > 0 && (
                            <div className="flex flex-wrap items-start gap-2">
                              <span className="text-xs text-[#8888a0]">Phụ:</span>
                              <div className="flex flex-wrap gap-1">
                                {selectedTask.seoResult.keywords.sub.map((kw, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Links Summary */}
                      {selectedTask.seoResult.links && (
                        <LinksSection links={selectedTask.seoResult.links} />
                      )}

                      {/* Details - Grouped by Category */}
                      {selectedTask.seoResult.details && selectedTask.seoResult.details.length > 0 && (
                        <SEODetailsGrouped details={selectedTask.seoResult.details} />
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
