'use client';

// ---------------------------------------------------------------------------
// SEO Report — Priority Actions (aggregated warnings across all projects)
// ---------------------------------------------------------------------------

import { AlertTriangle } from 'lucide-react';

interface WarningWithProject {
  severity: string;
  category: string;
  title: string;
  detail: string;
  projectName: string;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_LABELS: Record<string, string> = { critical: 'P0', high: 'P1', medium: 'P2', low: 'P3' };

const SEV_STYLES: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400',
  high: 'bg-orange-500/15 text-orange-400',
  medium: 'bg-yellow-500/15 text-yellow-400',
  low: 'bg-blue-500/15 text-blue-400',
};

export default function SeoReportPriorityActions({ warnings }: { warnings: WarningWithProject[] }) {
  // Sort by severity, dedupe similar titles, take top 10
  const sorted = [...warnings].sort((a, b) =>
    (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
  );

  // Group similar warnings (same title across projects)
  const grouped: (WarningWithProject & { projects: string[] })[] = [];
  const seen = new Map<string, number>();

  for (const w of sorted) {
    const key = w.title;
    const idx = seen.get(key);
    if (idx != null) {
      grouped[idx].projects.push(w.projectName);
    } else {
      seen.set(key, grouped.length);
      grouped.push({ ...w, projects: [w.projectName] });
    }
  }

  const top10 = grouped.slice(0, 10);

  if (top10.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <AlertTriangle className="w-4 h-4 text-accent" />
        <h2 className="text-sm font-bold text-[var(--text-primary)]">Ưu tiên hành động</h2>
        <span className="text-[10px] text-[#8888a0] ml-1">Top {top10.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 text-[#8888a0] font-medium w-8">#</th>
              <th className="text-left px-4 py-2.5 text-[#8888a0] font-medium w-12">Mức</th>
              <th className="text-left px-4 py-2.5 text-[#8888a0] font-medium">Hành động</th>
              <th className="text-left px-4 py-2.5 text-[#8888a0] font-medium">Dự án</th>
              <th className="text-left px-4 py-2.5 text-[#8888a0] font-medium">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((w, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-white/[0.02]">
                <td className="px-4 py-2.5 text-[#8888a0] font-medium">{i + 1}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${SEV_STYLES[w.severity] || SEV_STYLES.low}`}>
                    {PRIORITY_LABELS[w.severity] || 'P3'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-[var(--text-primary)] font-medium">{w.title}</td>
                <td className="px-4 py-2.5 text-[#8888a0]">
                  {w.projects.length === 1 ? w.projects[0] : w.projects.join(', ')}
                </td>
                <td className="px-4 py-2.5 text-[#8888a0] max-w-[300px] truncate">{w.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
