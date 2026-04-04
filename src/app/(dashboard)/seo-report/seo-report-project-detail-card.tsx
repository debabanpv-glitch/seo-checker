'use client';

// ---------------------------------------------------------------------------
// SEO Report — Per-Project Detail Card
// Shows KPI vs target, traffic table, keywords, audit bars, warnings, execution
// ---------------------------------------------------------------------------

import {
  MousePointerClick,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Link2,
  Network,
  Star,
  Eye,
} from 'lucide-react';
import type { ProjectSummary, ProjectGoal, HealthProject, GrowthRow } from './seo-report-comprehensive-per-project-page';

// ── Severity config ────────────────────────────────────────────────────────

const SEV_STYLES: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-500/15', text: 'text-red-400' },
  high: { bg: 'bg-orange-500/15', text: 'text-orange-400' },
  medium: { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  low: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
};

// ── Audit bar categories ───────────────────────────────────────────────────

const AUDIT_CATS = [
  { key: 'technical', label: 'Technical' },
  { key: 'content', label: 'Content' },
  { key: 'images', label: 'Images' },
  { key: 'links', label: 'Links' },
  { key: 'eeat', label: 'E-E-A-T' },
  { key: 'aiReadiness', label: 'AI Ready' },
];

function barColor(score: number) {
  if (score >= 80) return '#22C55E';
  if (score >= 50) return '#EAB308';
  return '#EF4444';
}

function kpiColor(current: number, target: number) {
  if (target <= 0) return '#8888a0';
  const pct = current / target;
  if (pct >= 1) return '#22C55E';
  if (pct >= 0.6) return '#EAB308';
  return '#EF4444';
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Tốt';
  if (score >= 60) return 'Khá';
  if (score >= 40) return 'Yếu';
  return 'Kém';
}

function scoreBadgeStyle(score: number) {
  if (score >= 80) return 'bg-emerald-500/15 text-emerald-400';
  if (score >= 60) return 'bg-yellow-500/15 text-yellow-400';
  return 'bg-red-500/15 text-red-400';
}

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  project: ProjectSummary;
  goal?: ProjectGoal;
  healthData?: HealthProject;
  growthRows: GrowthRow[];
  clusterCount: number;
}

export default function SeoReportProjectDetailCard({ project, goal, healthData, growthRows, clusterCount }: Props) {
  const overallScore = healthData?.overallScore ?? 0;
  const categoryScores = healthData?.categoryScores ?? {};
  const warnings = healthData?.warnings ?? [];
  const kwData = healthData?.keywordData;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Project Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#6366F1' }}
          >
            {project.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">{project.name}</h2>
            {healthData?.domain && (
              <span className="text-[10px] text-[#8888a0]">{healthData.domain}</span>
            )}
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${scoreBadgeStyle(overallScore)}`}>
          {overallScore}/100 {scoreLabel(overallScore)}
        </span>
      </div>

      {/* 3-Column Grid: KPI | Traffic | Keywords */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:divide-x divide-border">
        {/* Col 1: KPI vs Target */}
        <div className="p-4 space-y-2.5">
          <h3 className="text-[10px] uppercase font-semibold text-accent flex items-center gap-1">
            <Target className="w-3 h-3" /> KPI vs Mục tiêu
          </h3>
          {goal ? (
            <>
              <KpiRow label="Clicks/tuần" current={project.clicks} target={goal.targets.weekly_clicks} />
              <KpiRow label="KW Top 10" current={project.kwTrackedTop10 || project.kwTop10} target={goal.targets.top10_keywords} />
              <KpiRow label="SEO Score" current={project.auditScore} target={goal.targets.seo_score} />
              <KpiRow label="Strategy" current={project.strategyRate} target={goal.targets.strategy_completion} unit="%" />
              <TimelineBar goal={goal} />
            </>
          ) : (
            <p className="text-xs text-[#8888a0]">Chưa đặt mục tiêu</p>
          )}
        </div>

        {/* Col 2: Traffic GSC */}
        <div className="p-4 space-y-2.5 border-t lg:border-t-0 border-border">
          <h3 className="text-[10px] uppercase font-semibold text-accent flex items-center gap-1">
            <MousePointerClick className="w-3 h-3" /> Traffic GSC
          </h3>
          {growthRows.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#8888a0]">
                  <th className="text-left py-1 font-medium">Tuần</th>
                  <th className="text-right py-1 font-medium">Clicks</th>
                  <th className="text-right py-1 font-medium">Δ</th>
                  <th className="text-right py-1 font-medium">Imp</th>
                </tr>
              </thead>
              <tbody>
                {growthRows.map((r, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="py-1 text-[#8888a0]">{r.period_label}</td>
                    <td className="py-1 text-right font-medium text-[var(--text-primary)]">{r.clicks.toLocaleString()}</td>
                    <td className="py-1 text-right">
                      {r.clicks_delta != null && (
                        <span className={r.clicks_delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {r.clicks_delta >= 0 ? '+' : ''}{r.clicks_delta.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="py-1 text-right text-[#8888a0]">{r.impressions.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-[#8888a0]">Chưa có dữ liệu GSC</p>
          )}
        </div>

        {/* Col 3: Keywords */}
        <div className="p-4 space-y-2.5 border-t lg:border-t-0 border-border">
          <h3 className="text-[10px] uppercase font-semibold text-accent flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Từ khóa
          </h3>
          {kwData ? (
            <>
              <StatRow label="Tổng KW" value={kwData.total} />
              <StatRow label="Top 3" value={kwData.top3} pct={kwData.total > 0 ? Math.round(kwData.top3 / kwData.total * 100) : 0} good />
              <StatRow label="Top 10" value={kwData.top10} pct={kwData.total > 0 ? Math.round(kwData.top10 / kwData.total * 100) : 0} good />
              <StatRow label="Ngoài Top 10" value={kwData.total - kwData.top10} />
            </>
          ) : (
            <>
              <StatRow label="Cam kết" value={`${project.kwTrackedTop10}/${project.kwTrackedTotal}`} sub="top10" />
              <StatRow label="Tự follow" value={`${project.kwFollowTop10}/${project.kwFollowTotal}`} sub="top10" />
            </>
          )}
          <div className="border-t border-border/50 pt-1.5">
            <StatRow label="Cam kết tracked" value={project.kwTrackedTotal} />
            <StatRow label="Tự follow" value={project.kwFollowTotal} />
          </div>
        </div>
      </div>

      {/* Audit Bars + Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-border border-t border-border">
        {/* Audit Scores */}
        <div className="p-4 space-y-2">
          <h3 className="text-[10px] uppercase font-semibold text-accent">Audit Scores</h3>
          {AUDIT_CATS.map(({ key, label }) => {
            const score = categoryScores[key];
            if (score == null) return null;
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-16 text-[10px] text-[#8888a0] shrink-0">{label}</span>
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: barColor(score) }} />
                </div>
                <span className="w-6 text-[10px] text-right font-medium" style={{ color: barColor(score) }}>{score}</span>
              </div>
            );
          })}
        </div>

        {/* Warnings */}
        <div className="p-4 space-y-1.5 border-t lg:border-t-0 border-border">
          <h3 className="text-[10px] uppercase font-semibold text-accent flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Cảnh báo ({warnings.length})
          </h3>
          {warnings.length === 0 && <p className="text-xs text-[#8888a0]">Không có cảnh báo</p>}
          {warnings.map((w, i) => {
            const sev = SEV_STYLES[w.severity] || SEV_STYLES.low;
            return (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${sev.bg} ${sev.text}`}>
                  {w.severity}
                </span>
                <span className="text-[var(--text-primary)]">
                  {w.title}
                  <span className="text-[#8888a0] ml-1">— {w.detail}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Execution Stats Footer */}
      <div className="flex items-center gap-6 px-5 py-3 border-t border-border text-xs text-[#8888a0] bg-card">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-emerald-400" />
          Tasks: <strong className="text-[var(--text-primary)]">{project.tasksDone}/{project.tasksTotal}</strong>
          <span className="text-emerald-400 ml-0.5">({project.tasksTotal > 0 ? Math.round(project.tasksDone / project.tasksTotal * 100) : 0}%)</span>
        </span>
        <span className="flex items-center gap-1">
          <Link2 className="w-3 h-3 text-pink-400" />
          Backlinks: <strong className="text-[var(--text-primary)]">{project.backlinksAlive}/{project.backlinksTotal}</strong>
          {project.backlinksTotal > 0 && (
            <span className={project.backlinksAlive / project.backlinksTotal >= 0.7 ? 'text-emerald-400' : 'text-red-400'}>
              ({Math.round(project.backlinksAlive / project.backlinksTotal * 100)}% sống)
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <Network className="w-3 h-3 text-violet-400" />
          Clusters: <strong className="text-[var(--text-primary)]">{clusterCount}</strong>
        </span>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function KpiRow({ label, current, target, unit }: { label: string; current: number; target: number; unit?: string }) {
  if (target <= 0) return null;
  const pct = Math.min(Math.round((current / target) * 100), 100);
  const color = kpiColor(current, target);
  const isAhead = current >= target;

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-[#8888a0]">{label}</span>
        <span style={{ color }} className="font-semibold">
          {current}{unit ?? ''} / {target}{unit ?? ''}
          {isAhead ? <span className="ml-1 text-emerald-400">✓</span> : <span className="ml-1 font-normal">(thiếu {target - current})</span>}
        </span>
      </div>
      <div className="h-1 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function TimelineBar({ goal }: { goal: ProjectGoal }) {
  const now = new Date();
  const start = new Date(goal.start_date);
  const deadline = new Date(goal.deadline);
  const totalDays = Math.max(1, (deadline.getTime() - start.getTime()) / 86400000);
  const elapsed = Math.max(0, (now.getTime() - start.getTime()) / 86400000);
  const remaining = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86400000));
  const pct = Math.min(Math.round((elapsed / totalDays) * 100), 100);

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-[#8888a0]">Timeline</span>
        <span className="text-[var(--text-primary)] font-medium">còn {remaining} ngày ({pct}% đã qua)</span>
      </div>
      <div className="h-1 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatRow({ label, value, pct, good, sub }: { label: string; value: string | number; pct?: number; good?: boolean; sub?: string }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-[#8888a0]">{label}</span>
      <span className="font-medium text-[var(--text-primary)]">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {pct != null && <span className={`ml-1 text-[10px] ${good ? 'text-emerald-400' : 'text-[#8888a0]'}`}>({pct}%)</span>}
        {sub && <span className="ml-1 text-[10px] text-[#8888a0]">{sub}</span>}
      </span>
    </div>
  );
}
