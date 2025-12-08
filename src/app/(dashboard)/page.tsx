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
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ProgressBar from '@/components/ProgressBar';
import StatusBadge from '@/components/StatusBadge';
import { PageLoading } from '@/components/LoadingSpinner';
import { formatDate, isOverdue, truncate } from '@/lib/utils';
import { Task, ProjectStats, BottleneckData, Stats } from '@/types';

type TimeFilter = 'month' | 'week' | 'day';

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [stats, setStats] = useState<Stats | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [bottleneck, setBottleneck] = useState<BottleneckData | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [alerts, setAlerts] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate month options
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      value: `${date.getMonth() + 1}-${date.getFullYear()}`,
      label: `T${date.getMonth() + 1}/${date.getFullYear()}`,
    });
  }

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
      setAllTasks((data.recentTasks || []).concat(data.alerts || []));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter stats based on time filter
  const filteredStats = useMemo(() => {
    if (!stats) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

    if (timeFilter === 'month') {
      return stats;
    }

    // Filter tasks based on time
    const filteredTasks = allTasks.filter((task) => {
      const taskDate = task.publish_date ? new Date(task.publish_date) : null;
      if (!taskDate) return false;

      if (timeFilter === 'day') {
        return taskDate.toDateString() === today.toDateString();
      } else if (timeFilter === 'week') {
        return taskDate >= startOfWeek && taskDate <= today;
      }
      return true;
    });

    return {
      total: filteredTasks.length,
      published: filteredTasks.filter((t) => t.status_content === '4. Publish').length,
      inProgress: stats.inProgress,
      overdue: stats.overdue,
    };
  }, [stats, timeFilter, allTasks]);

  // Generate timeline chart data
  const chartData = useMemo(() => {
    const [month, year] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const data = [];

    // Create data for each day
    for (let day = 1; day <= daysInMonth; day++) {
      const published = recentTasks.filter((t) => {
        if (!t.publish_date || t.status_content !== '4. Publish') return false;
        const pubDate = new Date(t.publish_date);
        return pubDate.getDate() === day &&
               pubDate.getMonth() === month - 1 &&
               pubDate.getFullYear() === year;
      }).length;

      data.push({
        day: day,
        date: `${day}/${month}`,
        published: published,
        cumulative: 0,
      });
    }

    // Calculate cumulative
    let total = 0;
    data.forEach((d) => {
      total += d.published;
      d.cumulative = total;
    });

    return data;
  }, [selectedMonth, recentTasks]);

  // Calculate completion rate
  const completionRate = filteredStats?.total
    ? Math.round((filteredStats.published / filteredStats.total) * 100)
    : 0;

  // Calculate total target and actual
  const totalTarget = projectStats.reduce((sum, p) => sum + p.target, 0);
  const totalActual = projectStats.reduce((sum, p) => sum + p.actual, 0);
  const targetProgress = totalTarget ? Math.round((totalActual / totalTarget) * 100) : 0;

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-[#8888a0] text-xs md:text-sm">Tổng quan tiến độ công việc</p>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#8888a0] hidden sm:block" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2 md:px-3 py-1.5 md:py-2 bg-card border border-border rounded-lg text-white text-sm"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Time Filter Tabs */}
        <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit">
          {[
            { value: 'day', label: 'Hôm nay' },
            { value: 'week', label: 'Tuần này' },
            { value: 'month', label: 'Tháng' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTimeFilter(tab.value as TimeFilter)}
              className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-colors ${
                timeFilter === tab.value
                  ? 'bg-accent text-white'
                  : 'text-[#8888a0] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard
          label={timeFilter === 'day' ? 'Bài hôm nay' : timeFilter === 'week' ? 'Bài tuần này' : 'Tổng bài tháng'}
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

      {/* KPI Progress + Timeline Chart */}
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* Target Progress */}
        <div className="bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/30 rounded-xl p-4 md:p-6">
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

        {/* Timeline Chart */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <BarChart3 className="w-5 h-5 text-accent" />
            <h2 className="text-base md:text-lg font-semibold text-white">Tiến độ publish theo ngày</h2>
          </div>
          <div className="h-[150px] md:h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPublish" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="day"
                  stroke="#8888a0"
                  fontSize={10}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#8888a0" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(value) => `Ngày ${value}`}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'cumulative' ? 'Tổng cộng' : 'Publish',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPublish)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Projects + Workflow Row */}
      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Project Progress */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="text-base md:text-lg font-semibold text-white">Tiến độ từng dự án</h2>
          </div>

          <div className="space-y-3 md:space-y-4">
            {projectStats.length > 0 ? (
              projectStats.map((project) => {
                const progress = project.target ? Math.round((project.actual / project.target) * 100) : 0;
                return (
                  <div key={project.id} className="p-3 md:p-4 bg-secondary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-medium text-sm md:text-base">{project.name}</h3>
                      <span className={`text-sm font-bold ${progress >= 100 ? 'text-success' : progress >= 70 ? 'text-warning' : 'text-white'}`}>
                        {progress}%
                      </span>
                    </div>
                    <ProgressBar value={project.actual} max={project.target} showLabel={false} size="sm" />
                    <div className="flex items-center justify-between mt-1.5 text-xs md:text-sm">
                      <span className="text-[#8888a0]">
                        {project.actual} / {project.target} bài
                      </span>
                      {progress < 100 && (
                        <span className="text-[#8888a0]">
                          Còn {project.target - project.actual}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-[#8888a0] text-center py-6">Chưa có dự án nào</p>
            )}
          </div>
        </div>

        {/* Compact Workflow Status */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Workflow</h2>

          {bottleneck ? (
            <div className="space-y-2">
              {/* Horizontal Workflow Pipeline */}
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                <WorkflowPill label="Outline" count={bottleneck.content.doingOutline} color="warning" />
                <ChevronRight className="w-3 h-3 text-[#666] flex-shrink-0" />
                <WorkflowPill label="QC OL" count={bottleneck.seo.qcOutline} color="accent" />
                <ChevronRight className="w-3 h-3 text-[#666] flex-shrink-0" />
                <WorkflowPill label="Content" count={bottleneck.content.doingContent} color="warning" />
                <ChevronRight className="w-3 h-3 text-[#666] flex-shrink-0" />
                <WorkflowPill label="QC" count={bottleneck.seo.qcContent} color="accent" />
                <ChevronRight className="w-3 h-3 text-[#666] flex-shrink-0" />
                <WorkflowPill label="Publish" count={bottleneck.seo.waitPublish} color="success" />
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                <div className="text-center p-2 bg-warning/10 rounded-lg">
                  <p className="text-lg md:text-xl font-bold text-warning">
                    {bottleneck.content.doingOutline + bottleneck.content.doingContent +
                     (bottleneck.content.fixingOutline || 0) + (bottleneck.content.fixingContent || 0)}
                  </p>
                  <p className="text-xs text-[#8888a0]">Content đang giữ</p>
                </div>
                <div className="text-center p-2 bg-accent/10 rounded-lg">
                  <p className="text-lg md:text-xl font-bold text-accent">
                    {bottleneck.seo.qcOutline + bottleneck.seo.qcContent + bottleneck.seo.waitPublish}
                  </p>
                  <p className="text-xs text-[#8888a0]">SEO đang giữ</p>
                </div>
              </div>

              {/* Bottleneck Alert */}
              {bottleneck.biggest && bottleneck.biggest !== 'Không có nghẽn' && (
                <div className="p-2 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-warning text-xs font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {bottleneck.biggest}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[#8888a0] text-center py-4 text-sm">Không có dữ liệu</p>
          )}
        </div>
      </div>

      {/* Alerts & Recent Tasks */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Alerts */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-danger" />
            <h2 className="text-base md:text-lg font-semibold text-white">Cần chú ý</h2>
            {alerts.length > 0 && (
              <span className="ml-auto text-xs bg-danger/20 text-danger px-2 py-0.5 rounded-full">
                {alerts.length}
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-[250px] md:max-h-[300px] overflow-y-auto">
            {alerts.length > 0 ? (
              alerts.map((task) => (
                <div
                  key={task.id}
                  className={`p-2 md:p-3 rounded-lg border ${
                    isOverdue(task.deadline)
                      ? 'bg-danger/10 border-danger/30'
                      : 'bg-warning/10 border-warning/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs md:text-sm font-medium line-clamp-1">
                        {truncate(task.title || task.keyword_sub || '', 40)}
                      </p>
                      <p className="text-xs text-[#8888a0] mt-0.5">
                        {task.pic || 'Chưa assign'}
                        {task.deadline && ` • ${formatDate(task.deadline)}`}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] md:text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${
                        isOverdue(task.deadline)
                          ? 'bg-danger/20 text-danger'
                          : 'bg-warning/20 text-warning'
                      }`}
                    >
                      {isOverdue(task.deadline) ? 'Trễ' : 'Sắp hạn'}
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

          <div className="space-y-2 max-h-[250px] md:max-h-[300px] overflow-y-auto">
            {recentTasks.length > 0 ? (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-2 md:p-3 bg-secondary rounded-lg border border-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs md:text-sm font-medium line-clamp-1">
                        {truncate(task.title || task.keyword_sub || '', 35)}
                      </p>
                      <p className="text-xs text-[#8888a0] mt-0.5">
                        {task.pic || 'N/A'}
                        {task.publish_date && ` • ${formatDate(task.publish_date)}`}
                      </p>
                    </div>
                    <StatusBadge status={task.status_content || ''} size="sm" />
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

// Workflow Pill Component (compact horizontal)
function WorkflowPill({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: 'warning' | 'accent' | 'success';
}) {
  const colorClasses = {
    warning: 'bg-warning/20 text-warning border-warning/30',
    accent: 'bg-accent/20 text-accent border-accent/30',
    success: 'bg-success/20 text-success border-success/30',
  };

  return (
    <div className={`flex flex-col items-center px-2 py-1.5 rounded-lg border flex-shrink-0 ${colorClasses[color]}`}>
      <span className="text-sm md:text-base font-bold">{count}</span>
      <span className="text-[10px] whitespace-nowrap">{label}</span>
    </div>
  );
}
