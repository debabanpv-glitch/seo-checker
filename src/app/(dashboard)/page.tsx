'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Target,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';
import StatusBadge from '@/components/StatusBadge';
import { PageLoading } from '@/components/LoadingSpinner';
import { formatDate, isOverdue, truncate } from '@/lib/utils';
import { Task, ProjectStats, BottleneckData, Stats } from '@/types';

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [bottleneck, setBottleneck] = useState<BottleneckData | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [alerts, setAlerts] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate month options
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      value: `${date.getMonth() + 1}-${date.getFullYear()}`,
      label: `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
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
      // Filter out tasks without title
      setRecentTasks((data.recentTasks || []).filter((t: Task) => t.title || t.keyword_sub));
      setAlerts((data.alerts || []).filter((t: Task) => t.title || t.keyword_sub));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate completion rate
  const completionRate = stats?.total
    ? Math.round((stats.published / stats.total) * 100)
    : 0;

  // Calculate total target and actual
  const totalTarget = projectStats.reduce((sum, p) => sum + p.target, 0);
  const totalActual = projectStats.reduce((sum, p) => sum + p.actual, 0);
  const targetProgress = totalTarget ? Math.round((totalActual / totalTarget) * 100) : 0;

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-[#8888a0] text-sm">Tổng quan tiến độ công việc</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#8888a0]" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-card border border-border rounded-lg text-white"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics - Big Numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#8888a0] text-sm">Tổng bài trong tháng</span>
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <p className="text-3xl font-bold text-white">{stats?.total || 0}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#8888a0] text-sm">Đã Publish</span>
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <p className="text-3xl font-bold text-success">{stats?.published || 0}</p>
          <p className="text-xs text-[#8888a0] mt-1">{completionRate}% hoàn thành</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#8888a0] text-sm">Đang thực hiện</span>
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <p className="text-3xl font-bold text-warning">{stats?.inProgress || 0}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#8888a0] text-sm">Trễ deadline</span>
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <p className="text-3xl font-bold text-danger">{stats?.overdue || 0}</p>
        </div>
      </div>

      {/* Target Progress Overview */}
      <div className="bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-6 h-6 text-accent" />
          <h2 className="text-lg font-semibold text-white">Tiến độ KPI tháng</h2>
        </div>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-bold text-white">{totalActual}</span>
              <span className="text-2xl text-[#8888a0]">/ {totalTarget}</span>
              <span className="text-lg text-[#8888a0]">bài</span>
            </div>
            <ProgressBar value={totalActual} max={totalTarget} showLabel={false} />
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${targetProgress >= 100 ? 'text-success' : targetProgress >= 70 ? 'text-warning' : 'text-white'}`}>
              {targetProgress}%
            </p>
            <p className="text-xs text-[#8888a0]">
              {targetProgress >= 100 ? 'Đạt KPI!' : `Còn ${totalTarget - totalActual} bài`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Project Progress */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-white">Tiến độ từng dự án</h2>
          </div>

          <div className="space-y-5">
            {projectStats.length > 0 ? (
              projectStats.map((project) => {
                const progress = project.target ? Math.round((project.actual / project.target) * 100) : 0;
                return (
                  <div key={project.id} className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-medium">{project.name}</h3>
                      <span className={`text-sm font-bold ${progress >= 100 ? 'text-success' : progress >= 70 ? 'text-warning' : 'text-white'}`}>
                        {progress}%
                      </span>
                    </div>
                    <ProgressBar value={project.actual} max={project.target} showLabel={false} />
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-[#8888a0]">
                        {project.actual} / {project.target} bài
                      </span>
                      {progress < 100 && (
                        <span className="text-[#8888a0]">
                          Còn thiếu {project.target - project.actual} bài
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-[#8888a0] text-center py-8">Chưa có dự án nào</p>
            )}
          </div>
        </div>

        {/* Workflow Status - Visual Pipeline */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Trạng thái Workflow</h2>

          {bottleneck ? (
            <div className="space-y-4">
              {/* Workflow Steps */}
              <div className="space-y-3">
                <WorkflowStep
                  label="Đang làm Outline"
                  count={bottleneck.content.doingOutline}
                  color="warning"
                />
                <div className="flex justify-center">
                  <ArrowRight className="w-4 h-4 text-[#8888a0]" />
                </div>
                <WorkflowStep
                  label="Chờ QC Outline"
                  count={bottleneck.seo.qcOutline}
                  color="accent"
                />
                <div className="flex justify-center">
                  <ArrowRight className="w-4 h-4 text-[#8888a0]" />
                </div>
                <WorkflowStep
                  label="Đang viết Content"
                  count={bottleneck.content.doingContent}
                  color="warning"
                />
                <div className="flex justify-center">
                  <ArrowRight className="w-4 h-4 text-[#8888a0]" />
                </div>
                <WorkflowStep
                  label="Chờ QC Content"
                  count={bottleneck.seo.qcContent}
                  color="accent"
                />
                <div className="flex justify-center">
                  <ArrowRight className="w-4 h-4 text-[#8888a0]" />
                </div>
                <WorkflowStep
                  label="Chờ Publish"
                  count={bottleneck.seo.waitPublish}
                  color="success"
                />
              </div>

              {/* Bottleneck Alert */}
              {bottleneck.biggest && bottleneck.biggest !== 'Không có nghẽn' && (
                <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-warning text-sm font-medium">
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    {bottleneck.biggest}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[#8888a0] text-center py-4">Không có dữ liệu</p>
          )}
        </div>
      </div>

      {/* Alerts & Recent Tasks */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-danger" />
            <h2 className="text-lg font-semibold text-white">Cần chú ý</h2>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
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
                        {truncate(task.title || task.keyword_sub || '', 50)}
                      </p>
                      <p className="text-xs text-[#8888a0] mt-1">
                        <span className="font-medium">{task.pic || 'Chưa assign'}</span>
                        {task.deadline && ` • ${formatDate(task.deadline)}`}
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
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3 opacity-50" />
                <p className="text-[#8888a0]">Không có task nào trễ hoặc sắp đến hạn</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Published */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <h2 className="text-lg font-semibold text-white">Bài viết gần đây</h2>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {recentTasks.length > 0 ? (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-secondary rounded-lg border border-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">
                        {truncate(task.title || task.keyword_sub || '', 45)}
                      </p>
                      <p className="text-xs text-[#8888a0] mt-1">
                        {task.pic || 'N/A'}
                        {task.publish_date && ` • ${formatDate(task.publish_date)}`}
                      </p>
                    </div>
                    <StatusBadge status={task.status_content || ''} size="sm" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[#8888a0] text-center py-8">Chưa có bài viết nào</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Workflow Step Component
function WorkflowStep({
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
    <div className={`flex items-center justify-between p-3 rounded-lg border ${colorClasses[color]}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-lg font-bold">{count}</span>
    </div>
  );
}
