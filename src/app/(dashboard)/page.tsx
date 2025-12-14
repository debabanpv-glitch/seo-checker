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
  ClipboardList,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';
import { PageLoading } from '@/components/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import { isPublished } from '@/lib/task-helpers';
import { Task, ProjectStats, BottleneckData, Stats, BottleneckTask } from '@/types';

export default function DashboardPage() {
  // Month/Year state
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  const [stats, setStats] = useState<Stats | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [bottleneck, setBottleneck] = useState<BottleneckData | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [overdueFromPreviousMonths, setOverdueFromPreviousMonths] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Workflow expanded state
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  // Overdue expanded state
  const [showOverdueDetails, setShowOverdueDetails] = useState(false);
  // Project expanded state
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  // Project workflow status expanded state
  const [expandedProjectStatus, setExpandedProjectStatus] = useState<string | null>(null);
  // Attention box - expanded project
  const [expandedAttentionProject, setExpandedAttentionProject] = useState<string | null>(null);
  // Planning status - expanded project
  const [expandedPlanningProject, setExpandedPlanningProject] = useState<string | null>(null);
  // Previous months overdue - expanded project
  const [expandedPrevMonthsProject, setExpandedPrevMonthsProject] = useState<string | null>(null);

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
      setAllTasks((data.allTasks || data.recentTasks || []));
      setOverdueFromPreviousMonths(data.overdueFromPreviousMonths || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats based on all tasks
  const filteredStats = useMemo(() => {
    if (!stats) return null;

    // Debug: Log task data to console
    console.log('=== Dashboard Debug ===');
    console.log('allTasks.length:', allTasks.length);
    const tasksWithPublishDate = allTasks.filter((t) => t.publish_date);
    console.log('Tasks with publish_date:', tasksWithPublishDate.length);
    console.log('Sample task:', allTasks[0]);

    const published = allTasks.filter((t) => isPublished(t)).length;
    console.log('Published count:', published);
    const inProgress = allTasks.filter((t) =>
      t.status_content &&
      !isPublished(t)
    ).length;

    return {
      // Tổng bài = Published + Đang làm
      total: published + inProgress,
      published,
      inProgress,
      overdue: allTasks.filter((t) => {
        if (!t.deadline || isPublished(t)) return false;
        return new Date(t.deadline) < new Date();
      }).length,
    };
  }, [stats, allTasks]);

  // Get overdue tasks with details
  const overdueTasks = useMemo(() => {
    return allTasks
      .filter((t) => {
        if (!t.deadline || isPublished(t)) return false;
        return new Date(t.deadline) < new Date();
      })
      .map((t) => ({
        ...t,
        daysLate: Math.ceil((new Date().getTime() - new Date(t.deadline!).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => b.daysLate - a.daysLate); // Sắp xếp theo số ngày trễ giảm dần
  }, [allTasks]);

  // Get tasks from last 3 days (published with publish_date in last 3 days)
  const recentThreeDaysTasks = useMemo(() => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    return allTasks
      .filter((t) => {
        if (!t.publish_date || !isPublished(t)) return false;
        const pubDate = new Date(t.publish_date);
        return pubDate >= threeDaysAgo;
      })
      .sort((a, b) => new Date(b.publish_date!).getTime() - new Date(a.publish_date!).getTime()); // Mới nhất lên đầu
  }, [allTasks]);

  // Calculate leaderboard - person + published count for current month
  const leaderboard = useMemo(() => {
    const publishedTasks = allTasks.filter((t) => isPublished(t));

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

  // Get tasks gần trễ deadline (trong 3 ngày tới)
  const dueSoonTasks = useMemo(() => {
    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    return allTasks
      .filter((t) => {
        if (!t.deadline || isPublished(t)) return false;
        const deadline = new Date(t.deadline);
        return deadline >= now && deadline <= threeDaysLater;
      })
      .map((t) => ({
        ...t,
        daysLeft: Math.ceil((new Date(t.deadline!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [allTasks]);

  // Group overdue và due soon tasks theo project
  const attentionByProject = useMemo(() => {
    const projectMap: Record<string, {
      projectName: string;
      overdue: Array<Task & { daysLate: number }>;
      dueSoon: Array<Task & { daysLeft: number }>;
    }> = {};

    // Group overdue tasks
    overdueTasks.forEach((task) => {
      const projectId = task.project?.id || 'unknown';
      const projectName = task.project?.name || 'Không xác định';

      if (!projectMap[projectId]) {
        projectMap[projectId] = { projectName, overdue: [], dueSoon: [] };
      }
      projectMap[projectId].overdue.push(task);
    });

    // Group due soon tasks
    dueSoonTasks.forEach((task) => {
      const projectId = task.project?.id || 'unknown';
      const projectName = task.project?.name || 'Không xác định';

      if (!projectMap[projectId]) {
        projectMap[projectId] = { projectName, overdue: [], dueSoon: [] };
      }
      projectMap[projectId].dueSoon.push(task);
    });

    // Convert to array and sort by overdue count desc
    return Object.entries(projectMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.overdue.length - a.overdue.length);
  }, [overdueTasks, dueSoonTasks]);

  const totalAttention = overdueTasks.length + dueSoonTasks.length;

  // Process overdue tasks from previous months - group by project and add daysLate
  const prevMonthsOverdueByProject = useMemo(() => {
    const projectMap: Record<string, {
      projectName: string;
      overdue: Array<Task & { daysLate: number; fromMonth: string }>;
    }> = {};

    overdueFromPreviousMonths.forEach((task) => {
      const projectId = task.project?.id || 'unknown';
      const projectName = task.project?.name || 'Không xác định';
      const daysLate = task.deadline
        ? Math.ceil((new Date().getTime() - new Date(task.deadline).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const fromMonth = `T${(task as unknown as { month: number }).month}/${(task as unknown as { year: number }).year}`;

      if (!projectMap[projectId]) {
        projectMap[projectId] = { projectName, overdue: [] };
      }
      projectMap[projectId].overdue.push({ ...task, daysLate, fromMonth });
    });

    return Object.entries(projectMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.overdue.length - a.overdue.length);
  }, [overdueFromPreviousMonths]);

  const totalPrevMonthsOverdue = overdueFromPreviousMonths.length;

  // Calculate planning status per project - define BEFORE useMemo that uses it
  const getProjectPlanningStatus = (projectId: string, target: number) => {
    const projectTasks = allTasks.filter(t => t.project?.id === projectId);
    const totalPlanned = projectTasks.length;

    // Tasks missing deadline
    const missingDeadline = projectTasks.filter(t => !t.deadline);

    // Tasks missing outline (has topic but no outline status yet, or outline not done)
    const missingOutline = projectTasks.filter(t => {
      if (!t.status_outline) return true;
      const status = t.status_outline.toLowerCase();
      // Outline is done if status is 3.Done or higher
      return !status.includes('3. done') && !status.includes('3.done');
    });

    // Is planning complete? (enough topics to meet KPI)
    const planComplete = totalPlanned >= target;

    return {
      totalPlanned,
      target,
      missingDeadline: missingDeadline.length,
      missingDeadlineTasks: missingDeadline,
      missingOutline: missingOutline.length,
      missingOutlineTasks: missingOutline,
      planComplete,
      planDiff: totalPlanned - target,
    };
  };

  // Calculate planning status for all projects
  const planningStatusByProject = useMemo(() => {
    return projectStats.map((project) => {
      const status = getProjectPlanningStatus(project.id, project.target);
      return {
        id: project.id,
        name: project.name,
        ...status,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectStats, allTasks]);

  const totalMissingPlan = planningStatusByProject.filter(p => !p.planComplete).length;
  const totalMissingDeadlines = planningStatusByProject.reduce((sum, p) => sum + p.missingDeadline, 0);
  const totalMissingOutlines = planningStatusByProject.reduce((sum, p) => sum + p.missingOutline, 0);

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
        (t) => t.project?.id === project.id && isPublished(t)
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

  // Calculate workflow status per project with task lists
  const getProjectWorkflowStatus = (projectId: string) => {
    const projectTasks = allTasks.filter(t => t.project?.id === projectId);

    // Filter tasks by status
    const doingOutlineTasks = projectTasks.filter(t =>
      t.status_outline?.includes('1. Doing') && !t.status_outline?.includes('1.1')
    );
    const fixingOutlineTasks = projectTasks.filter(t =>
      t.status_outline?.includes('1.1 Fixing') || t.status_outline?.includes('1.2')
    );
    const qcOutlineTasks = projectTasks.filter(t =>
      t.status_outline?.includes('2. QC')
    );
    const doingContentTasks = projectTasks.filter(t =>
      t.status_content?.includes('1. Doing') && !t.status_content?.includes('1.1')
    );
    const fixingContentTasks = projectTasks.filter(t =>
      t.status_content?.includes('1.1 Fixing') || t.status_content?.includes('1.2')
    );
    const qcContentTasks = projectTasks.filter(t =>
      t.status_content?.includes('2. QC')
    );
    const waitPublishTasks = projectTasks.filter(t =>
      t.status_content?.includes('3. Done QC') && !isPublished(t)
    );
    const publishedTasks = projectTasks.filter(t => isPublished(t));

    return {
      doingOutline: doingOutlineTasks.length,
      doingOutlineTasks,
      fixingOutline: fixingOutlineTasks.length,
      fixingOutlineTasks,
      qcOutline: qcOutlineTasks.length,
      qcOutlineTasks,
      doingContent: doingContentTasks.length,
      doingContentTasks,
      fixingContent: fixingContentTasks.length,
      fixingContentTasks,
      qcContent: qcContentTasks.length,
      qcContentTasks,
      waitPublish: waitPublishTasks.length,
      waitPublishTasks,
      published: publishedTasks.length,
      publishedTasks,
      total: projectTasks.length,
    };
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-[#8888a0] text-xs md:text-sm">Tổng quan tiến độ công việc</p>
        </div>

        {/* Month/Year Picker */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#8888a0]" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm cursor-pointer"
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
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm cursor-pointer"
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
        {/* Trễ deadline - Clickable */}
        <button
          onClick={() => setShowOverdueDetails(!showOverdueDetails)}
          className="bg-card border border-border rounded-xl p-3 md:p-5 text-left hover:border-danger/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <span className="text-[#8888a0] text-xs md:text-sm">Trễ deadline</span>
            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-danger" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-danger">{filteredStats?.overdue || 0}</p>
          {(filteredStats?.overdue || 0) > 0 && (
            <p className="text-xs text-danger/70 mt-0.5 flex items-center gap-1">
              {showOverdueDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Xem chi tiết
            </p>
          )}
        </button>
      </div>

      {/* Overdue Details - Expandable when clicking on "Trễ deadline" */}
      {showOverdueDetails && overdueTasks.length > 0 && (
        <div className="bg-card border-2 border-danger/40 rounded-xl overflow-hidden">
          <div className="bg-danger/10 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-danger" />
              <h3 className="font-semibold text-danger text-sm">Chi tiết bài trễ deadline ({overdueTasks.length})</h3>
            </div>
            <button
              onClick={() => setShowOverdueDetails(false)}
              className="text-danger hover:text-danger/80 text-xs"
            >
              Đóng
            </button>
          </div>
          <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
            {overdueTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2 bg-danger/5 border border-danger/20 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-sm font-medium truncate">
                    {task.title || task.keyword_sub || 'Không có tiêu đề'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[#8888a0]">
                    <span className="text-accent">{task.pic || 'N/A'}</span>
                    <span>•</span>
                    <span>{task.project?.name || 'N/A'}</span>
                    <span>•</span>
                    <span className="text-danger">DL: {task.deadline ? formatDate(task.deadline) : 'N/A'}</span>
                  </div>
                </div>
                <span className="px-2 py-1 bg-danger text-white text-xs font-bold rounded">
                  -{task.daysLate} ngày
                </span>
                {task.content_file && (
                  <a
                    href={task.content_file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-accent hover:bg-accent/20 rounded"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid cho các box Cần chú ý / Trễ tháng trước / Trạng thái kế hoạch */}
      {(totalAttention > 0 || totalPrevMonthsOverdue > 0 || totalMissingPlan > 0 || totalMissingDeadlines > 0 || totalMissingOutlines > 0) && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Box Cần chú ý - Compact với collapse */}
          {totalAttention > 0 && (
            <div className="bg-card border-2 border-danger/40 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="bg-danger/10 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-danger" />
                  <h3 className="font-semibold text-danger text-sm">Cần chú ý</h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 bg-danger/20 text-danger rounded font-medium">
                    {overdueTasks.length} trễ
                  </span>
                  <span className="px-2 py-0.5 bg-warning/20 text-warning rounded font-medium">
                    {dueSoonTasks.length} sắp trễ
                  </span>
                </div>
              </div>
              {/* Content - Collapsible by Project */}
              <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                {attentionByProject.map((project) => {
                  const isExpanded = expandedAttentionProject === project.id;
                  return (
                    <div key={project.id} className="border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedAttentionProject(isExpanded ? null : project.id)}
                        className="w-full bg-secondary/50 px-3 py-2 flex items-center justify-between hover:bg-secondary transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-[#8888a0]" /> : <ChevronDown className="w-4 h-4 text-[#8888a0]" />}
                          <span className="font-medium text-[var(--text-primary)] text-sm">{project.projectName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {project.overdue.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-danger text-white text-xs font-bold rounded">{project.overdue.length}</span>
                          )}
                          {project.dueSoon.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-warning text-white text-xs font-bold rounded">{project.dueSoon.length}</span>
                          )}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="p-2 bg-secondary/20">
                          <div className="flex flex-wrap gap-1.5">
                            {project.overdue.map((task) => (
                              <div key={task.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-danger/10 border border-danger/30 rounded text-xs" title={`${task.title || task.keyword_sub} - ${task.pic} - DL: ${formatDate(task.deadline!)}`}>
                                <span className="text-[var(--text-primary)] max-w-[100px] truncate">{task.title || task.keyword_sub || 'N/A'}</span>
                                <span className="text-accent font-medium">{task.pic || 'N/A'}</span>
                                <span className="px-1 py-0.5 bg-danger text-white text-[10px] font-bold rounded">-{task.daysLate}d</span>
                                {task.content_file && (
                                  <a href={task.content_file} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-dark" onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ))}
                            {project.dueSoon.map((task) => (
                              <div key={task.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-warning/10 border border-warning/30 rounded text-xs" title={`${task.title || task.keyword_sub} - ${task.pic} - DL: ${formatDate(task.deadline!)}`}>
                                <span className="text-[var(--text-primary)] max-w-[100px] truncate">{task.title || task.keyword_sub || 'N/A'}</span>
                                <span className="text-accent font-medium">{task.pic || 'N/A'}</span>
                                <span className="px-1 py-0.5 bg-warning text-white text-[10px] font-bold rounded">{task.daysLeft === 0 ? 'Nay' : `${task.daysLeft}d`}</span>
                                {task.content_file && (
                                  <a href={task.content_file} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-dark" onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Box Trễ từ tháng trước - Previous Months Overdue */}
          {totalPrevMonthsOverdue > 0 && (
            <div className="bg-card border-2 border-purple-500/40 rounded-xl overflow-hidden">
              <div className="bg-purple-500/10 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <h3 className="font-semibold text-purple-500 text-sm">Trễ từ tháng trước</h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-500 rounded font-medium">
                    {totalPrevMonthsOverdue} bài
                  </span>
                </div>
              </div>
              <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                {prevMonthsOverdueByProject.map((project) => {
                  const isExpanded = expandedPrevMonthsProject === project.id;
                  return (
                    <div key={project.id} className="border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedPrevMonthsProject(isExpanded ? null : project.id)}
                        className="w-full bg-secondary/50 px-3 py-2 flex items-center justify-between hover:bg-secondary transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-[#8888a0]" /> : <ChevronDown className="w-4 h-4 text-[#8888a0]" />}
                          <span className="font-medium text-[var(--text-primary)] text-sm">{project.projectName}</span>
                        </div>
                        <span className="px-1.5 py-0.5 bg-purple-500 text-white text-xs font-bold rounded">{project.overdue.length}</span>
                      </button>
                      {isExpanded && (
                        <div className="p-2 bg-secondary/20">
                          <div className="flex flex-wrap gap-1.5">
                            {project.overdue.map((task) => (
                              <div key={task.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded text-xs" title={`${task.title || task.keyword_sub} - ${task.pic} - DL: ${formatDate(task.deadline!)}`}>
                                <span className="text-[var(--text-primary)] max-w-[80px] truncate">{task.title || task.keyword_sub || 'N/A'}</span>
                                <span className="text-accent font-medium">{task.pic || 'N/A'}</span>
                                <span className="px-1 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded">-{task.daysLate}d</span>
                                <span className="px-1 py-0.5 bg-[#8888a0]/20 text-[#8888a0] text-[10px] rounded">{task.fromMonth}</span>
                                {task.content_file && (
                                  <a href={task.content_file} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-dark" onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Box Trạng thái kế hoạch - Planning Status */}
          {(totalMissingPlan > 0 || totalMissingDeadlines > 0 || totalMissingOutlines > 0) && (
            <div className="bg-card border-2 border-accent/40 rounded-xl overflow-hidden">
              <div className="bg-accent/10 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-accent" />
                  <h3 className="font-semibold text-accent text-sm">Trạng thái kế hoạch</h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {totalMissingPlan > 0 && (
                    <span className="px-2 py-0.5 bg-danger/20 text-danger rounded font-medium">{totalMissingPlan} thiếu topic</span>
                  )}
                  {totalMissingDeadlines > 0 && (
                    <span className="px-2 py-0.5 bg-warning/20 text-warning rounded font-medium">{totalMissingDeadlines} thiếu DL</span>
                  )}
                  {totalMissingOutlines > 0 && (
                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-500 rounded font-medium">{totalMissingOutlines} thiếu outline</span>
                  )}
                </div>
              </div>
              <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                {planningStatusByProject
                  .filter(p => !p.planComplete || p.missingDeadline > 0 || p.missingOutline > 0)
                  .map((project) => {
                    const isExpanded = expandedPlanningProject === project.id;
                    return (
                      <div key={project.id} className="border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedPlanningProject(isExpanded ? null : project.id)}
                          className="w-full bg-secondary/50 px-3 py-2 flex items-center justify-between hover:bg-secondary transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-[#8888a0]" /> : <ChevronDown className="w-4 h-4 text-[#8888a0]" />}
                            <span className="font-medium text-[var(--text-primary)] text-sm">{project.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {project.planComplete ? (
                              <span className="px-1.5 py-0.5 bg-success/20 text-success text-xs font-medium rounded flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                {project.totalPlanned}/{project.target}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-danger text-white text-xs font-bold rounded">
                                {project.planDiff} topic
                              </span>
                            )}
                            {project.missingDeadline > 0 && (
                              <span className="px-1.5 py-0.5 bg-warning text-white text-xs font-bold rounded">{project.missingDeadline} DL</span>
                            )}
                            {project.missingOutline > 0 && (
                              <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs font-bold rounded">{project.missingOutline} OL</span>
                            )}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="p-2 bg-secondary/20 space-y-2">
                            {!project.planComplete && (
                              <div className="px-2 py-1.5 bg-danger/10 border border-danger/30 rounded text-xs">
                                <span className="text-danger font-medium">
                                  <AlertCircle className="w-3 h-3 inline mr-1" />
                                  Cần thêm {Math.abs(project.planDiff)} topic để đủ KPI ({project.totalPlanned}/{project.target})
                                </span>
                              </div>
                            )}
                            {project.missingDeadline > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs text-warning font-medium px-1">Thiếu deadline ({project.missingDeadline}):</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {project.missingDeadlineTasks.slice(0, 10).map((task) => (
                                    <div key={task.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-warning/10 border border-warning/30 rounded text-xs" title={task.title || task.keyword_sub || ''}>
                                      <span className="text-[var(--text-primary)] max-w-[120px] truncate">{task.title || task.keyword_sub || 'N/A'}</span>
                                      <span className="text-accent font-medium">{task.pic || 'N/A'}</span>
                                    </div>
                                  ))}
                                  {project.missingDeadline > 10 && (
                                    <span className="text-xs text-[#8888a0]">+{project.missingDeadline - 10} nữa...</span>
                                  )}
                                </div>
                              </div>
                            )}
                            {project.missingOutline > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs text-orange-500 font-medium px-1">Thiếu outline ({project.missingOutline}):</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {project.missingOutlineTasks.slice(0, 10).map((task) => (
                                    <div key={task.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-orange-500/10 border border-orange-500/30 rounded text-xs" title={task.title || task.keyword_sub || ''}>
                                      <span className="text-[var(--text-primary)] max-w-[120px] truncate">{task.title || task.keyword_sub || 'N/A'}</span>
                                      <span className="text-accent font-medium">{task.pic || 'N/A'}</span>
                                      {task.status_outline && (
                                        <span className="px-1 py-0.5 bg-[#8888a0]/20 text-[#8888a0] text-[10px] rounded">{task.status_outline.split('.')[0]}</span>
                                      )}
                                    </div>
                                  ))}
                                  {project.missingOutline > 10 && (
                                    <span className="text-xs text-[#8888a0]">+{project.missingOutline - 10} nữa...</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Progress (compact) + Missing Plan Warning + Leaderboard */}
      <div className="grid lg:grid-cols-4 gap-3 md:gap-4">
        {/* Target Progress - Compact */}
        <div className="lg:col-span-2 bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/30 rounded-xl p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-[var(--text-primary)]">KPI tháng</span>
            </div>
            <p className={`text-lg font-bold ${targetProgress >= 100 ? 'text-success' : targetProgress >= 70 ? 'text-warning' : 'text-[var(--text-primary)]'}`}>
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
            <span className="text-sm font-medium text-[var(--text-primary)]">Kế hoạch</span>
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
            <span className="text-sm font-medium text-[var(--text-primary)]">Top dẫn đầu</span>
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
                  <span className="text-[var(--text-primary)] text-xs truncate flex-1">{item.name}</span>
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
          <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)] mb-4">Workflow Status</h2>

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

        {/* Project Progress - Expandable */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)]">Tiến độ dự án</h2>
          </div>

          <div className="space-y-2">
            {projectStats.length > 0 ? (
              projectStats.map((project) => {
                const progress = project.target ? Math.round((project.actual / project.target) * 100) : 0;
                const isExpanded = expandedProject === project.id;
                const workflowStatus = isExpanded ? getProjectWorkflowStatus(project.id) : null;

                return (
                  <div key={project.id}>
                    <button
                      onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                      className="w-full flex items-center gap-3 p-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#8888a0] flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#8888a0] flex-shrink-0" />
                        )}
                        <p className="text-[var(--text-primary)] text-sm font-medium truncate">{project.name}</p>
                      </div>
                      <div className="w-24">
                        <ProgressBar value={project.actual} max={project.target} showLabel={false} size="sm" />
                      </div>
                      <span className={`text-sm font-bold w-16 text-right ${progress >= 100 ? 'text-success' : progress >= 70 ? 'text-warning' : 'text-[var(--text-primary)]'}`}>
                        {project.actual}/{project.target}
                      </span>
                    </button>

                    {/* Expanded Workflow Status */}
                    {isExpanded && workflowStatus && (
                      <div className="mt-2 ml-6 pl-3 border-l-2 border-border space-y-1.5">
                        {workflowStatus.doingOutline > 0 && (
                          <ProjectStatusItem
                            label="Đang làm Outline"
                            count={workflowStatus.doingOutline}
                            color="warning"
                            tasks={workflowStatus.doingOutlineTasks}
                            statusKey={`${project.id}-doingOutline`}
                            isExpanded={expandedProjectStatus === `${project.id}-doingOutline`}
                            onToggle={() => setExpandedProjectStatus(
                              expandedProjectStatus === `${project.id}-doingOutline` ? null : `${project.id}-doingOutline`
                            )}
                          />
                        )}
                        {workflowStatus.qcOutline > 0 && (
                          <ProjectStatusItem
                            label="SEO QC Outline"
                            count={workflowStatus.qcOutline}
                            color="accent"
                            tasks={workflowStatus.qcOutlineTasks}
                            statusKey={`${project.id}-qcOutline`}
                            isExpanded={expandedProjectStatus === `${project.id}-qcOutline`}
                            onToggle={() => setExpandedProjectStatus(
                              expandedProjectStatus === `${project.id}-qcOutline` ? null : `${project.id}-qcOutline`
                            )}
                          />
                        )}
                        {workflowStatus.fixingOutline > 0 && (
                          <ProjectStatusItem
                            label="Đang sửa Outline"
                            count={workflowStatus.fixingOutline}
                            color="orange"
                            tasks={workflowStatus.fixingOutlineTasks}
                            statusKey={`${project.id}-fixingOutline`}
                            isExpanded={expandedProjectStatus === `${project.id}-fixingOutline`}
                            onToggle={() => setExpandedProjectStatus(
                              expandedProjectStatus === `${project.id}-fixingOutline` ? null : `${project.id}-fixingOutline`
                            )}
                          />
                        )}
                        {workflowStatus.doingContent > 0 && (
                          <ProjectStatusItem
                            label="Đang viết Content"
                            count={workflowStatus.doingContent}
                            color="warning"
                            tasks={workflowStatus.doingContentTasks}
                            statusKey={`${project.id}-doingContent`}
                            isExpanded={expandedProjectStatus === `${project.id}-doingContent`}
                            onToggle={() => setExpandedProjectStatus(
                              expandedProjectStatus === `${project.id}-doingContent` ? null : `${project.id}-doingContent`
                            )}
                          />
                        )}
                        {workflowStatus.qcContent > 0 && (
                          <ProjectStatusItem
                            label="SEO QC Content"
                            count={workflowStatus.qcContent}
                            color="accent"
                            tasks={workflowStatus.qcContentTasks}
                            statusKey={`${project.id}-qcContent`}
                            isExpanded={expandedProjectStatus === `${project.id}-qcContent`}
                            onToggle={() => setExpandedProjectStatus(
                              expandedProjectStatus === `${project.id}-qcContent` ? null : `${project.id}-qcContent`
                            )}
                          />
                        )}
                        {workflowStatus.fixingContent > 0 && (
                          <ProjectStatusItem
                            label="Đang sửa Content"
                            count={workflowStatus.fixingContent}
                            color="orange"
                            tasks={workflowStatus.fixingContentTasks}
                            statusKey={`${project.id}-fixingContent`}
                            isExpanded={expandedProjectStatus === `${project.id}-fixingContent`}
                            onToggle={() => setExpandedProjectStatus(
                              expandedProjectStatus === `${project.id}-fixingContent` ? null : `${project.id}-fixingContent`
                            )}
                          />
                        )}
                        {workflowStatus.waitPublish > 0 && (
                          <ProjectStatusItem
                            label="Chờ Publish"
                            count={workflowStatus.waitPublish}
                            color="success"
                            tasks={workflowStatus.waitPublishTasks}
                            statusKey={`${project.id}-waitPublish`}
                            isExpanded={expandedProjectStatus === `${project.id}-waitPublish`}
                            onToggle={() => setExpandedProjectStatus(
                              expandedProjectStatus === `${project.id}-waitPublish` ? null : `${project.id}-waitPublish`
                            )}
                          />
                        )}
                        {/* Summary */}
                        <div className="pt-2 mt-2 border-t border-border space-y-1">
                          <ProjectStatusItem
                            label="Đã Publish"
                            count={workflowStatus.published}
                            color="success"
                            tasks={workflowStatus.publishedTasks}
                            statusKey={`${project.id}-published`}
                            isExpanded={expandedProjectStatus === `${project.id}-published`}
                            onToggle={() => setExpandedProjectStatus(
                              expandedProjectStatus === `${project.id}-published` ? null : `${project.id}-published`
                            )}
                            isSummary
                          />
                          <div className="flex justify-between items-center py-1 text-sm">
                            <span className="text-warning">Đang làm</span>
                            <span className="text-warning font-bold">
                              {workflowStatus.total - workflowStatus.published}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
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
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Báo cáo tuần</h2>
          </div>

          <div className="space-y-4">
            {weeklyReports.length > 0 ? (
              weeklyReports.map((report) => (
                <div key={report.projectId} className="bg-secondary rounded-lg p-4">
                  <p className="text-[var(--text-primary)] font-medium mb-3">{report.projectName}</p>
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

        {/* Recent 3 Days Published */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-accent" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">3 ngày gần đây</h2>
            <span className="ml-auto text-xs text-accent font-medium">{recentThreeDaysTasks.length} bài</span>
          </div>

          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {recentThreeDaysTasks.length > 0 ? (
              recentThreeDaysTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-2 bg-secondary rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-sm font-medium truncate">
                      {task.title || task.keyword_sub || 'Không có tiêu đề'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[#8888a0]">
                      <span className="text-accent">{task.pic || 'N/A'}</span>
                      <span>•</span>
                      <span>{task.project?.name || 'N/A'}</span>
                      <span>•</span>
                      <span className="text-success">{task.publish_date ? formatDate(task.publish_date) : 'N/A'}</span>
                    </div>
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
              <p className="text-[#8888a0] text-center py-6 text-sm">Không có bài viết trong 3 ngày qua</p>
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
  valueColor = 'text-[var(--text-primary)]',
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
          <span className="text-[var(--text-primary)] text-sm font-medium">{label}</span>
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
                <span className="text-[var(--text-primary)] flex-1 truncate text-xs">{task.title}</span>
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
                {task.deadline && (
                  <span className={`px-1.5 py-0.5 rounded ${
                    new Date(task.deadline) < new Date() ? 'bg-danger/20 text-danger' : 'bg-accent/20 text-accent'
                  }`}>
                    DL: {formatDate(task.deadline)}
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

// Project Status Item Component with expandable task list
function ProjectStatusItem({
  label,
  count,
  color,
  tasks,
  isExpanded,
  onToggle,
  isSummary = false,
}: {
  label: string;
  count: number;
  color: 'warning' | 'accent' | 'success' | 'orange';
  tasks: Task[];
  statusKey?: string;
  isExpanded: boolean;
  onToggle: () => void;
  isSummary?: boolean;
}) {
  const bgColors = {
    warning: 'bg-warning/10',
    accent: 'bg-accent/10',
    success: 'bg-success/10',
    orange: 'bg-orange-500/10',
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
        className={`w-full flex justify-between items-center py-1.5 px-2 ${bgColors[color]} rounded text-sm hover:opacity-80 transition-opacity`}
      >
        <div className="flex items-center gap-1.5">
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 text-[#8888a0]" />
          ) : (
            <ChevronDown className="w-3 h-3 text-[#8888a0]" />
          )}
          <span className={isSummary ? textColors[color] : 'text-[#8888a0]'}>{label}</span>
        </div>
        <span className={`${textColors[color]} font-${isSummary ? 'bold' : 'medium'}`}>{count}</span>
      </button>

      {/* Expanded Task List */}
      {isExpanded && tasks.length > 0 && (
        <div className="mt-1 ml-4 pl-2 border-l border-border/50 space-y-1 max-h-[200px] overflow-y-auto">
          {tasks.map((task) => (
            <div key={task.id} className="flex flex-col gap-0.5 text-xs py-1.5 px-2 bg-secondary/30 rounded">
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-primary)] flex-1 truncate">{task.title || task.keyword_sub || 'Không có tiêu đề'}</span>
                {(task.link_publish || task.content_file) && (
                  <a
                    href={task.link_publish || task.content_file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline flex-shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-accent">{task.pic || 'N/A'}</span>
                <div className="flex items-center gap-2">
                  {task.deadline && (
                    <span className={`px-1 py-0.5 rounded ${
                      new Date(task.deadline) < new Date() ? 'bg-danger/20 text-danger' : 'bg-[#8888a0]/20 text-[#8888a0]'
                    }`}>
                      DL: {formatDate(task.deadline)}
                    </span>
                  )}
                  {task.publish_date && (
                    <span className="px-1 py-0.5 rounded bg-success/20 text-success">
                      Pub: {formatDate(task.publish_date)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
