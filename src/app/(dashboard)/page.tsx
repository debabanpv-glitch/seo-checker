'use client';

import { useState, useEffect } from 'react';
import { FileText, CheckCircle2, Clock, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import ProgressBar from '@/components/ProgressBar';
import StatusBadge from '@/components/StatusBadge';
import { PageLoading } from '@/components/LoadingSpinner';
import { formatDate, isOverdue, truncate } from '@/lib/utils';
import { Task, ProjectStats, BottleneckData, Stats } from '@/types';

type DateFilter = 'today' | 'week' | 'month' | 'all';

export default function DashboardPage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [stats, setStats] = useState<Stats | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [bottleneck, setBottleneck] = useState<BottleneckData | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [alerts, setAlerts] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/stats?filter=${dateFilter}`);
      const data = await res.json();

      setStats(data.stats);
      setProjectStats(data.projectStats);
      setBottleneck(data.bottleneck);
      setRecentTasks(data.recentTasks || []);
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-[#8888a0] text-sm">Tổng quan tiến độ công việc</p>
        </div>

        {/* Date Filter */}
        <div className="flex gap-2 bg-card rounded-lg p-1">
          {[
            { value: 'today', label: 'Hôm nay' },
            { value: 'week', label: 'Tuần này' },
            { value: 'month', label: 'Tháng này' },
            { value: 'all', label: 'Tất cả' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setDateFilter(filter.value as DateFilter)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                dateFilter === filter.value
                  ? 'bg-accent text-white'
                  : 'text-[#8888a0] hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Tổng số bài"
          value={stats?.total || 0}
          icon={FileText}
          color="accent"
        />
        <StatsCard
          title="Đã Publish"
          value={stats?.published || 0}
          icon={CheckCircle2}
          color="success"
        />
        <StatsCard
          title="Đang làm"
          value={stats?.inProgress || 0}
          icon={Clock}
          color="warning"
        />
        <StatsCard
          title="Trễ deadline"
          value={stats?.overdue || 0}
          icon={AlertTriangle}
          color="danger"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Project Progress */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-white">Tiến độ Target tháng</h2>
            </div>

            <div className="space-y-5">
              {projectStats.length > 0 ? (
                projectStats.map((project) => (
                  <div key={project.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{project.name}</span>
                      <span className="text-sm text-[#8888a0]">
                        Target: {project.target} bài
                      </span>
                    </div>
                    <ProgressBar value={project.actual} max={project.target} />
                  </div>
                ))
              ) : (
                <p className="text-[#8888a0] text-center py-4">Chưa có dữ liệu</p>
              )}
            </div>
          </div>

          {/* Bottleneck Analysis */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-white">Phân tích Bottleneck</h2>
            </div>

            {bottleneck ? (
              <div className="grid grid-cols-2 gap-6">
                {/* Content Side */}
                <div>
                  <h3 className="text-warning font-medium mb-3 text-sm">CONTENT đang giữ:</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span className="text-[#8888a0]">Làm outline</span>
                      <span className="text-white font-mono">{bottleneck.content.doingOutline}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-[#8888a0]">Fix outline</span>
                      <span className="text-white font-mono">{bottleneck.content.fixingOutline}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-[#8888a0]">Đang viết</span>
                      <span className="text-white font-mono">{bottleneck.content.doingContent}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-[#8888a0]">Fix bài</span>
                      <span className="text-white font-mono">{bottleneck.content.fixingContent}</span>
                    </li>
                  </ul>
                </div>

                {/* SEO Side */}
                <div>
                  <h3 className="text-accent font-medium mb-3 text-sm">SEO đang giữ:</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span className="text-[#8888a0]">Chờ QC outline</span>
                      <span className="text-white font-mono">{bottleneck.seo.qcOutline}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-[#8888a0]">Chờ QC content</span>
                      <span className="text-white font-mono">{bottleneck.seo.qcContent}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-[#8888a0]">Chờ publish</span>
                      <span className="text-white font-mono">{bottleneck.seo.waitPublish}</span>
                    </li>
                  </ul>
                </div>

                {/* Biggest Bottleneck */}
                {bottleneck.biggest && (
                  <div className="col-span-2 mt-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-warning text-sm">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      Nghẽn lớn nhất: {bottleneck.biggest}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[#8888a0] text-center py-4">Không có dữ liệu</p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Alerts */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Cảnh báo</h2>

            <div className="space-y-3 max-h-[250px] overflow-y-auto">
              {alerts.length > 0 ? (
                alerts.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border ${
                      isOverdue(task.deadline)
                        ? 'bg-danger/10 border-danger/20'
                        : 'bg-warning/10 border-warning/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {truncate(task.title || task.keyword_sub || 'Untitled', 40)}
                        </p>
                        <p className="text-xs text-[#8888a0] mt-1">
                          {task.pic} • Deadline: {formatDate(task.deadline)}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          isOverdue(task.deadline)
                            ? 'bg-danger/20 text-danger'
                            : 'bg-warning/20 text-warning'
                        }`}
                      >
                        {isOverdue(task.deadline) ? 'Trễ' : 'Sắp đến hạn'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[#8888a0] text-center py-4">Không có cảnh báo</p>
              )}
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Tasks gần đây</h2>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {recentTasks.length > 0 ? (
                recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-secondary rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {truncate(task.title || task.keyword_sub || 'Untitled', 35)}
                        </p>
                        <p className="text-xs text-[#8888a0] mt-1">
                          {task.pic} • {formatDate(task.deadline)}
                        </p>
                      </div>
                      <StatusBadge status={task.status_content || task.status_outline || ''} size="sm" />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[#8888a0] text-center py-4">Chưa có tasks</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
