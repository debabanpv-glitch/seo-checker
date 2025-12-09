'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
  Target,
  BarChart3,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Calendar,
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

interface ProjectReport {
  id: string;
  name: string;
  sheet_id: string;
  sheet_name: string;
  // Stats
  target: number;
  published: number;
  inProgress: number;
  doneQC: number;
  overdue: number;
  // Weekly
  weeklyBreakdown: WeeklyData[];
  weeklyTarget: number;
  // Comparison
  prevPublished: number;
  momChange: number;
  // Analysis
  weeklyRate: number;
  requiredRate: number;
  daysRemaining: number;
  projectedTotal: number;
  trend: 'up' | 'down' | 'stable';
  health: 'good' | 'warning' | 'danger';
  bottleneck: string | null;
  // Team
  pics: string[];
  topPerformer: { name: string; count: number } | null;
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectReport[]>([]);
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

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

  // Summary calculations
  const summary = useMemo(() => {
    const totalTarget = projects.reduce((sum, p) => sum + p.target, 0);
    const totalPublished = projects.reduce((sum, p) => sum + p.published, 0);
    const totalInProgress = projects.reduce((sum, p) => sum + p.inProgress, 0);
    const totalOverdue = projects.reduce((sum, p) => sum + p.overdue, 0);
    const totalPrevPublished = projects.reduce((sum, p) => sum + p.prevPublished, 0);
    const progress = totalTarget > 0 ? Math.round((totalPublished / totalTarget) * 100) : 0;

    // Calculate overall MoM change
    const totalMomChange = totalPrevPublished > 0
      ? Math.round(((totalPublished - totalPrevPublished) / totalPrevPublished) * 100)
      : totalPublished > 0 ? 100 : 0;

    // Count health statuses
    const healthCounts = {
      good: projects.filter(p => p.health === 'good').length,
      warning: projects.filter(p => p.health === 'warning').length,
      danger: projects.filter(p => p.health === 'danger').length,
    };

    return {
      totalTarget,
      totalPublished,
      totalInProgress,
      totalOverdue,
      totalPrevPublished,
      totalMomChange,
      progress,
      healthCounts,
    };
  }, [projects]);

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">Báo cáo Dự án</h1>
          <p className="text-[#8888a0] text-xs md:text-sm">Phân tích hiệu suất và tiến độ</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-2">Tổng publish</p>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-2xl font-bold",
              summary.progress >= 80 ? "text-success" : summary.progress >= 50 ? "text-warning" : "text-danger"
            )}>
              {summary.totalPublished}
            </span>
            <span className="text-[#8888a0] text-sm">/{summary.totalTarget} bài</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={summary.progress} max={100} showLabel={false} size="sm" />
          </div>
          {/* MoM Comparison */}
          {meta && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <span className="text-[#8888a0]">vs T{meta.prevMonth}:</span>
              <span className={cn(
                "font-medium",
                summary.totalMomChange > 0 ? "text-success" : summary.totalMomChange < 0 ? "text-danger" : "text-[#8888a0]"
              )}>
                {summary.totalMomChange > 0 ? '+' : ''}{summary.totalMomChange}%
              </span>
              {summary.totalMomChange !== 0 && (
                summary.totalMomChange > 0
                  ? <TrendingUp className="w-3 h-3 text-success" />
                  : <TrendingDown className="w-3 h-3 text-danger" />
              )}
            </div>
          )}
        </div>

        <SummaryCard
          label="Đang thực hiện"
          value={summary.totalInProgress}
          subValue="bài"
          icon={Clock}
          color="warning"
        />
        <SummaryCard
          label="Trễ deadline"
          value={summary.totalOverdue}
          subValue="bài"
          icon={AlertTriangle}
          color={summary.totalOverdue > 0 ? 'danger' : 'success'}
        />
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-2">Sức khỏe dự án</p>
          <div className="flex items-center gap-3">
            {summary.healthCounts.good > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-success font-bold">{summary.healthCounts.good}</span>
              </div>
            )}
            {summary.healthCounts.warning > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="text-warning font-bold">{summary.healthCounts.warning}</span>
              </div>
            )}
            {summary.healthCounts.danger > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-danger" />
                <span className="text-danger font-bold">{summary.healthCounts.danger}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-[#8888a0] mt-2">
            {summary.healthCounts.danger > 0
              ? `${summary.healthCounts.danger} dự án cần chú ý`
              : summary.healthCounts.warning > 0
              ? `${summary.healthCounts.warning} dự án cần theo dõi`
              : 'Tất cả dự án đang tốt'}
          </p>
        </div>
      </div>

      {/* Projects List */}
      {projects.length > 0 ? (
        <div className="space-y-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              meta={meta}
              isExpanded={expandedProject === project.id}
              onToggle={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
            />
          ))}
        </div>
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

// Summary Card Component
function SummaryCard({
  label,
  value,
  subValue,
  progress,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  subValue: string;
  progress?: number;
  icon?: React.ElementType;
  color: 'success' | 'warning' | 'danger';
}) {
  const colorClasses = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[#8888a0] text-xs">{label}</p>
        {Icon && <Icon className={cn("w-4 h-4", colorClasses[color])} />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-2xl font-bold", colorClasses[color])}>{value}</span>
        <span className="text-[#8888a0] text-sm">{subValue}</span>
      </div>
      {progress !== undefined && (
        <div className="mt-2">
          <ProgressBar value={progress} max={100} showLabel={false} size="sm" />
        </div>
      )}
    </div>
  );
}

// Project Card Component
function ProjectCard({
  project,
  meta,
  isExpanded,
  onToggle,
}: {
  project: ProjectReport;
  meta: ReportMeta | null;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const progress = project.target > 0 ? Math.round((project.published / project.target) * 100) : 0;

  const healthColors = {
    good: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
    danger: 'border-danger/30 bg-danger/5',
  };

  const healthBadge = {
    good: { label: 'Tốt', color: 'bg-success/20 text-success' },
    warning: { label: 'Cần theo dõi', color: 'bg-warning/20 text-warning' },
    danger: { label: 'Cần chú ý', color: 'bg-danger/20 text-danger' },
  };

  const TrendIcon = project.trend === 'up' ? TrendingUp : project.trend === 'down' ? TrendingDown : Minus;
  const trendColor = project.trend === 'up' ? 'text-success' : project.trend === 'down' ? 'text-danger' : 'text-[#8888a0]';

  return (
    <div className={cn("bg-card border rounded-xl overflow-hidden transition-all", healthColors[project.health])}>
      {/* Header Row - Always visible */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-4 text-left hover:bg-secondary/30 transition-colors"
      >
        {/* Project Name & Health */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[var(--text-primary)] font-semibold truncate">{project.name}</h3>
            <span className={cn("px-2 py-0.5 rounded text-xs font-medium", healthBadge[project.health].color)}>
              {healthBadge[project.health].label}
            </span>
            {/* MoM Change Badge */}
            {project.momChange !== 0 && (
              <span className={cn(
                "px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-0.5",
                project.momChange > 0 ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
              )}>
                {project.momChange > 0 ? '+' : ''}{project.momChange}%
                {project.momChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-success font-bold">{project.published}</span>
            <span className="text-[#8888a0]">/</span>
            <span className="text-[var(--text-primary)]">{project.target}</span>
            <span className="text-[#8888a0]">publish</span>
            {project.inProgress > 0 && (
              <>
                <span className="text-[#8888a0]">•</span>
                <span className="text-warning">{project.inProgress} đang làm</span>
              </>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="hidden sm:flex items-center gap-3 w-32">
          <div className="flex-1">
            <ProgressBar value={project.published} max={project.target} showLabel={false} size="sm" />
          </div>
          <span className={cn(
            "text-sm font-bold w-10 text-right",
            progress >= 80 ? "text-success" : progress >= 50 ? "text-warning" : "text-danger"
          )}>
            {progress}%
          </span>
        </div>

        {/* Trend */}
        <div className="hidden md:flex items-center gap-1">
          <TrendIcon className={cn("w-4 h-4", trendColor)} />
          <span className={cn("text-sm font-medium", trendColor)}>
            {project.weeklyRate.toFixed(1)}/tuần
          </span>
        </div>

        {/* Expand Icon */}
        <div className="text-[#8888a0]">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50">
          {/* Weekly Breakdown */}
          {project.weeklyBreakdown && project.weeklyBreakdown.length > 0 && (
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
                        isAchieved
                          ? "bg-success/20 border border-success/30"
                          : week.count > 0
                          ? "bg-warning/20 border border-warning/30"
                          : "bg-secondary border border-border"
                      )}
                    >
                      {week.isCurrent && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-accent text-white px-1.5 py-0.5 rounded">
                          Now
                        </span>
                      )}
                      <p className="text-xs text-[#8888a0] mb-1">T{week.weekNum}</p>
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
          )}

          {/* Comparison with Previous Month */}
          {meta && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-[#8888a0] mb-2">So sánh với tháng {meta.prevMonth}/{meta.prevYear}</p>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[var(--text-primary)] text-lg font-bold">{project.published}</span>
                  <span className="text-[#8888a0] text-sm"> bài (T{meta.selectedMonth})</span>
                </div>
                <span className="text-[#8888a0]">vs</span>
                <div>
                  <span className="text-[var(--text-primary)] text-lg font-bold">{project.prevPublished}</span>
                  <span className="text-[#8888a0] text-sm"> bài (T{meta.prevMonth})</span>
                </div>
                <div className={cn(
                  "ml-auto px-2 py-1 rounded font-bold text-sm flex items-center gap-1",
                  project.momChange > 0 ? "bg-success/20 text-success" :
                  project.momChange < 0 ? "bg-danger/20 text-danger" :
                  "bg-secondary text-[#8888a0]"
                )}>
                  {project.momChange > 0 ? '+' : ''}{project.momChange}%
                  {project.momChange > 0 && <TrendingUp className="w-4 h-4" />}
                  {project.momChange < 0 && <TrendingDown className="w-4 h-4" />}
                  {project.momChange === 0 && <Minus className="w-4 h-4" />}
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatItem
              icon={Target}
              label="Tốc độ cần"
              value={`${project.requiredRate.toFixed(1)} bài/tuần`}
              subtext={`còn ${project.daysRemaining} ngày`}
            />
            <StatItem
              icon={BarChart3}
              label="Tốc độ thực tế"
              value={`${project.weeklyRate.toFixed(1)} bài/tuần`}
              subtext={project.weeklyRate >= project.requiredRate ? 'Đang đạt' : 'Chưa đạt'}
              valueColor={project.weeklyRate >= project.requiredRate ? 'success' : 'danger'}
            />
            <StatItem
              icon={TrendingUp}
              label="Dự báo cuối tháng"
              value={`${project.projectedTotal} bài`}
              subtext={project.projectedTotal >= project.target ? 'Đạt KPI' : `Thiếu ${project.target - project.projectedTotal}`}
              valueColor={project.projectedTotal >= project.target ? 'success' : 'danger'}
            />
            <StatItem
              icon={AlertTriangle}
              label="Trễ deadline"
              value={project.overdue.toString()}
              subtext={project.overdue > 0 ? 'Cần xử lý' : 'Không có'}
              valueColor={project.overdue > 0 ? 'danger' : 'success'}
            />
          </div>

          {/* Bottleneck & Insights */}
          <div className="grid md:grid-cols-2 gap-3">
            {/* Bottleneck */}
            {project.bottleneck && (
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-[#8888a0] mb-1">Điểm nghẽn</p>
                <p className="text-warning text-sm font-medium">{project.bottleneck}</p>
              </div>
            )}

            {/* Top Performer */}
            {project.topPerformer && (
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-[#8888a0] mb-1">Người đóng góp nhiều nhất</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
                    <span className="text-accent text-xs font-bold">
                      {project.topPerformer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[var(--text-primary)] text-sm">{project.topPerformer.name}</span>
                  <span className="text-success text-sm font-bold">{project.topPerformer.count} bài</span>
                </div>
              </div>
            )}
          </div>

          {/* Team */}
          {project.pics.length > 0 && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-[#8888a0] mb-2">Team ({project.pics.length} người)</p>
              <div className="flex flex-wrap gap-2">
                {project.pics.map((pic) => (
                  <span key={pic} className="px-2 py-1 bg-card rounded text-[var(--text-primary)] text-xs">
                    {pic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Link */}
          <div className="flex justify-end">
            <a
              href={`https://docs.google.com/spreadsheets/d/${project.sheet_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-accent hover:underline text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Xem Google Sheet
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Item Component
function StatItem({
  icon: Icon,
  label,
  value,
  subtext,
  valueColor = 'white',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext: string;
  valueColor?: 'white' | 'success' | 'warning' | 'danger';
}) {
  const colorClasses = {
    white: 'text-[var(--text-primary)]',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  return (
    <div className="bg-secondary/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-[#8888a0]" />
        <span className="text-xs text-[#8888a0]">{label}</span>
      </div>
      <p className={cn("text-lg font-bold", colorClasses[valueColor])}>{value}</p>
      <p className="text-xs text-[#8888a0]">{subtext}</p>
    </div>
  );
}
