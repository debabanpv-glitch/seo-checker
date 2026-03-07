'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  PenLine,
  Target,
  TrendingUp,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Globe,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WPPostSummary {
  id: number;
  title: string;
  date: string;
  slug: string;
  status: string;
}

interface WPProjectStats {
  projectId: string;
  projectName: string;
  domain: string | null;
  configured: boolean;
  siteUrl: string | null;
  totalPublished: number;
  totalDrafts: number;
  postsThisMonth: number;
  postsLastMonth: number;
  latestPosts: WPPostSummary[];
  drafts: WPPostSummary[];
  monthlyTarget: number;
  progressPct: number;
  onTrack: boolean;
}

interface WPStatsResponse {
  projects: WPProjectStats[];
  month: { daysPassed: number; daysInMonth: number; timePct: number };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DashboardWPContentStatsSection() {
  const [data, setData] = useState<WPStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/dashboard/wp-content-stats')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-secondary rounded w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 bg-secondary rounded-lg" />
          <div className="h-32 bg-secondary rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data || data.projects.length === 0) return null;

  const { projects, month } = data;
  const totalPublished = projects.reduce((s, p) => s + p.totalPublished, 0);
  const totalThisMonth = projects.reduce((s, p) => s + p.postsThisMonth, 0);
  const totalDrafts = projects.reduce((s, p) => s + p.totalDrafts, 0);
  const totalTarget = projects.reduce((s, p) => s + p.monthlyTarget, 0);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <PenLine className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Nội dung WordPress</h3>
            <p className="text-xs text-[#8888a0]">
              {totalPublished} bài publish | {totalDrafts} nháp | Tháng này: {totalThisMonth}
              {totalTarget > 0 && `/${totalTarget}`}
            </p>
          </div>
        </div>
        <div className="text-xs text-[#8888a0] bg-secondary px-2.5 py-1 rounded-lg">
          Ngày {month.daysPassed}/{month.daysInMonth} ({month.timePct}%)
        </div>
      </div>

      {/* Project cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((proj) => (
          <WPProjectCard key={proj.projectId} project={proj} timePct={month.timePct} />
        ))}
      </div>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function WPProjectCard({ project: p, timePct }: { project: WPProjectStats; timePct: number }) {
  const [showDrafts, setShowDrafts] = useState(false);
  const hasTarget = p.monthlyTarget > 0;
  const remaining = hasTarget ? Math.max(p.monthlyTarget - p.postsThisMonth, 0) : 0;

  return (
    <div className="bg-secondary/50 border border-border rounded-xl p-4 space-y-3">
      {/* Project header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">{p.projectName}</h4>
          {p.domain && (
            <p className="text-[10px] text-[#8888a0] flex items-center gap-1 mt-0.5">
              <Globe className="w-3 h-3 flex-shrink-0" />
              {p.domain}
            </p>
          )}
        </div>
        {p.siteUrl && (
          <a
            href={`${p.siteUrl}/wp-admin/edit.php`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 bg-accent/10 px-2 py-1 rounded-lg transition-colors font-medium flex-shrink-0"
          >
            WP Admin <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat
          icon={<CheckCircle className="w-3 h-3" />}
          label="Published"
          value={p.totalPublished}
          color="text-success"
        />
        <MiniStat
          icon={<FileText className="w-3 h-3" />}
          label="Nháp"
          value={p.totalDrafts}
          color={p.totalDrafts > 0 ? 'text-warning' : 'text-[#8888a0]'}
        />
        <MiniStat
          icon={<TrendingUp className="w-3 h-3" />}
          label="Tháng này"
          value={p.postsThisMonth}
          color="text-accent"
        />
      </div>

      {/* Monthly progress */}
      {hasTarget && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8888a0] flex items-center gap-1">
              <Target className="w-3 h-3" /> Mục tiêu tháng
            </span>
            <span className={`text-[10px] font-semibold ${p.onTrack ? 'text-success' : 'text-danger'}`}>
              {p.postsThisMonth}/{p.monthlyTarget} ({p.progressPct}%)
            </span>
          </div>
          <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
            {/* Time marker */}
            <div
              className="absolute top-0 h-full w-px bg-[#8888a0]/40 z-10"
              style={{ left: `${timePct}%` }}
            />
            <div
              className={`h-full rounded-full transition-all ${p.onTrack ? 'bg-success' : 'bg-danger'}`}
              style={{ width: `${Math.min(p.progressPct, 100)}%` }}
            />
          </div>
          {!p.onTrack && remaining > 0 && (
            <p className="text-[10px] text-danger flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Cần thêm {remaining} bài
            </p>
          )}
        </div>
      )}

      {/* Latest posts */}
      {p.latestPosts.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-[#8888a0] mb-1.5">Bài mới nhất</p>
          {p.latestPosts.map((post) => (
            <div key={post.id} className="flex items-center justify-between py-0.5">
              <span className="text-[11px] text-[var(--text-primary)] truncate flex-1 mr-2">{post.title}</span>
              <span className="text-[10px] text-[#8888a0] flex-shrink-0">{post.date}</span>
            </div>
          ))}
        </div>
      )}

      {/* Drafts toggle */}
      {p.totalDrafts > 0 && (
        <div className="pt-2 border-t border-border">
          <button
            onClick={() => setShowDrafts(!showDrafts)}
            className="text-[10px] text-accent hover:text-accent/80 font-medium transition-colors"
          >
            {showDrafts ? 'Ẩn nháp' : `Xem ${p.totalDrafts} nháp`}
          </button>
          {showDrafts && (
            <div className="mt-1.5 space-y-0.5">
              {p.drafts.slice(0, 5).map((draft) => (
                <div key={draft.id} className="flex items-center justify-between py-0.5">
                  <span className="text-[11px] text-[var(--text-primary)] truncate flex-1 mr-2">{draft.title}</span>
                  <span className="text-[10px] text-[#8888a0] flex-shrink-0">{draft.date}</span>
                </div>
              ))}
              {p.drafts.length > 5 && (
                <p className="text-[10px] text-[#8888a0]">+{p.drafts.length - 5} nháp khác</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MiniStat({
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
    <div className="text-center py-2 px-1 rounded-lg bg-card">
      <div className={`flex items-center justify-center gap-1 mb-0.5 ${color}`}>
        {icon}
        <span className="text-sm font-bold">{value}</span>
      </div>
      <p className="text-[10px] text-[#8888a0]">{label}</p>
    </div>
  );
}
