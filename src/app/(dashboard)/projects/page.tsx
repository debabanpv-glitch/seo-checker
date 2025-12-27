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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Ranking Growth state
  const [rankingGrowth, setRankingGrowth] = useState<RankingGrowthData | null>(null);
  const [rankingDays, setRankingDays] = useState(30);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch ranking data when project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchRankingGrowth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankingDays, selectedProjectId]);

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
