'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Calendar,
  CheckCircle2,
  XCircle,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronRight,
  ExternalLink,
  Clock,
  AlertCircle,
  Sparkles,
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
import ProgressBar from '@/components/ProgressBar';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';

interface ProjectReport {
  id: string;
  name: string;
  sheet_id: string;
  target: number;
  published: number;
  inProgress: number;
  doneQC: number;
  overdue: number;
  weeklyRate: number;
  requiredRate: number;
  daysRemaining: number;
  projectedTotal: number;
  trend: 'up' | 'down' | 'stable';
  health: 'good' | 'warning' | 'danger';
  bottleneck: string | null;
  topPerformer: { name: string; count: number } | null;
}

interface DailySnapshot {
  date: string;
  top3: number;
  top10: number;
  top20: number;
  top30: number;
  total: number;
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
  const [projects, setProjects] = useState<ProjectReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  // Ranking Growth state
  const [rankingGrowth, setRankingGrowth] = useState<RankingGrowthData | null>(null);
  const [rankingDays, setRankingDays] = useState(30);
  const [rankingProjectId, setRankingProjectId] = useState<string>('');
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchRankingGrowth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankingDays, rankingProjectId]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/report?month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRankingGrowth = async () => {
    setIsLoadingRanking(true);
    try {
      const params = new URLSearchParams({ days: rankingDays.toString() });
      if (rankingProjectId) {
        params.append('projectId', rankingProjectId);
      }
      const res = await fetch(`/api/keyword-rankings/growth?${params}`);
      const data = await res.json();
      setRankingGrowth(data);
    } catch (error) {
      console.error('Failed to fetch ranking growth:', error);
    } finally {
      setIsLoadingRanking(false);
    }
  };

  // Summary calculations
  const summary = useMemo(() => {
    const totalTarget = projects.reduce((sum, p) => sum + p.target, 0);
    const totalPublished = projects.reduce((sum, p) => sum + p.published, 0);
    const totalInProgress = projects.reduce((sum, p) => sum + p.inProgress, 0);
    const totalOverdue = projects.reduce((sum, p) => sum + p.overdue, 0);
    const progress = totalTarget > 0 ? Math.round((totalPublished / totalTarget) * 100) : 0;

    const totalProjected = projects.reduce((sum, p) => sum + p.projectedTotal, 0);
    const willMeetKPI = totalProjected >= totalTarget;

    const atRiskProjects = projects.filter(p => p.projectedTotal < p.target);
    const healthyProjects = projects.filter(p => p.health === 'good');
    const warningProjects = projects.filter(p => p.health === 'warning');
    const dangerProjects = projects.filter(p => p.health === 'danger');

    const avgDaysRemaining = projects.length > 0
      ? Math.round(projects.reduce((sum, p) => sum + p.daysRemaining, 0) / projects.length)
      : 0;

    return {
      totalTarget,
      totalPublished,
      totalInProgress,
      totalOverdue,
      progress,
      totalProjected,
      willMeetKPI,
      atRiskProjects,
      healthyProjects,
      warningProjects,
      dangerProjects,
      avgDaysRemaining,
    };
  }, [projects]);

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">Tổng quan Dự án</h1>
          <p className="text-[#8888a0] text-xs md:text-sm">Xem nhanh tình trạng và vấn đề cần xử lý</p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#8888a0]" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm cursor-pointer"
          >
            {[2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {projects.length > 0 ? (
        <>
          {/* KPI Status Banner */}
          <div className={cn(
            "rounded-xl p-5 border-2",
            summary.willMeetKPI
              ? "bg-success/10 border-success/30"
              : "bg-danger/10 border-danger/30"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {summary.willMeetKPI ? (
                  <div className="w-14 h-14 rounded-xl bg-success/20 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-success" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-danger/20 flex items-center justify-center">
                    <XCircle className="w-7 h-7 text-danger" />
                  </div>
                )}
                <div>
                  <p className={cn(
                    "font-bold text-xl",
                    summary.willMeetKPI ? "text-success" : "text-danger"
                  )}>
                    {summary.willMeetKPI ? 'Đang đúng tiến độ' : 'Cần tăng tốc'}
                  </p>
                  <p className="text-[#8888a0] text-sm">
                    Dự báo đạt <span className="font-bold text-[var(--text-primary)]">{summary.totalProjected}</span> / {summary.totalTarget} bài
                    {!summary.willMeetKPI && (
                      <span className="text-danger ml-1">(thiếu {summary.totalTarget - summary.totalProjected})</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-4xl font-bold text-[var(--text-primary)]">{summary.progress}%</p>
                <p className="text-xs text-[#8888a0]">Hoàn thành tháng {selectedMonth}</p>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Target className="w-5 h-5" />}
              label="Đã publish"
              value={summary.totalPublished}
              subValue={`/ ${summary.totalTarget}`}
              color="success"
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              label="Đang làm"
              value={summary.totalInProgress}
              subValue="bài"
              color="warning"
            />
            <StatCard
              icon={<AlertTriangle className="w-5 h-5" />}
              label="Trễ deadline"
              value={summary.totalOverdue}
              subValue="bài"
              color={summary.totalOverdue > 0 ? 'danger' : 'success'}
            />
            <StatCard
              icon={<Calendar className="w-5 h-5" />}
              label="Còn lại"
              value={summary.avgDaysRemaining}
              subValue="ngày"
              color={summary.avgDaysRemaining < 7 ? 'danger' : 'accent'}
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Project Status */}
            <div className="space-y-4">
              <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-accent" />
                Trạng thái dự án
              </h2>

              {/* Project Cards */}
              <div className="space-y-3">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>

            {/* Right: Issues & Actions */}
            <div className="space-y-4">
              <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-danger" />
                Vấn đề cần xử lý
              </h2>

              {/* Issues List */}
              <div className="space-y-3">
                {/* Overdue Tasks */}
                {summary.totalOverdue > 0 && (
                  <IssueCard
                    type="danger"
                    title={`${summary.totalOverdue} bài trễ deadline`}
                    description="Cần ưu tiên xử lý ngay"
                    projects={projects.filter(p => p.overdue > 0).map(p => ({
                      name: p.name,
                      count: p.overdue
                    }))}
                  />
                )}

                {/* At Risk Projects */}
                {summary.atRiskProjects.length > 0 && (
                  <IssueCard
                    type="warning"
                    title={`${summary.atRiskProjects.length} dự án nguy cơ không đạt KPI`}
                    description="Cần tăng tốc độ publish"
                    projects={summary.atRiskProjects.map(p => ({
                      name: p.name,
                      count: p.target - p.projectedTotal,
                      suffix: 'thiếu'
                    }))}
                  />
                )}

                {/* Bottlenecks */}
                {projects.some(p => p.bottleneck) && (
                  <IssueCard
                    type="info"
                    title="Điểm nghẽn cần giải quyết"
                    description="Các giai đoạn đang tắc"
                    items={projects.filter(p => p.bottleneck).map(p => ({
                      project: p.name,
                      issue: p.bottleneck!
                    }))}
                  />
                )}

                {/* All Good */}
                {summary.totalOverdue === 0 && summary.atRiskProjects.length === 0 && (
                  <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-success" />
                    <div>
                      <p className="font-semibold text-success">Mọi thứ đang tốt!</p>
                      <p className="text-sm text-[#8888a0]">Không có vấn đề cần xử lý</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Project Health Summary */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-medium text-[var(--text-primary)] mb-3">Sức khỏe dự án</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-success/10 rounded-lg">
                    <p className="text-2xl font-bold text-success">{summary.healthyProjects.length}</p>
                    <p className="text-xs text-[#8888a0]">Tốt</p>
                  </div>
                  <div className="text-center p-3 bg-warning/10 rounded-lg">
                    <p className="text-2xl font-bold text-warning">{summary.warningProjects.length}</p>
                    <p className="text-xs text-[#8888a0]">Cần chú ý</p>
                  </div>
                  <div className="text-center p-3 bg-danger/10 rounded-lg">
                    <p className="text-2xl font-bold text-danger">{summary.dangerProjects.length}</p>
                    <p className="text-xs text-[#8888a0]">Nguy hiểm</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ranking Growth Section - Full Width */}
          <RankingGrowthSection
            data={rankingGrowth}
            isLoading={isLoadingRanking}
            days={rankingDays}
            onDaysChange={setRankingDays}
            projects={projects}
            selectedProjectId={rankingProjectId}
            onProjectChange={setRankingProjectId}
          />
        </>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="Chưa có dự án"
          description="Thêm dự án trong phần Cài đặt để bắt đầu"
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subValue: string;
  color: 'success' | 'warning' | 'danger' | 'accent';
}) {
  const colorClasses = {
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    danger: 'text-danger bg-danger/10',
    accent: 'text-accent bg-accent/10',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", colorClasses[color])}>
        {icon}
      </div>
      <p className="text-[#8888a0] text-xs">{label}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <span className={cn("text-2xl font-bold", colorClasses[color].split(' ')[0])}>{value}</span>
        <span className="text-[#8888a0] text-sm">{subValue}</span>
      </div>
    </div>
  );
}

// Project Card Component
function ProjectCard({ project }: { project: ProjectReport }) {
  const progress = project.target > 0 ? Math.round((project.published / project.target) * 100) : 0;
  const willMeet = project.projectedTotal >= project.target;

  return (
    <div className={cn(
      "bg-card border rounded-xl p-4 hover:bg-secondary/30 transition-colors cursor-pointer",
      project.health === 'good' ? "border-success/30" :
      project.health === 'warning' ? "border-warning/30" : "border-danger/30"
    )}
    onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${project.sheet_id}`, '_blank')}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-3 h-3 rounded-full",
            project.health === 'good' ? 'bg-success' :
            project.health === 'warning' ? 'bg-warning' : 'bg-danger'
          )} />
          <h3 className="font-semibold text-[var(--text-primary)]">{project.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          {project.trend === 'up' && <TrendingUp className="w-4 h-4 text-success" />}
          {project.trend === 'down' && <TrendingDown className="w-4 h-4 text-danger" />}
          <ExternalLink className="w-4 h-4 text-[#8888a0]" />
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1">
          <ProgressBar value={project.published} max={project.target} showLabel={false} size="sm" />
        </div>
        <span className={cn(
          "text-sm font-bold",
          progress >= 80 ? "text-success" : progress >= 50 ? "text-warning" : "text-danger"
        )}>
          {progress}%
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span>
            <span className="text-success font-bold">{project.published}</span>
            <span className="text-[#8888a0]">/{project.target}</span>
          </span>
          {project.inProgress > 0 && (
            <span className="text-warning">{project.inProgress} đang làm</span>
          )}
          {project.overdue > 0 && (
            <span className="text-danger">{project.overdue} trễ</span>
          )}
        </div>
        <span className={cn(
          "px-2 py-0.5 rounded text-xs font-medium",
          willMeet ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
        )}>
          {willMeet ? 'Đạt KPI' : `Thiếu ${project.target - project.projectedTotal}`}
        </span>
      </div>
    </div>
  );
}

// Issue Card Component
function IssueCard({
  type,
  title,
  description,
  projects,
  items,
}: {
  type: 'danger' | 'warning' | 'info';
  title: string;
  description: string;
  projects?: { name: string; count: number; suffix?: string }[];
  items?: { project: string; issue: string }[];
}) {
  const colorClasses = {
    danger: 'bg-danger/10 border-danger/30',
    warning: 'bg-warning/10 border-warning/30',
    info: 'bg-accent/10 border-accent/30',
  };

  const textClasses = {
    danger: 'text-danger',
    warning: 'text-warning',
    info: 'text-accent',
  };

  return (
    <div className={cn("border rounded-xl p-4", colorClasses[type])}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className={cn("font-semibold", textClasses[type])}>{title}</p>
          <p className="text-sm text-[#8888a0]">{description}</p>
        </div>
      </div>
      {projects && projects.length > 0 && (
        <div className="mt-3 space-y-1">
          {projects.map((p) => (
            <div key={p.name} className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-primary)]">{p.name}</span>
              <span className={textClasses[type]}>
                {p.suffix && `${p.suffix} `}{p.count} bài
              </span>
            </div>
          ))}
        </div>
      )}
      {items && items.length > 0 && (
        <div className="mt-3 space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <ChevronRight className="w-4 h-4 text-[#8888a0]" />
              <span className="text-[var(--text-primary)] font-medium">{item.project}:</span>
              <span className="text-[#8888a0]">{item.issue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Ranking Growth Section Component
function RankingGrowthSection({
  data,
  isLoading,
  days,
  onDaysChange,
  projects,
  selectedProjectId,
  onProjectChange,
}: {
  data: RankingGrowthData | null;
  isLoading: boolean;
  days: number;
  onDaysChange: (days: number) => void;
  projects: ProjectReport[];
  selectedProjectId: string;
  onProjectChange: (projectId: string) => void;
}) {
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-[#8888a0]">Đang tải...</div>
        </div>
      </div>
    );
  }

  if (!data || data.snapshots.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-accent" />
          <h2 className="font-semibold text-[var(--text-primary)]">Tăng trưởng Keyword Ranking</h2>
        </div>
        <div className="h-32 flex flex-col items-center justify-center text-[#8888a0]">
          <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
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
        <span className="flex items-center gap-1 text-success font-bold">
          <ArrowUp className="w-4 h-4" />+{change}
        </span>
      );
    }
    if (change < 0) {
      return (
        <span className="flex items-center gap-1 text-danger font-bold">
          <ArrowDown className="w-4 h-4" />{change}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[#8888a0]">
        <Minus className="w-4 h-4" />0
      </span>
    );
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-[var(--text-primary)] font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'top3' && 'Top 3: '}
              {entry.dataKey === 'top10' && 'Top 10: '}
              {entry.dataKey === 'top20' && 'Top 20: '}
              {entry.dataKey === 'top30' && 'Top 30: '}
              <span className="font-bold">{entry.value}</span> từ khóa
            </p>
          ))}
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
            <BarChart3 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">
              Tăng trưởng Ranking
              {selectedProject && (
                <span className="text-accent ml-2">- {selectedProject.name}</span>
              )}
            </h2>
            <p className="text-xs text-[#8888a0]">{snapshots.length} lần check trong {days} ngày</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => onProjectChange(e.target.value)}
            className="px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm cursor-pointer"
          >
            <option value="">Tất cả dự án</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
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
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="p-4 border-b border-border bg-secondary/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-[#8888a0] mb-1">Top 3</p>
              <p className="text-2xl font-bold text-success">{summary.top3Last}</p>
              <div className="text-sm">{getChangeIndicator(summary.top3Change)}</div>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#8888a0] mb-1">Top 10</p>
              <p className="text-2xl font-bold text-accent">{summary.top10Last}</p>
              <div className="text-sm">{getChangeIndicator(summary.top10Change)}</div>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#8888a0] mb-1">Top 20</p>
              <p className="text-2xl font-bold text-blue-400">{summary.top20Last}</p>
              <div className="text-sm">{getChangeIndicator(summary.top20Change)}</div>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#8888a0] mb-1">Top 30</p>
              <p className="text-2xl font-bold text-warning">{summary.top30Last}</p>
              <div className="text-sm">{getChangeIndicator(summary.top30Change)}</div>
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
