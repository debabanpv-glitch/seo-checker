'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface ProjectProgress {
  id: string;
  name: string;
  clicks: number;
  kwTop10: number;
  contentPublished: number;
  auditScore: number;
  progressPercent: number;
}

interface Props {
  projects: ProjectProgress[];
}

function progressColor(pct: number): string {
  if (pct >= 70) return '#22C55E';
  if (pct >= 30) return '#EAB308';
  return '#EF4444';
}

export default function DashboardV2ProjectProgressBars({ projects }: Props) {
  if (!projects.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Tiến độ dự án</h3>
        <p className="text-[#8888a0] text-sm">Chưa có dữ liệu</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Tiến độ dự án</h3>
      <div className="space-y-4">
        {projects.map((p) => {
          const color = progressColor(p.progressPercent);
          return (
            <div key={p.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-primary)]">{p.name}</span>
                <span className="text-xs font-semibold" style={{ color }}>
                  {p.progressPercent}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(p.progressPercent, 100)}%`, backgroundColor: color }}
                />
              </div>
              {/* Mini stats */}
              <div className="flex gap-3 text-[10px] text-[#8888a0]">
                <span>Clicks: <span className="text-[var(--text-primary)] font-medium">{p.clicks}</span></span>
                <span>KW Top10: <span className="text-[var(--text-primary)] font-medium">{p.kwTop10}</span></span>
                <span>Nội dung: <span className="text-[var(--text-primary)] font-medium">{p.contentPublished}</span></span>
                <span>Audit: <span className="text-[var(--text-primary)] font-medium">{p.auditScore}/100</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
