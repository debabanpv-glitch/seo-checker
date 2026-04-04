'use client';

// ---------------------------------------------------------------------------
// Projects — Comparison Summary Table (all projects side-by-side)
// Shows key metrics for all projects in a single table for quick comparison.
// ---------------------------------------------------------------------------

import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import type { MergedProjectData } from './projects-seo-command-center-shared-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(n: number, d: number) {
  if (d === 0) return 0;
  return Math.round((n / d) * 100);
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500/10';
  if (score >= 60) return 'bg-yellow-500/10';
  if (score >= 40) return 'bg-orange-500/10';
  return 'bg-red-500/10';
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={`inline-flex items-center justify-center w-10 h-6 rounded text-[11px] font-bold ${getScoreColor(score)} ${getScoreBg(score)}`}>
      {score}
    </span>
  );
}

function WarningCount({ count, critical }: { count: number; critical: number }) {
  if (count === 0) return <span className="text-emerald-400 text-[11px] font-medium">Không có</span>;
  return (
    <div className="flex items-center gap-1">
      {critical > 0 && (
        <span className="flex items-center gap-0.5 text-red-400 text-[11px] font-semibold">
          <AlertCircle className="w-3 h-3" />
          {critical}
        </span>
      )}
      {count - critical > 0 && (
        <span className="flex items-center gap-0.5 text-orange-400 text-[11px]">
          <AlertTriangle className="w-3 h-3" />
          {count - critical}
        </span>
      )}
    </div>
  );
}

function TrendPill({ val }: { val: number | null }) {
  if (val == null) return <span className="text-[var(--text-secondary)] text-[11px]">—</span>;
  if (val === 0) return (
    <span className="flex items-center gap-0.5 text-[var(--text-secondary)] text-[11px]">
      <Minus className="w-3 h-3" />0
    </span>
  );
  const up = val > 0;
  return (
    <span className={`flex items-center gap-0.5 text-[11px] font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}{val}
    </span>
  );
}

function ProgressBar({ value, max, color = 'bg-blue-500' }: { value: number; max: number; color?: string }) {
  const w = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden min-w-[40px]">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${w}%` }} />
      </div>
      <span className="text-[10px] text-[var(--text-secondary)] flex-shrink-0">{w}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface ComparisonTableProps {
  projects: MergedProjectData[];
}

export default function ProjectsComparisonSummaryTableAllProjectsSideBySide({ projects }: ComparisonTableProps) {
  if (projects.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">So sánh nhanh tất cả dự án</h2>
        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Tổng hợp chỉ số chính — tháng hiện tại</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wide text-[var(--text-secondary)] font-medium w-40">Dự án</th>
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wide text-[var(--text-secondary)] font-medium">Điểm SEO</th>
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wide text-[var(--text-secondary)] font-medium">Clicks/tuần</th>
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wide text-[var(--text-secondary)] font-medium">KW Top10</th>
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wide text-[var(--text-secondary)] font-medium">Nội dung</th>
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wide text-[var(--text-secondary)] font-medium">Backlinks</th>
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wide text-[var(--text-secondary)] font-medium">Cảnh báo</th>
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wide text-[var(--text-secondary)] font-medium">Tiến độ</th>
              <th className="px-3 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {projects.map(({ project, unified, health, kwData }, idx) => {
              const score = health?.overallScore ?? 0;
              const clicks = health?.trafficData?.clicks ?? unified?.clicks ?? 0;
              const prevClicks = health?.trafficData?.prevClicks ?? null;
              const clicksDiff = prevClicks != null ? clicks - prevClicks : null;

              const kwTop10 = health?.keywordData?.top10 ?? unified?.kwTop10 ?? 0;
              const kwTop10Change = health?.keywordData?.top10Change ?? null;

              const published = project.actual ?? 0;
              const target = project.target || 20;

              const backlinksAlive = unified?.backlinksAlive ?? 0;
              const backlinksTotal = unified?.backlinksTotal ?? 0;

              const allWarnings = health?.warnings ?? [];
              const criticalCount = allWarnings.filter(w => w.severity === 'critical').length;

              const timelinePct = health?.progressReport?.timelineProgress ?? (unified?.progressPercent ?? 0);
              const onTrack = health?.progressReport?.onTrack ?? true;

              const slug = health?.slug ?? project.slug ?? null;

              const isEven = idx % 2 === 0;

              return (
                <tr
                  key={project.id}
                  className={`border-b border-border/50 hover:bg-[var(--hover-bg)] transition-colors ${isEven ? '' : 'bg-[var(--hover-bg)]'}`}
                >
                  {/* Project name */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-primary)] text-[12px] leading-tight">{project.name}</div>
                    {health?.domain && (
                      <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{health.domain}</div>
                    )}
                  </td>

                  {/* SEO Score */}
                  <td className="px-3 py-3 text-center">
                    <ScoreBadge score={score} />
                  </td>

                  {/* Clicks */}
                  <td className="px-3 py-3 text-center">
                    <div className="text-[12px] font-semibold text-[var(--text-primary)]">{clicks.toLocaleString()}</div>
                    <div className="flex justify-center mt-0.5">
                      <TrendPill val={clicksDiff} />
                    </div>
                  </td>

                  {/* KW Top10 */}
                  <td className="px-3 py-3 text-center">
                    <div className="text-[12px] font-semibold text-[var(--text-primary)]">{kwTop10}</div>
                    <div className="flex justify-center mt-0.5">
                      <TrendPill val={kwTop10Change} />
                    </div>
                  </td>

                  {/* Content done */}
                  <td className="px-3 py-3">
                    <div className="text-center text-[12px] font-semibold text-[var(--text-primary)] mb-1">
                      {published}/{target}
                    </div>
                    <ProgressBar
                      value={published}
                      max={target}
                      color={pct(published, target) >= 80 ? 'bg-emerald-500' : pct(published, target) >= 50 ? 'bg-yellow-400' : 'bg-red-500'}
                    />
                  </td>

                  {/* Backlinks */}
                  <td className="px-3 py-3 text-center">
                    {backlinksTotal > 0 ? (
                      <>
                        <div className="text-[12px] font-semibold text-[var(--text-primary)]">{backlinksAlive}/{backlinksTotal}</div>
                        <div className="text-[10px] text-[var(--text-secondary)]">{pct(backlinksAlive, backlinksTotal)}% sống</div>
                      </>
                    ) : (
                      <span className="text-[var(--text-secondary)] text-[11px]">—</span>
                    )}
                  </td>

                  {/* Warnings */}
                  <td className="px-3 py-3 text-center">
                    <WarningCount count={allWarnings.length} critical={criticalCount} />
                  </td>

                  {/* Timeline progress */}
                  <td className="px-3 py-3">
                    <div className="min-w-[80px]">
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-[var(--text-secondary)]">{Math.round(timelinePct)}%</span>
                        <span className={onTrack ? 'text-emerald-400' : 'text-yellow-400'}>
                          {onTrack ? '✓' : '!'}
                        </span>
                      </div>
                      <ProgressBar
                        value={timelinePct}
                        max={100}
                        color={onTrack ? 'bg-emerald-500' : 'bg-yellow-400'}
                      />
                    </div>
                  </td>

                  {/* Detail link */}
                  <td className="px-3 py-3 text-center">
                    {slug ? (
                      <a
                        href={`/projects/${slug}`}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-accent/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        title="Xem chi tiết"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
