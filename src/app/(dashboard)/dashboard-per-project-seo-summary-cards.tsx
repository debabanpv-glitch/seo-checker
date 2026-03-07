'use client';

import Link from 'next/link';
import { Globe, ArrowRight, MousePointerClick, Eye, Hash, TrendingUp, TrendingDown } from 'lucide-react';
import ScoreRing from '@/components/score-ring-svg-circle';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectGsc {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  prevClicks: number | null;
  prevImpressions: number | null;
}

interface ProjectKeywords {
  total: number;
  top3: number;
  top10: number;
  top20: number;
  top50: number;
  beyond50: number;
  improved: number;
  declined: number;
}

interface ProjectSummary {
  id: string;
  name: string;
  slug: string | null;
  domain: string | null;
  gsc: ProjectGsc;
  keywords: ProjectKeywords;
  healthScore: number;
  auditDate: string | null;
}

// ---------------------------------------------------------------------------
// Single project card
// ---------------------------------------------------------------------------

function ProjectSeoSummaryCard({ project }: { project: ProjectSummary }) {
  const href = `/projects/${project.slug || project.id}`;
  const { gsc, keywords } = project;
  const hasData = gsc.clicks > 0 || gsc.impressions > 0 || keywords.total > 0;

  return (
    <Link
      href={href}
      className="group bg-card border border-border rounded-xl p-4 hover:border-accent/40 transition-all hover:shadow-lg hover:shadow-accent/5 block"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-accent transition-colors">
            {project.name}
          </h4>
          {project.domain && (
            <p className="text-[10px] text-[#8888a0] mt-0.5 flex items-center gap-1">
              <Globe className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{project.domain}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {project.healthScore > 0 && (
            <ScoreRing score={project.healthScore} size={44} strokeWidth={5} />
          )}
          <ArrowRight className="w-3.5 h-3.5 text-[#8888a0] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {hasData ? (
        <>
          {/* Mini stats row */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <MiniStatBox icon={<MousePointerClick className="w-3 h-3" />} label="Clicks" value={gsc.clicks} color="text-blue-400" />
            <MiniStatBox icon={<Eye className="w-3 h-3" />} label="Impr" value={gsc.impressions} color="text-purple-400" />
            <MiniStatBox icon={<Hash className="w-3 h-3" />} label="KW" value={keywords.total} color="text-[var(--text-primary)]" />
            <MiniStatBox icon={<Hash className="w-3 h-3" />} label="Top10" value={keywords.top10} color="text-green-400" />
          </div>

          {/* Keyword tiers mini bar */}
          {keywords.total > 0 && (
            <div className="mb-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[#8888a0]">Phân bố từ khóa</span>
                <span className="text-[10px] text-green-400 font-medium">{keywords.top10} / Top 10</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden flex">
                {[
                  { count: keywords.top3, color: '#22c55e' },
                  { count: keywords.top10 - keywords.top3, color: '#3b82f6' },
                  { count: keywords.top20 - keywords.top10, color: '#f59e0b' },
                  { count: keywords.top50 - keywords.top20, color: '#f97316' },
                  { count: keywords.beyond50, color: '#ef4444' },
                ].map((seg, i) => {
                  const pct = (seg.count / keywords.total) * 100;
                  if (pct < 0.5) return null;
                  return (
                    <div key={i} className="h-full" style={{ width: `${pct}%`, background: seg.color }} />
                  );
                })}
              </div>
            </div>
          )}

          {/* Improved / declined */}
          {(keywords.improved > 0 || keywords.declined > 0) && (
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              {keywords.improved > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-green-400">
                  <TrendingUp className="w-3 h-3" /> {keywords.improved} tăng
                </span>
              )}
              {keywords.declined > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-red-400">
                  <TrendingDown className="w-3 h-3" /> {keywords.declined} giảm
                </span>
              )}
              {project.auditDate && (
                <span className="ml-auto text-[10px] text-[#8888a0]">
                  Audit: {new Date(project.auditDate).toLocaleDateString('vi-VN')}
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-[#8888a0] py-4 text-center">Chưa có dữ liệu GSC / keywords</p>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// MiniStatBox helper
// ---------------------------------------------------------------------------

function MiniStatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-secondary/60 rounded-lg p-2 text-center">
      <div className={`flex items-center justify-center gap-0.5 mb-0.5 ${color}`}>
        {icon}
        <span className="text-xs font-bold">{value.toLocaleString()}</span>
      </div>
      <p className="text-[9px] text-[#8888a0]">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardPerProjectSeoSummaryCards — Row 3, grid of project cards
// ---------------------------------------------------------------------------

export default function DashboardPerProjectSeoSummaryCards({ projects }: { projects: ProjectSummary[] }) {
  if (projects.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tổng quan theo dự án</h3>
        <span className="px-2 py-0.5 bg-secondary text-[#8888a0] text-xs rounded-full">{projects.length} dự án</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {projects.map((p) => (
          <ProjectSeoSummaryCard key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}
