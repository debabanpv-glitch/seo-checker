'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Upload,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  Trash2,
  Globe,
  Link2,
  FileText,
  Zap,
  Loader2,
  Info,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
}

interface SiteCrawl {
  id: string;
  project_id: string;
  crawl_date: string;
  source_url: string | null;
  total_urls: number;
  indexable_urls: number;
  non_indexable_urls: number;
  status_2xx: number;
  status_3xx: number;
  status_4xx: number;
  status_5xx: number;
  health_score: number;
  critical_issues: number;
  warnings: number;
  opportunities: number;
  created_at: string;
  project?: { name: string };
}

interface CrawlPage {
  id: string;
  address: string;
  status_code: number;
  indexability: string;
  indexability_status: string;
  title: string;
  title_length: number;
  meta_description: string;
  meta_description_length: number;
  h1_1: string;
  h1_2: string;
  word_count: number;
  response_time: number;
  crawl_depth: number;
  unique_inlinks: number;
  has_critical_issue: boolean;
  has_warning: boolean;
  issues: Array<{ id: string; severity: string; name: string; suggestion: string }>;
}

interface IssueDefinition {
  id: string;
  category: string;
  severity: string;
  name: string;
  description: string;
  suggestion: string;
}

export default function SiteHealthPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [crawls, setCrawls] = useState<SiteCrawl[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedCrawl, setSelectedCrawl] = useState<SiteCrawl | null>(null);
  const [pages, setPages] = useState<CrawlPage[]>([]);
  const [issueDefinitions, setIssueDefinitions] = useState<IssueDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchCrawls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCrawls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchCrawls = async () => {
    setIsLoading(true);
    try {
      const projectParam = selectedProject ? `?project_id=${selectedProject}` : '';
      const res = await fetch(`/api/site-crawl${projectParam}`);
      const data = await res.json();
      setCrawls(data.crawls || []);
    } catch (error) {
      console.error('Failed to fetch crawls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCrawlDetail = async (crawlId: string) => {
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/site-crawl?crawl_id=${crawlId}`);
      const data = await res.json();
      setSelectedCrawl(data.crawl);
      setPages(data.pages || []);
      setIssueDefinitions(data.issueDefinitions || []);
    } catch (error) {
      console.error('Failed to fetch crawl detail:', error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const deleteCrawl = async (crawlId: string) => {
    if (!confirm('Bạn có chắc muốn xóa báo cáo crawl này?')) return;

    try {
      await fetch(`/api/site-crawl?crawl_id=${crawlId}`, { method: 'DELETE' });
      setCrawls((prev) => prev.filter((c) => c.id !== crawlId));
      if (selectedCrawl?.id === crawlId) {
        setSelectedCrawl(null);
        setPages([]);
      }
    } catch (error) {
      console.error('Failed to delete crawl:', error);
    }
  };

  // Group issues by category
  const issuesByCategory = useMemo(() => {
    const grouped: Record<string, { critical: CrawlPage[]; warning: CrawlPage[]; opportunity: CrawlPage[] }> = {
      indexability: { critical: [], warning: [], opportunity: [] },
      content: { critical: [], warning: [], opportunity: [] },
      technical: { critical: [], warning: [], opportunity: [] },
      links: { critical: [], warning: [], opportunity: [] },
    };

    pages.forEach((page) => {
      page.issues?.forEach((issue) => {
        const def = issueDefinitions.find((d) => d.id === issue.id);
        if (def) {
          grouped[def.category]?.[issue.severity as 'critical' | 'warning' | 'opportunity']?.push(page);
        }
      });
    });

    return grouped;
  }, [pages, issueDefinitions]);

  // Filter pages
  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      // Filter by severity
      if (filterSeverity === 'critical' && !page.has_critical_issue) return false;
      if (filterSeverity === 'warning' && !page.has_warning) return false;
      if (filterSeverity === 'ok' && (page.has_critical_issue || page.has_warning)) return false;

      // Filter by category
      if (filterCategory !== 'all') {
        const hasIssueInCategory = page.issues?.some((issue) => {
          const def = issueDefinitions.find((d) => d.id === issue.id);
          return def?.category === filterCategory;
        });
        if (!hasIssueInCategory) return false;
      }

      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          page.address?.toLowerCase().includes(query) ||
          page.title?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [pages, filterSeverity, filterCategory, searchQuery, issueDefinitions]);

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">Site Health</h1>
          <p className="text-[#8888a0] text-xs md:text-sm">Phân tích On-page SEO từ Screaming Frog</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Project Filter */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm"
          >
            <option value="">Tất cả dự án</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Import Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-accent/90"
          >
            <Upload className="w-4 h-4" />
            Import Crawl
          </button>
        </div>
      </div>

      {crawls.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Chưa có dữ liệu crawl"
          description="Import file CSV từ Screaming Frog để bắt đầu phân tích"
        />
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left: Crawl List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Lịch sử Crawl</h2>
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {crawls.map((crawl) => (
                <CrawlCard
                  key={crawl.id}
                  crawl={crawl}
                  isSelected={selectedCrawl?.id === crawl.id}
                  onClick={() => fetchCrawlDetail(crawl.id)}
                  onDelete={() => deleteCrawl(crawl.id)}
                />
              ))}
            </div>
          </div>

          {/* Right: Crawl Detail */}
          <div className="lg:col-span-2">
            {isLoadingDetail ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : selectedCrawl ? (
              <CrawlDetail
                crawl={selectedCrawl}
                pages={filteredPages}
                issuesByCategory={issuesByCategory}
                issueDefinitions={issueDefinitions}
                filterSeverity={filterSeverity}
                setFilterSeverity={setFilterSeverity}
                filterCategory={filterCategory}
                setFilterCategory={setFilterCategory}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-[#8888a0]">
                <div className="text-center">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Chọn một crawl để xem chi tiết</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          projects={projects}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            fetchCrawls();
          }}
        />
      )}
    </div>
  );
}

// Crawl Card Component
function CrawlCard({
  crawl,
  isSelected,
  onClick,
  onDelete,
}: {
  crawl: SiteCrawl;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/20';
    if (score >= 60) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border cursor-pointer transition-all",
        isSelected
          ? "bg-accent/10 border-accent"
          : "bg-card border-border hover:border-accent/50"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {crawl.project?.name || 'Unknown Project'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-[#8888a0]">
            <Calendar className="w-3 h-3" />
            {new Date(crawl.crawl_date).toLocaleDateString('vi-VN')}
            <span>•</span>
            <span>{crawl.total_urls} URLs</span>
          </div>
        </div>

        <div className={cn("px-2 py-1 rounded-lg", getHealthBg(crawl.health_score))}>
          <span className={cn("text-lg font-bold", getHealthColor(crawl.health_score))}>
            {crawl.health_score}
          </span>
        </div>
      </div>

      {/* Issue summary */}
      <div className="flex items-center gap-3 mt-3">
        {crawl.critical_issues > 0 && (
          <span className="flex items-center gap-1 text-xs text-red-400">
            <XCircle className="w-3 h-3" />
            {crawl.critical_issues}
          </span>
        )}
        {crawl.warnings > 0 && (
          <span className="flex items-center gap-1 text-xs text-yellow-400">
            <AlertTriangle className="w-3 h-3" />
            {crawl.warnings}
          </span>
        )}
        {crawl.opportunities > 0 && (
          <span className="flex items-center gap-1 text-xs text-blue-400">
            <Info className="w-3 h-3" />
            {crawl.opportunities}
          </span>
        )}
        {crawl.critical_issues === 0 && crawl.warnings === 0 && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            Không có lỗi
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-auto p-1 text-[#8888a0] hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Crawl Detail Component
function CrawlDetail({
  crawl,
  pages,
  issuesByCategory,
  issueDefinitions,
  filterSeverity,
  setFilterSeverity,
  filterCategory,
  setFilterCategory,
  searchQuery,
  setSearchQuery,
}: {
  crawl: SiteCrawl;
  pages: CrawlPage[];
  issuesByCategory: Record<string, { critical: CrawlPage[]; warning: CrawlPage[]; opportunity: CrawlPage[] }>;
  issueDefinitions: IssueDefinition[];
  filterSeverity: string;
  setFilterSeverity: (v: string) => void;
  filterCategory: string;
  setFilterCategory: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('indexability');

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-4">
      {/* Health Score Overview */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-6">
          {/* Score Circle */}
          <div className="relative">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle
                cx="56" cy="56" r="48"
                stroke="currentColor" strokeWidth="10" fill="none"
                className="text-[#8888a0]/20"
              />
              <circle
                cx="56" cy="56" r="48"
                stroke="currentColor" strokeWidth="10" fill="none"
                strokeDasharray={`${(crawl.health_score / 100) * 301.6} 301.6`}
                strokeLinecap="round"
                className={getHealthColor(crawl.health_score)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={cn("text-3xl font-bold", getHealthColor(crawl.health_score))}>
                  {crawl.health_score}
                </div>
                <div className="text-xs text-[#8888a0]">Health</div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox label="Tổng URLs" value={crawl.total_urls} icon={<Globe className="w-4 h-4" />} />
            <StatBox label="Indexable" value={crawl.indexable_urls} color="green" icon={<CheckCircle2 className="w-4 h-4" />} />
            <StatBox label="Critical" value={crawl.critical_issues} color="red" icon={<XCircle className="w-4 h-4" />} />
            <StatBox label="Warnings" value={crawl.warnings} color="yellow" icon={<AlertTriangle className="w-4 h-4" />} />
          </div>
        </div>

        {/* Status Code Breakdown */}
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-4">
          <span className="text-xs text-[#8888a0]">Status Codes:</span>
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
              2xx: {crawl.status_2xx}
            </span>
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
              3xx: {crawl.status_3xx}
            </span>
            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
              4xx: {crawl.status_4xx}
            </span>
            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
              5xx: {crawl.status_5xx}
            </span>
          </div>
        </div>
      </div>

      {/* Issue Categories */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Phân tích theo Category</h3>

        {Object.entries(issuesByCategory).map(([category, issues]) => {
          const categoryDefs = issueDefinitions.filter((d) => d.category === category);

          return (
            <IssueCategoryCard
              key={category}
              category={category}
              issues={issues}
              definitions={categoryDefs}
              isExpanded={expandedCategory === category}
              onToggle={() => setExpandedCategory(expandedCategory === category ? null : category)}
            />
          );
        })}
      </div>

      {/* Pages List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Chi tiết URLs ({pages.length})
          </h3>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888a0]" />
              <input
                type="text"
                placeholder="Tìm URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-secondary border-none rounded-lg text-sm text-[var(--text-primary)]"
              />
            </div>
          </div>

          {/* Filters */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-2 py-1.5 bg-secondary rounded-lg text-xs text-[var(--text-primary)]"
          >
            <option value="all">Tất cả</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="ok">OK</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-2 py-1.5 bg-secondary rounded-lg text-xs text-[var(--text-primary)]"
          >
            <option value="all">Tất cả category</option>
            <option value="indexability">Indexability</option>
            <option value="content">Content</option>
            <option value="technical">Technical</option>
            <option value="links">Links</option>
          </select>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {pages.length === 0 ? (
            <div className="p-8 text-center text-[#8888a0]">
              Không có URL nào phù hợp
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 sticky top-0">
                <tr className="text-left text-xs text-[#8888a0]">
                  <th className="px-4 py-2 font-medium">URL</th>
                  <th className="px-4 py-2 font-medium text-center">Status</th>
                  <th className="px-4 py-2 font-medium text-center">Issues</th>
                  <th className="px-4 py-2 font-medium">Title</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pages.slice(0, 100).map((page) => (
                  <PageRow key={page.id} page={page} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Box Component
function StatBox({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color?: 'green' | 'red' | 'yellow' | 'blue';
  icon?: React.ReactNode;
}) {
  const colorClasses = {
    green: 'text-green-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
  };

  return (
    <div className="bg-secondary/50 rounded-lg p-3">
      <div className="flex items-center gap-2 text-[#8888a0] mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className={cn("text-2xl font-bold", color ? colorClasses[color] : "text-[var(--text-primary)]")}>
        {value}
      </div>
    </div>
  );
}

// Issue Category Card
function IssueCategoryCard({
  category,
  issues,
  definitions,
  isExpanded,
  onToggle,
}: {
  category: string;
  issues: { critical: CrawlPage[]; warning: CrawlPage[]; opportunity: CrawlPage[] };
  definitions: IssueDefinition[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const categoryNames: Record<string, string> = {
    indexability: 'Indexability',
    content: 'Nội dung',
    technical: 'Kỹ thuật',
    links: 'Internal Links',
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    indexability: <Globe className="w-4 h-4" />,
    content: <FileText className="w-4 h-4" />,
    technical: <Zap className="w-4 h-4" />,
    links: <Link2 className="w-4 h-4" />,
  };

  const totalIssues = issues.critical.length + issues.warning.length + issues.opportunity.length;
  const hasCritical = issues.critical.length > 0;
  const hasWarning = issues.warning.length > 0;

  const borderColor = hasCritical
    ? 'border-red-500/50'
    : hasWarning
    ? 'border-yellow-500/50'
    : 'border-green-500/50';

  const bgColor = hasCritical
    ? 'bg-red-500/5'
    : hasWarning
    ? 'bg-yellow-500/5'
    : 'bg-green-500/5';

  // Group issues by type
  const issueGroups: Record<string, { def: IssueDefinition; pages: CrawlPage[] }> = {};
  [...issues.critical, ...issues.warning, ...issues.opportunity].forEach((page) => {
    page.issues?.forEach((issue) => {
      const def = definitions.find((d) => d.id === issue.id);
      if (def) {
        if (!issueGroups[issue.id]) {
          issueGroups[issue.id] = { def, pages: [] };
        }
        if (!issueGroups[issue.id].pages.find((p) => p.id === page.id)) {
          issueGroups[issue.id].pages.push(page);
        }
      }
    });
  });

  return (
    <div className={cn("rounded-xl border overflow-hidden", borderColor, bgColor)}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
      >
        <div className={cn(
          "p-1.5 rounded-lg",
          hasCritical ? "bg-red-500/20 text-red-400" :
          hasWarning ? "bg-yellow-500/20 text-yellow-400" :
          "bg-green-500/20 text-green-400"
        )}>
          {categoryIcons[category]}
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {categoryNames[category]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {issues.critical.length > 0 && (
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium">
              {issues.critical.length} critical
            </span>
          )}
          {issues.warning.length > 0 && (
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
              {issues.warning.length} warning
            </span>
          )}
          {totalIssues === 0 && (
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
              OK
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#8888a0]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8888a0]" />
          )}
        </div>
      </button>

      {isExpanded && Object.keys(issueGroups).length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          {Object.entries(issueGroups).map(([issueId, { def, pages }]) => (
            <div
              key={issueId}
              className={cn(
                "p-3 rounded-lg",
                def.severity === 'critical' ? "bg-red-500/10" :
                def.severity === 'warning' ? "bg-yellow-500/10" :
                "bg-blue-500/10"
              )}
            >
              <div className="flex items-start gap-2">
                {def.severity === 'critical' ? (
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                ) : def.severity === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {def.name}
                    </span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-medium",
                      def.severity === 'critical' ? "bg-red-500/20 text-red-400" :
                      def.severity === 'warning' ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-blue-500/20 text-blue-400"
                    )}>
                      {pages.length} URLs
                    </span>
                  </div>
                  <p className="text-xs text-[#8888a0] mt-1">{def.description}</p>
                  <p className="text-xs text-yellow-400 mt-1">💡 {def.suggestion}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isExpanded && Object.keys(issueGroups).length === 0 && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-green-500/10 rounded-lg text-center">
            <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-sm text-green-400">Không có lỗi trong category này</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Page Row Component
function PageRow({ page }: { page: CrawlPage }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "cursor-pointer hover:bg-secondary/30",
          page.has_critical_issue && "bg-red-500/5",
          page.has_warning && !page.has_critical_issue && "bg-yellow-500/5"
        )}
      >
        <td className="px-4 py-2">
          <div className="flex items-center gap-2">
            {page.has_critical_issue ? (
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            ) : page.has_warning ? (
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            )}
            <span className="text-[var(--text-primary)] truncate max-w-[300px]">
              {page.address}
            </span>
          </div>
        </td>
        <td className="px-4 py-2 text-center">
          <span className={cn(
            "px-2 py-0.5 rounded text-xs font-medium",
            page.status_code >= 200 && page.status_code < 300 ? "bg-green-500/20 text-green-400" :
            page.status_code >= 300 && page.status_code < 400 ? "bg-yellow-500/20 text-yellow-400" :
            "bg-red-500/20 text-red-400"
          )}>
            {page.status_code}
          </span>
        </td>
        <td className="px-4 py-2 text-center">
          <span className="text-[#8888a0]">{page.issues?.length || 0}</span>
        </td>
        <td className="px-4 py-2">
          <span className="text-[#8888a0] truncate block max-w-[200px]">
            {page.title || '-'}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={4} className="px-4 py-3 bg-secondary/30">
            <div className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[#8888a0]">Word Count:</span>{' '}
                  <span className="text-[var(--text-primary)]">{page.word_count || '-'}</span>
                </div>
                <div>
                  <span className="text-[#8888a0]">Response:</span>{' '}
                  <span className="text-[var(--text-primary)]">{page.response_time ? `${page.response_time}ms` : '-'}</span>
                </div>
                <div>
                  <span className="text-[#8888a0]">Inlinks:</span>{' '}
                  <span className="text-[var(--text-primary)]">{page.unique_inlinks || 0}</span>
                </div>
                <div>
                  <span className="text-[#8888a0]">Depth:</span>{' '}
                  <span className="text-[var(--text-primary)]">{page.crawl_depth || '-'}</span>
                </div>
              </div>
              {page.issues && page.issues.length > 0 && (
                <div className="space-y-1">
                  {page.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1 rounded text-xs",
                        issue.severity === 'critical' ? "bg-red-500/10 text-red-400" :
                        issue.severity === 'warning' ? "bg-yellow-500/10 text-yellow-400" :
                        "bg-blue-500/10 text-blue-400"
                      )}
                    >
                      {issue.severity === 'critical' ? <XCircle className="w-3 h-3" /> :
                       issue.severity === 'warning' ? <AlertTriangle className="w-3 h-3" /> :
                       <Info className="w-3 h-3" />}
                      <span>{issue.name}</span>
                    </div>
                  ))}
                </div>
              )}
              <a
                href={page.address}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                Xem trang <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// Import Modal Component
function ImportModal({
  projects,
  onClose,
  onSuccess,
}: {
  projects: Project[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [projectId, setProjectId] = useState('');
  const [crawlDate, setCrawlDate] = useState(new Date().toISOString().split('T')[0]);
  const [csvData, setCsvData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    if (!projectId) {
      setError('Vui lòng chọn dự án');
      return;
    }
    if (!csvData.trim()) {
      setError('Vui lòng paste dữ liệu CSV');
      return;
    }

    setIsImporting(true);
    setError('');

    try {
      // Parse CSV
      const lines = csvData.trim().split('\n');
      const headers = parseCSVLine(lines[0]);
      const data = lines.slice(1).map((line) => {
        const values = parseCSVLine(line);
        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        return row;
      });

      // Send to API
      const res = await fetch('/api/site-crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          crawl_date: crawlDate,
          data,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Import failed');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Import Crawl Data</h2>
          <button onClick={onClose} className="text-[#8888a0] hover:text-[var(--text-primary)]">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-130px)]">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#8888a0] mb-1">Dự án *</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)]"
              >
                <option value="">Chọn dự án</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1">Ngày crawl</label>
              <input
                type="date"
                value={crawlDate}
                onChange={(e) => setCrawlDate(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#8888a0] mb-1">
              Dữ liệu CSV (copy từ Google Sheet hoặc Excel)
            </label>
            <textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="Paste dữ liệu CSV tại đây (bao gồm header row)..."
              rows={15}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm font-mono"
            />
          </div>

          <div className="text-xs text-[#8888a0]">
            <p className="font-medium mb-1">Hướng dẫn:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Export dữ liệu từ Screaming Frog (File → Export → Internal → All)</li>
              <li>Mở file trong Google Sheet hoặc Excel</li>
              <li>Chọn tất cả (Ctrl+A) và copy (Ctrl+C)</li>
              <li>Paste vào ô trên</li>
            </ol>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#8888a0] hover:text-[var(--text-primary)]"
          >
            Hủy
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="px-4 py-2 bg-accent text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang import...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Parse CSV line (handle quoted values)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === '\t') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
