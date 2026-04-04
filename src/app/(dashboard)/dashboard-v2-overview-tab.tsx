'use client';

import { useState, useEffect } from 'react';
import {
  MousePointerClick,
  Target,
  FileText,
  CheckCircle,
  Link2,
  Shield,
  TrendingUp,
  AlertTriangle,
  Star,
  Eye,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import DashboardV2ActivityFeed from './dashboard-v2-activity-feed';
import DashboardV2ClientReportExportModal from './dashboard-v2-client-report-export-modal';

// ── Types ──────────────────────────────────────────────────────────────────

interface ProjectSummary {
  id: string;
  name: string;
  clicks: number;
  kwTop10: number;
  kwTrackedTotal: number;
  kwTrackedTop10: number;
  kwFollowTotal: number;
  kwFollowTop10: number;
  contentPublished: number;
  auditScore: number;
  progressPercent: number;
  tasksDone: number;
  tasksTotal: number;
  backlinksAlive: number;
  backlinksTotal: number;
  strategyRate: number;
}

interface ProjectGoalTargets {
  weekly_clicks: number;
  top10_keywords: number;
  strategy_completion: number;
  seo_score: number;
}

interface ProjectGoal {
  start_date: string;
  deadline: string;
  targets: ProjectGoalTargets;
}

interface UnifiedSummary {
  projects: ProjectSummary[];
  projectGoals: Record<string, ProjectGoal>;
  recentActivity: Array<{
    source: string; action: string; description: string;
    project_id?: string; created_at: string;
  }>;
}

// ── KPI Mini Item ─────────────────────────────────────────────────────────

function KpiItem({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-[#8888a0]">
        <Icon className="w-3 h-3" style={{ color }} />
        <span className="text-[10px] uppercase">{label}</span>
      </div>
      <div className="text-sm font-bold text-[var(--text-primary)]">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {sub && <span className="text-[10px] text-[#8888a0] font-normal ml-0.5">{sub}</span>}
      </div>
    </div>
  );
}

// ── KPI Progress Bar (current vs target) ──────────────────────────────────

function KpiProgressRow({ label, current, target, unit }: {
  label: string;
  current: number;
  target: number;
  unit?: string;
}) {
  if (target <= 0) return null;
  const pct = Math.min(Math.round((current / target) * 100), 100);
  const deficit = target - current;
  const isAhead = current >= target;
  const color = isAhead ? '#22C55E' : pct >= 60 ? '#EAB308' : '#EF4444';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-[#8888a0]">{label}</span>
        <span style={{ color }} className="font-semibold">
          {current}{unit ?? ''} / {target}{unit ?? ''}
          {!isAhead && <span className="ml-1 font-normal">(thiếu {deficit})</span>}
          {isAhead && <span className="ml-1 font-normal text-[#22C55E]">Đạt!</span>}
        </span>
      </div>
      <div className="h-1 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Timeline Progress ─────────────────────────────────────────────────────

function TimelineProgress({ goal }: { goal: ProjectGoal }) {
  const now = new Date();
  const start = new Date(goal.start_date);
  const deadline = new Date(goal.deadline);
  const totalDays = Math.max(1, (deadline.getTime() - start.getTime()) / 86400000);
  const elapsed = Math.max(0, (now.getTime() - start.getTime()) / 86400000);
  const remaining = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86400000));
  const pct = Math.min(Math.round((elapsed / totalDays) * 100), 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-[#8888a0]">Timeline</span>
        <span className="text-[var(--text-primary)] font-medium">
          còn {remaining} ngày ({pct}% đã qua)
        </span>
      </div>
      <div className="h-1 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Per-Project KPI Card ───────────────────────────────────────────────────

function ProjectKpiCard({ project, goal }: { project: ProjectSummary; goal?: ProjectGoal }) {
  const progressColor = project.progressPercent >= 70 ? '#22C55E'
    : project.progressPercent >= 30 ? '#EAB308' : '#EF4444';

  const hasGoal = !!goal;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Project name + progress */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{project.name}</h3>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: progressColor, backgroundColor: `${progressColor}15` }}>
          {project.progressPercent}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(project.progressPercent, 100)}%`, backgroundColor: progressColor }}
        />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-2.5">
        <KpiItem icon={MousePointerClick} label="Clicks/w" value={project.clicks} color="#3B82F6" />
        <KpiItem icon={Star} label="Cam kết" value={`${project.kwTrackedTop10}/${project.kwTrackedTotal}`} sub="top10" color="#F59E0B" />
        <KpiItem icon={Eye} label="Tự follow" value={`${project.kwFollowTop10}/${project.kwFollowTotal}`} sub="top10" color="#8B5CF6" />
        <KpiItem icon={FileText} label="Nội dung" value={project.contentPublished} color="#F97316" />
        <KpiItem icon={Link2} label="Backlinks" value={`${project.backlinksAlive}/${project.backlinksTotal}`} sub="sống" color="#EC4899" />
        <KpiItem icon={CheckCircle} label="Tasks" value={`${project.tasksDone}/${project.tasksTotal}`} color="#10B981" />
      </div>

      {/* KPI vs Target (if goals exist) */}
      {hasGoal && (
        <div className="border-t border-border pt-2.5 space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] text-[#8888a0] uppercase font-medium mb-1">
            <AlertTriangle className="w-3 h-3" />
            Mục tiêu
          </div>
          <KpiProgressRow label="Clicks/tuần" current={project.clicks} target={goal.targets.weekly_clicks} />
          <KpiProgressRow label="Cam kết Top 10" current={project.kwTrackedTop10} target={goal.targets.top10_keywords} />
          <KpiProgressRow label="SEO Score" current={project.auditScore} target={goal.targets.seo_score} />
          <KpiProgressRow label="Chiến lược" current={project.strategyRate} target={goal.targets.strategy_completion} unit="%" />
          <TimelineProgress goal={goal} />
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function DashboardV2OverviewTab() {
  const [data, setData] = useState<UnifiedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/dashboard/unified-summary');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err: any) {
      setError(err.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoading />;
  if (error) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-red-400 mb-3">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-accent text-white rounded-lg text-sm">Thử lại</button>
      </div>
    );
  }
  if (!data) return null;

  const realProjects = data.projects.filter(p => p.id && p.id !== 'all' && p.name);

  return (
    <div className="space-y-5">
      {/* Header with Export */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowReport(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          Xuất báo cáo
        </button>
      </div>
      <DashboardV2ClientReportExportModal isOpen={showReport} onClose={() => setShowReport(false)} />

      {/* Per-Project KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {realProjects.map(p => (
          <ProjectKpiCard key={p.id} project={p} goal={data.projectGoals?.[p.id]} />
        ))}
      </div>

      {/* Activity Feed */}
      <DashboardV2ActivityFeed activities={data.recentActivity} />
    </div>
  );
}
