'use client';

// ---------------------------------------------------------------------------
// SEO Report — Comprehensive Per-Project Page
// 3 tabs: Tổng thể (overview) | Tháng (monthly growth) | Tuần (weekly growth)
// Aggregates unified-summary + health-check + growth-report into one view
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { RefreshCw, FileBarChart, LayoutDashboard, Calendar, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageLoading } from '@/components/LoadingSpinner';
import SeoReportProjectDetailCard from './seo-report-project-detail-card';
import SeoReportComparisonTable from './seo-report-comparison-table';
import SeoReportPriorityActions from './seo-report-priority-actions';
import SeoReportDataFreshness from './seo-report-data-freshness';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ProjectSummary {
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

export interface ProjectGoal {
  start_date: string;
  deadline: string;
  targets: { weekly_clicks: number; top10_keywords: number; strategy_completion: number; seo_score: number };
}

export interface UnifiedSummary {
  projects: ProjectSummary[];
  projectGoals: Record<string, ProjectGoal>;
  seoStrength: { auditScores: Record<string, number>; clusterCount: number };
}

export interface HealthProject {
  id: string;
  name: string;
  domain: string;
  overallScore: number;
  overallLabel: string;
  categoryScores: Record<string, number | null>;
  warnings: { severity: string; category: string; title: string; detail: string }[];
  priorityActions?: { severity: string; title: string; source: string }[];
  keywordData?: { total: number; top3: number; top10: number; top30?: number } | null;
  trafficData?: { totalClicks: number; totalImpressions: number; avgCTR?: number; avgPosition?: number } | null;
  strategyData?: { totalActions: number; completedActions?: number } | null;
  progressReport?: { timeElapsedPercent?: number; daysRemaining?: number } | null;
  dataAge?: { lastAudit?: string; lastGscSnapshot?: string; lastKeywordSync?: string } | null;
}

export interface HealthCheckResponse {
  projects: HealthProject[];
}

export interface GrowthRow {
  period_label: string;
  clicks: number;
  clicks_delta: number | null;
  impressions: number;
  impressions_delta?: number | null;
  kw_top10?: number;
  content_published?: number;
  backlinks_new?: number;
  audit_score?: number;
}

export interface GrowthReport {
  project: { id: string; name: string };
  rows: GrowthRow[];
}

export interface TaskItem {
  id: string;
  project_id: string;
  title: string;
  parent_keyword: string;
  status_content: string;
  publish_date: string | null;
  deadline: string | null;
  pic: string;
  month: number;
  year: number;
}

type ReportTab = 'overview' | 'monthly' | 'weekly';

const TABS: { id: ReportTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Tổng thể', icon: LayoutDashboard },
  { id: 'monthly', label: 'Triển khai tháng', icon: Calendar },
  { id: 'weekly', label: 'Triển khai tuần', icon: CalendarDays },
];

// ── Main Component ─────────────────────────────────────────────────────────

export default function SeoReportComprehensivePage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [unified, setUnified] = useState<UnifiedSummary | null>(null);
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [weeklyGrowth, setWeeklyGrowth] = useState<Record<string, GrowthRow[]>>({});
  const [monthlyGrowth, setMonthlyGrowth] = useState<Record<string, GrowthRow[]>>({});
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [uRes, hRes, tRes] = await Promise.all([
        fetch('/api/v1/dashboard/unified-summary'),
        fetch('/api/v1/health-check'),
        fetch('/api/v1/tasks'),
      ]);
      if (!uRes.ok || !hRes.ok) throw new Error('API error');
      const uData: UnifiedSummary = await uRes.json();
      const hData: HealthCheckResponse = await hRes.json();
      const tData = tRes.ok ? await tRes.json() : [];
      const tasks: TaskItem[] = Array.isArray(tData) ? tData : tData.tasks || tData.rows || [];
      setUnified(uData);
      setHealth(hData);
      setAllTasks(tasks);

      // Fetch weekly + monthly growth per real project in parallel
      const realProjects = uData.projects.filter(p => p.id && p.name && (p.clicks > 0 || p.kwTop10 > 0 || p.tasksTotal > 0));
      const wResults: Record<string, GrowthRow[]> = {};
      const mResults: Record<string, GrowthRow[]> = {};
      await Promise.all(
        realProjects.flatMap(p => [
          fetch(`/api/v1/dashboard/growth-report?period=weekly&project_id=${p.id}`)
            .then(r => r.ok ? r.json() : null)
            .then((d: GrowthReport | null) => { if (d) wResults[p.id] = d.rows.slice(0, 8); })
            .catch(() => {}),
          fetch(`/api/v1/dashboard/growth-report?period=monthly&project_id=${p.id}`)
            .then(r => r.ok ? r.json() : null)
            .then((d: GrowthReport | null) => { if (d) mResults[p.id] = d.rows.slice(0, 6); })
            .catch(() => {}),
        ])
      );
      setWeeklyGrowth(wResults);
      setMonthlyGrowth(mResults);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) return <PageLoading />;
  if (error) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-red-400 mb-3">{error}</p>
        <button onClick={fetchAll} className="px-4 py-2 bg-accent text-white rounded-lg text-sm">Thử lại</button>
      </div>
    );
  }
  if (!unified || !health) return null;

  const realProjects = unified.projects.filter(
    p => p.id && p.name && (p.clicks > 0 || p.kwTop10 > 0 || p.tasksTotal > 0)
  );

  const healthMap: Record<string, HealthProject> = {};
  for (const hp of health.projects) healthMap[hp.id] = hp;

  const allWarnings = health.projects.flatMap(p =>
    (p.warnings || []).map(w => ({ ...w, projectName: p.name }))
  );
  const dataAge = health.projects.find(p => p.dataAge)?.dataAge;

  return (
    <div className="space-y-5">
      {/* Header + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileBarChart className="w-5 h-5 text-accent" />
          <div>
            <h1 className="text-base font-bold text-[var(--text-primary)]">Báo Cáo Tổng Hợp SEO</h1>
            <p className="text-[10px] text-[#8888a0]">
              {new Date().toLocaleDateString('vi-VN')} · {realProjects.length} dự án
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex bg-card border border-border rounded-lg p-0.5">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    isActive ? 'bg-accent text-white' : 'text-[#8888a0] hover:text-[var(--text-primary)]'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-[#8888a0] hover:text-[var(--text-primary)] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {realProjects.map(project => (
            <SeoReportProjectDetailCard
              key={project.id}
              project={project}
              goal={unified.projectGoals?.[project.id]}
              healthData={healthMap[project.id]}
              growthRows={weeklyGrowth[project.id] || []}
              clusterCount={unified.seoStrength?.clusterCount || 0}
            />
          ))}
          {realProjects.length > 1 && (
            <SeoReportComparisonTable projects={realProjects} goals={unified.projectGoals} healthMap={healthMap} />
          )}
          <SeoReportPriorityActions warnings={allWarnings} />
          <SeoReportDataFreshness dataAge={dataAge} />
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="space-y-5">
          <MonthlyCharts projects={realProjects} tasks={allTasks} />
          <ExecutionSummaryCards
            projects={realProjects}
            tasks={allTasks}
            period="monthly"
          />
        </div>
      )}

      {activeTab === 'weekly' && (
        <div className="space-y-6">
          {[0, 1, 2, 3].map(offset => (
            <ExecutionSummaryCards
              key={offset}
              projects={realProjects}
              tasks={allTasks}
              period="weekly"
              weekOffset={offset}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Execution Timeline ─────────────────────────────────────────────────────
// Shows actual tasks/content grouped by week or month

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `T${week} ${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// ── Execution Summary Cards ────────────────────────────────────────────────
// Thống kê tổng hợp triển khai trong tháng/tuần hiện tại per project

// ── Monthly Charts ───────────────────────────────────────────────────────
// Biểu đồ tổng hợp cho tab triển khai tháng

function MonthlyCharts({ projects, tasks }: { projects: ProjectSummary[]; tasks: TaskItem[] }) {
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  // Per-project stats for current month (same filter as ExecutionSummaryCards)
  const projectStats = projects.map(p => {
    const pTasks = tasks.filter(t => t.project_id === p.id && (
      (t.month === curMonth && t.year === curYear) ||
      (t.publish_date && isInCurrentMonth(t.publish_date))
    ));
    const published = pTasks.filter(t => t.status_content === '4. Publish').length;
    const doneQC = pTasks.filter(t => t.status_content === '3. Done QC').length;
    const inProgress = pTasks.filter(t => t.status_content === '2. QC Content').length;
    const notStarted = pTasks.filter(t => !t.status_content || t.status_content === '').length;
    return { name: p.name, id: p.id, total: pTasks.length, published, doneQC, inProgress, notStarted };
  });

  // Weekly timeline within current month
  const weeksInMonth: { label: string; start: Date; end: Date }[] = [];
  const monthStart = new Date(curYear, curMonth - 1, 1);
  const monthEnd = new Date(curYear, curMonth, 0);
  let wStart = new Date(monthStart);
  // Align to Monday
  const dayOfWeek = wStart.getDay();
  if (dayOfWeek !== 1) wStart.setDate(wStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  let weekIdx = 1;
  while (wStart <= monthEnd) {
    const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 7);
    weeksInMonth.push({ label: `T${weekIdx}`, start: new Date(wStart), end: wEnd });
    wStart = new Date(wEnd);
    weekIdx++;
  }

  // Count published per week per project (include cross-month tasks with publish_date in this month)
  const weeklyData = projects.map(p => {
    const pTasks = tasks.filter(t => t.project_id === p.id && t.status_content === '4. Publish' && (
      (t.month === curMonth && t.year === curYear) ||
      (t.publish_date && isInCurrentMonth(t.publish_date))
    ));
    return weeksInMonth.map(w => {
      return pTasks.filter(t => {
        if (t.publish_date) {
          const d = new Date(t.publish_date);
          return d >= w.start && d < w.end;
        }
        return false;
      }).length;
    });
  });

  const maxBarVal = Math.max(1, ...projectStats.map(p => p.total));
  const COLORS = ['#10b981', '#3b82f6', '#eab308', '#6b7280'];
  const PROJECT_COLORS = ['#8b5cf6', '#06b6d4', '#f97316'];
  const STATUS_LABELS = ['Publish', 'Done QC', 'Đang QC', 'Chưa bắt đầu'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Donut Chart — Overall status distribution */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-xs font-bold text-[var(--text-primary)] mb-3">
          Tỷ lệ trạng thái — Tháng {curMonth}
        </h3>
        {(() => {
          const totals = [
            projectStats.reduce((s, p) => s + p.published, 0),
            projectStats.reduce((s, p) => s + p.doneQC, 0),
            projectStats.reduce((s, p) => s + p.inProgress, 0),
            projectStats.reduce((s, p) => s + p.notStarted, 0),
          ];
          const sum = totals.reduce((a, b) => a + b, 0) || 1;
          let offset = 0;
          const r = 40, cx = 60, cy = 60, stroke = 16;
          const circumference = 2 * Math.PI * r;
          return (
            <div className="flex items-center gap-4">
              <svg width={120} height={120} viewBox="0 0 120 120">
                {totals.map((val, i) => {
                  const pct = val / sum;
                  const dashLen = pct * circumference;
                  const dashOffset = -offset * circumference;
                  offset += pct;
                  if (val === 0) return null;
                  return (
                    <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={COLORS[i]}
                      strokeWidth={stroke} strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                      strokeDashoffset={dashOffset} transform={`rotate(-90 ${cx} ${cy})`} />
                  );
                })}
                <text x={cx} y={cy - 4} textAnchor="middle" className="fill-[var(--text-primary)] text-lg font-bold">{sum}</text>
                <text x={cx} y={cy + 10} textAnchor="middle" className="fill-[#8888a0] text-[9px]">bài</text>
              </svg>
              <div className="space-y-1.5">
                {STATUS_LABELS.map((label, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-[#8888a0]">{label}</span>
                    <span className="font-bold text-[var(--text-primary)]">{totals[i]}</span>
                    <span className="text-[10px] text-[#8888a0]">({Math.round(totals[i] / sum * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 2. Bar Chart — So sánh projects */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-xs font-bold text-[var(--text-primary)] mb-3">So sánh dự án</h3>
        <div className="space-y-3">
          {projectStats.map((p) => (
            <div key={p.id} className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-primary)] font-medium truncate">{p.name}</span>
                <span className="text-[#8888a0]">{p.published}/{p.total}</span>
              </div>
              <div className="h-5 bg-secondary rounded-md overflow-hidden flex">
                {[p.published, p.doneQC, p.inProgress, p.notStarted].map((val, si) => (
                  val > 0 ? (
                    <div key={si} className="h-full flex items-center justify-center text-[8px] font-bold text-white/80"
                      style={{ width: `${val / maxBarVal * 100}%`, backgroundColor: COLORS[si], minWidth: val > 0 ? '12px' : 0 }}>
                      {val}
                    </div>
                  ) : null
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex gap-3 mt-3 flex-wrap">
          {STATUS_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-1 text-[9px] text-[#8888a0]">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: COLORS[i] }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Timeline — Published per week within month */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-xs font-bold text-[var(--text-primary)] mb-3">Publish theo tuần</h3>
        {(() => {
          const maxWeekly = Math.max(1, ...weeklyData.flat());
          const barW = Math.floor(180 / weeksInMonth.length);
          const chartH = 80;
          const gap = 2;
          const subW = Math.floor((barW - gap * (projects.length + 1)) / projects.length);
          return (
            <div>
              <svg width="100%" viewBox={`0 0 ${weeksInMonth.length * barW + 20} ${chartH + 25}`} className="overflow-visible">
                {/* Grid lines */}
                {[0, 0.5, 1].map(pct => (
                  <line key={pct} x1={0} x2={weeksInMonth.length * barW + 20} y1={chartH * (1 - pct)} y2={chartH * (1 - pct)}
                    stroke="var(--border)" strokeWidth={0.5} />
                ))}
                {weeksInMonth.map((w, wi) => (
                  <g key={wi}>
                    {projects.map((_, pi) => {
                      const val = weeklyData[pi]?.[wi] || 0;
                      const h = (val / maxWeekly) * chartH;
                      const x = wi * barW + gap * (pi + 1) + pi * subW + 10;
                      return (
                        <g key={pi}>
                          <rect x={x} y={chartH - h} width={Math.max(subW, 4)} height={h || 1}
                            fill={PROJECT_COLORS[pi] || '#888'} rx={2} opacity={0.85} />
                          {val > 0 && (
                            <text x={x + subW / 2} y={chartH - h - 3} textAnchor="middle"
                              className="fill-[var(--text-primary)] text-[8px] font-bold">{val}</text>
                          )}
                        </g>
                      );
                    })}
                    <text x={wi * barW + barW / 2 + 10} y={chartH + 14} textAnchor="middle"
                      className="fill-[#8888a0] text-[9px]">{w.label}</text>
                  </g>
                ))}
              </svg>
              {/* Project legend */}
              <div className="flex gap-3 mt-2">
                {projects.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-1 text-[9px] text-[#8888a0]">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: PROJECT_COLORS[i] || '#888' }} />
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function getWeekRange(offset: number = 0): { start: Date; end: Date; label: string } {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1 - offset * 7); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  // Week number (ISO: weeks start Monday)
  const jan1 = new Date(startOfWeek.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((startOfWeek.getTime() - jan1.getTime()) / 86400000 + jan1.getDay()) / 7);
  const dd = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
  const endDisplay = new Date(endOfWeek); endDisplay.setDate(endDisplay.getDate() - 1);
  const label = `Tuần ${weekNum} (${dd(startOfWeek)} – ${dd(endDisplay)})`;
  return { start: startOfWeek, end: endOfWeek, label };
}

function isInWeekRange(dateStr: string, start: Date, end: Date): boolean {
  const d = new Date(dateStr);
  return d >= start && d < end;
}

function isInCurrentMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function ExecutionSummaryCards({ projects, tasks, period, weekOffset = 0 }: {
  projects: ProjectSummary[];
  tasks: TaskItem[];
  period: 'weekly' | 'monthly';
  weekOffset?: number;
}) {
  const now = new Date();
  const week = period === 'weekly' ? getWeekRange(weekOffset) : null;
  const periodLabel = period === 'monthly'
    ? `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`
    : week!.label;

  return (
    <>
      <div className="bg-card border border-border rounded-xl px-5 py-3">
        <h2 className="text-sm font-bold text-[var(--text-primary)]">
          Triển khai {periodLabel}
        </h2>
        <p className="text-[10px] text-[#8888a0]">Thống kê công việc trong kỳ hiện tại</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(project => {
          const pTasks = tasks.filter(t => t.project_id === project.id);
          // Tasks in period: monthly uses month/year fields, weekly uses publish_date/deadline
          const inPeriodTasks = period === 'monthly'
            ? pTasks.filter(t =>
                (t.month === now.getMonth() + 1 && t.year === now.getFullYear()) ||
                (t.publish_date && isInCurrentMonth(t.publish_date))
              )
            : pTasks.filter(t => {
                if (!week) return false;
                const d = t.publish_date || t.deadline;
                if (d) return isInWeekRange(d, week.start, week.end);
                // Tasks without dates but with month/year: show in latest week (offset=0) of that month
                if (weekOffset === 0 && t.month && t.year) {
                  return t.month === now.getMonth() + 1 && t.year === now.getFullYear();
                }
                return false;
              });
          const published = inPeriodTasks.filter(t => t.status_content === '4. Publish');
          const qcDone = inPeriodTasks.filter(t => t.status_content === '3. Done QC');
          const inProgress = inPeriodTasks.filter(t => t.status_content === '2. QC Content');
          const notStarted = inPeriodTasks.filter(t => !t.status_content || t.status_content === '');
          // Overdue = has deadline in period but not published
          const overdue = inPeriodTasks.filter(t => {
            if (t.status_content === '4. Publish') return false;
            if (!t.deadline) return false;
            return new Date(t.deadline) < now;
          });

          return (
            <div key={project.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{project.name}</h3>
                <span className="text-xs font-bold text-accent">{inPeriodTasks.length} bài</span>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-2">
                <StatBlock label="Đã publish" value={published.length} color="text-emerald-400" bg="bg-emerald-500/10" />
                <StatBlock label="Done QC" value={qcDone.length} color="text-blue-400" bg="bg-blue-500/10" />
                <StatBlock label="Đang QC" value={inProgress.length} color="text-yellow-400" bg="bg-yellow-500/10" />
                <StatBlock label="Chưa bắt đầu" value={notStarted.length} color="text-gray-400" bg="bg-gray-500/10" />
              </div>

              {/* Progress bar */}
              {inPeriodTasks.length > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[#8888a0]">Tiến độ</span>
                    <span className="text-emerald-400 font-semibold">
                      {published.length}/{inPeriodTasks.length} ({Math.round(published.length / inPeriodTasks.length * 100)}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${published.length / inPeriodTasks.length * 100}%` }} />
                    <div className="h-full bg-blue-500" style={{ width: `${qcDone.length / inPeriodTasks.length * 100}%` }} />
                    <div className="h-full bg-yellow-500" style={{ width: `${inProgress.length / inPeriodTasks.length * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Overdue warning */}
              {overdue.length > 0 && (
                <div className="text-[10px] text-red-400 bg-red-500/10 rounded px-2 py-1">
                  ⚠ {overdue.length} bài quá hạn
                </div>
              )}

              {/* Keyword & Traffic Stats */}
              <div className="border-t border-border pt-3 space-y-2">
                <span className="text-[10px] text-[#8888a0] uppercase font-medium">Từ khóa & Traffic</span>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Clicks/tuần" value={project.clicks} color="text-purple-400" />
                  <MiniStat label="KW Top 10" value={project.kwTop10} color="text-cyan-400" />
                  <MiniStat label="Backlinks" value={project.backlinksAlive} suffix={project.backlinksTotal ? `/${project.backlinksTotal}` : ''} color="text-orange-400" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MiniStat label="Cam kết Top10" value={project.kwTrackedTop10} suffix={`/${project.kwTrackedTotal}`} color="text-amber-400" />
                  <MiniStat label="Follow Top10" value={project.kwFollowTop10} suffix={`/${project.kwFollowTotal}`} color="text-sky-400" />
                </div>
              </div>

              {/* Recent published list */}
              {published.length > 0 && (
                <div className="border-t border-border pt-2 space-y-1">
                  <span className="text-[10px] text-[#8888a0] uppercase font-medium">Đã publish ({published.length})</span>
                  {[...published]
                    .sort((a, b) => (b.publish_date || '').localeCompare(a.publish_date || ''))
                    .slice(0, 8).map(t => (
                    <div key={t.id} className="flex items-start gap-1.5 text-[11px]">
                      {t.publish_date && (
                        <span className="text-[10px] text-accent font-mono shrink-0">
                          {new Date(t.publish_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                      {!t.publish_date && <span className="text-[10px] text-[#8888a0] font-mono shrink-0">--/--</span>}
                      <span className="text-[var(--text-primary)] truncate">{t.title || t.parent_keyword || '(không có tiêu đề)'}</span>
                    </div>
                  ))}
                  {published.length > 8 && (
                    <span className="text-[10px] text-[#8888a0]">+{published.length - 8} bài khác</span>
                  )}
                </div>
              )}

              {inPeriodTasks.length === 0 && (
                <p className="text-xs text-[#8888a0] text-center py-2">Không có bài nào trong kỳ này</p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function StatBlock({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${bg}`}>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-[#8888a0]">{label}</div>
    </div>
  );
}

function MiniStat({ label, value, suffix, color }: { label: string; value: number; suffix?: string; color: string }) {
  return (
    <div className="bg-secondary/50 rounded-lg px-2.5 py-1.5 text-center">
      <div className={`text-sm font-bold ${color}`}>
        {value.toLocaleString()}{suffix && <span className="text-[10px] text-[#8888a0]">{suffix}</span>}
      </div>
      <div className="text-[9px] text-[#8888a0] leading-tight">{label}</div>
    </div>
  );
}
