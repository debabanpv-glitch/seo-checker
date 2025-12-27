'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Target,
  Users,
  ExternalLink,
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Zap,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';

interface WeeklyData {
  weekNum: number;
  count: number;
  target: number;
  isCurrent: boolean;
}

interface PicDetail {
  name: string;
  published: number;
  inProgress: number;
  doneQC: number;
  overdue: number;
  total: number;
}

interface Pipeline {
  doingOutline: number;
  qcOutline: number;
  fixingOutline: number;
  doingContent: number;
  qcContent: number;
  fixingContent: number;
  waitPublish: number;
}

interface DeadlineDistribution {
  overdue: number;
  dueSoon: number;
  dueThisWeek: number;
  later: number;
  noDeadline: number;
}

interface ActiveTask {
  id: string;
  title: string;
  pic: string;
  status_outline: string;
  status_content: string;
  deadline: string;
  isOverdue: boolean;
}

interface RecentPublished {
  id: string;
  title: string;
  pic: string;
  publish_date: string;
  link_publish: string;
}

interface ProjectReport {
  id: string;
  name: string;
  sheet_id: string;
  sheet_name: string;
  target: number;
  published: number;
  inProgress: number;
  doneQC: number;
  overdue: number;
  weeklyBreakdown: WeeklyData[];
  weeklyTarget: number;
  prevPublished: number;
  momChange: number;
  weeklyRate: number;
  requiredRate: number;
  daysRemaining: number;
  projectedTotal: number;
  trend: 'up' | 'down' | 'stable';
  health: 'good' | 'warning' | 'danger';
  bottleneck: string | null;
  pics: string[];
  topPerformer: { name: string; count: number } | null;
  // NEW detailed analytics
  picDetails: PicDetail[];
  pipeline: Pipeline;
  deadlineDistribution: DeadlineDistribution;
  activeTasks: ActiveTask[];
  recentPublished: RecentPublished[];
}

interface ReportMeta {
  selectedMonth: number;
  selectedYear: number;
  prevMonth: number;
  prevYear: number;
  isCurrentMonth: boolean;
  weeksInMonth: number;
  currentWeekInMonth: number;
}

// Ranking Growth interfaces
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
    totalChange: number;
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
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  // Ranking Growth state
  const [rankingGrowth, setRankingGrowth] = useState<RankingGrowthData | null>(null);
  const [rankingDays, setRankingDays] = useState(30);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchRankingGrowth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchRankingGrowth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankingDays]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/report?month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      setProjects(data.projects || []);
      setMeta(data.meta || null);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRankingGrowth = async () => {
    setIsLoadingRanking(true);
    try {
      const res = await fetch(`/api/keyword-rankings/growth?days=${rankingDays}`);
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
    const totalPrevPublished = projects.reduce((sum, p) => sum + p.prevPublished, 0);
    const progress = totalTarget > 0 ? Math.round((totalPublished / totalTarget) * 100) : 0;
    const remaining = totalTarget - totalPublished;

    // Calculate overall projected
    const totalProjected = projects.reduce((sum, p) => sum + p.projectedTotal, 0);
    const willMeetKPI = totalProjected >= totalTarget;

    // Calculate overall MoM change
    const totalMomChange = totalPrevPublished > 0
      ? Math.round(((totalPublished - totalPrevPublished) / totalPrevPublished) * 100)
      : totalPublished > 0 ? 100 : 0;

    // Projects at risk (won't meet KPI)
    const atRiskProjects = projects.filter(p => p.projectedTotal < p.target);

    // Best performers
    const allPerformers: { name: string; count: number; project: string }[] = [];
    projects.forEach(p => {
      if (p.topPerformer) {
        allPerformers.push({ ...p.topPerformer, project: p.name });
      }
    });
    allPerformers.sort((a, b) => b.count - a.count);

    return {
      totalTarget,
      totalPublished,
      totalInProgress,
      totalOverdue,
      totalPrevPublished,
      totalMomChange,
      progress,
      remaining,
      totalProjected,
      willMeetKPI,
      atRiskProjects,
      topPerformers: allPerformers.slice(0, 5),
    };
  }, [projects]);

  // Calculate average days remaining
  const avgDaysRemaining = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + p.daysRemaining, 0) / projects.length)
    : 0;

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">Phân tích Dự án</h1>
          <p className="text-[#8888a0] text-xs md:text-sm">Insights để đưa ra quyết định</p>
        </div>

        {/* Month/Year Picker */}
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
          {/* Key Insight Banner */}
          <div className={cn(
            "rounded-xl p-4 border-2",
            summary.willMeetKPI
              ? "bg-success/10 border-success/30"
              : "bg-danger/10 border-danger/30"
          )}>
            <div className="flex items-start gap-3">
              {summary.willMeetKPI ? (
                <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-danger flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={cn(
                  "font-semibold text-lg",
                  summary.willMeetKPI ? "text-success" : "text-danger"
                )}>
                  {summary.willMeetKPI
                    ? `Dự kiến đạt KPI tháng ${selectedMonth}`
                    : `Cần tăng tốc để đạt KPI tháng ${selectedMonth}`}
                </p>
                <p className="text-[#8888a0] text-sm mt-1">
                  {summary.willMeetKPI
                    ? `Dự báo: ${summary.totalProjected}/${summary.totalTarget} bài (${Math.round((summary.totalProjected / summary.totalTarget) * 100)}%)`
                    : `Dự báo: ${summary.totalProjected}/${summary.totalTarget} bài - Thiếu ${summary.totalTarget - summary.totalProjected} bài`}
                </p>
                {!summary.willMeetKPI && summary.atRiskProjects.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {summary.atRiskProjects.map(p => (
                      <span key={p.id} className="px-2 py-1 bg-danger/20 text-danger rounded text-xs font-medium">
                        {p.name}: thiếu {p.target - p.projectedTotal} bài
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-3xl font-bold text-[var(--text-primary)]">{summary.progress}%</p>
                <p className="text-xs text-[#8888a0]">Hoàn thành</p>
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <QuickStat
              label="Đã Publish"
              value={summary.totalPublished}
              subValue={`/${summary.totalTarget}`}
              trend={summary.totalMomChange}
              color="success"
            />
            <QuickStat
              label="Còn lại"
              value={summary.remaining}
              subValue="bài"
              color={summary.remaining > 20 ? 'danger' : summary.remaining > 10 ? 'warning' : 'success'}
            />
            <QuickStat
              label="Đang làm"
              value={summary.totalInProgress}
              subValue="bài"
              color="warning"
            />
            <QuickStat
              label="Trễ deadline"
              value={summary.totalOverdue}
              subValue="bài"
              color={summary.totalOverdue > 0 ? 'danger' : 'success'}
            />
            <QuickStat
              label="Còn"
              value={avgDaysRemaining}
              subValue="ngày"
              color={avgDaysRemaining < 7 ? 'danger' : avgDaysRemaining < 14 ? 'warning' : 'accent'}
            />
          </div>

          {/* Ranking Growth Section */}
          <RankingGrowthSection
            data={rankingGrowth}
            isLoading={isLoadingRanking}
            days={rankingDays}
            onDaysChange={setRankingDays}
          />

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Project Performance Table */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold text-[var(--text-primary)]">Hiệu suất theo Dự án</h2>
                <span className="text-xs text-[#8888a0]">{projects.length} dự án</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50">
                    <tr className="text-left text-xs text-[#8888a0]">
                      <th className="px-4 py-3 font-medium">Dự án</th>
                      <th className="px-4 py-3 font-medium text-center">Publish</th>
                      <th className="px-4 py-3 font-medium text-center">Tiến độ</th>
                      <th className="px-4 py-3 font-medium text-center">Tốc độ</th>
                      <th className="px-4 py-3 font-medium text-center">Dự báo</th>
                      <th className="px-4 py-3 font-medium text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {projects.map((project) => {
                      const progress = project.target > 0 ? Math.round((project.published / project.target) * 100) : 0;
                      const willMeet = project.projectedTotal >= project.target;

                      return (
                        <tr key={project.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full flex-shrink-0",
                                project.health === 'good' ? 'bg-success' :
                                project.health === 'warning' ? 'bg-warning' : 'bg-danger'
                              )} />
                              <span className="text-[var(--text-primary)] font-medium truncate max-w-[150px]">
                                {project.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-success font-bold">{project.published}</span>
                            <span className="text-[#8888a0]">/{project.target}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-16">
                                <ProgressBar value={project.published} max={project.target} showLabel={false} size="sm" />
                              </div>
                              <span className={cn(
                                "text-xs font-medium w-8",
                                progress >= 80 ? "text-success" : progress >= 50 ? "text-warning" : "text-danger"
                              )}>
                                {progress}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {project.trend === 'up' ? (
                                <TrendingUp className="w-3 h-3 text-success" />
                              ) : project.trend === 'down' ? (
                                <TrendingDown className="w-3 h-3 text-danger" />
                              ) : null}
                              <span className={cn(
                                "text-sm",
                                project.weeklyRate >= project.requiredRate ? "text-success" : "text-[#8888a0]"
                              )}>
                                {project.weeklyRate.toFixed(1)}/tuần
                              </span>
                            </div>
                            <p className="text-[10px] text-[#8888a0]">cần {project.requiredRate.toFixed(1)}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn(
                              "font-bold",
                              willMeet ? "text-success" : "text-danger"
                            )}>
                              {project.projectedTotal}
                            </span>
                            {!willMeet && (
                              <p className="text-[10px] text-danger">-{project.target - project.projectedTotal}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {willMeet ? (
                              <span className="px-2 py-1 bg-success/20 text-success rounded text-xs font-medium">
                                Đạt KPI
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-danger/20 text-danger rounded text-xs font-medium">
                                Nguy hiểm
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-4">
              {/* Top Performers */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-accent" />
                  <h3 className="font-semibold text-[var(--text-primary)]">Top Contributors</h3>
                </div>
                {summary.topPerformers.length > 0 ? (
                  <div className="space-y-3">
                    {summary.topPerformers.map((person, idx) => (
                      <div key={person.name} className="flex items-center gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          idx === 0 ? "bg-yellow-500/20 text-yellow-500" :
                          idx === 1 ? "bg-gray-400/20 text-gray-400" :
                          idx === 2 ? "bg-orange-500/20 text-orange-500" :
                          "bg-secondary text-[#8888a0]"
                        )}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--text-primary)] text-sm font-medium truncate">{person.name}</p>
                          <p className="text-[10px] text-[#8888a0] truncate">{person.project}</p>
                        </div>
                        <span className="text-accent font-bold">{person.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#8888a0] text-sm text-center py-4">Chưa có dữ liệu</p>
                )}
              </div>

              {/* Action Items */}
              {(summary.totalOverdue > 0 || summary.atRiskProjects.length > 0) && (
                <div className="bg-danger/10 border border-danger/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-danger" />
                    <h3 className="font-semibold text-danger">Cần hành động</h3>
                  </div>
                  <div className="space-y-2">
                    {summary.totalOverdue > 0 && (
                      <div className="flex items-start gap-2 text-sm">
                        <ArrowRight className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                        <p className="text-[var(--text-primary)]">
                          Xử lý <span className="text-danger font-bold">{summary.totalOverdue}</span> bài trễ deadline
                        </p>
                      </div>
                    )}
                    {summary.atRiskProjects.length > 0 && (
                      <div className="flex items-start gap-2 text-sm">
                        <ArrowRight className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                        <p className="text-[var(--text-primary)]">
                          Tăng tốc <span className="text-danger font-bold">{summary.atRiskProjects.length}</span> dự án có nguy cơ không đạt KPI
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Week-by-Week Comparison */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-accent" />
                  <h3 className="font-semibold text-[var(--text-primary)]">So sánh tuần</h3>
                </div>
                {projects.length > 0 && projects[0].weeklyBreakdown && (
                  <div className="space-y-3">
                    {/* Get max weeks */}
                    {projects[0].weeklyBreakdown.map((week) => {
                      const weekTotal = projects.reduce((sum, p) => {
                        const w = p.weeklyBreakdown.find(wb => wb.weekNum === week.weekNum);
                        return sum + (w?.count || 0);
                      }, 0);
                      const weekTarget = projects.reduce((sum, p) => {
                        const w = p.weeklyBreakdown.find(wb => wb.weekNum === week.weekNum);
                        return sum + (w?.target || 0);
                      }, 0);
                      const isAchieved = weekTotal >= weekTarget;

                      return (
                        <div key={week.weekNum} className="flex items-center gap-3">
                          <div className={cn(
                            "w-16 py-1 text-center rounded text-xs font-medium",
                            week.isCurrent ? "bg-accent text-white" : "bg-secondary text-[#8888a0]"
                          )}>
                            Tuần {week.weekNum}
                          </div>
                          <div className="flex-1">
                            <ProgressBar value={weekTotal} max={weekTarget || 1} showLabel={false} size="sm" />
                          </div>
                          <span className={cn(
                            "text-sm font-bold w-12 text-right",
                            isAchieved ? "text-success" : weekTotal > 0 ? "text-warning" : "text-[#8888a0]"
                          )}>
                            {weekTotal}/{weekTarget}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Project Cards - Collapsible */}
          <div className="space-y-3">
            <h2 className="font-semibold text-[var(--text-primary)]">Chi tiết từng dự án</h2>
            {projects.map((project) => (
              <DetailedProjectCard key={project.id} project={project} meta={meta} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="Chưa có dữ liệu"
          description="Thêm dự án trong phần Cài đặt để bắt đầu theo dõi"
        />
      )}
    </div>
  );
}

// Quick Stat Component
function QuickStat({
  label,
  value,
  subValue,
  trend,
  color,
}: {
  label: string;
  value: number;
  subValue: string;
  trend?: number;
  color: 'success' | 'warning' | 'danger' | 'accent';
}) {
  const colorClasses = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    accent: 'text-accent',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-[#8888a0] text-xs mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-2xl font-bold", colorClasses[color])}>{value}</span>
        <span className="text-[#8888a0] text-sm">{subValue}</span>
      </div>
      {trend !== undefined && trend !== 0 && (
        <div className="flex items-center gap-1 mt-1">
          {trend > 0 ? (
            <TrendingUp className="w-3 h-3 text-success" />
          ) : (
            <TrendingDown className="w-3 h-3 text-danger" />
          )}
          <span className={cn(
            "text-xs font-medium",
            trend > 0 ? "text-success" : "text-danger"
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        </div>
      )}
    </div>
  );
}

// Detailed Project Card
function DetailedProjectCard({
  project,
  meta,
}: {
  project: ProjectReport;
  meta: ReportMeta | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const progress = project.target > 0 ? Math.round((project.published / project.target) * 100) : 0;
  const willMeet = project.projectedTotal >= project.target;

  return (
    <div className={cn(
      "bg-card border rounded-xl overflow-hidden transition-all",
      project.health === 'good' ? "border-success/30" :
      project.health === 'warning' ? "border-warning/30" : "border-danger/30"
    )}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-4 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className={cn(
          "w-3 h-3 rounded-full flex-shrink-0",
          project.health === 'good' ? 'bg-success' :
          project.health === 'warning' ? 'bg-warning' : 'bg-danger'
        )} />

        <div className="flex-1 min-w-0">
          <h3 className="text-[var(--text-primary)] font-semibold truncate">{project.name}</h3>
          <div className="flex items-center gap-3 text-sm mt-1">
            <span className="text-success font-bold">{project.published}</span>
            <span className="text-[#8888a0]">/</span>
            <span className="text-[var(--text-primary)]">{project.target}</span>
            {project.inProgress > 0 && (
              <>
                <span className="text-[#8888a0]">•</span>
                <span className="text-warning">{project.inProgress} đang làm</span>
              </>
            )}
            {project.overdue > 0 && (
              <>
                <span className="text-[#8888a0]">•</span>
                <span className="text-danger">{project.overdue} trễ</span>
              </>
            )}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4">
          <div className="w-24">
            <ProgressBar value={project.published} max={project.target} showLabel={false} size="sm" />
          </div>
          <span className={cn(
            "text-sm font-bold w-10",
            progress >= 80 ? "text-success" : progress >= 50 ? "text-warning" : "text-danger"
          )}>
            {progress}%
          </span>
          <span className={cn(
            "px-2 py-1 rounded text-xs font-medium",
            willMeet ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
          )}>
            {willMeet ? 'Đạt KPI' : `Thiếu ${project.target - project.projectedTotal}`}
          </span>
        </div>

        <ExternalLink
          className="w-4 h-4 text-[#8888a0] hover:text-accent flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://docs.google.com/spreadsheets/d/${project.sheet_id}`, '_blank');
          }}
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50">
          {/* Weekly Progress */}
          <div className="pt-4">
            <p className="text-xs text-[#8888a0] mb-3">Tiến độ theo tuần</p>
            <div className="grid grid-cols-5 gap-2">
              {project.weeklyBreakdown.map((week) => {
                const isAchieved = week.count >= week.target;
                return (
                  <div
                    key={week.weekNum}
                    className={cn(
                      "text-center p-2 rounded-lg relative",
                      week.isCurrent ? "ring-2 ring-accent" : "",
                      isAchieved ? "bg-success/20" : week.count > 0 ? "bg-warning/20" : "bg-secondary"
                    )}
                  >
                    {week.isCurrent && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-accent text-white px-1.5 py-0.5 rounded">
                        Now
                      </span>
                    )}
                    <p className="text-xs text-[#8888a0]">T{week.weekNum}</p>
                    <p className={cn(
                      "text-xl font-bold",
                      isAchieved ? "text-success" : week.count > 0 ? "text-warning" : "text-[#8888a0]"
                    )}>
                      {week.count}
                    </p>
                    <p className="text-xs text-[#8888a0]">/{week.target}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-[#8888a0]" />
                <span className="text-xs text-[#8888a0]">Tốc độ cần</span>
              </div>
              <p className="text-lg font-bold text-[var(--text-primary)]">{project.requiredRate.toFixed(1)}/tuần</p>
              <p className="text-xs text-[#8888a0]">còn {project.daysRemaining} ngày</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-[#8888a0]" />
                <span className="text-xs text-[#8888a0]">Tốc độ thực tế</span>
              </div>
              <p className={cn(
                "text-lg font-bold",
                project.weeklyRate >= project.requiredRate ? "text-success" : "text-danger"
              )}>
                {project.weeklyRate.toFixed(1)}/tuần
              </p>
              <p className="text-xs text-[#8888a0]">
                {project.weeklyRate >= project.requiredRate ? 'Đang đạt' : 'Chưa đạt'}
              </p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-[#8888a0]" />
                <span className="text-xs text-[#8888a0]">Dự báo cuối tháng</span>
              </div>
              <p className={cn(
                "text-lg font-bold",
                willMeet ? "text-success" : "text-danger"
              )}>
                {project.projectedTotal} bài
              </p>
              <p className="text-xs text-[#8888a0]">
                {willMeet ? 'Đạt KPI' : `Thiếu ${project.target - project.projectedTotal}`}
              </p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-[#8888a0]" />
                <span className="text-xs text-[#8888a0]">Trễ deadline</span>
              </div>
              <p className={cn(
                "text-lg font-bold",
                project.overdue > 0 ? "text-danger" : "text-success"
              )}>
                {project.overdue}
              </p>
              <p className="text-xs text-[#8888a0]">
                {project.overdue > 0 ? 'Cần xử lý' : 'Không có'}
              </p>
            </div>
          </div>

          {/* MoM Comparison */}
          {meta && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-[#8888a0] mb-2">So sánh với tháng trước</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-lg font-bold text-[var(--text-primary)]">{project.published}</span>
                    <span className="text-sm text-[#8888a0]"> (T{meta.selectedMonth})</span>
                  </div>
                  <span className="text-[#8888a0]">vs</span>
                  <div>
                    <span className="text-lg font-bold text-[var(--text-primary)]">{project.prevPublished}</span>
                    <span className="text-sm text-[#8888a0]"> (T{meta.prevMonth})</span>
                  </div>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded font-bold text-sm flex items-center gap-1",
                  project.momChange > 0 ? "bg-success/20 text-success" :
                  project.momChange < 0 ? "bg-danger/20 text-danger" :
                  "bg-secondary text-[#8888a0]"
                )}>
                  {project.momChange > 0 ? '+' : ''}{project.momChange}%
                  {project.momChange > 0 && <TrendingUp className="w-3 h-3" />}
                  {project.momChange < 0 && <TrendingDown className="w-3 h-3" />}
                </span>
              </div>
            </div>
          )}

          {/* Bottleneck & Top Performer */}
          <div className="grid md:grid-cols-2 gap-3">
            {project.bottleneck && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                <p className="text-xs text-warning mb-1">Điểm nghẽn</p>
                <p className="text-[var(--text-primary)] text-sm font-medium">{project.bottleneck}</p>
              </div>
            )}
            {project.topPerformer && (
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
                <p className="text-xs text-accent mb-1">Top contributor</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
                    <span className="text-accent text-xs font-bold">
                      {project.topPerformer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[var(--text-primary)] text-sm">{project.topPerformer.name}</span>
                  <span className="text-accent font-bold ml-auto">{project.topPerformer.count} bài</span>
                </div>
              </div>
            )}
          </div>

          {/* NEW: Pipeline Status - Visual Flow */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <p className="text-xs text-[#8888a0] mb-3 font-medium">Pipeline bài viết</p>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              <PipelineStage label="Viết outline" count={project.pipeline.doingOutline} color="blue" />
              <PipelineArrow />
              <PipelineStage label="QC outline" count={project.pipeline.qcOutline} color="yellow" />
              <PipelineArrow />
              <PipelineStage label="Fix outline" count={project.pipeline.fixingOutline} color="orange" />
              <PipelineArrow />
              <PipelineStage label="Viết content" count={project.pipeline.doingContent} color="blue" />
              <PipelineArrow />
              <PipelineStage label="QC content" count={project.pipeline.qcContent} color="yellow" />
              <PipelineArrow />
              <PipelineStage label="Fix content" count={project.pipeline.fixingContent} color="orange" />
              <PipelineArrow />
              <PipelineStage label="Chờ publish" count={project.pipeline.waitPublish} color="green" />
            </div>
          </div>

          {/* NEW: Team Performance Table */}
          {project.picDetails && project.picDetails.length > 0 && (
            <div className="bg-secondary/30 rounded-lg p-4">
              <p className="text-xs text-[#8888a0] mb-3 font-medium">Hiệu suất theo người</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#8888a0] text-xs">
                      <th className="text-left py-2 font-medium">PIC</th>
                      <th className="text-center py-2 font-medium">Tổng</th>
                      <th className="text-center py-2 font-medium">Publish</th>
                      <th className="text-center py-2 font-medium">Đang làm</th>
                      <th className="text-center py-2 font-medium">Done QC</th>
                      <th className="text-center py-2 font-medium">Trễ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {project.picDetails.map((pic) => (
                      <tr key={pic.name} className="hover:bg-secondary/50">
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-accent text-xs font-bold">
                                {pic.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-[var(--text-primary)] truncate max-w-[100px]">{pic.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-2 text-[var(--text-primary)] font-medium">{pic.total}</td>
                        <td className="text-center py-2 text-success font-bold">{pic.published}</td>
                        <td className="text-center py-2 text-warning">{pic.inProgress}</td>
                        <td className="text-center py-2 text-accent">{pic.doneQC}</td>
                        <td className="text-center py-2">
                          {pic.overdue > 0 ? (
                            <span className="text-danger font-bold">{pic.overdue}</span>
                          ) : (
                            <span className="text-[#8888a0]">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* NEW: Deadline Distribution */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <p className="text-xs text-[#8888a0] mb-3 font-medium">Phân bổ deadline</p>
            <div className="grid grid-cols-5 gap-2">
              <DeadlineBadge
                label="Quá hạn"
                count={project.deadlineDistribution.overdue}
                color="danger"
              />
              <DeadlineBadge
                label="3 ngày tới"
                count={project.deadlineDistribution.dueSoon}
                color="warning"
              />
              <DeadlineBadge
                label="7 ngày tới"
                count={project.deadlineDistribution.dueThisWeek}
                color="accent"
              />
              <DeadlineBadge
                label="Sau đó"
                count={project.deadlineDistribution.later}
                color="success"
              />
              <DeadlineBadge
                label="Không có"
                count={project.deadlineDistribution.noDeadline}
                color="gray"
              />
            </div>
          </div>

          {/* NEW: Active Tasks List */}
          {project.activeTasks && project.activeTasks.length > 0 && (
            <div className="bg-secondary/30 rounded-lg p-4">
              <p className="text-xs text-[#8888a0] mb-3 font-medium">
                Bài đang thực hiện ({project.activeTasks.length})
              </p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {project.activeTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg",
                      task.isOverdue ? "bg-danger/10 border border-danger/30" : "bg-card"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--text-primary)] text-sm truncate">{task.title}</p>
                      <div className="flex items-center gap-2 text-xs text-[#8888a0] mt-0.5">
                        {task.pic && <span>{task.pic}</span>}
                        {task.status_content && (
                          <>
                            <span>•</span>
                            <span className={cn(
                              task.status_content.toLowerCase().includes('qc') ? "text-warning" :
                              task.status_content.toLowerCase().includes('fix') ? "text-orange-500" :
                              task.status_content.toLowerCase().includes('doing') ? "text-blue-500" : ""
                            )}>
                              {task.status_content}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {task.deadline && (
                      <div className={cn(
                        "text-xs px-2 py-1 rounded flex-shrink-0",
                        task.isOverdue ? "bg-danger/20 text-danger" : "bg-secondary text-[#8888a0]"
                      )}>
                        {new Date(task.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NEW: Recent Published */}
          {project.recentPublished && project.recentPublished.length > 0 && (
            <div className="bg-success/10 border border-success/30 rounded-lg p-4">
              <p className="text-xs text-success mb-3 font-medium">Bài vừa publish</p>
              <div className="space-y-2">
                {project.recentPublished.map((task) => (
                  <div key={task.id} className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--text-primary)] text-sm truncate">{task.title}</p>
                      <p className="text-xs text-[#8888a0]">
                        {task.pic} • {task.publish_date && new Date(task.publish_date).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    {task.link_publish && (
                      <a
                        href={task.link_publish}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Pipeline Stage Component
function PipelineStage({
  label,
  count,
  color
}: {
  label: string;
  count: number;
  color: 'blue' | 'yellow' | 'orange' | 'green' | 'gray';
}) {
  const colorClasses = {
    blue: count > 0 ? 'bg-blue-500/20 text-blue-500 border-blue-500/30' : 'bg-secondary text-[#8888a0] border-border',
    yellow: count > 0 ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' : 'bg-secondary text-[#8888a0] border-border',
    orange: count > 0 ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' : 'bg-secondary text-[#8888a0] border-border',
    green: count > 0 ? 'bg-green-500/20 text-green-500 border-green-500/30' : 'bg-secondary text-[#8888a0] border-border',
    gray: 'bg-secondary text-[#8888a0] border-border',
  };

  return (
    <div className={cn(
      "flex flex-col items-center px-3 py-2 rounded-lg border min-w-[70px]",
      colorClasses[color]
    )}>
      <span className="text-lg font-bold">{count}</span>
      <span className="text-[10px] whitespace-nowrap">{label}</span>
    </div>
  );
}

// Pipeline Arrow Component
function PipelineArrow() {
  return (
    <ArrowRight className="w-4 h-4 text-[#8888a0] flex-shrink-0" />
  );
}

// Deadline Badge Component
function DeadlineBadge({
  label,
  count,
  color
}: {
  label: string;
  count: number;
  color: 'danger' | 'warning' | 'accent' | 'success' | 'gray';
}) {
  const colorClasses = {
    danger: count > 0 ? 'bg-danger/20 text-danger' : 'bg-secondary text-[#8888a0]',
    warning: count > 0 ? 'bg-warning/20 text-warning' : 'bg-secondary text-[#8888a0]',
    accent: count > 0 ? 'bg-accent/20 text-accent' : 'bg-secondary text-[#8888a0]',
    success: count > 0 ? 'bg-success/20 text-success' : 'bg-secondary text-[#8888a0]',
    gray: 'bg-secondary text-[#8888a0]',
  };

  return (
    <div className={cn("text-center p-2 rounded-lg", colorClasses[color])}>
      <p className="text-lg font-bold">{count}</p>
      <p className="text-[10px]">{label}</p>
    </div>
  );
}

// Ranking Growth Section Component
function RankingGrowthSection({
  data,
  isLoading,
  days,
  onDaysChange,
}: {
  data: RankingGrowthData | null;
  isLoading: boolean;
  days: number;
  onDaysChange: (days: number) => void;
}) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-accent" />
          <h2 className="font-semibold text-[var(--text-primary)]">Tăng trưởng Keyword Ranking</h2>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="animate-pulse text-[#8888a0]">Đang tải...</div>
        </div>
      </div>
    );
  }

  if (!data || data.snapshots.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-accent" />
          <h2 className="font-semibold text-[var(--text-primary)]">Tăng trưởng Keyword Ranking</h2>
        </div>
        <div className="h-32 flex flex-col items-center justify-center text-[#8888a0]">
          <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">Chưa có dữ liệu ranking</p>
          <p className="text-xs mt-1">Sync dữ liệu từ Cài đặt để bắt đầu theo dõi</p>
        </div>
      </div>
    );
  }

  const { snapshots, summary } = data;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  // Get change indicator
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

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent" />
          <h2 className="font-semibold text-[var(--text-primary)]">Tăng trưởng Keyword Ranking</h2>
          <span className="text-xs text-[#8888a0]">({snapshots.length} lần check)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8888a0]">Hiển thị:</span>
          <select
            value={days}
            onChange={(e) => onDaysChange(parseInt(e.target.value))}
            className="px-2 py-1 bg-secondary border border-border rounded text-[var(--text-primary)] text-sm"
          >
            <option value={7}>7 ngày</option>
            <option value={14}>14 ngày</option>
            <option value={30}>30 ngày</option>
            <option value={60}>60 ngày</option>
            <option value={90}>90 ngày</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="p-4 bg-secondary/30 border-b border-border">
          <div className="flex items-center gap-2 mb-3 text-xs text-[#8888a0]">
            <Calendar className="w-4 h-4" />
            <span>
              {formatDate(summary.firstDate)} → {formatDate(summary.lastDate)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card rounded-lg p-3 text-center">
              <p className="text-xs text-[#8888a0] mb-1">Top 3</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-success font-bold text-lg">{summary.top3Last}</span>
                {getChangeIndicator(summary.top3Change)}
              </div>
              <p className="text-[10px] text-[#8888a0] mt-1">
                {summary.top3First} → {summary.top3Last}
              </p>
            </div>
            <div className="bg-card rounded-lg p-3 text-center">
              <p className="text-xs text-[#8888a0] mb-1">Top 10</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-accent font-bold text-lg">{summary.top10Last}</span>
                {getChangeIndicator(summary.top10Change)}
              </div>
              <p className="text-[10px] text-[#8888a0] mt-1">
                {summary.top10First} → {summary.top10Last}
              </p>
            </div>
            <div className="bg-card rounded-lg p-3 text-center">
              <p className="text-xs text-[#8888a0] mb-1">Top 20</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-blue-400 font-bold text-lg">{summary.top20Last}</span>
                {getChangeIndicator(summary.top20Change)}
              </div>
              <p className="text-[10px] text-[#8888a0] mt-1">
                {summary.top20First} → {summary.top20Last}
              </p>
            </div>
            <div className="bg-card rounded-lg p-3 text-center">
              <p className="text-xs text-[#8888a0] mb-1">Top 30</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-warning font-bold text-lg">{summary.top30Last}</span>
                {getChangeIndicator(summary.top30Change)}
              </div>
              <p className="text-[10px] text-[#8888a0] mt-1">
                {summary.top30First} → {summary.top30Last}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart Area */}
      <div className="p-4">
        <div className="h-48 relative">
          <GrowthChart snapshots={snapshots} />
        </div>
      </div>

      {/* Daily Table (Scrollable) */}
      <div className="border-t border-border">
        <div className="p-4 pb-2">
          <p className="text-xs text-[#8888a0] font-medium mb-2">Chi tiết theo ngày</p>
        </div>
        <div className="overflow-x-auto max-h-[200px]">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 sticky top-0">
              <tr className="text-xs text-[#8888a0]">
                <th className="px-4 py-2 text-left font-medium">Ngày</th>
                <th className="px-4 py-2 text-center font-medium">Top 3</th>
                <th className="px-4 py-2 text-center font-medium">Top 10</th>
                <th className="px-4 py-2 text-center font-medium">Top 20</th>
                <th className="px-4 py-2 text-center font-medium">Top 30</th>
                <th className="px-4 py-2 text-center font-medium">Tổng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...snapshots].reverse().map((snap, idx) => {
                const prev = snapshots[snapshots.length - idx - 2];
                return (
                  <tr key={snap.date} className="hover:bg-secondary/30">
                    <td className="px-4 py-2 text-[var(--text-primary)]">
                      {formatDate(snap.date)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="text-success font-medium">{snap.top3}</span>
                      {prev && snap.top3 !== prev.top3 && (
                        <span className={cn(
                          "ml-1 text-xs",
                          snap.top3 > prev.top3 ? "text-success" : "text-danger"
                        )}>
                          {snap.top3 > prev.top3 ? "+" : ""}{snap.top3 - prev.top3}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="text-accent font-medium">{snap.top10}</span>
                      {prev && snap.top10 !== prev.top10 && (
                        <span className={cn(
                          "ml-1 text-xs",
                          snap.top10 > prev.top10 ? "text-success" : "text-danger"
                        )}>
                          {snap.top10 > prev.top10 ? "+" : ""}{snap.top10 - prev.top10}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="text-blue-400 font-medium">{snap.top20}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="text-warning font-medium">{snap.top30}</span>
                    </td>
                    <td className="px-4 py-2 text-center text-[var(--text-primary)]">
                      {snap.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Growth Chart Component
function GrowthChart({ snapshots }: { snapshots: DailySnapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <div className="h-full flex items-center justify-center text-[#8888a0] text-sm">
        Cần ít nhất 2 điểm dữ liệu để hiển thị biểu đồ
      </div>
    );
  }

  const maxTop30 = Math.max(...snapshots.map(s => s.top30), 1);
  const maxValue = Math.max(maxTop30, 10);

  const width = 100;
  const height = 100;
  const padding = { top: 10, bottom: 20, left: 5, right: 5 };

  const getX = (idx: number) => {
    return padding.left + (idx / (snapshots.length - 1)) * (width - padding.left - padding.right);
  };

  const getY = (value: number) => {
    return height - padding.bottom - (value / maxValue) * (height - padding.top - padding.bottom);
  };

  // Create path for top10
  const top10Path = snapshots.map((s, i) => {
    const x = getX(i);
    const y = getY(s.top10);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Create path for top3
  const top3Path = snapshots.map((s, i) => {
    const x = getX(i);
    const y = getY(s.top3);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Create area path for top10
  const top10Area = `${top10Path} L ${getX(snapshots.length - 1)} ${height - padding.bottom} L ${getX(0)} ${height - padding.bottom} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      {/* Grid lines */}
      <line
        x1={padding.left} y1={padding.top}
        x2={width - padding.right} y2={padding.top}
        stroke="currentColor" strokeOpacity="0.1"
      />
      <line
        x1={padding.left} y1={(height - padding.bottom + padding.top) / 2}
        x2={width - padding.right} y2={(height - padding.bottom + padding.top) / 2}
        stroke="currentColor" strokeOpacity="0.1"
      />
      <line
        x1={padding.left} y1={height - padding.bottom}
        x2={width - padding.right} y2={height - padding.bottom}
        stroke="currentColor" strokeOpacity="0.1"
      />

      {/* Top 10 Area */}
      <path
        d={top10Area}
        fill="rgb(99 102 241)"
        fillOpacity="0.1"
      />

      {/* Top 10 Line */}
      <path
        d={top10Path}
        fill="none"
        stroke="rgb(99 102 241)"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Top 3 Line */}
      <path
        d={top3Path}
        fill="none"
        stroke="rgb(34 197 94)"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points for Top 10 */}
      {snapshots.map((s, i) => (
        <circle
          key={`top10-${i}`}
          cx={getX(i)}
          cy={getY(s.top10)}
          r="1.2"
          fill="rgb(99 102 241)"
        />
      ))}

      {/* Points for Top 3 */}
      {snapshots.map((s, i) => (
        <circle
          key={`top3-${i}`}
          cx={getX(i)}
          cy={getY(s.top3)}
          r="1.2"
          fill="rgb(34 197 94)"
        />
      ))}

      {/* Y-axis labels */}
      <text x="2" y={padding.top + 3} className="text-[3px] fill-[#8888a0]">{maxValue}</text>
      <text x="2" y={(height - padding.bottom + padding.top) / 2 + 1} className="text-[3px] fill-[#8888a0]">{Math.round(maxValue / 2)}</text>
      <text x="2" y={height - padding.bottom + 3} className="text-[3px] fill-[#8888a0]">0</text>
    </svg>
  );
}
