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
  BarChart3,
  ExternalLink,
  Trophy,
  Medal,
  Crown,
  User,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import ProgressBar from '@/components/ProgressBar';
import { PageLoading } from '@/components/LoadingSpinner';
import { formatDate, isOverdue } from '@/lib/utils';
import { Task, ProjectStats, BottleneckData, Stats, BottleneckTask } from '@/types';

type ChartGroupBy = 'project' | 'person';
type ChartTimeRange = 'day' | 'week';

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
  const [alerts, setAlerts] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Workflow expanded state
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);

  // Chart settings
  const [chartGroupBy, setChartGroupBy] = useState<ChartGroupBy>('project');
  const [chartTimeRange, setChartTimeRange] = useState<ChartTimeRange>('day');

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
      setAlerts((data.alerts || []).filter((t: Task) => t.title || t.keyword_sub));
      setAllTasks((data.allTasks || data.recentTasks || []).concat(data.alerts || []));
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

    // Filter all tasks by date range
    const filteredTasks = allTasks.filter((task) => {
      const taskDate = task.publish_date ? new Date(task.publish_date) : null;
      if (!taskDate) return false;
      return taskDate >= fromDate && taskDate <= toDate;
    });

    return {
      total: stats.total,
      published: filteredTasks.filter((t) => t.status_content === '4. Publish').length,
      inProgress: stats.inProgress,
      overdue: stats.overdue,
    };
  }, [stats, dateRange, allTasks]);

  // Generate chart data based on groupBy and timeRange
  const chartData = useMemo(() => {
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    const data: Record<string, Record<string, number>> = {};

    // Get all published tasks
    const publishedTasks = allTasks.filter(
      (t) => t.status_content === '4. Publish' && t.publish_date
    );

    // Group tasks by date (day or week)
    publishedTasks.forEach((task) => {
      const pubDate = new Date(task.publish_date);
      if (pubDate < fromDate || pubDate > toDate) return;

      let dateKey: string;
      if (chartTimeRange === 'week') {
        // Get week number
        const weekStart = new Date(pubDate);
        weekStart.setDate(pubDate.getDate() - pubDate.getDay() + 1);
        dateKey = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
      } else {
        dateKey = `${pubDate.getDate()}/${pubDate.getMonth() + 1}`;
      }

      const groupKey = chartGroupBy === 'project'
        ? (task.project?.name || 'Khác')
        : (task.pic || 'Chưa assign');

      if (!data[dateKey]) data[dateKey] = {};
      if (!data[dateKey][groupKey]) data[dateKey][groupKey] = 0;
      data[dateKey][groupKey]++;
    });

    // Convert to array format for recharts
    const result: Array<{ date: string; [key: string]: string | number }> = [];
    const allGroups = new Set<string>();

    Object.entries(data).forEach(([, groups]) => {
      Object.keys(groups).forEach((g) => allGroups.add(g));
    });

    // Sort dates
    const sortedDates = Object.keys(data).sort((a, b) => {
      const [dayA, monthA] = a.split('/').map(Number);
      const [dayB, monthB] = b.split('/').map(Number);
      if (monthA !== monthB) return monthA - monthB;
      return dayA - dayB;
    });

    sortedDates.forEach((date) => {
      const entry: { date: string; [key: string]: string | number } = { date };
      allGroups.forEach((group) => {
        entry[group] = data[date][group] || 0;
      });
      result.push(entry);
    });

    return { data: result, groups: Array.from(allGroups) };
  }, [allTasks, dateRange, chartGroupBy, chartTimeRange]);

  // Calculate leaderboard
  const leaderboard = useMemo(() => {
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);

    const publishedTasks = allTasks.filter((t) => {
      if (t.status_content !== '4. Publish' || !t.publish_date) return false;
      const pubDate = new Date(t.publish_date);
      return pubDate >= fromDate && pubDate <= toDate;
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

  // Get tasks for workflow section
  const getWorkflowTasks = (type: string): BottleneckTask[] => {
    if (!bottleneck?.tasks) return [];
    const taskMap: Record<string, BottleneckTask[]> = {
      qcContent: bottleneck.tasks.qcContent || [],
      qcOutline: bottleneck.tasks.qcOutline || [],
      waitPublish: bottleneck.tasks.waitPublish || [],
      doingContent: bottleneck.tasks.doingContent || [],
    };
    return taskMap[type] || [];
  };

  // Chart colors
  const chartColors = [
    '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
  ];

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

      {/* KPI Progress + Leaderboard */}
      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Target Progress */}
        <div className="lg:col-span-2 bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/30 rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Target className="w-5 h-5 text-accent" />
            <h2 className="text-base md:text-lg font-semibold text-white">Tiến độ KPI tháng</h2>
          </div>
          <div className="flex items-end gap-3 md:gap-4">
            <div className="flex-1">
              <div className="flex items-baseline gap-1 md:gap-2 mb-2">
                <span className="text-2xl md:text-4xl font-bold text-white">{totalActual}</span>
                <span className="text-lg md:text-2xl text-[#8888a0]">/ {totalTarget}</span>
                <span className="text-sm md:text-lg text-[#8888a0]">bài</span>
              </div>
              <ProgressBar value={totalActual} max={totalTarget} showLabel={false} />
            </div>
            <div className="text-right">
              <p className={`text-2xl md:text-3xl font-bold ${targetProgress >= 100 ? 'text-success' : targetProgress >= 70 ? 'text-warning' : 'text-white'}`}>
                {targetProgress}%
              </p>
              <p className="text-xs text-[#8888a0]">
                {targetProgress >= 100 ? 'Đạt KPI!' : `Còn ${totalTarget - totalActual} bài`}
              </p>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-base md:text-lg font-semibold text-white">Top dẫn đầu</h2>
          </div>
          <div className="space-y-2">
            {leaderboard.length > 0 ? (
              leaderboard.map((item) => (
                <div
                  key={item.name}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    item.rank === 1 ? 'bg-yellow-500/10' :
                    item.rank === 2 ? 'bg-gray-400/10' :
                    item.rank === 3 ? 'bg-orange-500/10' : 'bg-secondary'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    {item.rank === 1 ? (
                      <Crown className="w-5 h-5 text-yellow-500" />
                    ) : item.rank === 2 ? (
                      <Medal className="w-5 h-5 text-gray-400" />
                    ) : item.rank === 3 ? (
                      <Medal className="w-5 h-5 text-orange-500" />
                    ) : (
                      <span className="text-sm text-[#8888a0]">{item.rank}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.name}</p>
                  </div>
                  <span className="text-accent font-bold">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="text-[#8888a0] text-center py-4 text-sm">Chưa có dữ liệu</p>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            <h2 className="text-base md:text-lg font-semibold text-white">Tiến độ publish</h2>
          </div>

          {/* Chart Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 p-1 bg-secondary rounded-lg">
              <button
                onClick={() => setChartGroupBy('project')}
                className={`px-2 py-1 text-xs rounded ${chartGroupBy === 'project' ? 'bg-accent text-white' : 'text-[#8888a0]'}`}
              >
                Dự án
              </button>
              <button
                onClick={() => setChartGroupBy('person')}
                className={`px-2 py-1 text-xs rounded ${chartGroupBy === 'person' ? 'bg-accent text-white' : 'text-[#8888a0]'}`}
              >
                Người
              </button>
            </div>
            <div className="flex gap-1 p-1 bg-secondary rounded-lg">
              <button
                onClick={() => setChartTimeRange('day')}
                className={`px-2 py-1 text-xs rounded ${chartTimeRange === 'day' ? 'bg-accent text-white' : 'text-[#8888a0]'}`}
              >
                Ngày
              </button>
              <button
                onClick={() => setChartTimeRange('week')}
                className={`px-2 py-1 text-xs rounded ${chartTimeRange === 'week' ? 'bg-accent text-white' : 'text-[#8888a0]'}`}
              >
                Tuần
              </button>
            </div>
          </div>
        </div>

        <div className="h-[250px] md:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="date"
                stroke="#8888a0"
                fontSize={11}
                tickLine={false}
              />
              <YAxis stroke="#8888a0" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {chartData.groups.map((group, index) => (
                <Line
                  key={group}
                  type="monotone"
                  dataKey={group}
                  stroke={chartColors[index % chartColors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workflow + Projects Row */}
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* Workflow with Inline Tasks */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-white mb-4">Workflow Status</h2>

          {bottleneck ? (
            <div className="space-y-3">
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

              {/* Fixing counts */}
              {(bottleneck.content.fixingOutline > 0 || bottleneck.content.fixingContent > 0) && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-[#8888a0] mb-2">Đang sửa:</p>
                  <div className="flex gap-2 flex-wrap">
                    {bottleneck.content.fixingOutline > 0 && (
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">
                        Outline: {bottleneck.content.fixingOutline}
                      </span>
                    )}
                    {bottleneck.content.fixingContent > 0 && (
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">
                        Content: {bottleneck.content.fixingContent}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[#8888a0] text-center py-4 text-sm">Không có dữ liệu</p>
          )}
        </div>

        {/* Project Progress */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="text-base md:text-lg font-semibold text-white">Tiến độ dự án</h2>
          </div>

          <div className="space-y-3">
            {projectStats.length > 0 ? (
              projectStats.map((project) => {
                const progress = project.target ? Math.round((project.actual / project.target) * 100) : 0;
                return (
                  <div key={project.id} className="p-3 bg-secondary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-medium text-sm">{project.name}</h3>
                      <span className={`text-sm font-bold ${progress >= 100 ? 'text-success' : progress >= 70 ? 'text-warning' : 'text-white'}`}>
                        {project.actual}/{project.target}
                      </span>
                    </div>
                    <ProgressBar value={project.actual} max={project.target} showLabel={false} size="sm" />
                  </div>
                );
              })
            ) : (
              <p className="text-[#8888a0] text-center py-6">Chưa có dự án nào</p>
            )}
          </div>
        </div>
      </div>

      {/* Alerts & Recent Tasks */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Alerts */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-danger" />
            <h2 className="text-base md:text-lg font-semibold text-white">Cần lưu ý</h2>
            {alerts.length > 0 && (
              <span className="ml-auto text-xs bg-danger/20 text-danger px-2 py-0.5 rounded-full">
                {alerts.length}
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {alerts.length > 0 ? (
              alerts.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border ${
                    isOverdue(task.deadline)
                      ? 'bg-danger/10 border-danger/30'
                      : 'bg-warning/10 border-warning/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">
                        {task.title || task.keyword_sub || 'Không có tiêu đề'}
                      </p>
                      <p className="text-xs text-[#8888a0] mt-1">
                        <span className="text-accent">{task.project?.name || '-'}</span>
                        {' • '}{task.pic || 'Chưa assign'}
                        {task.deadline && ` • DL: ${formatDate(task.deadline)}`}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap ${
                        isOverdue(task.deadline)
                          ? 'bg-danger/20 text-danger'
                          : 'bg-warning/20 text-warning'
                      }`}
                    >
                      {isOverdue(task.deadline) ? 'Trễ hạn' : 'Sắp đến hạn'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2 opacity-50" />
                <p className="text-[#8888a0] text-sm">Không có task trễ/sắp hạn</p>
              </div>
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
              recentTasks.slice(0, 10).map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-secondary rounded-lg border border-border"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">
                        {task.title || task.keyword_sub || 'Không có tiêu đề'}
                      </p>
                      <p className="text-xs text-[#8888a0] mt-1">
                        <span className="text-accent">{task.project?.name || '-'}</span>
                        {' • '}{task.pic || 'N/A'}
                        {task.publish_date && ` • ${formatDate(task.publish_date)}`}
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
                </div>
              ))
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
  color: 'warning' | 'accent' | 'success';
  tasks: BottleneckTask[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const colorClasses = {
    warning: 'bg-warning/10 border-warning/30 hover:bg-warning/20',
    accent: 'bg-accent/10 border-accent/30 hover:bg-accent/20',
    success: 'bg-success/10 border-success/30 hover:bg-success/20',
  };

  const textColors = {
    warning: 'text-warning',
    accent: 'text-accent',
    success: 'text-success',
  };

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${colorClasses[color]}`}
      >
        <span className="text-white text-sm font-medium">{label}</span>
        <span className={`text-lg font-bold ${textColors[color]}`}>{count} bài</span>
      </button>

      {/* Expanded Task List */}
      {isExpanded && tasks.length > 0 && (
        <div className="mt-2 ml-2 pl-3 border-l-2 border-border space-y-2">
          {tasks.map((task, idx) => (
            <div key={task.id || idx} className="flex items-center gap-2 text-sm py-1">
              <User className="w-3 h-3 text-[#8888a0] flex-shrink-0" />
              <span className="text-white flex-1 truncate">{task.title}</span>
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
    </div>
  );
}
