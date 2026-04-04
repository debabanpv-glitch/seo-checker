'use client';

// ---------------------------------------------------------------------------
// SEO Report — Comparison Table (all projects side by side)
// ---------------------------------------------------------------------------

import { BarChart3 } from 'lucide-react';
import type { ProjectSummary, ProjectGoal, HealthProject } from './seo-report-comprehensive-per-project-page';

interface Props {
  projects: ProjectSummary[];
  goals: Record<string, ProjectGoal>;
  healthMap: Record<string, HealthProject>;
}

function cellColor(value: number, target: number) {
  if (target <= 0) return '';
  const pct = value / target;
  if (pct >= 1) return 'text-emerald-400';
  if (pct >= 0.6) return 'text-yellow-400';
  return 'text-red-400';
}

export default function SeoReportComparisonTable({ projects, goals, healthMap }: Props) {
  const rows: { label: string; values: (string | number)[]; colors?: string[] }[] = [];

  // Helper to get values across projects
  const mapProjects = (fn: (p: ProjectSummary, h?: HealthProject, g?: ProjectGoal) => string | number) =>
    projects.map(p => fn(p, healthMap[p.id], goals[p.id]));

  const mapColors = (fn: (p: ProjectSummary, h?: HealthProject, g?: ProjectGoal) => string) =>
    projects.map(p => fn(p, healthMap[p.id], goals[p.id]));

  // Health Score
  rows.push({
    label: 'Health Score',
    values: mapProjects((_, h) => h ? `${h.overallScore}/100` : '—'),
    colors: mapColors((_, h) => {
      if (!h) return '';
      if (h.overallScore >= 80) return 'text-emerald-400';
      if (h.overallScore >= 60) return 'text-yellow-400';
      return 'text-red-400';
    }),
  });

  rows.push({ label: 'Audit Score', values: mapProjects(p => p.auditScore || '—') });

  // Traffic
  rows.push({ label: 'Clicks/tuần', values: mapProjects(p => p.clicks) });
  rows.push({
    label: 'Target clicks',
    values: mapProjects((_, __, g) => g?.targets.weekly_clicks ?? '—'),
  });
  rows.push({
    label: '% Target clicks',
    values: mapProjects((p, _, g) => g ? `${Math.round(p.clicks / g.targets.weekly_clicks * 100)}%` : '—'),
    colors: mapColors((p, _, g) => g ? cellColor(p.clicks, g.targets.weekly_clicks) : ''),
  });

  // Keywords
  rows.push({ label: 'KW Top 10', values: mapProjects(p => p.kwTop10) });
  rows.push({
    label: 'Target KW',
    values: mapProjects((_, __, g) => g?.targets.top10_keywords ?? '—'),
  });
  rows.push({
    label: '% Target KW',
    values: mapProjects((p, _, g) => g ? `${Math.round(p.kwTop10 / g.targets.top10_keywords * 100)}%` : '—'),
    colors: mapColors((p, _, g) => g ? cellColor(p.kwTop10, g.targets.top10_keywords) : ''),
  });

  // Tasks
  rows.push({
    label: 'Tasks done',
    values: mapProjects(p => `${p.tasksDone}/${p.tasksTotal} (${p.tasksTotal > 0 ? Math.round(p.tasksDone / p.tasksTotal * 100) : 0}%)`),
  });

  // Strategy
  rows.push({
    label: 'Strategy %',
    values: mapProjects(p => `${p.strategyRate}%`),
    colors: mapColors(p => p.strategyRate < 10 ? 'text-red-400' : p.strategyRate >= 50 ? 'text-emerald-400' : 'text-yellow-400'),
  });

  // Backlinks
  rows.push({
    label: 'Backlinks',
    values: mapProjects(p => p.backlinksTotal > 0 ? `${p.backlinksAlive}/${p.backlinksTotal}` : '0'),
  });

  // E-E-A-T
  rows.push({
    label: 'E-E-A-T',
    values: mapProjects((_, h) => h?.categoryScores?.eeat ?? '—'),
    colors: mapColors((_, h) => {
      const v = h?.categoryScores?.eeat;
      if (v == null) return '';
      if (v >= 60) return 'text-emerald-400';
      if (v >= 40) return 'text-yellow-400';
      return 'text-red-400';
    }),
  });

  // Deadline
  rows.push({
    label: 'Deadline',
    values: mapProjects((_, __, g) => g ? new Date(g.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '—'),
  });

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <BarChart3 className="w-4 h-4 text-accent" />
        <h2 className="text-sm font-bold text-[var(--text-primary)]">So sánh dự án</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 text-[#8888a0] font-medium">Chỉ số</th>
              {projects.map(p => (
                <th key={p.id} className="text-center px-4 py-2.5 text-[var(--text-primary)] font-semibold">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border/50 hover:bg-white/[0.02]">
                <td className="px-4 py-2 text-[#8888a0] font-medium">{row.label}</td>
                {row.values.map((v, ci) => (
                  <td key={ci} className={`px-4 py-2 text-center font-medium ${row.colors?.[ci] || 'text-[var(--text-primary)]'}`}>
                    {typeof v === 'number' ? v.toLocaleString() : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
