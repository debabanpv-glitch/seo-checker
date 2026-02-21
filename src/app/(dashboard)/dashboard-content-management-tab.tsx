'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
  Wallet,
  Search,
  ArrowRight,
  Bell,
  X,
  TrendingDown,
  Layers,
  Zap,
} from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';
import { formatDate, formatCurrency } from '@/lib/utils';
import { isPublished } from '@/lib/task-helpers';
import { Task, ProjectStats, BottleneckData, Stats, BottleneckTask } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewData {
  tasks: {
    total: number;
    published: number;
    inProgress: number;
    overdue: number;
    dueSoon: number;
  };
  finance: {
    totalSalary: number;
    paidSalary: number;
    unpaidSalary: number;
    paidCount: number;
    unpaidCount: number;
    totalMembers: number;
  };
  seo: {
    keywords: {
      total: number;
      top3: number;
      top10: number;
      top20: number;
      top30: number;
    };
    audit: {
      total: number;
      passed: number;
      failed: number;
      avgScore: number;
    };
    decliningKeywords: Array<{
      keyword: string;
      currentPosition: number;
      previousPosition: number;
      change: number;
    }>;
  };
  alerts: Array<{
    type: 'danger' | 'warning' | 'info';
    title: string;
    message: string;
    count?: number;
    link?: string;
  }>;
  topPerformers: Array<{
    name: string;
    published: number;
    salary: number;
    isPaid: boolean;
    isKpiMet: boolean;
  }>;
}

interface StrategyPhase {
  id: string;
  name: string;
  status: string; // planned | in_progress | completed | blocked
  progress: number;
  phase_type: string;
  priority: number;
}

interface DashboardContentTabProps {
  selectedMonth: number;
  selectedYear: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardContentManagementTab({ selectedMonth, selectedYear }: DashboardContentTabProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [bottleneck, setBottleneck] = useState<BottleneckData | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [overdueFromPreviousMonths, setOverdueFromPreviousMonths] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // Strategy phases state
  const [strategyPhases, setStrategyPhases] = useState<StrategyPhase[]>([]);

  // Expand/collapse state
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [showOverdueDetails, setShowOverdueDetails] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [expandedProjectStatus, setExpandedProjectStatus] = useState<string | null>(null);
  const [expandedAttentionProject, setExpandedAttentionProject] = useState<string | null>(null);
  const [expandedPlanningProject, setExpandedPlanningProject] = useState<string | null>(null);
  const [expandedPrevMonthsProject, setExpandedPrevMonthsProject] = useState<string | null>(null);
  const [showAttention, setShowAttention] = useState(true);
  const [showPrevMonths, setShowPrevMonths] = useState(true);
  const [showPlanning, setShowPlanning] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, overviewRes] = await Promise.all([
        fetch(`/api/v1/stats?month=${selectedMonth}&year=${selectedYear}`),
        fetch(`/api/v1/dashboard/overview?month=${selectedMonth}&year=${selectedYear}`),
      ]);

      const data = await statsRes.json();
      const overviewData = await overviewRes.json();

      setStats(data.stats);
      setProjectStats(data.projectStats);
      setBottleneck(data.bottleneck);
      setAllTasks((data.allTasks || data.recentTasks || []));
      setOverdueFromPreviousMonths(data.overdueFromPreviousMonths || []);
      setOverview(overviewData);

      // Fetch strategy phases for first active project
      try {
        const projectsRes = await fetch('/api/v1/projects');
        const projectsData = await projectsRes.json();
        const projectsList = projectsData.projects || [];
        if (projectsList.length > 0) {
          const firstProjectId = projectsList[0].id;
          const phasesRes = await fetch(`/api/v1/strategy/phases?project_id=${firstProjectId}`);
          const phasesData = await phasesRes.json();
          setStrategyPhases(phasesData.phases || []);
        }
      } catch {
        // Strategy phases are optional - silently ignore errors
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissAlert = (alertTitle: string) => {
    setDismissedAlerts(prev => [...prev, alertTitle]);
  };

  const activeAlerts = overview?.alerts?.filter(a => !dismissedAlerts.includes(a.title)) || [];

  // ─── Computed Values ─────────────────────────────────────────────────────

  const filteredStats = useMemo(() => {
    if (!stats) return null;
    const published = allTasks.filter((t) => isPublished(t)).length;
    const inProgress = allTasks.filter((t) => t.status_content && !isPublished(t)).length;
    return {
      total: published + inProgress,
      published,
      inProgress,
      overdue: allTasks.filter((t) => {
        if (!t.deadline || isPublished(t)) return false;
        return new Date(t.deadline) < new Date();
      }).length,
    };
  }, [stats, allTasks]);

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
      .sort((a, b) => b.daysLate - a.daysLate);
  }, [allTasks]);

  const recentThreeDaysTasks = useMemo(() => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);
    return allTasks
      .filter((t) => {
        if (!t.publish_date || !isPublished(t)) return false;
        return new Date(t.publish_date) >= threeDaysAgo;
      })
      .sort((a, b) => new Date(b.publish_date!).getTime() - new Date(a.publish_date!).getTime());
  }, [allTasks]);

  const leaderboard = useMemo(() => {
    const publishedTasks = allTasks.filter((t) => isPublished(t));
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

  const completionRate = filteredStats?.total
    ? Math.round((filteredStats.published / filteredStats.total) * 100)
    : 0;

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

  const attentionByProject = useMemo(() => {
    const projectMap: Record<string, {
      projectName: string;
      overdue: Array<Task & { daysLate: number }>;
      dueSoon: Array<Task & { daysLeft: number }>;
    }> = {};
    overdueTasks.forEach((task) => {
      const projectId = task.project?.id || 'unknown';
      const projectName = task.project?.name || 'Không xác định';
      if (!projectMap[projectId]) projectMap[projectId] = { projectName, overdue: [], dueSoon: [] };
      projectMap[projectId].overdue.push(task);
    });
    dueSoonTasks.forEach((task) => {
      const projectId = task.project?.id || 'unknown';
      const projectName = task.project?.name || 'Không xác định';
      if (!projectMap[projectId]) projectMap[projectId] = { projectName, overdue: [], dueSoon: [] };
      projectMap[projectId].dueSoon.push(task);
    });
    return Object.entries(projectMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.overdue.length - a.overdue.length);
  }, [overdueTasks, dueSoonTasks]);

  const totalAttention = overdueTasks.length + dueSoonTasks.length;

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
      if (!projectMap[projectId]) projectMap[projectId] = { projectName, overdue: [] };
      projectMap[projectId].overdue.push({ ...task, daysLate, fromMonth });
    });
    return Object.entries(projectMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.overdue.length - a.overdue.length);
  }, [overdueFromPreviousMonths]);

  const totalPrevMonthsOverdue = overdueFromPreviousMonths.length;

  const getProjectPlanningStatus = (projectId: string, target: number) => {
    const projectTasks = allTasks.filter(t => t.project?.id === projectId);
    const totalPlanned = projectTasks.length;
    const missingDeadline = projectTasks.filter(t => !t.deadline);
    const missingOutline = projectTasks.filter(t => {
      if (!t.status_outline) return true;
      const status = t.status_outline.toLowerCase();
      return !status.includes('3. done') && !status.includes('3.done');
    });
    const planComplete = totalPlanned >= target;
    return {
      totalPlanned, target,
      missingDeadline: missingDeadline.length, missingDeadlineTasks: missingDeadline,
      missingOutline: missingOutline.length, missingOutlineTasks: missingOutline,
      planComplete, planDiff: totalPlanned - target,
    };
  };

  const planningStatusByProject = useMemo(() => {
    return projectStats.map((project) => {
      const status = getProjectPlanningStatus(project.id, project.target);
      return { id: project.id, name: project.name, ...status };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectStats, allTasks]);

  const totalMissingPlan = planningStatusByProject.filter(p => !p.planComplete).length;
  const totalMissingDeadlines = planningStatusByProject.reduce((sum, p) => sum + p.missingDeadline, 0);
  const totalMissingOutlines = planningStatusByProject.reduce((sum, p) => sum + p.missingOutline, 0);

  const totalTarget = projectStats.reduce((sum, p) => sum + p.target, 0);
  const totalActual = projectStats.reduce((sum, p) => sum + p.actual, 0);
  const targetProgress = totalTarget ? Math.round((totalActual / totalTarget) * 100) : 0;

  const totalPlanned = allTasks.length;
  const missingPlan = totalTarget - totalPlanned;

  const weeklyReports = useMemo(() => {
    const now = new Date();
    const currentWeekInMonth = Math.ceil(now.getDate() / 7);
    const isCurrentMonth = selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear();
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
    return projectStats.map((project) => {
      const weeklyTarget = Math.ceil(project.target / weeksInMonth.length);
      const projectTasks = allTasks.filter((t) => t.project?.id === project.id && isPublished(t));
      const weeklyData = weeksInMonth.map((week) => {
        const tasksInWeek = projectTasks.filter((t) => {
          if (!t.publish_date) return false;
          const pubDate = new Date(t.publish_date);
          return pubDate >= week.start && pubDate <= week.end;
        });
        return { weekNum: week.weekNum, count: tasksInWeek.length, target: weeklyTarget, isCurrent: isCurrentMonth && week.weekNum === currentWeekInMonth };
      });
      return { projectId: project.id, projectName: project.name, weeklyTarget, weeks: weeklyData };
    });
  }, [projectStats, allTasks, selectedMonth, selectedYear]);

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

  const getProjectWorkflowStatus = (projectId: string) => {
    const projectTasks = allTasks.filter(t => t.project?.id === projectId);
    const doingOutlineTasks = projectTasks.filter(t => t.status_outline?.includes('1. Doing') && !t.status_outline?.includes('1.1'));
    const fixingOutlineTasks = projectTasks.filter(t => t.status_outline?.includes('1.1 Fixing') || t.status_outline?.includes('1.2'));
    const qcOutlineTasks = projectTasks.filter(t => t.status_outline?.includes('2. QC'));
    const doingContentTasks = projectTasks.filter(t => t.status_content?.includes('1. Doing') && !t.status_content?.includes('1.1'));
    const fixingContentTasks = projectTasks.filter(t => t.status_content?.includes('1.1 Fixing') || t.status_content?.includes('1.2'));
    const qcContentTasks = projectTasks.filter(t => t.status_content?.includes('2. QC'));
    const waitPublishTasks = projectTasks.filter(t => t.status_content?.includes('3. Done QC') && !isPublished(t));
    const publishedTasks = projectTasks.filter(t => isPublished(t));
    return {
      doingOutline: doingOutlineTasks.length, doingOutlineTasks,
      fixingOutline: fixingOutlineTasks.length, fixingOutlineTasks,
      qcOutline: qcOutlineTasks.length, qcOutlineTasks,
      doingContent: doingContentTasks.length, doingContentTasks,
      fixingContent: fixingContentTasks.length, fixingContentTasks,
      qcContent: qcContentTasks.length, qcContentTasks,
      waitPublish: waitPublishTasks.length, waitPublishTasks,
      published: publishedTasks.length, publishedTasks,
      total: projectTasks.length,
    };
  };

  // ─── Loading State ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-[#8888a0] text-sm">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 md:space-y-5">

      {/* ── Alert Banner (compact dismissible strip) ── */}
      {activeAlerts.length > 0 && (
        <div className="space-y-1.5">
          {activeAlerts.map((alert) => (
            <div
              key={alert.title}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${
                alert.type === 'danger'
                  ? 'bg-danger/8 border-danger/25 text-danger'
                  : alert.type === 'warning'
                  ? 'bg-warning/8 border-warning/25 text-warning'
                  : 'bg-accent/8 border-accent/25 text-accent'
              }`}
            >
              <div className="flex-shrink-0">
                {alert.type === 'danger' ? <AlertTriangle className="w-4 h-4" /> : alert.type === 'warning' ? <Bell className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>
              <span className="font-medium">{alert.title}</span>
              {alert.count && <span className="px-1.5 py-0.5 bg-white/15 rounded text-xs font-bold">{alert.count}</span>}
              <span className="text-[#8888a0] font-normal text-xs flex-1">{alert.message}</span>
              <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                {alert.link && (
                  <Link
                    href={alert.link}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      alert.type === 'danger' ? 'bg-danger text-white hover:bg-danger/90'
                        : alert.type === 'warning' ? 'bg-warning text-white hover:bg-warning/90'
                        : 'bg-accent text-white hover:bg-accent/90'
                    }`}
                  >
                    Xem
                  </Link>
                )}
                <button onClick={() => dismissAlert(alert.title)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-3.5 h-3.5 text-[#8888a0]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Hero Stats Row (4 gradient cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 relative overflow-hidden group hover:border-accent/40 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#8888a0] text-xs font-medium">Tổng bài</span>
            <div className="p-1.5 bg-accent/10 rounded-lg"><FileText className="w-4 h-4 text-accent" /></div>
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{filteredStats?.total || 0}</p>
          <p className="text-xs text-[#8888a0] mt-1">{totalPlanned} có plan</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 relative overflow-hidden hover:border-success/40 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#8888a0] text-xs font-medium">Đã Publish</span>
            <div className="p-1.5 bg-success/10 rounded-lg"><CheckCircle2 className="w-4 h-4 text-success" /></div>
          </div>
          <p className="text-3xl font-bold text-success">{filteredStats?.published || 0}</p>
          <p className="text-xs text-[#8888a0] mt-1">{completionRate}% hoàn thành</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 relative overflow-hidden hover:border-warning/40 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#8888a0] text-xs font-medium">Đang thực hiện</span>
            <div className="p-1.5 bg-warning/10 rounded-lg"><Clock className="w-4 h-4 text-warning" /></div>
          </div>
          <p className="text-3xl font-bold text-warning">{filteredStats?.inProgress || 0}</p>
          <p className="text-xs text-[#8888a0] mt-1">đang trong quy trình</p>
        </div>

        <button
          onClick={() => setShowOverdueDetails(!showOverdueDetails)}
          className="bg-card border border-border rounded-xl p-4 relative overflow-hidden text-left hover:border-danger/40 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-danger/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#8888a0] text-xs font-medium">Trễ deadline</span>
            <div className="p-1.5 bg-danger/10 rounded-lg"><AlertTriangle className="w-4 h-4 text-danger" /></div>
          </div>
          <p className="text-3xl font-bold text-danger">{filteredStats?.overdue || 0}</p>
          {(filteredStats?.overdue || 0) > 0 && (
            <p className="text-xs text-danger/70 mt-1 flex items-center gap-1">
              {showOverdueDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Xem chi tiết
            </p>
          )}
        </button>
      </div>

      {/* Overdue Details (expandable) */}
      {showOverdueDetails && overdueTasks.length > 0 && (
        <div className="bg-card border-2 border-danger/30 rounded-xl overflow-hidden">
          <div className="bg-danger/8 px-4 py-2.5 flex items-center justify-between border-b border-danger/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-danger" />
              <h3 className="font-semibold text-danger text-sm">Chi tiết bài trễ deadline ({overdueTasks.length})</h3>
            </div>
            <button onClick={() => setShowOverdueDetails(false)} className="text-[#8888a0] hover:text-danger text-xs transition-colors">Đóng</button>
          </div>
          <div className="p-3 space-y-1.5 max-h-[280px] overflow-y-auto">
            {overdueTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-2.5 bg-danger/5 border border-danger/15 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-sm font-medium truncate">{task.title || task.keyword_sub || 'Không có tiêu đề'}</p>
                  <div className="flex items-center gap-2 text-xs text-[#8888a0] mt-0.5">
                    <span className="text-accent">{task.pic || 'N/A'}</span>
                    <span>•</span>
                    <span>{task.project?.name || 'N/A'}</span>
                    <span>•</span>
                    <span className="text-danger">DL: {task.deadline ? formatDate(task.deadline) : 'N/A'}</span>
                  </div>
                </div>
                <span className="px-2 py-1 bg-danger text-white text-xs font-bold rounded-lg">-{task.daysLate}d</span>
                {task.content_file && (
                  <a href={task.content_file} target="_blank" rel="noopener noreferrer" className="p-1.5 text-accent hover:bg-accent/15 rounded-lg transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick Nav Cards (4 links) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/salary" className="group bg-gradient-to-br from-emerald-500/15 to-emerald-500/3 border border-emerald-500/25 rounded-xl p-4 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all">
          <div className="flex items-center justify-between mb-2.5">
            <div className="p-1.5 bg-emerald-500/15 rounded-lg"><Wallet className="w-4 h-4 text-emerald-400" /></div>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-base font-bold text-emerald-400 leading-tight">{overview?.finance ? formatCurrency(overview.finance.totalSalary) : '---'}</p>
          <p className="text-xs text-[#8888a0] mt-0.5">Tổng lương tháng</p>
          {overview?.finance && overview.finance.unpaidCount > 0 && (
            <p className="text-xs text-warning mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{overview.finance.unpaidCount} chưa TT
            </p>
          )}
        </Link>

        <Link href="/keyword-ranking" className="group bg-gradient-to-br from-blue-500/15 to-blue-500/3 border border-blue-500/25 rounded-xl p-4 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center justify-between mb-2.5">
            <div className="p-1.5 bg-blue-500/15 rounded-lg"><TrendingUp className="w-4 h-4 text-blue-400" /></div>
            <ArrowRight className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-base font-bold text-blue-400 leading-tight">
            {overview?.seo?.keywords?.top10 || 0}
            <span className="text-sm font-normal text-[#8888a0]">/{overview?.seo?.keywords?.total || 0}</span>
          </p>
          <p className="text-xs text-[#8888a0] mt-0.5">Top 10 Keywords</p>
          {overview?.seo?.decliningKeywords && overview.seo.decliningKeywords.length > 0 && (
            <p className="text-xs text-danger mt-1.5 flex items-center gap-1"><TrendingDown className="w-3 h-3" />{overview.seo.decliningKeywords.length} giảm</p>
          )}
        </Link>

        <Link href="/seo-audit" className="group bg-gradient-to-br from-purple-500/15 to-purple-500/3 border border-purple-500/25 rounded-xl p-4 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all">
          <div className="flex items-center justify-between mb-2.5">
            <div className="p-1.5 bg-purple-500/15 rounded-lg"><Search className="w-4 h-4 text-purple-400" /></div>
            <ArrowRight className="w-3.5 h-3.5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-base font-bold text-purple-400 leading-tight">
            {overview?.seo?.audit?.avgScore || 0}
            <span className="text-sm font-normal text-[#8888a0]">/100</span>
          </p>
          <p className="text-xs text-[#8888a0] mt-0.5">SEO Score TB</p>
          {overview?.seo?.audit && overview.seo.audit.failed > 0 && (
            <p className="text-xs text-warning mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{overview.seo.audit.failed} cần fix</p>
          )}
        </Link>

        <Link href="/members" className="group bg-gradient-to-br from-orange-500/15 to-orange-500/3 border border-orange-500/25 rounded-xl p-4 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all">
          <div className="flex items-center justify-between mb-2.5">
            <div className="p-1.5 bg-orange-500/15 rounded-lg"><User className="w-4 h-4 text-orange-400" /></div>
            <ArrowRight className="w-3.5 h-3.5 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-base font-bold text-orange-400 leading-tight">
            {overview?.topPerformers?.filter(p => p.isKpiMet).length || 0}
            <span className="text-sm font-normal text-[#8888a0]">/{overview?.finance?.totalMembers || 0}</span>
          </p>
          <p className="text-xs text-[#8888a0] mt-0.5">Đạt KPI</p>
          {overview?.topPerformers && overview.topPerformers[0] && (
            <p className="text-xs text-success mt-1.5 flex items-center gap-1"><Trophy className="w-3 h-3" />{overview.topPerformers[0].name}</p>
          )}
        </Link>
      </div>

      {/* ── Strategy Phase Mini Timeline ── */}
      {strategyPhases.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-accent/10 rounded-lg"><Layers className="w-4 h-4 text-accent" /></div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Lộ trình SEO Strategy</h3>
                <p className="text-xs text-[#8888a0]">Tiến độ các phase chiến lược</p>
              </div>
            </div>
            <Link href="/strategy" className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 transition-colors">
              Xem chi tiết <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {strategyPhases.map((phase, idx) => {
              const isCompleted = phase.status === 'completed';
              const isInProgress = phase.status === 'in_progress';
              const isBlocked = phase.status === 'blocked';
              return (
                <div key={phase.id} className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex flex-col items-center gap-1.5 min-w-[80px] max-w-[100px]">
                    {/* Phase dot with status ring */}
                    <div className={`relative w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted ? 'bg-success/20 border-success'
                        : isInProgress ? 'bg-accent/20 border-accent ring-2 ring-accent/30 ring-offset-1 ring-offset-[var(--bg)]'
                        : isBlocked ? 'bg-danger/15 border-danger/50'
                        : 'bg-secondary border-border'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : isInProgress ? (
                        <Zap className="w-3.5 h-3.5 text-accent" />
                      ) : isBlocked ? (
                        <AlertCircle className="w-3.5 h-3.5 text-danger" />
                      ) : (
                        <span className="text-xs font-bold text-[#8888a0]">{idx + 1}</span>
                      )}
                    </div>
                    {/* Phase name */}
                    <p className={`text-[10px] text-center leading-tight font-medium truncate w-full ${
                      isCompleted ? 'text-success'
                        : isInProgress ? 'text-accent'
                        : isBlocked ? 'text-danger'
                        : 'text-[#8888a0]'
                    }`} title={phase.name}>
                      {phase.name.length > 12 ? phase.name.slice(0, 12) + '…' : phase.name}
                    </p>
                    {/* Progress mini bar */}
                    {phase.progress > 0 && (
                      <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isCompleted ? 'bg-success' : isInProgress ? 'bg-accent' : 'bg-[#8888a0]'}`}
                          style={{ width: `${phase.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {/* Connector line */}
                  {idx < strategyPhases.length - 1 && (
                    <div className={`h-px w-6 flex-shrink-0 ${isCompleted ? 'bg-success/50' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
            <span className="flex items-center gap-1 text-[10px] text-success"><CheckCircle className="w-3 h-3" /> Hoàn thành</span>
            <span className="flex items-center gap-1 text-[10px] text-accent"><Zap className="w-3 h-3" /> Đang làm</span>
            <span className="flex items-center gap-1 text-[10px] text-[#8888a0]"><div className="w-3 h-3 rounded-full border border-border" /> Chưa bắt đầu</span>
            {strategyPhases.some(p => p.status === 'blocked') && (
              <span className="flex items-center gap-1 text-[10px] text-danger"><AlertCircle className="w-3 h-3" /> Bị chặn</span>
            )}
          </div>
        </div>
      )}

      {/* ── Two Column: KPI + Leaderboard | Project Progress ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Left: KPI + Plan Status + Leaderboard */}
        <div className="space-y-3">
          {/* KPI Progress Bar */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-accent/10 rounded-lg"><Target className="w-4 h-4 text-accent" /></div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">KPI tháng</span>
              </div>
              <span className={`text-xl font-bold ${targetProgress >= 100 ? 'text-success' : targetProgress >= 70 ? 'text-warning' : 'text-[var(--text-primary)]'}`}>
                {targetProgress}%
              </span>
            </div>
            <ProgressBar value={totalActual} max={totalTarget} showLabel={false} size="sm" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-[#8888a0]">{totalActual} / {totalTarget} bài đã publish</span>
              <span className={`text-xs font-medium ${missingPlan > 0 ? 'text-warning' : 'text-success'}`}>
                {missingPlan > 0 ? `Thiếu ${missingPlan} plan` : 'Đủ kế hoạch'}
              </span>
            </div>
          </div>

          {/* Workflow Pipeline */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-warning/10 rounded-lg"><Zap className="w-4 h-4 text-warning" /></div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Workflow Pipeline</h3>
            </div>
            {bottleneck ? (
              <div className="space-y-1.5">
                <WorkflowItem label="Làm Outline" count={bottleneck.content.doingOutline} color="warning" tasks={getWorkflowTasks('doingOutline')} isExpanded={expandedWorkflow === 'doingOutline'} onToggle={() => setExpandedWorkflow(expandedWorkflow === 'doingOutline' ? null : 'doingOutline')} />
                <WorkflowItem label="QC Outline" count={bottleneck.seo.qcOutline} color="accent" tasks={getWorkflowTasks('qcOutline')} isExpanded={expandedWorkflow === 'qcOutline'} onToggle={() => setExpandedWorkflow(expandedWorkflow === 'qcOutline' ? null : 'qcOutline')} />
                {bottleneck.content.fixingOutline > 0 && <WorkflowItem label="Sửa Outline" count={bottleneck.content.fixingOutline} color="orange" tasks={getWorkflowTasks('fixingOutline')} isExpanded={expandedWorkflow === 'fixingOutline'} onToggle={() => setExpandedWorkflow(expandedWorkflow === 'fixingOutline' ? null : 'fixingOutline')} />}
                <WorkflowItem label="Viết Content" count={bottleneck.content.doingContent} color="warning" tasks={getWorkflowTasks('doingContent')} isExpanded={expandedWorkflow === 'doingContent'} onToggle={() => setExpandedWorkflow(expandedWorkflow === 'doingContent' ? null : 'doingContent')} />
                <WorkflowItem label="QC Content" count={bottleneck.seo.qcContent} color="accent" tasks={getWorkflowTasks('qcContent')} isExpanded={expandedWorkflow === 'qcContent'} onToggle={() => setExpandedWorkflow(expandedWorkflow === 'qcContent' ? null : 'qcContent')} />
                {bottleneck.content.fixingContent > 0 && <WorkflowItem label="Sửa Content" count={bottleneck.content.fixingContent} color="orange" tasks={getWorkflowTasks('fixingContent')} isExpanded={expandedWorkflow === 'fixingContent'} onToggle={() => setExpandedWorkflow(expandedWorkflow === 'fixingContent' ? null : 'fixingContent')} />}
                <WorkflowItem label="Chờ Publish" count={bottleneck.seo.waitPublish} color="success" tasks={getWorkflowTasks('waitPublish')} isExpanded={expandedWorkflow === 'waitPublish'} onToggle={() => setExpandedWorkflow(expandedWorkflow === 'waitPublish' ? null : 'waitPublish')} />
                {(() => {
                  const totalInProgress = bottleneck.content.doingOutline + bottleneck.content.fixingOutline + bottleneck.content.doingContent + bottleneck.content.fixingContent + bottleneck.seo.qcOutline + bottleneck.seo.qcContent + bottleneck.seo.waitPublish;
                  const publishedCount = filteredStats?.published || 0;
                  const total = publishedCount + totalInProgress;
                  const isEnough = total >= totalTarget;
                  return (
                    <div className="mt-2 pt-2 border-t border-border grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-success font-bold">{publishedCount}</p>
                        <p className="text-[10px] text-[#8888a0]">Published</p>
                      </div>
                      <div>
                        <p className="text-warning font-bold">{totalInProgress}</p>
                        <p className="text-[10px] text-[#8888a0]">Đang làm</p>
                      </div>
                      <div>
                        <p className={`font-bold ${isEnough ? 'text-success' : 'text-danger'}`}>{total}/{totalTarget}</p>
                        <p className="text-[10px] text-[#8888a0]">{isEnough ? 'Đủ KPI' : `Thiếu ${totalTarget - total}`}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : <p className="text-[#8888a0] text-center py-4 text-sm">Không có dữ liệu</p>}
          </div>

          {/* Top Performers Leaderboard */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-yellow-500/10 rounded-lg"><Trophy className="w-4 h-4 text-yellow-500" /></div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Top Performers</h3>
            </div>
            <div className="space-y-2">
              {leaderboard.length > 0 ? leaderboard.map((item) => (
                <div key={item.name} className="flex items-center gap-3 p-2 bg-secondary rounded-lg">
                  <div className="w-6 flex items-center justify-center flex-shrink-0">
                    {item.rank === 1 ? <Crown className="w-4 h-4 text-yellow-500" /> : item.rank === 2 ? <Medal className="w-4 h-4 text-gray-400" /> : <Medal className="w-4 h-4 text-orange-500" />}
                  </div>
                  <span className="text-[var(--text-primary)] text-sm truncate flex-1">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min((item.count / (leaderboard[0]?.count || 1)) * 100, 100)}%` }} />
                    </div>
                    <span className="text-accent font-bold text-sm w-6 text-right">{item.count}</span>
                  </div>
                </div>
              )) : <p className="text-[#8888a0] text-center py-3 text-sm">Chưa có dữ liệu</p>}
            </div>
          </div>
        </div>

        {/* Right: Project Progress */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-accent/10 rounded-lg"><TrendingUp className="w-4 h-4 text-accent" /></div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tiến độ dự án</h3>
          </div>
          <div className="space-y-2">
            {projectStats.length > 0 ? projectStats.map((project) => {
              const progress = project.target ? Math.round((project.actual / project.target) * 100) : 0;
              const isExpanded = expandedProject === project.id;
              const workflowStatus = isExpanded ? getProjectWorkflowStatus(project.id) : null;
              return (
                <div key={project.id}>
                  <button
                    onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                    className="w-full flex items-center gap-3 p-2.5 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#8888a0] flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-[#8888a0] flex-shrink-0" />}
                      <p className="text-[var(--text-primary)] text-sm font-medium truncate">{project.name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-20">
                        <ProgressBar value={project.actual} max={project.target} showLabel={false} size="sm" />
                      </div>
                      <span className={`text-sm font-bold w-14 text-right ${progress >= 100 ? 'text-success' : progress >= 70 ? 'text-warning' : 'text-[var(--text-primary)]'}`}>
                        {project.actual}/{project.target}
                      </span>
                    </div>
                  </button>
                  {isExpanded && workflowStatus && (
                    <div className="mt-1.5 ml-5 pl-3 border-l-2 border-border space-y-1">
                      {workflowStatus.doingOutline > 0 && <ProjectStatusItem label="Làm Outline" count={workflowStatus.doingOutline} color="warning" tasks={workflowStatus.doingOutlineTasks} isExpanded={expandedProjectStatus === `${project.id}-doingOutline`} onToggle={() => setExpandedProjectStatus(expandedProjectStatus === `${project.id}-doingOutline` ? null : `${project.id}-doingOutline`)} />}
                      {workflowStatus.qcOutline > 0 && <ProjectStatusItem label="QC Outline" count={workflowStatus.qcOutline} color="accent" tasks={workflowStatus.qcOutlineTasks} isExpanded={expandedProjectStatus === `${project.id}-qcOutline`} onToggle={() => setExpandedProjectStatus(expandedProjectStatus === `${project.id}-qcOutline` ? null : `${project.id}-qcOutline`)} />}
                      {workflowStatus.fixingOutline > 0 && <ProjectStatusItem label="Sửa Outline" count={workflowStatus.fixingOutline} color="orange" tasks={workflowStatus.fixingOutlineTasks} isExpanded={expandedProjectStatus === `${project.id}-fixingOutline`} onToggle={() => setExpandedProjectStatus(expandedProjectStatus === `${project.id}-fixingOutline` ? null : `${project.id}-fixingOutline`)} />}
                      {workflowStatus.doingContent > 0 && <ProjectStatusItem label="Viết Content" count={workflowStatus.doingContent} color="warning" tasks={workflowStatus.doingContentTasks} isExpanded={expandedProjectStatus === `${project.id}-doingContent`} onToggle={() => setExpandedProjectStatus(expandedProjectStatus === `${project.id}-doingContent` ? null : `${project.id}-doingContent`)} />}
                      {workflowStatus.qcContent > 0 && <ProjectStatusItem label="QC Content" count={workflowStatus.qcContent} color="accent" tasks={workflowStatus.qcContentTasks} isExpanded={expandedProjectStatus === `${project.id}-qcContent`} onToggle={() => setExpandedProjectStatus(expandedProjectStatus === `${project.id}-qcContent` ? null : `${project.id}-qcContent`)} />}
                      {workflowStatus.fixingContent > 0 && <ProjectStatusItem label="Sửa Content" count={workflowStatus.fixingContent} color="orange" tasks={workflowStatus.fixingContentTasks} isExpanded={expandedProjectStatus === `${project.id}-fixingContent`} onToggle={() => setExpandedProjectStatus(expandedProjectStatus === `${project.id}-fixingContent` ? null : `${project.id}-fixingContent`)} />}
                      {workflowStatus.waitPublish > 0 && <ProjectStatusItem label="Chờ Publish" count={workflowStatus.waitPublish} color="success" tasks={workflowStatus.waitPublishTasks} isExpanded={expandedProjectStatus === `${project.id}-waitPublish`} onToggle={() => setExpandedProjectStatus(expandedProjectStatus === `${project.id}-waitPublish` ? null : `${project.id}-waitPublish`)} />}
                      <div className="pt-1.5 mt-1 border-t border-border space-y-1">
                        <ProjectStatusItem label="Đã Publish" count={workflowStatus.published} color="success" tasks={workflowStatus.publishedTasks} isExpanded={expandedProjectStatus === `${project.id}-published`} onToggle={() => setExpandedProjectStatus(expandedProjectStatus === `${project.id}-published` ? null : `${project.id}-published`)} isSummary />
                        <div className="flex justify-between items-center py-1 text-xs px-2">
                          <span className="text-warning">Đang làm</span>
                          <span className="text-warning font-bold">{workflowStatus.total - workflowStatus.published}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }) : <p className="text-[#8888a0] text-center py-8 text-sm">Chưa có dự án nào</p>}
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Weekly Report + Recent 3 Days ── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Weekly Report (2/3 width) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-accent/10 rounded-lg"><Calendar className="w-4 h-4 text-accent" /></div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Báo cáo tuần</h3>
          </div>
          <div className="space-y-3">
            {weeklyReports.length > 0 ? weeklyReports.map((report) => (
              <div key={report.projectId} className="bg-secondary rounded-xl p-3">
                <p className="text-[var(--text-primary)] text-sm font-medium mb-2.5">{report.projectName}</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {report.weeks.map((week) => {
                    const isAchieved = week.count >= week.target;
                    return (
                      <div
                        key={week.weekNum}
                        className={`text-center p-2 rounded-lg relative ${week.isCurrent ? 'ring-2 ring-accent ring-offset-1 ring-offset-secondary' : ''} ${
                          isAchieved ? 'bg-success/15 border border-success/25'
                            : week.count > 0 ? 'bg-warning/15 border border-warning/25'
                            : 'bg-card border border-border'
                        }`}
                      >
                        {week.isCurrent && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-accent text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">Hiện tại</span>
                        )}
                        <p className="text-[10px] text-[#8888a0] mb-1">T{week.weekNum}</p>
                        <p className={`text-lg font-bold ${isAchieved ? 'text-success' : week.count > 0 ? 'text-warning' : 'text-[#8888a0]'}`}>{week.count}</p>
                        <p className="text-[10px] text-[#8888a0]">/{week.target}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )) : <p className="text-[#8888a0] text-center py-8 text-sm">Chưa có dữ liệu báo cáo tuần</p>}
          </div>
        </div>

        {/* Recent 3 Days (1/3 width) */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-success/10 rounded-lg"><CheckCircle2 className="w-4 h-4 text-success" /></div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">3 ngày gần đây</h3>
            <span className="ml-auto px-2 py-0.5 bg-success/15 text-success text-xs font-medium rounded-full">{recentThreeDaysTasks.length}</span>
          </div>
          <div className="space-y-1.5 flex-1 overflow-y-auto">
            {recentThreeDaysTasks.length > 0 ? recentThreeDaysTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-2 p-2 bg-secondary rounded-lg group">
                <div className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-xs font-medium truncate leading-snug">{task.title || task.keyword_sub || 'Không có tiêu đề'}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#8888a0] mt-0.5">
                    <span className="text-accent">{task.pic || 'N/A'}</span>
                    <span>•</span>
                    <span className="text-success">{task.publish_date ? formatDate(task.publish_date) : 'N/A'}</span>
                  </div>
                </div>
                {task.link_publish && (
                  <a href={task.link_publish} target="_blank" rel="noopener noreferrer" className="p-1 text-[#8888a0] hover:text-accent rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )) : (
              <div className="flex items-center justify-center h-full py-8">
                <p className="text-[#8888a0] text-sm text-center">Không có bài viết trong 3 ngày qua</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Collapsible Attention Sections ── */}
      {(totalAttention > 0 || totalPrevMonthsOverdue > 0 || totalMissingPlan > 0 || totalMissingDeadlines > 0 || totalMissingOutlines > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-[#8888a0] font-medium px-2">Cần xử lý</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid lg:grid-cols-3 gap-3">
            {/* Cần chú ý */}
            {totalAttention > 0 && (
              <CollapsibleSection
                title="Cần chú ý"
                icon={<AlertTriangle className="w-4 h-4 text-danger" />}
                colorClass="border-danger/30 bg-danger/5"
                headerColorClass="text-danger"
                isOpen={showAttention}
                onToggle={() => setShowAttention(!showAttention)}
                badges={[
                  { label: `${overdueTasks.length} trễ`, color: 'bg-danger/20 text-danger' },
                  { label: `${dueSoonTasks.length} sắp trễ`, color: 'bg-warning/20 text-warning' },
                ]}
              >
                <div className="space-y-1">
                  {attentionByProject.map((project) => {
                    const isExpanded = expandedAttentionProject === project.id;
                    return (
                      <div key={project.id} className="border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedAttentionProject(isExpanded ? null : project.id)}
                          className="w-full bg-secondary/50 px-3 py-2 flex items-center justify-between hover:bg-secondary transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#8888a0]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#8888a0]" />}
                            <span className="font-medium text-[var(--text-primary)] text-xs">{project.projectName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {project.overdue.length > 0 && <span className="px-1.5 py-0.5 bg-danger text-white text-[10px] font-bold rounded">{project.overdue.length}</span>}
                            {project.dueSoon.length > 0 && <span className="px-1.5 py-0.5 bg-warning text-white text-[10px] font-bold rounded">{project.dueSoon.length}</span>}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="p-2 bg-secondary/20">
                            <div className="flex flex-wrap gap-1.5">
                              {project.overdue.map((task) => (
                                <div key={task.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-danger/10 border border-danger/25 rounded text-xs" title={`${task.title || task.keyword_sub} - ${task.pic} - DL: ${formatDate(task.deadline!)}`}>
                                  <span className="text-[var(--text-primary)] max-w-[90px] truncate">{task.title || task.keyword_sub || 'N/A'}</span>
                                  <span className="text-accent font-medium">{task.pic || 'N/A'}</span>
                                  <span className="px-1 py-0.5 bg-danger text-white text-[9px] font-bold rounded">-{task.daysLate}d</span>
                                  {task.content_file && <a href={task.content_file} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}><ExternalLink className="w-3 h-3 text-accent" /></a>}
                                </div>
                              ))}
                              {project.dueSoon.map((task) => (
                                <div key={task.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-warning/10 border border-warning/25 rounded text-xs" title={`${task.title || task.keyword_sub} - ${task.pic} - DL: ${formatDate(task.deadline!)}`}>
                                  <span className="text-[var(--text-primary)] max-w-[90px] truncate">{task.title || task.keyword_sub || 'N/A'}</span>
                                  <span className="text-accent font-medium">{task.pic || 'N/A'}</span>
                                  <span className="px-1 py-0.5 bg-warning text-white text-[9px] font-bold rounded">{task.daysLeft === 0 ? 'Nay' : `${task.daysLeft}d`}</span>
                                  {task.content_file && <a href={task.content_file} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}><ExternalLink className="w-3 h-3 text-accent" /></a>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleSection>
            )}

            {/* Trễ từ tháng trước */}
            {totalPrevMonthsOverdue > 0 && (
              <CollapsibleSection
                title="Trễ từ tháng trước"
                icon={<Clock className="w-4 h-4 text-purple-400" />}
                colorClass="border-purple-500/30 bg-purple-500/5"
                headerColorClass="text-purple-400"
                isOpen={showPrevMonths}
                onToggle={() => setShowPrevMonths(!showPrevMonths)}
                badges={[{ label: `${totalPrevMonthsOverdue} bài`, color: 'bg-purple-500/20 text-purple-400' }]}
              >
                <div className="space-y-1">
                  {prevMonthsOverdueByProject.map((project) => {
                    const isExpanded = expandedPrevMonthsProject === project.id;
                    return (
                      <div key={project.id} className="border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedPrevMonthsProject(isExpanded ? null : project.id)}
                          className="w-full bg-secondary/50 px-3 py-2 flex items-center justify-between hover:bg-secondary transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#8888a0]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#8888a0]" />}
                            <span className="font-medium text-[var(--text-primary)] text-xs">{project.projectName}</span>
                          </div>
                          <span className="px-1.5 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded">{project.overdue.length}</span>
                        </button>
                        {isExpanded && (
                          <div className="p-2 bg-secondary/20">
                            <div className="flex flex-wrap gap-1.5">
                              {project.overdue.map((task) => (
                                <div key={task.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 border border-purple-500/25 rounded text-xs">
                                  <span className="text-[var(--text-primary)] max-w-[70px] truncate">{task.title || task.keyword_sub || 'N/A'}</span>
                                  <span className="text-accent font-medium">{task.pic || 'N/A'}</span>
                                  <span className="px-1 py-0.5 bg-purple-500 text-white text-[9px] font-bold rounded">-{task.daysLate}d</span>
                                  <span className="px-1 py-0.5 bg-[#8888a0]/20 text-[#8888a0] text-[9px] rounded">{task.fromMonth}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleSection>
            )}

            {/* Trạng thái kế hoạch */}
            {(totalMissingPlan > 0 || totalMissingDeadlines > 0 || totalMissingOutlines > 0) && (
              <CollapsibleSection
                title="Trạng thái kế hoạch"
                icon={<ClipboardList className="w-4 h-4 text-accent" />}
                colorClass="border-accent/30 bg-accent/5"
                headerColorClass="text-accent"
                isOpen={showPlanning}
                onToggle={() => setShowPlanning(!showPlanning)}
                badges={[
                  ...(totalMissingPlan > 0 ? [{ label: `${totalMissingPlan} thiếu topic`, color: 'bg-danger/20 text-danger' }] : []),
                  ...(totalMissingDeadlines > 0 ? [{ label: `${totalMissingDeadlines} thiếu DL`, color: 'bg-warning/20 text-warning' }] : []),
                  ...(totalMissingOutlines > 0 ? [{ label: `${totalMissingOutlines} thiếu OL`, color: 'bg-orange-500/20 text-orange-400' }] : []),
                ]}
              >
                <div className="space-y-1">
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
                            <div className="flex items-center gap-1.5">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#8888a0]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#8888a0]" />}
                              <span className="font-medium text-[var(--text-primary)] text-xs">{project.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {project.planComplete ? (
                                <span className="px-1.5 py-0.5 bg-success/20 text-success text-[10px] font-medium rounded flex items-center gap-0.5"><CheckCircle className="w-2.5 h-2.5" />{project.totalPlanned}/{project.target}</span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-danger text-white text-[10px] font-bold rounded">{project.planDiff}</span>
                              )}
                              {project.missingDeadline > 0 && <span className="px-1.5 py-0.5 bg-warning text-white text-[10px] font-bold rounded">{project.missingDeadline} DL</span>}
                              {project.missingOutline > 0 && <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded">{project.missingOutline} OL</span>}
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="p-2 bg-secondary/20 space-y-2">
                              {!project.planComplete && (
                                <div className="px-2 py-1.5 bg-danger/10 border border-danger/25 rounded text-xs">
                                  <span className="text-danger font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />Cần thêm {Math.abs(project.planDiff)} topic ({project.totalPlanned}/{project.target})</span>
                                </div>
                              )}
                              {project.missingDeadline > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-warning font-medium px-1">Thiếu deadline ({project.missingDeadline}):</p>
                                  <div className="flex flex-wrap gap-1">
                                    {project.missingDeadlineTasks.slice(0, 8).map((task) => (
                                      <div key={task.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-warning/10 border border-warning/25 rounded text-[10px]">
                                        <span className="text-[var(--text-primary)] max-w-[100px] truncate">{task.title || task.keyword_sub || 'N/A'}</span>
                                        <span className="text-accent">{task.pic || 'N/A'}</span>
                                      </div>
                                    ))}
                                    {project.missingDeadline > 8 && <span className="text-[10px] text-[#8888a0]">+{project.missingDeadline - 8}...</span>}
                                  </div>
                                </div>
                              )}
                              {project.missingOutline > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-orange-400 font-medium px-1">Thiếu outline ({project.missingOutline}):</p>
                                  <div className="flex flex-wrap gap-1">
                                    {project.missingOutlineTasks.slice(0, 8).map((task) => (
                                      <div key={task.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/10 border border-orange-500/25 rounded text-[10px]">
                                        <span className="text-[var(--text-primary)] max-w-[100px] truncate">{task.title || task.keyword_sub || 'N/A'}</span>
                                        <span className="text-accent">{task.pic || 'N/A'}</span>
                                      </div>
                                    ))}
                                    {project.missingOutline > 8 && <span className="text-[10px] text-[#8888a0]">+{project.missingOutline - 8}...</span>}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </CollapsibleSection>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  colorClass,
  headerColorClass,
  isOpen,
  onToggle,
  badges,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  headerColorClass: string;
  isOpen: boolean;
  onToggle: () => void;
  badges?: { label: string; color: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border overflow-hidden ${colorClass}`}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className={`font-semibold text-sm ${headerColorClass}`}>{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {badges?.map((b) => (
            <span key={b.label} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${b.color}`}>{b.label}</span>
          ))}
          {isOpen ? <ChevronUp className="w-4 h-4 text-[#8888a0] ml-1" /> : <ChevronDown className="w-4 h-4 text-[#8888a0] ml-1" />}
        </div>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 bg-card/50 max-h-[280px] overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

function WorkflowItem({ label, count, color, tasks, isExpanded, onToggle }: {
  label: string; count: number; color: 'warning' | 'accent' | 'success' | 'orange'; tasks: BottleneckTask[]; isExpanded: boolean; onToggle: () => void;
}) {
  const colorClasses = {
    warning: 'bg-warning/8 border-warning/20 hover:bg-warning/15',
    accent: 'bg-accent/8 border-accent/20 hover:bg-accent/15',
    success: 'bg-success/8 border-success/20 hover:bg-success/15',
    orange: 'bg-orange-500/8 border-orange-500/20 hover:bg-orange-500/15',
  };
  const countBg = { warning: 'bg-warning/20 text-warning', accent: 'bg-accent/20 text-accent', success: 'bg-success/20 text-success', orange: 'bg-orange-500/20 text-orange-400' };
  return (
    <div>
      <button onClick={onToggle} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${colorClasses[color]}`}>
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#8888a0]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#8888a0]" />}
          <span className="text-[var(--text-primary)] text-xs font-medium">{label}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${countBg[color]}`}>{count}</span>
      </button>
      {isExpanded && tasks.length > 0 && (
        <div className="mt-1 ml-5 pl-3 border-l-2 border-border space-y-1 max-h-[180px] overflow-y-auto">
          {tasks.map((task, idx) => (
            <div key={task.id || idx} className="flex flex-col gap-0.5 text-xs py-1.5 px-2 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-primary)] flex-1 truncate">{task.title}</span>
                {task.link && <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-accent flex-shrink-0"><ExternalLink className="w-3 h-3" /></a>}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#8888a0]">
                <span>{task.pic} • {task.project}</span>
                {task.deadline && <span className={`px-1.5 py-0.5 rounded ${new Date(task.deadline) < new Date() ? 'bg-danger/20 text-danger' : 'bg-[#8888a0]/20'}`}>DL: {formatDate(task.deadline)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {isExpanded && tasks.length === 0 && (
        <div className="mt-1 ml-5 pl-3 border-l-2 border-border">
          <p className="text-[10px] text-[#8888a0] py-1.5">Không có chi tiết</p>
        </div>
      )}
    </div>
  );
}

function ProjectStatusItem({ label, count, color, tasks, isExpanded, onToggle, isSummary = false }: {
  label: string; count: number; color: 'warning' | 'accent' | 'success' | 'orange'; tasks: Task[]; statusKey?: string; isExpanded: boolean; onToggle: () => void; isSummary?: boolean;
}) {
  const bgColors = { warning: 'bg-warning/8', accent: 'bg-accent/8', success: 'bg-success/8', orange: 'bg-orange-500/8' };
  const textColors = { warning: 'text-warning', accent: 'text-accent', success: 'text-success', orange: 'text-orange-400' };
  return (
    <div>
      <button onClick={onToggle} className={`w-full flex justify-between items-center py-1.5 px-2.5 ${bgColors[color]} rounded-lg text-xs hover:opacity-80 transition-opacity`}>
        <div className="flex items-center gap-1.5">
          {isExpanded ? <ChevronUp className="w-3 h-3 text-[#8888a0]" /> : <ChevronDown className="w-3 h-3 text-[#8888a0]" />}
          <span className={isSummary ? textColors[color] : 'text-[#8888a0]'}>{label}</span>
        </div>
        <span className={`${textColors[color]} font-${isSummary ? 'bold' : 'medium'}`}>{count}</span>
      </button>
      {isExpanded && tasks.length > 0 && (
        <div className="mt-1 ml-4 pl-2 border-l border-border/50 space-y-1 max-h-[180px] overflow-y-auto">
          {tasks.map((task) => (
            <div key={task.id} className="flex flex-col gap-0.5 text-xs py-1.5 px-2 bg-secondary/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-primary)] flex-1 truncate">{task.title || task.keyword_sub || 'Không có tiêu đề'}</span>
                {(task.link_publish || task.content_file) && <a href={task.link_publish || task.content_file} target="_blank" rel="noopener noreferrer" className="text-accent flex-shrink-0"><ExternalLink className="w-3 h-3" /></a>}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#8888a0]">
                <span className="text-accent">{task.pic || 'N/A'}</span>
                <div className="flex items-center gap-1.5">
                  {task.deadline && <span className={`px-1 py-0.5 rounded ${new Date(task.deadline) < new Date() ? 'bg-danger/20 text-danger' : 'bg-[#8888a0]/15'}`}>DL: {formatDate(task.deadline)}</span>}
                  {task.publish_date && <span className="px-1 py-0.5 rounded bg-success/20 text-success">Pub: {formatDate(task.publish_date)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
