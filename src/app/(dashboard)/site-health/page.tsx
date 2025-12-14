'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  Trash2,
  Globe,
  FileText,
  Loader2,
  Info,
  Download,
  RefreshCw,
  Type,
  Hash,
  Link2,
  FileSearch,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  crawl_sheet_url?: string;
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

interface PageIssue {
  severity: string;
  name: string;
  suggestion: string;
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
  canonical_link: string;
  word_count: number;
  response_time: number;
  crawl_depth: number;
  unique_inlinks: number;
  has_critical_issue: boolean;
  has_warning: boolean;
  issues: PageIssue[];
}

// Issue types for grouping
interface IssueGroup {
  name: string;
  severity: 'critical' | 'warning' | 'opportunity';
  count: number;
  pages: CrawlPage[];
  suggestion: string;
  icon: React.ReactNode;
}

export default function SiteHealthPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [crawls, setCrawls] = useState<SiteCrawl[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedCrawl, setSelectedCrawl] = useState<SiteCrawl | null>(null);
  const [pages, setPages] = useState<CrawlPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'urls'>('overview');
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'issues' | 'ok'>('all');

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

      // Auto-select latest crawl
      if (data.crawls && data.crawls.length > 0 && !selectedCrawl) {
        fetchCrawlDetail(data.crawls[0].id);
      }
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
    } catch (error) {
      console.error('Failed to fetch crawl detail:', error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSyncCrawl = async (projectId: string, sheetUrl: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/site-crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          sheet_url: sheetUrl,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Sync failed');
      }

      // Refresh crawls and show the new one
      await fetchCrawls();
      if (result.crawl?.id) {
        await fetchCrawlDetail(result.crawl.id);
      }

      alert(`Đã sync thành công ${result.imported} URLs!`);
    } catch (error) {
      console.error('Sync error:', error);
      alert('Lỗi sync: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSyncing(false);
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

  // Group issues by type for the report view
  const issueGroups = useMemo(() => {
    const groups: Record<string, IssueGroup> = {};

    pages.forEach((page) => {
      page.issues?.forEach((issue) => {
        if (!groups[issue.name]) {
          groups[issue.name] = {
            name: issue.name,
            severity: issue.severity as 'critical' | 'warning' | 'opportunity',
            count: 0,
            pages: [],
            suggestion: issue.suggestion,
            icon: getIssueIcon(issue.name),
          };
        }
        groups[issue.name].count++;
        groups[issue.name].pages.push(page);
      });
    });

    // Sort by severity then count
    return Object.values(groups).sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, opportunity: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.count - a.count;
    });
  }, [pages]);

  // Filter pages for URLs tab
  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      if (filterStatus === 'issues' && !page.has_critical_issue && !page.has_warning) return false;
      if (filterStatus === 'ok' && (page.has_critical_issue || page.has_warning)) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          page.address?.toLowerCase().includes(query) ||
          page.title?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [pages, filterStatus, searchQuery]);

  // Export to CSV
  const exportIssuesCSV = () => {
    const rows: string[][] = [['Issue Type', 'Severity', 'Count', 'URLs']];

    issueGroups.forEach((group) => {
      group.pages.forEach((page) => {
        rows.push([
          group.name,
          group.severity,
          group.count.toString(),
          page.address,
        ]);
      });
    });

    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo-issues-${selectedCrawl?.project?.name || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return <PageLoading />;
  }

  const selectedProjectData = projects.find((p) => p.id === selectedProject);

  return (
    <div className="space-y-4">
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
            onChange={(e) => {
              setSelectedProject(e.target.value);
              setSelectedCrawl(null);
              setPages([]);
            }}
            className="px-3 py-2 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm"
          >
            <option value="">Chọn dự án</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Sync Button */}
          {selectedProject && selectedProjectData?.crawl_sheet_url && (
            <button
              onClick={() => handleSyncCrawl(selectedProject, selectedProjectData.crawl_sheet_url!)}
              disabled={isSyncing}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-accent/90 disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang sync...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sync Crawl
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* No project selected */}
      {!selectedProject && (
        <EmptyState
          icon={Activity}
          title="Chọn dự án để xem Site Health"
          description="Vào Settings để cấu hình Crawl Sheet URL cho mỗi dự án"
        />
      )}

      {/* No crawl data */}
      {selectedProject && crawls.length === 0 && !selectedProjectData?.crawl_sheet_url && (
        <EmptyState
          icon={Activity}
          title="Chưa có dữ liệu crawl"
          description="Vào Settings để thêm Crawl Sheet URL cho dự án này"
        />
      )}

      {/* No crawl but has URL */}
      {selectedProject && crawls.length === 0 && selectedProjectData?.crawl_sheet_url && (
        <EmptyState
          icon={Activity}
          title="Chưa có dữ liệu crawl"
          description="Nhấn 'Sync Crawl' để import dữ liệu từ Google Sheet"
        />
      )}

      {/* Main Content */}
      {selectedCrawl && (
        <div className="space-y-4">
          {/* Crawl Info Bar */}
          <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-accent" />
                <span className="font-medium text-[var(--text-primary)]">
                  {selectedCrawl.project?.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#8888a0]">
                <Calendar className="w-4 h-4" />
                {new Date(selectedCrawl.crawl_date).toLocaleDateString('vi-VN')}
              </div>
              <span className="text-sm text-[#8888a0]">
                {selectedCrawl.total_urls.toLocaleString()} URLs
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportIssuesCSV}
                className="px-3 py-1.5 text-sm text-[#8888a0] hover:text-[var(--text-primary)] flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => deleteCrawl(selectedCrawl.id)}
                className="p-1.5 text-[#8888a0] hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1 w-fit">
            {[
              { id: 'overview', label: 'Tổng quan' },
              { id: 'issues', label: 'Issues Report' },
              { id: 'urls', label: 'Chi tiết URLs' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'issues' | 'urls')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-accent text-white"
                    : "text-[#8888a0] hover:text-[var(--text-primary)]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isLoadingDetail ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <OverviewTab crawl={selectedCrawl} issueGroups={issueGroups} />
              )}

              {/* Issues Tab */}
              {activeTab === 'issues' && (
                <IssuesTab
                  issueGroups={issueGroups}
                  expandedIssue={expandedIssue}
                  setExpandedIssue={setExpandedIssue}
                />
              )}

              {/* URLs Tab */}
              {activeTab === 'urls' && (
                <URLsTab
                  pages={filteredPages}
                  totalPages={pages.length}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Get icon for issue type
function getIssueIcon(issueName: string): React.ReactNode {
  if (issueName.includes('Title')) return <Type className="w-4 h-4" />;
  if (issueName.includes('Meta')) return <FileText className="w-4 h-4" />;
  if (issueName.includes('H1')) return <Hash className="w-4 h-4" />;
  if (issueName.includes('Canonical')) return <Link2 className="w-4 h-4" />;
  if (issueName.includes('HTTP') || issueName.includes('index')) return <XCircle className="w-4 h-4" />;
  if (issueName.includes('Tải') || issueName.includes('sâu')) return <Activity className="w-4 h-4" />;
  return <FileSearch className="w-4 h-4" />;
}

// Overview Tab Component
function OverviewTab({ crawl, issueGroups }: { crawl: SiteCrawl; issueGroups: IssueGroup[] }) {
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Health Score Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[#8888a0] mb-4">Health Score</h3>
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64" cy="64" r="56"
                stroke="currentColor" strokeWidth="12" fill="none"
                className="text-[#8888a0]/20"
              />
              <circle
                cx="64" cy="64" r="56"
                stroke="currentColor" strokeWidth="12" fill="none"
                strokeDasharray={`${(crawl.health_score / 100) * 351.86} 351.86`}
                strokeLinecap="round"
                className={getHealthColor(crawl.health_score)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={cn("text-4xl font-bold", getHealthColor(crawl.health_score))}>
                  {crawl.health_score}
                </div>
                <div className="text-xs text-[#8888a0]">/ 100</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="bg-green-500/10 rounded-lg p-2">
            <div className="text-lg font-bold text-green-400">{crawl.indexable_urls}</div>
            <div className="text-xs text-[#8888a0]">Indexable</div>
          </div>
          <div className="bg-yellow-500/10 rounded-lg p-2">
            <div className="text-lg font-bold text-yellow-400">{crawl.non_indexable_urls}</div>
            <div className="text-xs text-[#8888a0]">Non-Indexable</div>
          </div>
        </div>
      </div>

      {/* Issues Summary Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[#8888a0] mb-4">Issues Summary</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Critical</span>
            </div>
            <span className="text-xl font-bold text-red-400">{crawl.critical_issues}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Warnings</span>
            </div>
            <span className="text-xl font-bold text-yellow-400">{crawl.warnings}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Opportunities</span>
            </div>
            <span className="text-xl font-bold text-blue-400">{crawl.opportunities}</span>
          </div>
        </div>
      </div>

      {/* Status Codes Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[#8888a0] mb-4">Status Codes</h3>

        <div className="space-y-3">
          <StatusBar label="2xx Success" value={crawl.status_2xx} total={crawl.total_urls} color="green" />
          <StatusBar label="3xx Redirect" value={crawl.status_3xx} total={crawl.total_urls} color="yellow" />
          <StatusBar label="4xx Client Error" value={crawl.status_4xx} total={crawl.total_urls} color="red" />
          <StatusBar label="5xx Server Error" value={crawl.status_5xx} total={crawl.total_urls} color="red" />
        </div>
      </div>

      {/* Top Issues - Full Width */}
      <div className="lg:col-span-3 bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[#8888a0] mb-4">Top Issues cần sửa</h3>

        {issueGroups.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
            <p className="text-green-400 font-medium">Không có lỗi nào!</p>
            <p className="text-sm text-[#8888a0]">Website của bạn đã được tối ưu tốt</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {issueGroups.slice(0, 6).map((group) => (
              <div
                key={group.name}
                className={cn(
                  "p-4 rounded-lg",
                  group.severity === 'critical' ? "bg-red-500/10 border border-red-500/30" :
                  group.severity === 'warning' ? "bg-yellow-500/10 border border-yellow-500/30" :
                  "bg-blue-500/10 border border-blue-500/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    group.severity === 'critical' ? "bg-red-500/20 text-red-400" :
                    group.severity === 'warning' ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-blue-500/20 text-blue-400"
                  )}>
                    {group.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {group.name}
                      </span>
                    </div>
                    <div className={cn(
                      "text-2xl font-bold mt-1",
                      group.severity === 'critical' ? "text-red-400" :
                      group.severity === 'warning' ? "text-yellow-400" :
                      "text-blue-400"
                    )}>
                      {group.count}
                    </div>
                    <div className="text-xs text-[#8888a0]">URLs cần sửa</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Status Bar Component
function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: 'green' | 'yellow' | 'red' }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colorClasses = {
    green: 'bg-green-400',
    yellow: 'bg-yellow-400',
    red: 'bg-red-400',
  };
  const textClasses = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-[#8888a0]">{label}</span>
        <span className={textClasses[color]}>{value.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", colorClasses[color])} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

// Issues Tab Component
function IssuesTab({
  issueGroups,
  expandedIssue,
  setExpandedIssue
}: {
  issueGroups: IssueGroup[];
  expandedIssue: string | null;
  setExpandedIssue: (v: string | null) => void;
}) {
  const criticalIssues = issueGroups.filter((g) => g.severity === 'critical');
  const warningIssues = issueGroups.filter((g) => g.severity === 'warning');
  const opportunityIssues = issueGroups.filter((g) => g.severity === 'opportunity');

  return (
    <div className="space-y-6">
      {/* Critical Issues */}
      {criticalIssues.length > 0 && (
        <IssueSection
          title="Critical Issues"
          subtitle="Cần sửa ngay để tránh ảnh hưởng SEO"
          issues={criticalIssues}
          expandedIssue={expandedIssue}
          setExpandedIssue={setExpandedIssue}
          color="red"
        />
      )}

      {/* Warnings */}
      {warningIssues.length > 0 && (
        <IssueSection
          title="Warnings"
          subtitle="Nên sửa để cải thiện SEO"
          issues={warningIssues}
          expandedIssue={expandedIssue}
          setExpandedIssue={setExpandedIssue}
          color="yellow"
        />
      )}

      {/* Opportunities */}
      {opportunityIssues.length > 0 && (
        <IssueSection
          title="Opportunities"
          subtitle="Cơ hội tối ưu thêm"
          issues={opportunityIssues}
          expandedIssue={expandedIssue}
          setExpandedIssue={setExpandedIssue}
          color="blue"
        />
      )}

      {issueGroups.length === 0 && (
        <div className="bg-card border border-green-500/30 rounded-xl p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-green-400 mb-2">Tuyệt vời!</h3>
          <p className="text-[#8888a0]">Không tìm thấy lỗi SEO nào. Website của bạn đã được tối ưu tốt.</p>
        </div>
      )}
    </div>
  );
}

// Issue Section Component
function IssueSection({
  title,
  subtitle,
  issues,
  expandedIssue,
  setExpandedIssue,
  color,
}: {
  title: string;
  subtitle: string;
  issues: IssueGroup[];
  expandedIssue: string | null;
  setExpandedIssue: (v: string | null) => void;
  color: 'red' | 'yellow' | 'blue';
}) {
  const colorClasses = {
    red: 'border-red-500/30 bg-red-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
  };
  const iconClasses = {
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
  };

  return (
    <div className={cn("border rounded-xl overflow-hidden", colorClasses[color])}>
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          {color === 'red' && <XCircle className={cn("w-5 h-5", iconClasses[color])} />}
          {color === 'yellow' && <AlertTriangle className={cn("w-5 h-5", iconClasses[color])} />}
          {color === 'blue' && <Info className={cn("w-5 h-5", iconClasses[color])} />}
          <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
          <span className={cn("px-2 py-0.5 rounded text-xs font-medium",
            color === 'red' ? "bg-red-500/20 text-red-400" :
            color === 'yellow' ? "bg-yellow-500/20 text-yellow-400" :
            "bg-blue-500/20 text-blue-400"
          )}>
            {issues.length} loại
          </span>
        </div>
        <p className="text-xs text-[#8888a0] mt-1">{subtitle}</p>
      </div>

      <div className="divide-y divide-border/50">
        {issues.map((group) => (
          <IssueRow
            key={group.name}
            group={group}
            isExpanded={expandedIssue === group.name}
            onToggle={() => setExpandedIssue(expandedIssue === group.name ? null : group.name)}
          />
        ))}
      </div>
    </div>
  );
}

// Issue Row Component
function IssueRow({ group, isExpanded, onToggle }: { group: IssueGroup; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
      >
        <div className={cn(
          "p-2 rounded-lg",
          group.severity === 'critical' ? "bg-red-500/20 text-red-400" :
          group.severity === 'warning' ? "bg-yellow-500/20 text-yellow-400" :
          "bg-blue-500/20 text-blue-400"
        )}>
          {group.icon}
        </div>

        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-[var(--text-primary)]">{group.name}</div>
          <div className="text-xs text-[#8888a0]">{group.suggestion}</div>
        </div>

        <div className={cn(
          "text-xl font-bold",
          group.severity === 'critical' ? "text-red-400" :
          group.severity === 'warning' ? "text-yellow-400" :
          "text-blue-400"
        )}>
          {group.count}
        </div>

        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[#8888a0]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#8888a0]" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="bg-secondary/50 rounded-lg max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary">
                <tr className="text-left text-xs text-[#8888a0]">
                  <th className="px-3 py-2 font-medium">URL</th>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {group.pages.slice(0, 50).map((page) => (
                  <tr key={page.id} className="hover:bg-white/5">
                    <td className="px-3 py-2">
                      <span className="text-[var(--text-primary)] truncate block max-w-[400px]">
                        {page.address}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[#8888a0] truncate block max-w-[200px]">
                        {page.title || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <a
                        href={page.address}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {group.pages.length > 50 && (
              <div className="p-3 text-center text-xs text-[#8888a0]">
                Hiển thị 50/{group.pages.length} URLs. Export CSV để xem tất cả.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// URLs Tab Component
function URLsTab({
  pages,
  totalPages,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
}: {
  pages: CrawlPage[];
  totalPages: number;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterStatus: 'all' | 'issues' | 'ok';
  setFilterStatus: (v: 'all' | 'issues' | 'ok') => void;
}) {
  const [displayLimit, setDisplayLimit] = useState(100);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888a0]" />
            <input
              type="text"
              placeholder="Tìm URL hoặc Title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-secondary border-none rounded-lg text-sm text-[var(--text-primary)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'issues', label: 'Có lỗi' },
            { id: 'ok', label: 'OK' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id as 'all' | 'issues' | 'ok')}
              className={cn(
                "px-3 py-1 rounded text-xs font-medium transition-colors",
                filterStatus === f.id
                  ? "bg-accent text-white"
                  : "text-[#8888a0] hover:text-[var(--text-primary)]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-sm text-[#8888a0]">
          {pages.length.toLocaleString()} / {totalPages.toLocaleString()} URLs
        </span>
      </div>

      {/* Table */}
      <div className="max-h-[600px] overflow-y-auto">
        {pages.length === 0 ? (
          <div className="p-8 text-center text-[#8888a0]">
            Không có URL nào phù hợp
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 sticky top-0">
              <tr className="text-left text-xs text-[#8888a0]">
                <th className="px-4 py-2 font-medium w-8">Status</th>
                <th className="px-4 py-2 font-medium">URL</th>
                <th className="px-4 py-2 font-medium text-center">Code</th>
                <th className="px-4 py-2 font-medium text-center">Issues</th>
                <th className="px-4 py-2 font-medium">Title</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pages.slice(0, displayLimit).map((page) => (
                <URLRow key={page.id} page={page} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Load More */}
      {pages.length > displayLimit && (
        <div className="p-4 border-t border-border text-center">
          <button
            onClick={() => setDisplayLimit((prev) => prev + 100)}
            className="px-4 py-2 bg-secondary text-[var(--text-primary)] rounded-lg text-sm hover:bg-secondary/80"
          >
            Hiển thị thêm ({displayLimit}/{pages.length})
          </button>
        </div>
      )}
    </div>
  );
}

// URL Row Component
function URLRow({ page }: { page: CrawlPage }) {
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
          {page.has_critical_issue ? (
            <XCircle className="w-4 h-4 text-red-400" />
          ) : page.has_warning ? (
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          )}
        </td>
        <td className="px-4 py-2">
          <span className="text-[var(--text-primary)] truncate block max-w-[400px]">
            {page.address}
          </span>
        </td>
        <td className="px-4 py-2 text-center">
          <span className={cn(
            "px-2 py-0.5 rounded text-xs font-medium",
            page.status_code >= 200 && page.status_code < 300 ? "bg-green-500/20 text-green-400" :
            page.status_code >= 300 && page.status_code < 400 ? "bg-yellow-500/20 text-yellow-400" :
            "bg-red-500/20 text-red-400"
          )}>
            {page.status_code || '-'}
          </span>
        </td>
        <td className="px-4 py-2 text-center">
          <span className="text-[#8888a0]">{page.issues?.length || 0}</span>
        </td>
        <td className="px-4 py-2">
          <span className="text-[#8888a0] truncate block max-w-[250px]">
            {page.title || '-'}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5} className="px-4 py-3 bg-secondary/30">
            <div className="space-y-3">
              {/* Meta Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[#8888a0]">Title Length:</span>{' '}
                  <span className={cn(
                    "font-medium",
                    page.title_length && page.title_length > 60 ? "text-yellow-400" :
                    page.title_length && page.title_length < 30 ? "text-yellow-400" :
                    "text-[var(--text-primary)]"
                  )}>
                    {page.title_length || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[#8888a0]">Meta Desc Length:</span>{' '}
                  <span className={cn(
                    "font-medium",
                    page.meta_description_length && page.meta_description_length > 160 ? "text-yellow-400" :
                    !page.meta_description_length ? "text-yellow-400" :
                    "text-[var(--text-primary)]"
                  )}>
                    {page.meta_description_length || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[#8888a0]">H1:</span>{' '}
                  <span className={cn(
                    "font-medium",
                    !page.h1_1 ? "text-yellow-400" : "text-[var(--text-primary)]"
                  )}>
                    {page.h1_1 ? 'Có' : 'Không'}
                  </span>
                </div>
                <div>
                  <span className="text-[#8888a0]">Canonical:</span>{' '}
                  <span className={cn(
                    "font-medium",
                    !page.canonical_link ? "text-yellow-400" : "text-[var(--text-primary)]"
                  )}>
                    {page.canonical_link ? 'Có' : 'Không'}
                  </span>
                </div>
              </div>

              {/* Issues */}
              {page.issues && page.issues.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {page.issues.map((issue, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "px-2 py-1 rounded text-xs",
                        issue.severity === 'critical' ? "bg-red-500/20 text-red-400" :
                        issue.severity === 'warning' ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-blue-500/20 text-blue-400"
                      )}
                    >
                      {issue.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
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
