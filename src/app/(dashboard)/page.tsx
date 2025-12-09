'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Target,
  Calendar,
  ExternalLink,
  Trophy,
  Medal,
  Crown,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';
import { PageLoading } from '@/components/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import { Task, ProjectStats, BottleneckData, Stats, BottleneckTask } from '@/types';

// Helper to check if task is published - support multiple formats
const isPublished = (statusContent: string | null | undefined) => {
  if (!statusContent) return false;
  const status = statusContent.toLowerCase().trim();
  return status.includes('publish') || status.includes('4.') || status === 'done' || status === 'hoàn thành';
};

export default function DashboardPage() {
  // Date range state
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: firstDay.toISOString().split('T')[0],
      to: lastDay.toISOString().split('T')[0],
    };
  });

  const [stats, setStats] = useState<Stats | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [bottleneck, setBottleneck] = useState<BottleneckData | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Workflow expanded state
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);

  // Get month/year from date range for API
  const selectedMonth = useMemo(() => {
    const fromDate = new Date(dateRange.from);
    return `${fromDate.getMonth() + 1}-${fromDate.getFullYear()}`;
  }, [dateRange.from]);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [month, year] = selectedMonth.split('-');
      const res = await fetch(`/api/stats?month=${month}&year=${year}`);
      const data = await res.json();

      setStats(data.stats);
      setProjectStats(data.projectStats);
      setBottleneck(data.bottleneck);
      setRecentTasks((data.recentTasks || []).filter((t: Task) => t.title || t.keyword_sub));
      setAllTasks((data.allTasks || data.recentTasks || []));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter stats based on date range
  const filteredStats = useMemo(() => {
    if (!stats) return null;

    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    // Filter all tasks by date range - use publish_date if published, otherwise deadline
    const filteredTasks = allTasks.filter((task) => {
      const taskDate = task.publish_date ? new Date(task.publish_date) :
                       task.deadline ? new Date(task.deadline) : null;
      if (!taskDate) return true; // Include tasks without dates
      return taskDate >= fromDate && taskDate <= toDate;
    });

    const published = filteredTasks.filter((t) => isPublished(t.status_content)).length;
    const inProgress = filteredTasks.filter((t) =>
      t.status_content &&
      !isPublished(t.status_content)
    ).length;

    return {
      // Tổng bài = Published + Đang làm
      total: published + inProgress,
      published,
      inProgress,
      overdue: filteredTasks.filter((t) => {
        if (!t.deadline || isPublished(t.status_content)) return false;
        return new Date(t.deadline) < new Date();
      }).length,
    };
  }, [stats, dateRange, allTasks]);

  // Calculate leaderboard - person + published count
  const leaderboard = useMemo(() => {
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    const publishedTasks = allTasks.filter((t) => {
      if (!isPublished(t.status_content)) return false;
      // If has publish_date, filter by date range
      if (t.publish_date) {
        const pubDate = new Date(t.publish_date);
        return pubDate >= fromDate && pubDate <= toDate;
      }
      // If no publish_date but is published, include it
      return true;
    });

    // Count by PIC
    const picCount: Record<string, number> = {};
    publishedTasks.forEach((t) => {
      const pic = t.pic || 'Unknown';
      picCount[pic] = (picCount[pic] || 0) + 1;
    });

    return Object.entries(picCount)
      .filter(([name]) => name !== 'Unknown')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count], index) => ({ name, count, rank: index + 1 }));
  }, [allTasks, dateRange]);

  // Calculate completion rate
  const completionRate = filteredStats?.total
    ? Math.round((filteredStats.published / filteredStats.total) * 100)
    : 0;

  // Calculate total target and actual
  const totalTarget = projectStats.reduce((sum, p) => sum + p.target, 0);
  const totalActual = projectStats.reduce((sum, p) => sum + p.actual, 0);
  const targetProgress = totalTarget ? Math.round((totalActual / totalTarget) * 100) : 0;

  // Calculate planned articles (total tasks in allTasks for the month)
  const totalPlanned = allTasks.length;
  const missingPlan = totalTarget - totalPlanned;

  // Calculate weekly report for each project
  const weeklyReports = useMemo(() => {
    const fromDate = new Date(dateRange.from);
    const currentMonth = fromDate.getMonth();
    const currentYear = fromDate.getFullYear();

    // Get last day of month
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    // Calculate week number in month (starting from 1)
    const getWeekOfMonth = (date: Date) => {
      const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const dayOfMonth = date.getDate();
      const firstDayWeekday = firstDayOfMonth.getDay(); // 0 = Sunday
      return Math.ceil((dayOfMonth + firstDayWeekday) / 7);
    };

    // Get absolute week number of year
    const getWeekOfYear = (date: Date) => {
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const diffDays = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
      return Math.ceil((diffDays + startOfYear.getDay() + 1) / 7);
    };

    // Calculate weekly KPI target per project
    const weeksInMonth = getWeekOfMonth(lastDay);

    return projectStats.map((project) => {
      const weeklyTarget = Math.ceil(project.target / weeksInMonth);

      // Get published tasks for this project
      const projectTasks = allTasks.filter(
        (t) => t.project?.id === project.id && isPublished(t.status_content) && t.publish_date
      );

      // Group by week
      const weeklyData: { week: number; weekOfYear: number; count: number; target: number }[] = [];
      for (let w = 1; w <= weeksInMonth; w++) {
        // Find tasks published in this week
        const tasksInWeek = projectTasks.filter((t) => {
          if (!t.publish_date) return false;
          const pubDate = new Date(t.publish_date);
          return pubDate.getMonth() === currentMonth &&
                 pubDate.getFullYear() === currentYear &&
                 getWeekOfMonth(pubDate) === w;
        });

        // Get week of year for the first day of this week in month
        const weekStartDate = new Date(currentYear, currentMonth, (w - 1) * 7 + 1);
        if (weekStartDate > lastDay) continue;

        weeklyData.push({
          week: w,
          weekOfYear: getWeekOfYear(weekStartDate),
          count: tasksInWeek.length,
          target: weeklyTarget,
        });
      }

      return {
        projectId: project.id,
        projectName: project.name,
        weeklyTarget,
        weeks: weeklyData,
      };
    });
  }, [projectStats, allTasks, dateRange]);

  // Get tasks for workflow section
  const getWorkflowTasks = (type: string): BottleneckTask[] => {
    if (!bottleneck?.tasks) return [];
    const taskMap: Record<string, BottleneckTask[]> = {
      qcContent: bottleneck.tasks.qcContent || [],
      qcOutline: bottleneck.tasks.qcOutline || [],
      waitPublish: bottleneck.tasks.waitPublish || [],
      doingContent: bottleneck.tasks.doingContent || [],
      fixingOutline: bottleneck.tasks.fixingOutline || [],
      fixingContent: bottleneck.tasks.fixingContent || [],
      doingOutline: bottleneck.tasks.doingOutline || [],
    };
    return taskMap[type] || [];
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-[#8888a0] text-xs md:text-sm">Tổng quan tiến độ công việc</p>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-[#8888a0]" />
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="px-2 py-1.5 bg-card border border-border rounded-lg text-white text-sm"
          />
          <span className="text-[#8888a0]">-</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="px-2 py-1.5 bg-card border border-border rounded-lg text-white text-sm"
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard
          label="Tổng bài"
          value={filteredStats?.total || 0}
          icon={<FileText className="w-4 h-4 md:w-5 md:h-5 text-accent" />}
        />
        <MetricCard
          label="Đã Publish"
          value={filteredStats?.published || 0}
          icon={<CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-success" />}
          valueColor="text-success"
          subtitle={`${completionRate}% hoàn thành`}
        />
        <MetricCard
          label="Đang thực hiện"
          value={filteredStats?.inProgress || 0}
          icon={<Clock className="w-4 h-4 md:w-5 md:h-5 text-warning" />}
          valueColor="text-warning"
        />
        <MetricCard
          label="Trễ deadline"
          value={filteredStats?.overdue || 0}
          icon={<AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-danger" />}
          valueColor="text-danger"
        />
      </div>

      {/* KPI Progress (compact) + Missing Plan Warning + Leaderboard */}
      <div className="grid lg:grid-cols-4 gap-3 md:gap-4">
        {/* Target Progress - Compact */}
        <div className="lg:col-span-2 bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/30 rounded-xl p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-white">KPI tháng</span>
            </div>
            <p className={`text-lg font-bold ${targetProgress >= 100 ? 'text-success' : targetProgress >= 70 ? 'text-warning' : 'text-white'}`}>
              {targetProgress}%
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1">
              <ProgressBar value={totalActual} max={totalTarget} showLabel={false} size="sm" />
            </div>
            <span className="text-sm text-[#8888a0]">{totalActual}/{totalTarget}</span>
          </div>
        </div>

        {/* Missing Plan Warning */}
        <div className={`rounded-xl p-3 md:p-4 border ${missingPlan > 0 ? 'bg-warning/10 border-warning/30' : 'bg-success/10 border-success/30'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${missingPlan > 0 ? 'text-warning' : 'text-success'}`} />
            <span className="text-sm font-medium text-white">Kế hoạch</span>
          </div>
          <div className="mt-1">
            {missingPlan > 0 ? (
              <p className="text-sm text-warning">
                Thiếu <span className="font-bold">{missingPlan}</span> bài
              </p>
            ) : (
              <p className="text-sm text-success">Đủ kế hoạch</p>
            )}
            <p className="text-xs text-[#8888a0]">{totalPlanned}/{totalTarget} bài có plan</p>
          </div>
        </div>

        {/* Leaderboard - Compact */}
        <div className="bg-card border border-border rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-white">Top dẫn đầu</span>
          </div>
          <div className="space-y-1">
            {leaderboard.length > 0 ? (
              leaderboard.slice(0, 3).map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2"
                >
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {item.rank === 1 ? (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    ) : item.rank === 2 ? (
                      <Medal className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Medal className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                  <span className="text-white text-xs truncate flex-1">{item.name}</span>
                  <span className="text-accent font-bold text-xs">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="text-[#8888a0] text-center py-2 text-xs">Chưa có</p>
            )}
          </div>
        </div>
      </div>

      {/* Workflow + Projects Row */}
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* Workflow with Inline Tasks */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-white mb-4">Workflow Status</h2>

          {bottleneck ? (
            <div className="space-y-2">
              {/* Workflow Items */}
              <WorkflowItem
                label="SEO QC Outline"
                count={bottleneck.seo.qcOutline}
                color="accent"
                tasks={getWorkflowTasks('qcOutline')}
                isExpanded={expandedWorkflow === 'qcOutline'}
                onToggle={() => setExpandedWorkflow(expandedWorkflow === 'qcOutline' ? null : 'qcOutline')}
              />
              <WorkflowItem
                label="Content đang viết"
                count={bottleneck.content.doingContent}
                color="warning"
                tasks={getWorkflowTasks('doingContent')}
                isExpanded={expandedWorkflow === 'doingContent'}
                onToggle={() => setExpandedWorkflow(expandedWorkflow === 'doingContent' ? null : 'doingContent')}
              />
              <WorkflowItem
                label="SEO QC Content"
                count={bottleneck.seo.qcContent}
                color="accent"
                tasks={getWorkflowTasks('qcContent')}
                isExpanded={expandedWorkflow === 'qcContent'}
                onToggle={() => setExpandedWorkflow(expandedWorkflow === 'qcContent' ? null : 'qcContent')}
              />
              <WorkflowItem
                label="Chờ Publish"
                count={bottleneck.seo.waitPublish}
                color="success"
                tasks={getWorkflowTasks('waitPublish')}
                isExpanded={expandedWorkflow === 'waitPublish'}
                onToggle={() => setExpandedWorkflow(expandedWorkflow === 'waitPublish' ? null : 'waitPublish')}
              />

              {/* Fixing items - now clickable with task details */}
              {bottleneck.content.fixingOutline > 0 && (
                <WorkflowItem
                  label="Đang sửa Outline"
                  count={bottleneck.content.fixingOutline}
                  color="orange"
                  tasks={getWorkflowTasks('fixingOutline')}
                  isExpanded={expandedWorkflow === 'fixingOutline'}
                  onToggle={() => setExpandedWorkflow(expandedWorkflow === 'fixingOutline' ? null : 'fixingOutline')}
                />
              )}
              {bottleneck.content.fixingContent > 0 && (
                <WorkflowItem
                  label="Đang sửa Content"
                  count={bottleneck.content.fixingContent}
                  color="orange"
                  tasks={getWorkflowTasks('fixingContent')}
                  isExpanded={expandedWorkflow === 'fixingContent'}
                  onToggle={() => setExpandedWorkflow(expandedWorkflow === 'fixingContent' ? null : 'fixingContent')}
                />
              )}
            </div>
          ) : (
            <p className="text-[#8888a0] text-center py-4 text-sm">Không có dữ liệu</p>
          )}
        </div>

        {/* Project Progress - Compact */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="text-base md:text-lg font-semibold text-white">Tiến độ dự án</h2>
          </div>

          <div className="space-y-2">
            {projectStats.length > 0 ? (
              projectStats.map((project) => {
                const progress = project.target ? Math.round((project.actual / project.target) * 100) : 0;
                return (
                  <div key={project.id} className="flex items-center gap-3 p-2 bg-secondary rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{project.name}</p>
                    </div>
                    <div className="w-24">
                      <ProgressBar value={project.actual} max={project.target} showLabel={false} size="sm" />
                    </div>
                    <span className={`text-sm font-bold w-16 text-right ${progress >= 100 ? 'text-success' : progress >= 70 ? 'text-warning' : 'text-white'}`}>
                      {project.actual}/{project.target}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-[#8888a0] text-center py-6">Chưa có dự án nào</p>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Report + Recent Published */}
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* Weekly Report */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-accent" />
            <h2 className="text-base md:text-lg font-semibold text-white">Báo cáo tuần</h2>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {weeklyReports.length > 0 ? (
              weeklyReports.map((report) => (
                <div key={report.projectId} className="bg-secondary rounded-lg p-3">
                  <p className="text-white text-sm font-medium mb-2">{report.projectName}</p>
                  <div className="grid grid-cols-4 gap-1">
                    {report.weeks.map((week) => {
                      const isAchieved = week.count >= week.target;
                      return (
                        <div
                          key={week.week}
                          className={`text-center p-1.5 rounded ${
                            isAchieved ? 'bg-success/20' : week.count > 0 ? 'bg-warning/20' : 'bg-secondary'
                          }`}
                        >
                          <p className="text-[10px] text-[#8888a0]">T{week.weekOfYear}</p>
                          <p className={`text-xs font-bold ${isAchieved ? 'text-success' : week.count > 0 ? 'text-warning' : 'text-[#8888a0]'}`}>
                            {week.count}/{week.target}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[#8888a0] text-center py-6 text-sm">Chưa có dữ liệu</p>
            )}
          </div>
        </div>

        {/* Recent Published */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-success" />
            <h2 className="text-base md:text-lg font-semibold text-white">Bài viết gần đây</h2>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {recentTasks.length > 0 ? (
              recentTasks.slice(0, 10).map((task) => {
                // Calculate time ago
                const getTimeAgo = (dateStr: string | null | undefined) => {
                  if (!dateStr) return null;
                  const date = new Date(dateStr);
                  const now = new Date();
                  const diffMs = now.getTime() - date.getTime();
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  if (diffDays === 0) return 'Hôm nay';
                  if (diffDays === 1) return 'Hôm qua';
                  if (diffDays < 7) return `${diffDays} ngày trước`;
                  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
                  return formatDate(dateStr);
                };

                const timeAgo = getTimeAgo(task.publish_date || task.updated_at);

                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2 bg-secondary rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {task.title || task.keyword_sub || 'Không có tiêu đề'}
                      </p>
                      <p className="text-xs text-[#8888a0]">
                        {task.pic || 'N/A'}
                        {timeAgo && (
                          <span className="text-accent"> • {timeAgo}</span>
                        )}
                      </p>
                    </div>
                    {task.link_publish && (
                      <a
                        href={task.link_publish}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-accent hover:bg-accent/20 rounded transition-colors flex-shrink-0"
                        title="Xem bài viết"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-[#8888a0] text-center py-6 text-sm">Chưa có bài viết nào</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  label,
  value,
  icon,
  valueColor = 'text-white',
  subtitle,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  valueColor?: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 md:p-5">
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <span className="text-[#8888a0] text-xs md:text-sm">{label}</span>
        {icon}
      </div>
      <p className={`text-2xl md:text-3xl font-bold ${valueColor}`}>{value}</p>
      {subtitle && <p className="text-xs text-[#8888a0] mt-0.5">{subtitle}</p>}
    </div>
  );
}

// Workflow Item Component with inline task list
function WorkflowItem({
  label,
  count,
  color,
  tasks,
  isExpanded,
  onToggle,
}: {
  label: string;
  count: number;
  color: 'warning' | 'accent' | 'success' | 'orange';
  tasks: BottleneckTask[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const colorClasses = {
    warning: 'bg-warning/10 border-warning/30 hover:bg-warning/20',
    accent: 'bg-accent/10 border-accent/30 hover:bg-accent/20',
    success: 'bg-success/10 border-success/30 hover:bg-success/20',
    orange: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20',
  };

  const textColors = {
    warning: 'text-warning',
    accent: 'text-accent',
    success: 'text-success',
    orange: 'text-orange-400',
  };

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-colors ${colorClasses[color]}`}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#8888a0]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8888a0]" />
          )}
          <span className="text-white text-sm font-medium">{label}</span>
        </div>
        <span className={`text-base font-bold ${textColors[color]}`}>{count} bài</span>
      </button>

      {/* Expanded Task List */}
      {isExpanded && tasks.length > 0 && (
        <div className="mt-2 ml-6 pl-3 border-l-2 border-border space-y-1.5">
          {tasks.map((task, idx) => (
            <div key={task.id || idx} className="flex items-center gap-2 text-sm py-1 px-2 bg-secondary/50 rounded">
              <User className="w-3 h-3 text-[#8888a0] flex-shrink-0" />
              <span className="text-white flex-1 truncate text-xs">{task.title}</span>
              <span className="text-xs text-[#8888a0] flex-shrink-0">{task.pic}</span>
              {task.waitDays !== undefined && task.waitDays > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                  task.waitDays >= 3 ? 'bg-danger/20 text-danger' :
                  task.waitDays >= 1 ? 'bg-warning/20 text-warning' :
                  'bg-secondary text-[#8888a0]'
                }`}>
                  {task.waitDays}d
                </span>
              )}
              {task.link && (
                <a
                  href={task.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline flex-shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state when expanded but no tasks */}
      {isExpanded && tasks.length === 0 && (
        <div className="mt-2 ml-6 pl-3 border-l-2 border-border">
          <p className="text-xs text-[#8888a0] py-2">Không có chi tiết</p>
        </div>
      )}
    </div>
  );
}
