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
  // Month/Year state
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  const [stats, setStats] = useState<Stats | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [bottleneck, setBottleneck] = useState<BottleneckData | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Workflow expanded state
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/stats?month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();

      setStats(data.stats);
      setProjectStats(data.projectStats);
      setBottleneck(data.bottleneck);
      // Bài viết gần đây = chỉ bài đã publish VÀ có link
      setRecentTasks((data.allTasks || []).filter((t: Task) =>
        (t.title || t.keyword_sub) &&
        t.link_publish &&
        isPublished(t.status_content)
      ));
      setAllTasks((data.allTasks || data.recentTasks || []));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats based on all tasks
  const filteredStats = useMemo(() => {
    if (!stats) return null;

    const published = allTasks.filter((t) => isPublished(t.status_content)).length;
    const inProgress = allTasks.filter((t) =>
      t.status_content &&
      !isPublished(t.status_content)
    ).length;

    return {
      // Tổng bài = Published + Đang làm
      total: published + inProgress,
      published,
      inProgress,
      overdue: allTasks.filter((t) => {
        if (!t.deadline || isPublished(t.status_content)) return false;
        return new Date(t.deadline) < new Date();
      }).length,
    };
  }, [stats, allTasks]);

  // Calculate leaderboard - person + published count for current month
  const leaderboard = useMemo(() => {
    const publishedTasks = allTasks.filter((t) => isPublished(t.status_content));

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
  }, [allTasks]);

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

  // Calculate weekly report for each project - weeks within selected month
  const weeklyReports = useMemo(() => {
    const now = new Date();
    const currentWeekInMonth = Math.ceil(now.getDate() / 7);
    const isCurrentMonth = selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear();

    // Get weeks in the selected month (up to 5 weeks)
    const getWeeksInMonth = () => {
      const lastDay = new Date(selectedYear, selectedMonth, 0);
      const totalDays = lastDay.getDate();
      const weeks: { weekNum: number; start: Date; end: Date }[] = [];

      for (let week = 1; week <= 5; week++) {
        const startDay = (week - 1) * 7 + 1;
        if (startDay > totalDays) break;

        const endDay = Math.min(week * 7, totalDays);
        const start = new Date(selectedYear, selectedMonth - 1, startDay);
        const end = new Date(selectedYear, selectedMonth - 1, endDay, 23, 59, 59);

        weeks.push({ weekNum: week, start, end });
      }

      return weeks;
    };

    const weeksInMonth = getWeeksInMonth();

    // Weekly target = monthly target / number of weeks
    return projectStats.map((project) => {
      const weeklyTarget = Math.ceil(project.target / weeksInMonth.length);

      // Get published tasks for this project (with publish_date)
      const projectTasks = allTasks.filter(
        (t) => t.project?.id === project.id && isPublished(t.status_content)
      );

      const weeklyData = weeksInMonth.map((week) => {
        // Count tasks published in this week
        const tasksInWeek = projectTasks.filter((t) => {
          if (!t.publish_date) return false;
          const pubDate = new Date(t.publish_date);
          return pubDate >= week.start && pubDate <= week.end;
        });

        return {
          weekNum: week.weekNum,
          count: tasksInWeek.length,
          target: weeklyTarget,
          isCurrent: isCurrentMonth && week.weekNum === currentWeekInMonth,
        };
      });

      return {
        projectId: project.id,
        projectName: project.name,
        weeklyTarget,
        weeks: weeklyData,
      };
    });
  }, [projectStats, allTasks, selectedMonth, selectedYear]);

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

        {/* Month/Year Picker */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#8888a0]" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-white text-sm cursor-pointer"
          >
            <option value={1}>Tháng 1</option>
            <option value={2}>Tháng 2</option>
            <option value={3}>Tháng 3</option>
            <option value={4}>Tháng 4</option>
            <option value={5}>Tháng 5</option>
            <option value={6}>Tháng 6</option>
            <option value={7}>Tháng 7</option>
            <option value={8}>Tháng 8</option>
            <option value={9}>Tháng 9</option>
            <option value={10}>Tháng 10</option>
            <option value={11}>Tháng 11</option>
            <option value={12}>Tháng 12</option>
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-white text-sm cursor-pointer"
          >
            {[2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
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
              {/* Content đang làm Outline */}
              <WorkflowItem
                label="Content đang làm Outline"
                count={bottleneck.content.doingOutline}
                color="warning"
                tasks={getWorkflowTasks('doingOutline')}
                isExpanded={expandedWorkflow === 'doingOutline'}
                onToggle={() => setExpandedWorkflow(expandedWorkflow === 'doingOutline' ? null : 'doingOutline')}
              />
              {/* SEO QC Outline */}
              <WorkflowItem
                label="SEO QC Outline"
                count={bottleneck.seo.qcOutline}
                color="accent"
                tasks={getWorkflowTasks('qcOutline')}
                isExpanded={expandedWorkflow === 'qcOutline'}
                onToggle={() => setExpandedWorkflow(expandedWorkflow === 'qcOutline' ? null : 'qcOutline')}
              />
              {/* Content đang sửa Outline */}
              {bottleneck.content.fixingOutline > 0 && (
                <WorkflowItem
                  label="Content đang sửa Outline"
                  count={bottleneck.content.fixingOutline}
                  color="orange"
                  tasks={getWorkflowTasks('fixingOutline')}
                  isExpanded={expandedWorkflow === 'fixingOutline'}
                  onToggle={() => setExpandedWorkflow(expandedWorkflow === 'fixingOutline' ? null : 'fixingOutline')}
                />
              )}
              {/* Content đang viết */}
              <WorkflowItem
                label="Content đang viết"
                count={bottleneck.content.doingContent}
                color="warning"
                tasks={getWorkflowTasks('doingContent')}
                isExpanded={expandedWorkflow === 'doingContent'}
                onToggle={() => setExpandedWorkflow(expandedWorkflow === 'doingContent' ? null : 'doingContent')}
              />
              {/* SEO QC Content */}
              <WorkflowItem
                label="SEO QC Content"
                count={bottleneck.seo.qcContent}
                color="accent"
                tasks={getWorkflowTasks('qcContent')}
                isExpanded={expandedWorkflow === 'qcContent'}
                onToggle={() => setExpandedWorkflow(expandedWorkflow === 'qcContent' ? null : 'qcContent')}
              />
              {/* Content đang sửa Content */}
              {bottleneck.content.fixingContent > 0 && (
                <WorkflowItem
                  label="Content đang sửa Content"
                  count={bottleneck.content.fixingContent}
                  color="orange"
                  tasks={getWorkflowTasks('fixingContent')}
                  isExpanded={expandedWorkflow === 'fixingContent'}
                  onToggle={() => setExpandedWorkflow(expandedWorkflow === 'fixingContent' ? null : 'fixingContent')}
                />
              )}
              {/* Chờ Publish */}
              <WorkflowItem
                label="Chờ Publish"
                count={bottleneck.seo.waitPublish}
                color="success"
                tasks={getWorkflowTasks('waitPublish')}
                isExpanded={expandedWorkflow === 'waitPublish'}
                onToggle={() => setExpandedWorkflow(expandedWorkflow === 'waitPublish' ? null : 'waitPublish')}
              />

              {/* Total Summary */}
              {(() => {
                const totalInProgress = bottleneck.content.doingOutline + bottleneck.content.fixingOutline +
                  bottleneck.content.doingContent + bottleneck.content.fixingContent +
                  bottleneck.seo.qcOutline + bottleneck.seo.qcContent + bottleneck.seo.waitPublish;
                const publishedCount = filteredStats?.published || 0;
                const total = publishedCount + totalInProgress;
                const isEnough = total >= totalTarget;
                return (
                  <div className="mt-3 pt-3 border-t border-border space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-success">Đã Publish:</span>
                      <span className="font-bold text-success">{publishedCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-warning">Đang làm:</span>
                      <span className="font-bold text-warning">{totalInProgress}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-[#8888a0]">Tổng:</span>
                      <span className={`text-lg font-bold ${isEnough ? 'text-success' : 'text-danger'}`}>
                        {total}/{totalTarget} {isEnough ? '✓' : `(thiếu ${totalTarget - total})`}
                      </span>
                    </div>
                  </div>
                );
              })()}
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

      {/* Weekly Report (Large) + Recent Published (Small) */}
      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Weekly Report - Larger */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-white">Báo cáo tuần</h2>
          </div>

          <div className="space-y-4">
            {weeklyReports.length > 0 ? (
              weeklyReports.map((report) => (
                <div key={report.projectId} className="bg-secondary rounded-lg p-4">
                  <p className="text-white font-medium mb-3">{report.projectName}</p>
                  <div className="grid grid-cols-5 gap-2">
                    {report.weeks.map((week) => {
                      const isAchieved = week.count >= week.target;
                      const isCurrent = week.isCurrent;
                      return (
                        <div
                          key={week.weekNum}
                          className={`text-center p-2 rounded-lg relative ${
                            isCurrent ? 'ring-2 ring-accent' : ''
                          } ${
                            isAchieved ? 'bg-success/20 border border-success/30' : week.count > 0 ? 'bg-warning/20 border border-warning/30' : 'bg-card border border-border'
                          }`}
                        >
                          {isCurrent && (
                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-accent text-white px-1.5 py-0.5 rounded">
                              Hiện tại
                            </span>
                          )}
                          <p className="text-xs text-[#8888a0] mb-1">Tuần {week.weekNum}</p>
                          <p className={`text-xl font-bold ${isAchieved ? 'text-success' : week.count > 0 ? 'text-warning' : 'text-[#8888a0]'}`}>
                            {week.count}
                          </p>
                          <p className="text-xs text-[#8888a0]">/{week.target} bài</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[#8888a0] text-center py-8">Chưa có dữ liệu báo cáo tuần</p>
            )}
          </div>
        </div>

        {/* Recent Published - Smaller */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <h2 className="text-base font-semibold text-white">Bài viết gần đây</h2>
          </div>

          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {recentTasks.length > 0 ? (
              recentTasks.slice(0, 10).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-2 bg-secondary rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {task.title || task.keyword_sub || 'Không có tiêu đề'}
                    </p>
                    <p className="text-xs text-[#8888a0]">
                      {task.pic || 'N/A'}
                      <span className="text-accent"> • {task.publish_date ? formatDate(task.publish_date) : 'Chưa có ngày'}</span>
                    </p>
                  </div>
                  {task.link_publish && (
                    <a
                      href={task.link_publish}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-accent hover:bg-accent/20 rounded transition-colors flex-shrink-0"
                      title="Xem bài viết"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))
            ) : (
              <p className="text-[#8888a0] text-center py-6 text-sm">Chưa có bài viết</p>
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
            <div key={task.id || idx} className="flex flex-col gap-1 text-sm py-2 px-2 bg-secondary/50 rounded">
              <div className="flex items-center gap-2">
                <User className="w-3 h-3 text-[#8888a0] flex-shrink-0" />
                <span className="text-white flex-1 truncate text-xs">{task.title}</span>
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
              <div className="flex items-center justify-between text-xs pl-5">
                <span className="text-[#8888a0]">{task.pic} • {task.project}</span>
                {task.waitDays !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded ${
                    task.waitDays >= 5 ? 'bg-danger/20 text-danger' :
                    task.waitDays >= 3 ? 'bg-orange-500/20 text-orange-400' :
                    task.waitDays >= 1 ? 'bg-warning/20 text-warning' :
                    'bg-secondary text-[#8888a0]'
                  }`}>
                    {task.waitDays === 0 ? 'Hôm nay' : `${task.waitDays} ngày trước`}
                  </span>
                )}
              </div>
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
