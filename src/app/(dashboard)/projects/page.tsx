'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban,
  TrendingUp,
  Target,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronDown,
  FileText,
  Link2,
  ExternalLink,
  Search,
  List,
  CheckCircle2,
  XCircle,
  Zap,
  TrendingDown,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  Bar,
  BarChart,
} from 'recharts';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  sheet_id: string;
  target: number;
  actual: number;
  totalTasks: number;
  thisMonthTotal: number;
}

interface DailySnapshot {
  date: string;
  top3: number;
  top10: number;
  top20: number;
  top30: number;
  total: number;
  uniqueUrls: number;
}

interface RankingGrowthData {
  snapshots: DailySnapshot[];
  summary: {
    firstDate: string;
    lastDate: string;
    top3Change: number;
    top10Change: number;
    top20Change: number;
    top30Change: number;
    top3First: number;
    top3Last: number;
    top10First: number;
    top10Last: number;
    top20First: number;
    top20Last: number;
    top30First: number;
    top30Last: number;
  } | null;
}

interface KeywordDetail {
  keyword: string;
  url: string;
  position: number;
  change: number;
}

interface URLDetail {
  url: string;
  keywords: {
    keyword: string;
    position: number;
    change: number;
  }[];
}

// Analysis interfaces
interface ContentStats {
  total: number;
  hasRanking: number;
  noRanking: number;
  percentEffective: number;
}

interface MonthlyContent {
  month: string;
  year: number;
  monthNum: number;
  published: number;
  hasRanking: number;
  noRanking: number;
}

interface URLAnalysis {
  url: string;
  bestPosition: number;
  keywordCount: number;
  seoScore: number | null;
  seoMaxScore: number | null;
  status: 'top10' | 'top30' | 'low' | 'none';
  action: string;
  keywords: { keyword: string; position: number }[];
}

interface OpportunityKeyword {
  keyword: string;
  url: string;
  position: number;
  change: number;
}

interface DecliningKeyword {
  keyword: string;
  url: string;
  currentPosition: number;
  previousPosition: number;
  decline: number;
}

interface AnalysisData {
  contentStats: ContentStats;
  monthlyContent: MonthlyContent[];
  urlAnalysis: URLAnalysis[];
  opportunityKeywords: OpportunityKeyword[];
  decliningKeywords: DecliningKeyword[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Ranking Growth state
  const [rankingGrowth, setRankingGrowth] = useState<RankingGrowthData | null>(null);
  const [rankingDays, setRankingDays] = useState(30);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);

  // Detail tables state
  const [keywordDetails, setKeywordDetails] = useState<KeywordDetail[]>([]);
  const [urlDetails, setUrlDetails] = useState<URLDetail[]>([]);
  const [detailsView, setDetailsView] = useState<'keywords' | 'urls'>('keywords');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [latestDate, setLatestDate] = useState<string | null>(null);

  // Analysis data state
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch ranking data when project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchRankingGrowth();
      fetchDetails();
      fetchAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankingDays, selectedProjectId]);

  // Fetch details when view changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailsView]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      const projectList = data.projects || [];
      setProjects(projectList);

      // Auto-select first project if available
      if (projectList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectList[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRankingGrowth = async () => {
    if (!selectedProjectId) return;

    setIsLoadingRanking(true);
    try {
      const params = new URLSearchParams({
        days: rankingDays.toString(),
        projectId: selectedProjectId,
      });
      const res = await fetch(`/api/keyword-rankings/growth?${params}`);
      const data = await res.json();
      setRankingGrowth(data);
    } catch (error) {
      console.error('Failed to fetch ranking growth:', error);
    } finally {
      setIsLoadingRanking(false);
    }
  };

  const fetchDetails = async () => {
    if (!selectedProjectId) return;

    setIsLoadingDetails(true);
    try {
      const params = new URLSearchParams({
        projectId: selectedProjectId,
        view: detailsView,
      });
      const res = await fetch(`/api/keyword-rankings/details?${params}`);
      const data = await res.json();

      if (detailsView === 'keywords') {
        setKeywordDetails(data.keywords || []);
      } else {
        setUrlDetails(data.urls || []);
      }
      setLatestDate(data.latestDate);
    } catch (error) {
      console.error('Failed to fetch details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const fetchAnalysis = async () => {
    if (!selectedProjectId) return;

    setIsLoadingAnalysis(true);
    try {
      const params = new URLSearchParams({
        projectId: selectedProjectId,
      });
      const res = await fetch(`/api/keyword-rankings/analysis?${params}`);
      const data = await res.json();
      setAnalysisData(data);
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  // Get selected project
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Calculate KPI percentages
  const kpiStats = useMemo(() => {
    if (!rankingGrowth?.summary || !rankingGrowth.snapshots.length) {
      return null;
    }

    const lastSnapshot = rankingGrowth.snapshots[rankingGrowth.snapshots.length - 1];
    const total = lastSnapshot.total;

    if (total === 0) return null;

    return {
      top3: {
        count: lastSnapshot.top3,
        percent: Math.round((lastSnapshot.top3 / total) * 100),
        change: rankingGrowth.summary.top3Change,
      },
      top10: {
        count: lastSnapshot.top10,
        percent: Math.round((lastSnapshot.top10 / total) * 100),
        change: rankingGrowth.summary.top10Change,
      },
      top20: {
        count: lastSnapshot.top20,
        percent: Math.round((lastSnapshot.top20 / total) * 100),
        change: rankingGrowth.summary.top20Change,
      },
      top30: {
        count: lastSnapshot.top30,
        percent: Math.round((lastSnapshot.top30 / total) * 100),
        change: rankingGrowth.summary.top30Change,
      },
      total,
      uniqueUrls: lastSnapshot.uniqueUrls || 0,
    };
  }, [rankingGrowth]);

  // Content stats from selected project
  const contentStats = useMemo(() => {
    if (!selectedProject) return null;

    return {
      // Content đã publish = actual (bài đã đăng tháng này)
      published: selectedProject.actual || 0,
      // Total URLs có ranking
      urlsWithRanking: kpiStats?.uniqueUrls || 0,
      // Total keywords
      totalKeywords: kpiStats?.total || 0,
    };
  }, [selectedProject, kpiStats]);

  // Filtered keyword details for search
  const filteredKeywords = useMemo(() => {
    if (!searchTerm) return keywordDetails;
    const term = searchTerm.toLowerCase();
    return keywordDetails.filter(
      (k) => k.keyword.toLowerCase().includes(term) || k.url.toLowerCase().includes(term)
    );
  }, [keywordDetails, searchTerm]);

  // Filtered URL details for search
  const filteredUrls = useMemo(() => {
    if (!searchTerm) return urlDetails;
    const term = searchTerm.toLowerCase();
    return urlDetails.filter(
      (u) => u.url.toLowerCase().includes(term) || u.keywords.some((k) => k.keyword.toLowerCase().includes(term))
    );
  }, [urlDetails, searchTerm]);


  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Project Selector */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">Tổng quan Dự án</h1>
              <p className="text-[#8888a0] text-sm">Xem KPI ranking & hiệu suất</p>
            </div>
          </div>

          {/* Project Selector */}
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="appearance-none px-4 py-3 pr-10 bg-secondary border border-border rounded-xl text-[var(--text-primary)] font-medium text-base cursor-pointer min-w-[200px] focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="" disabled>Chọn dự án...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8888a0] pointer-events-none" />
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Chưa có dự án"
          description="Thêm dự án trong phần Cài đặt để bắt đầu"
        />
      ) : !selectedProjectId ? (
        <EmptyState
          icon={Target}
          title="Chọn dự án"
          description="Chọn một dự án từ dropdown để xem KPI"
        />
      ) : (
        <>
          {/* KPI Cards - Ranking Percentages */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Top 3"
              count={kpiStats?.top3.count || 0}
              percent={kpiStats?.top3.percent || 0}
              change={kpiStats?.top3.change || 0}
              total={kpiStats?.total || 0}
              color="success"
              isLoading={isLoadingRanking}
            />
            <KPICard
              label="Top 10"
              count={kpiStats?.top10.count || 0}
              percent={kpiStats?.top10.percent || 0}
              change={kpiStats?.top10.change || 0}
              total={kpiStats?.total || 0}
              color="accent"
              isLoading={isLoadingRanking}
            />
            <KPICard
              label="Top 20"
              count={kpiStats?.top20.count || 0}
              percent={kpiStats?.top20.percent || 0}
              change={kpiStats?.top20.change || 0}
              total={kpiStats?.total || 0}
              color="blue"
              isLoading={isLoadingRanking}
            />
            <KPICard
              label="Top 30"
              count={kpiStats?.top30.count || 0}
              percent={kpiStats?.top30.percent || 0}
              change={kpiStats?.top30.change || 0}
              total={kpiStats?.total || 0}
              color="warning"
              isLoading={isLoadingRanking}
            />
          </div>

          {/* Content Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <span className="text-[#8888a0] text-sm">Content đã đăng</span>
              </div>
              <p className="text-3xl font-bold text-[var(--text-primary)]">
                {contentStats?.published || 0}
                <span className="text-lg font-normal text-[#8888a0] ml-2">bài</span>
              </p>
              <p className="text-xs text-[#8888a0] mt-1">Tháng này</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-success" />
                </div>
                <span className="text-[#8888a0] text-sm">URL có ranking</span>
              </div>
              <p className="text-3xl font-bold text-success">
                {contentStats?.urlsWithRanking || 0}
                <span className="text-lg font-normal text-[#8888a0] ml-2">URLs</span>
              </p>
              <p className="text-xs text-[#8888a0] mt-1">Trong hệ thống tracking</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-warning/20 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-warning" />
                </div>
                <span className="text-[#8888a0] text-sm">Tổng từ khóa</span>
              </div>
              <p className="text-3xl font-bold text-warning">
                {contentStats?.totalKeywords || 0}
                <span className="text-lg font-normal text-[#8888a0] ml-2">keywords</span>
              </p>
              <p className="text-xs text-[#8888a0] mt-1">Đang theo dõi</p>
            </div>
          </div>

          {/* Ranking Growth Chart */}
          <RankingGrowthChart
            data={rankingGrowth}
            isLoading={isLoadingRanking}
            days={rankingDays}
            onDaysChange={setRankingDays}
            projectName={selectedProject?.name || ''}
          />

          {/* Detailed Tables Section */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header with View Toggle and Search */}
            <div className="p-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                    <List className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[var(--text-primary)]">Chi tiết Ranking</h2>
                    <p className="text-xs text-[#8888a0]">
                      {latestDate ? `Cập nhật: ${new Date(latestDate).toLocaleDateString('vi-VN')}` : 'Chưa có dữ liệu'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* View Toggle */}
                  <div className="flex bg-secondary rounded-lg p-1">
                    <button
                      onClick={() => setDetailsView('keywords')}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                        detailsView === 'keywords'
                          ? "bg-accent text-white"
                          : "text-[#8888a0] hover:text-[var(--text-primary)]"
                      )}
                    >
                      Từ khóa
                    </button>
                    <button
                      onClick={() => setDetailsView('urls')}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                        detailsView === 'urls'
                          ? "bg-accent text-white"
                          : "text-[#8888a0] hover:text-[var(--text-primary)]"
                      )}
                    >
                      URLs
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888a0]" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm text-[var(--text-primary)] placeholder-[#8888a0] focus:outline-none focus:ring-2 focus:ring-accent/50 w-48"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Table Content */}
            {isLoadingDetails ? (
              <div className="p-8 text-center text-[#8888a0]">
                <div className="animate-pulse">Đang tải dữ liệu...</div>
              </div>
            ) : detailsView === 'keywords' ? (
              /* Keywords Table */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-12">STT</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Từ khóa</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-24">Vị trí</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-24">Thay đổi</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredKeywords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[#8888a0]">
                          {searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có dữ liệu từ khóa'}
                        </td>
                      </tr>
                    ) : (
                      filteredKeywords.map((item, idx) => (
                        <tr key={idx} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 text-sm text-[#8888a0]">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-[var(--text-primary)]">{item.keyword}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn(
                              "inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold",
                              item.position <= 3 ? "bg-success/20 text-success" :
                              item.position <= 10 ? "bg-accent/20 text-accent" :
                              item.position <= 20 ? "bg-blue-400/20 text-blue-400" :
                              item.position <= 30 ? "bg-warning/20 text-warning" :
                              "bg-secondary text-[#8888a0]"
                            )}>
                              {item.position}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.change !== 0 ? (
                              <span className={cn(
                                "inline-flex items-center gap-0.5 text-sm font-medium",
                                item.change > 0 ? "text-success" : "text-danger"
                              )}>
                                {item.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                {item.change > 0 ? '+' : ''}{item.change}
                              </span>
                            ) : (
                              <span className="text-[#8888a0]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {item.url ? (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-accent hover:underline inline-flex items-center gap-1 max-w-xs truncate"
                              >
                                <span className="truncate">{item.url.replace(/^https?:\/\//, '').split('/').slice(0, 2).join('/')}</span>
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              </a>
                            ) : (
                              <span className="text-[#8888a0] text-sm">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {filteredKeywords.length > 0 && (
                  <div className="px-4 py-3 border-t border-border bg-secondary/30 text-xs text-[#8888a0]">
                    Hiển thị {filteredKeywords.length} / {keywordDetails.length} từ khóa
                  </div>
                )}
              </div>
            ) : (
              /* URLs Table */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-12">STT</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">URL</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-24">Số từ khóa</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Từ khóa & Vị trí</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUrls.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-[#8888a0]">
                          {searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có dữ liệu URL'}
                        </td>
                      </tr>
                    ) : (
                      filteredUrls.map((item, idx) => (
                        <tr key={idx} className="hover:bg-secondary/30 transition-colors align-top">
                          <td className="px-4 py-3 text-sm text-[#8888a0]">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-accent hover:underline inline-flex items-center gap-1"
                            >
                              <span className="max-w-xs truncate">{item.url.replace(/^https?:\/\//, '')}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </a>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-accent/20 text-accent text-sm font-medium">
                              {item.keywords.length}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {item.keywords.slice(0, 5).map((kw, kwIdx) => (
                                <span
                                  key={kwIdx}
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs",
                                    kw.position <= 3 ? "bg-success/20 text-success" :
                                    kw.position <= 10 ? "bg-accent/20 text-accent" :
                                    kw.position <= 20 ? "bg-blue-400/20 text-blue-400" :
                                    kw.position <= 30 ? "bg-warning/20 text-warning" :
                                    "bg-secondary text-[#8888a0]"
                                  )}
                                >
                                  <span className="font-medium">{kw.keyword}</span>
                                  <span className="opacity-75">#{kw.position}</span>
                                  {kw.change !== 0 && (
                                    <span className={kw.change > 0 ? "text-success" : "text-danger"}>
                                      {kw.change > 0 ? '↑' : '↓'}
                                    </span>
                                  )}
                                </span>
                              ))}
                              {item.keywords.length > 5 && (
                                <span className="text-xs text-[#8888a0]">+{item.keywords.length - 5} khác</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {filteredUrls.length > 0 && (
                  <div className="px-4 py-3 border-t border-border bg-secondary/30 text-xs text-[#8888a0]">
                    Hiển thị {filteredUrls.length} / {urlDetails.length} URLs
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content Performance Analysis */}
          <ContentPerformanceSection
            data={analysisData}
            isLoading={isLoadingAnalysis}
          />

          {/* URL Analysis with SEO Scores */}
          <URLAnalysisSection
            data={analysisData}
            isLoading={isLoadingAnalysis}
          />

          {/* Opportunity & Declining Keywords */}
          <KeywordInsightsSection
            data={analysisData}
            isLoading={isLoadingAnalysis}
          />
        </>
      )}
    </div>
  );
}

// KPI Card Component
function KPICard({
  label,
  count,
  percent,
  change,
  total,
  color,
  isLoading,
}: {
  label: string;
  count: number;
  percent: number;
  change: number;
  total: number;
  color: 'success' | 'accent' | 'blue' | 'warning';
  isLoading: boolean;
}) {
  const colorClasses = {
    success: 'text-success bg-success/10 border-success/30',
    accent: 'text-accent bg-accent/10 border-accent/30',
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    warning: 'text-warning bg-warning/10 border-warning/30',
  };

  const textColor = {
    success: 'text-success',
    accent: 'text-accent',
    blue: 'text-blue-400',
    warning: 'text-warning',
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-secondary rounded w-16 mb-3"></div>
        <div className="h-10 bg-secondary rounded w-24 mb-2"></div>
        <div className="h-3 bg-secondary rounded w-20"></div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card border rounded-xl p-5", colorClasses[color].split(' ').slice(1).join(' '))}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#8888a0] text-sm font-medium">{label}</span>
        {change !== 0 && (
          <span className={cn(
            "flex items-center gap-0.5 text-xs font-bold",
            change > 0 ? "text-success" : "text-danger"
          )}>
            {change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {change > 0 ? '+' : ''}{change}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-4xl font-bold", textColor[color])}>{percent}%</span>
      </div>
      <p className="text-xs text-[#8888a0] mt-2">
        {count} / {total} từ khóa
      </p>
    </div>
  );
}

// Ranking Growth Chart Component
function RankingGrowthChart({
  data,
  isLoading,
  days,
  onDaysChange,
  projectName,
}: {
  data: RankingGrowthData | null;
  isLoading: boolean;
  days: number;
  onDaysChange: (days: number) => void;
  projectName: string;
}) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="h-80 flex items-center justify-center">
          <div className="animate-pulse text-[#8888a0]">Đang tải biểu đồ...</div>
        </div>
      </div>
    );
  }

  if (!data || data.snapshots.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-accent" />
          <h2 className="font-semibold text-[var(--text-primary)]">Tăng trưởng Ranking</h2>
        </div>
        <div className="h-48 flex flex-col items-center justify-center text-[#8888a0]">
          <TrendingUp className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm">Chưa có dữ liệu ranking</p>
          <p className="text-xs mt-1">Sync dữ liệu từ Cài đặt để theo dõi</p>
        </div>
      </div>
    );
  }

  const { snapshots, summary } = data;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const chartData = snapshots.map((snap) => ({
    ...snap,
    dateLabel: formatDate(snap.date),
  }));

  const getChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <span className="flex items-center gap-1 text-success text-sm font-bold">
          <ArrowUp className="w-4 h-4" />+{change}
        </span>
      );
    }
    if (change < 0) {
      return (
        <span className="flex items-center gap-1 text-danger text-sm font-bold">
          <ArrowDown className="w-4 h-4" />{change}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[#8888a0] text-sm">
        <Minus className="w-4 h-4" />0
      </span>
    );
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string; payload?: { total?: number } }>; label?: string }) => {
    if (active && payload && payload.length) {
      // Get total from the data point
      const total = payload[0]?.payload?.total || 0;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-[var(--text-primary)] font-medium mb-2">{label}</p>
          <p className="text-xs text-[#8888a0] mb-2">Tổng: {total} từ khóa</p>
          {payload.map((entry, index) => {
            const percent = total > 0 ? Math.round((entry.value / total) * 100) : 0;
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.dataKey === 'top3' && 'Top 3: '}
                {entry.dataKey === 'top10' && 'Top 10: '}
                {entry.dataKey === 'top20' && 'Top 20: '}
                {entry.dataKey === 'top30' && 'Top 30: '}
                <span className="font-bold">{entry.value}</span>
                <span className="text-[#8888a0]"> ({percent}%)</span>
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">
              Tăng trưởng Ranking
            </h2>
            <p className="text-xs text-[#8888a0]">{projectName} - {snapshots.length} lần check</p>
          </div>
        </div>
        <select
          value={days}
          onChange={(e) => onDaysChange(parseInt(e.target.value))}
          className="px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm cursor-pointer"
        >
          <option value={7}>7 ngày</option>
          <option value={14}>14 ngày</option>
          <option value={30}>30 ngày</option>
          <option value={60}>60 ngày</option>
          <option value={90}>90 ngày</option>
        </select>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="p-4 border-b border-border bg-secondary/30">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-[#8888a0] mb-1">Top 3</p>
              <p className="text-xl font-bold text-success">{summary.top3Last}</p>
              <div>{getChangeIndicator(summary.top3Change)}</div>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#8888a0] mb-1">Top 10</p>
              <p className="text-xl font-bold text-accent">{summary.top10Last}</p>
              <div>{getChangeIndicator(summary.top10Change)}</div>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#8888a0] mb-1">Top 20</p>
              <p className="text-xl font-bold text-blue-400">{summary.top20Last}</p>
              <div>{getChangeIndicator(summary.top20Change)}</div>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#8888a0] mb-1">Top 30</p>
              <p className="text-xl font-bold text-warning">{summary.top30Last}</p>
              <div>{getChangeIndicator(summary.top30Change)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="p-4">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTop3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTop10" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTop20" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTop30" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" strokeOpacity={0.3} />
              <XAxis dataKey="dateLabel" stroke="#8888a0" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#8888a0" fontSize={12} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => {
                  const labels: Record<string, string> = { top3: 'Top 3', top10: 'Top 10', top20: 'Top 20', top30: 'Top 30' };
                  return <span className="text-[var(--text-primary)] text-sm">{labels[value] || value}</span>;
                }}
              />
              <Area type="monotone" dataKey="top30" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorTop30)" />
              <Area type="monotone" dataKey="top20" stroke="#60a5fa" strokeWidth={2} fillOpacity={1} fill="url(#colorTop20)" />
              <Area type="monotone" dataKey="top10" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorTop10)" />
              <Area type="monotone" dataKey="top3" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorTop3)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Content Performance Section
function ContentPerformanceSection({
  data,
  isLoading,
}: {
  data: AnalysisData | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-secondary rounded w-48"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-secondary rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { contentStats, monthlyContent } = data;

  const monthNames = ['', 'Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
  const chartData = monthlyContent.map((m) => ({
    ...m,
    label: `${monthNames[m.monthNum]}/${m.year.toString().slice(-2)}`,
  }));

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-success/20 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-success" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Hiệu suất Content</h2>
            <p className="text-xs text-[#8888a0]">Phân tích content đã publish và ranking</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-secondary/50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <p className="text-3xl font-bold text-accent">{contentStats.total}</p>
          <p className="text-xs text-[#8888a0] mt-1">Tổng bài đã publish</p>
        </div>

        <div className="bg-secondary/50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <p className="text-3xl font-bold text-success">{contentStats.hasRanking}</p>
          <p className="text-xs text-[#8888a0] mt-1">Có ranking</p>
        </div>

        <div className="bg-secondary/50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-danger" />
          </div>
          <p className="text-3xl font-bold text-danger">{contentStats.noRanking}</p>
          <p className="text-xs text-[#8888a0] mt-1">Chưa có ranking</p>
        </div>

        <div className="bg-secondary/50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Target className="w-5 h-5 text-warning" />
          </div>
          <p className="text-3xl font-bold text-warning">{contentStats.percentEffective}%</p>
          <p className="text-xs text-[#8888a0] mt-1">Tỷ lệ hiệu quả</p>
        </div>
      </div>

      {/* Monthly Chart */}
      {chartData.length > 0 && (
        <div className="p-4 border-t border-border">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">Content theo tháng</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" strokeOpacity={0.3} />
                <XAxis dataKey="label" stroke="#8888a0" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8888a0" fontSize={12} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => {
                    const labels: Record<string, string> = { hasRanking: 'Có ranking', noRanking: 'Chưa ranking' };
                    return <span className="text-[var(--text-primary)] text-sm">{labels[value] || value}</span>;
                  }}
                />
                <Bar dataKey="hasRanking" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="noRanking" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// URL Analysis Section with SEO Scores
function URLAnalysisSection({
  data,
  isLoading,
}: {
  data: AnalysisData | null;
  isLoading: boolean;
}) {
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-secondary rounded w-48"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-secondary rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.urlAnalysis.length === 0) return null;

  const { urlAnalysis } = data;
  const displayData = showAll ? urlAnalysis : urlAnalysis.slice(0, 10);

  const getStatusBadge = (status: URLAnalysis['status']) => {
    switch (status) {
      case 'top10':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">Top 10</span>;
      case 'top30':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning/20 text-warning">Top 30</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-danger/20 text-danger">Thấp</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-[#8888a0]">Chưa ranking</span>;
    }
  };

  const getSEOScoreColor = (score: number | null) => {
    if (score === null) return 'text-[#8888a0]';
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
            <Link2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Phân tích URL & SEO</h2>
            <p className="text-xs text-[#8888a0]">Trạng thái ranking và điểm SEO từng URL</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">URL</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-24">Trạng thái</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-20">Vị trí</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-20">SEO</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Đề xuất</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayData.map((item, idx) => (
              <tr key={idx} className="hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline inline-flex items-center gap-1 max-w-xs"
                  >
                    <span className="truncate">{item.url.replace(/^https?:\/\//, '').slice(0, 50)}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                  {item.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.keywords.slice(0, 3).map((kw, kwIdx) => (
                        <span key={kwIdx} className="text-xs bg-secondary px-1.5 py-0.5 rounded text-[#8888a0]">
                          {kw.keyword} #{kw.position}
                        </span>
                      ))}
                      {item.keywords.length > 3 && (
                        <span className="text-xs text-[#8888a0]">+{item.keywords.length - 3}</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {getStatusBadge(item.status)}
                </td>
                <td className="px-4 py-3 text-center">
                  {item.bestPosition > 0 ? (
                    <span className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold",
                      item.bestPosition <= 3 ? "bg-success/20 text-success" :
                      item.bestPosition <= 10 ? "bg-accent/20 text-accent" :
                      item.bestPosition <= 30 ? "bg-warning/20 text-warning" :
                      "bg-secondary text-[#8888a0]"
                    )}>
                      {item.bestPosition}
                    </span>
                  ) : (
                    <span className="text-[#8888a0]">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {item.seoScore !== null ? (
                    <span className={cn("font-bold", getSEOScoreColor(item.seoScore))}>
                      {item.seoScore}
                    </span>
                  ) : (
                    <span className="text-[#8888a0]">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-[#8888a0]">{item.action}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show More */}
      {urlAnalysis.length > 10 && (
        <div className="p-4 border-t border-border text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-accent hover:underline"
          >
            {showAll ? 'Thu gọn' : `Xem thêm ${urlAnalysis.length - 10} URLs`}
          </button>
        </div>
      )}
    </div>
  );
}

// Keyword Insights Section (Opportunity & Declining)
function KeywordInsightsSection({
  data,
  isLoading,
}: {
  data: AnalysisData | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
            <div className="h-6 bg-secondary rounded w-48 mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-12 bg-secondary rounded-lg"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { opportunityKeywords, decliningKeywords } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Opportunity Keywords */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Cơ hội (11-20)</h2>
              <p className="text-xs text-[#8888a0]">Từ khóa gần top 10, cần thêm effort</p>
            </div>
          </div>
        </div>

        {opportunityKeywords.length === 0 ? (
          <div className="p-6 text-center text-[#8888a0] text-sm">
            Không có từ khóa nào ở vị trí 11-20
          </div>
        ) : (
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {opportunityKeywords.slice(0, 10).map((item, idx) => (
              <div key={idx} className="p-3 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.keyword}</p>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline truncate block"
                    >
                      {item.url.replace(/^https?:\/\//, '').slice(0, 40)}...
                    </a>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold bg-warning/20 text-warning">
                      {item.position}
                    </span>
                    {item.change !== 0 && (
                      <span className={cn(
                        "text-xs font-medium flex items-center gap-0.5",
                        item.change > 0 ? "text-success" : "text-danger"
                      )}>
                        {item.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {Math.abs(item.change)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {opportunityKeywords.length > 10 && (
          <div className="p-3 border-t border-border text-center text-xs text-[#8888a0]">
            +{opportunityKeywords.length - 10} từ khóa khác
          </div>
        )}
      </div>

      {/* Declining Keywords */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-danger/20 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-danger" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Đang giảm</h2>
              <p className="text-xs text-[#8888a0]">Từ khóa giảm 3+ vị trí, cần chú ý</p>
            </div>
          </div>
        </div>

        {decliningKeywords.length === 0 ? (
          <div className="p-6 text-center text-[#8888a0] text-sm">
            Không có từ khóa nào giảm mạnh
          </div>
        ) : (
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {decliningKeywords.slice(0, 10).map((item, idx) => (
              <div key={idx} className="p-3 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.keyword}</p>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline truncate block"
                    >
                      {item.url.replace(/^https?:\/\//, '').slice(0, 40)}...
                    </a>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <div className="text-right">
                      <span className="text-xs text-[#8888a0]">{item.previousPosition} → </span>
                      <span className="text-sm font-bold text-danger">{item.currentPosition}</span>
                    </div>
                    <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-bold bg-danger/20 text-danger">
                      <ArrowDown className="w-3 h-3" />
                      {item.decline}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {decliningKeywords.length > 10 && (
          <div className="p-3 border-t border-border text-center text-xs text-[#8888a0]">
            +{decliningKeywords.length - 10} từ khóa khác
          </div>
        )}
      </div>
    </div>
  );
}
