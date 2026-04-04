'use client';

// ---------------------------------------------------------------------------
// Projects — Per-Project SEO Mini Dashboard Card
// Shows health score, key metrics, content execution, keyword performance,
// and top warnings for a single project.
// ---------------------------------------------------------------------------

import {
  MousePointerClick,
  Eye,
  FileText,
  Link2,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  Circle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import ScoreRing from '@/components/score-ring-svg-circle';
import type { MergedProjectData } from './projects-seo-command-center-shared-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(n: number, d: number) {
  if (d === 0) return 0;
  return Math.round((n / d) * 100);
}

function clipsChange(val: number | null | undefined) {
  if (val == null) return null;
  return val;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#ef4444';
  return '#6b7280';
}

type Severity = 'critical' | 'high' | 'medium' | 'low';

const SEV_CONFIG: Record<Severity, { bg: string; text: string; icon: typeof AlertCircle }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertCircle },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: AlertTriangle },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: AlertTriangle },
  low: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: Info },
};

type TrendDir = 'up' | 'down' | 'stable' | 'no_data';

function TrendIcon({ dir }: { dir: TrendDir }) {
  if (dir === 'up') return <TrendingUp className="w-3 h-3 text-emerald-400" />;
  if (dir === 'down') return <TrendingDown className="w-3 h-3 text-red-400" />;
  return <Minus className="w-3 h-3 text-[var(--text-secondary)]" />;
}

function ChangeChip({ val }: { val: number | null | undefined }) {
  const v = clipsChange(val);
  if (v == null) return null;
  if (v === 0) return <span className="text-[10px] text-[var(--text-secondary)]">→0</span>;
  const up = v > 0;
  return (
    <span className={`text-[10px] font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
      {up ? '+' : ''}{v}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Mini Stat Block
// ---------------------------------------------------------------------------

function StatBlock({
  icon: Icon,
  iconColor,
  label,
  value,
  sub,
  change,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconColor: string;
  label: string;
  value: string | number;
  sub?: string;
  change?: number | null;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="flex items-center gap-1 text-[var(--text-secondary)]">
        <Icon className="w-3 h-3 flex-shrink-0" style={{ color: iconColor }} />
        <span className="text-[10px] uppercase tracking-wide truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-bold text-[var(--text-primary)]">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {sub && <span className="text-[10px] text-[var(--text-secondary)]">{sub}</span>}
        {change !== undefined && <ChangeChip val={change} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content Execution Bar
// ---------------------------------------------------------------------------

function ContentExecutionSection({
  published,
  doneQC,
  inProgress,
  target,
  notStarted,
}: {
  published: number;
  doneQC: number;
  inProgress: number;
  target: number;
  notStarted: number;
}) {
  const total = Math.max(target, published + doneQC + inProgress + notStarted);
  const pubPct = pct(published, total);
  const qcPct = pct(doneQC, total);
  const ipPct = pct(inProgress, total);
  const nsPct = pct(notStarted, total);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--text-secondary)] font-medium uppercase tracking-wide">Thực thi nội dung</span>
        <span className="text-[var(--text-primary)] font-semibold">{published}/{total} đã đăng</span>
      </div>

      {/* Progress bar stacked */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px bg-border">
        {pubPct > 0 && (
          <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${pubPct}%` }} title={`Đã đăng: ${published}`} />
        )}
        {qcPct > 0 && (
          <div className="h-full bg-blue-400" style={{ width: `${qcPct}%` }} title={`Done QC: ${doneQC}`} />
        )}
        {ipPct > 0 && (
          <div className="h-full bg-yellow-400" style={{ width: `${ipPct}%` }} title={`Đang làm: ${inProgress}`} />
        )}
        {nsPct > 0 && (
          <div className="h-full bg-gray-200 rounded-r-full" style={{ width: `${nsPct}%` }} title={`Chưa bắt đầu: ${notStarted}`} />
        )}
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <StatusBadge color="bg-emerald-500" label="Đã đăng" count={published} />
        <StatusBadge color="bg-blue-400" label="Done QC" count={doneQC} />
        <StatusBadge color="bg-yellow-400" label="Đang làm" count={inProgress} />
        <StatusBadge color="bg-gray-200" label="Chưa bắt đầu" count={notStarted} />
      </div>
    </div>
  );
}

function StatusBadge({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
      <div className={`w-2 h-2 rounded-sm ${color}`} />
      <span>{label}</span>
      <span className="font-semibold text-[var(--text-primary)]">{count}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Keyword Performance Section
// ---------------------------------------------------------------------------

function KeywordPerformanceSection({
  total,
  top3,
  top10,
  top30,
  surging,
  dropping,
  boundary,
  trackedTotal,
  trackedTop10,
}: {
  total: number;
  top3: number;
  top10: number;
  top30: number;
  surging: number;
  dropping: number;
  boundary: number;
  trackedTotal: number;
  trackedTop10: number;
}) {
  const beyond30 = Math.max(0, total - top30);

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-[var(--text-secondary)] font-medium uppercase tracking-wide">Từ khóa</div>

      {/* Distribution bar */}
      {total > 0 && (
        <div className="space-y-1">
          <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${pct(top3, total)}%` }}
              title={`Top 3: ${top3}`}
            />
            <div
              className="bg-blue-400 h-full"
              style={{ width: `${pct(top10 - top3, total)}%` }}
              title={`Top 4-10: ${top10 - top3}`}
            />
            <div
              className="bg-purple-400 h-full"
              style={{ width: `${pct(top30 - top10, total)}%` }}
              title={`Top 11-30: ${top30 - top10}`}
            />
            <div
              className="bg-border h-full flex-1"
              title={`Ngoài Top30: ${beyond30}`}
            />
          </div>
          <div className="flex justify-between text-[9px] text-[var(--text-secondary)]">
            <span>Top 3: <strong className="text-emerald-400">{top3}</strong></span>
            <span>Top 10: <strong className="text-blue-400">{top10}</strong></span>
            <span>Top 30: <strong className="text-purple-400">{top30}</strong></span>
            <span>Ngoài: <strong className="text-[var(--text-secondary)]">{beyond30}</strong></span>
          </div>
        </div>
      )}

      {/* Movers + boundary */}
      <div className="flex items-center gap-3 text-[11px]">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400 font-semibold">{surging}</span>
          <span className="text-[var(--text-secondary)]">tăng</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown className="w-3 h-3 text-red-400" />
          <span className="text-red-400 font-semibold">{dropping}</span>
          <span className="text-[var(--text-secondary)]">giảm</span>
        </div>
        {boundary > 0 && (
          <div className="flex items-center gap-1 bg-yellow-500/10 px-1.5 py-0.5 rounded">
            <Circle className="w-2.5 h-2.5 text-yellow-400" />
            <span className="text-yellow-400 font-semibold">{boundary}</span>
            <span className="text-[var(--text-secondary)]">cơ hội (8-12)</span>
          </div>
        )}
      </div>

      {/* Tracked breakdown */}
      {trackedTotal > 0 && (
        <div className="text-[10px] text-[var(--text-secondary)]">
          Cam kết: <span className="text-[var(--text-primary)] font-medium">{trackedTop10}/{trackedTotal}</span> trong Top10
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline Progress Section
// ---------------------------------------------------------------------------

function TimelineSection({
  daysElapsed,
  daysRemaining,
  timelineProgress,
  onTrack,
}: {
  daysElapsed: number;
  daysRemaining: number;
  timelineProgress: number;
  onTrack: boolean;
}) {
  const color = onTrack ? 'bg-emerald-500' : timelineProgress > 70 ? 'bg-red-500' : 'bg-yellow-400';

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <Clock className="w-3 h-3 text-[var(--text-secondary)] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-0.5">
          <span className="text-[var(--text-secondary)]">Tiến độ dự án</span>
          <span className={`font-semibold ${onTrack ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {onTrack ? 'Đúng tiến độ' : 'Chú ý'}
          </span>
        </div>
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${timelineProgress}%` }} />
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="text-[var(--text-primary)] font-semibold">{daysRemaining}d</div>
        <div className="text-[var(--text-secondary)]">còn lại</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Card Component
// ---------------------------------------------------------------------------

interface ProjectCardProps {
  data: MergedProjectData;
}

export default function ProjectCardPerProjectSeoDashboard({ data }: ProjectCardProps) {
  const { project, unified, health, goal, kwData } = data;

  const healthScore = health?.overallScore ?? 0;
  const scoreColor = getScoreColor(healthScore);

  const clicks = health?.trafficData?.clicks ?? unified?.clicks ?? 0;
  const prevClicks = health?.trafficData?.prevClicks ?? null;
  const clicksChange = prevClicks != null ? clicks - prevClicks : null;

  const kwTop10 = health?.keywordData?.top10 ?? unified?.kwTop10 ?? 0;
  const kwTop10Change = health?.keywordData?.top10Change ?? null;
  const kwTop3 = health?.keywordData?.top3 ?? 0;
  const kwTop3Change = health?.keywordData?.top3Change ?? null;
  const kwTotal = kwData?.summary.total ?? health?.keywordData?.total ?? 0;
  const kwTop30 = kwData ? kwData.tiers.top3 + kwData.tiers.top10 + kwData.tiers.top30 : kwTop10;

  const backlinksAlive = unified?.backlinksAlive ?? 0;
  const backlinksTotal = unified?.backlinksTotal ?? 0;

  const auditScore = unified?.auditScore ?? 0;

  // Content stats
  const published = project.actual ?? 0;
  const doneQC = project.doneQC ?? 0;
  const inProgress = project.inProgress ?? 0;
  const target = project.target || 20;
  const totalAssigned = project.thisMonthTotal ?? (published + doneQC + inProgress);
  const notStarted = Math.max(0, totalAssigned - published - doneQC - inProgress);

  // Keyword movers
  const surging = kwData?.movers.surging ?? 0;
  const dropping = kwData?.movers.dropping ?? 0;
  const boundary = kwData?.movers.boundary ?? 0;
  const trackedTotal = kwData?.summary.trackedTotal ?? unified?.kwTrackedTotal ?? 0;
  const trackedTop10 = kwData?.summary.trackedInTop10 ?? unified?.kwTrackedTop10 ?? 0;

  // Top warnings (max 3)
  const warnings = (health?.warnings ?? []).slice(0, 3);

  // Domain for link
  const domain = health?.domain ?? project.domain ?? null;
  const slug = health?.slug ?? project.slug ?? null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate text-base">{project.name}</h3>
            {domain && (
              <a
                href={`https://${domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          {domain && (
            <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{domain}</div>
          )}
        </div>

        {/* Health Score Ring */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Trend icons */}
          {health && (
            <div className="flex flex-col gap-1 text-[10px] text-[var(--text-secondary)]">
              <div className="flex items-center gap-1">
                <TrendIcon dir={health.trends.traffic} />
                <span>Traffic</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendIcon dir={health.trends.keywords} />
                <span>Keywords</span>
              </div>
            </div>
          )}
          <ScoreRing score={healthScore} size={64} strokeWidth={6} />
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="p-4 space-y-4">

        {/* Timeline progress */}
        {health?.progressReport && (
          <TimelineSection
            daysElapsed={health.progressReport.daysElapsed}
            daysRemaining={health.progressReport.daysRemaining}
            timelineProgress={health.progressReport.timelineProgress}
            onTrack={health.progressReport.onTrack}
          />
        )}

        {/* ── Row 2: Key Metrics Grid ─────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 py-3 border-t border-b border-border">
          <StatBlock
            icon={MousePointerClick}
            iconColor="#818cf8"
            label="Clicks/tuần"
            value={clicks}
            change={clicksChange}
          />
          <StatBlock
            icon={TrendingUp}
            iconColor="#22c55e"
            label="KW Top 10"
            value={kwTop10}
            change={kwTop10Change}
          />
          <StatBlock
            icon={FileText}
            iconColor="#f59e0b"
            label="Đã đăng/tháng"
            value={`${published}/${target}`}
          />
          <StatBlock
            icon={Link2}
            iconColor="#06b6d4"
            label="Backlinks"
            value={backlinksTotal > 0 ? `${backlinksAlive}/${backlinksTotal}` : backlinksAlive}
            sub={backlinksTotal > 0 ? `${pct(backlinksAlive, backlinksTotal)}% sống` : undefined}
          />
          <StatBlock
            icon={Shield}
            iconColor={scoreColor}
            label="Audit Score"
            value={auditScore > 0 ? auditScore : '--'}
          />
          <StatBlock
            icon={Eye}
            iconColor="#a78bfa"
            label="KW Top 3"
            value={kwTop3}
            change={kwTop3Change}
          />
        </div>

        {/* ── Row 3: Content Execution ─────────────────────────────────── */}
        <ContentExecutionSection
          published={published}
          doneQC={doneQC}
          inProgress={inProgress}
          target={target}
          notStarted={notStarted}
        />

        {/* ── Row 4: Keyword Performance ───────────────────────────────── */}
        <div className="border-t border-border pt-3">
          <KeywordPerformanceSection
            total={kwTotal}
            top3={kwTop3}
            top10={kwTop10}
            top30={kwTop30}
            surging={surging}
            dropping={dropping}
            boundary={boundary}
            trackedTotal={trackedTotal}
            trackedTop10={trackedTop10}
          />
        </div>

        {/* ── Row 5: Warnings ─────────────────────────────────────────── */}
        {warnings.length > 0 && (
          <div className="border-t border-border pt-3 space-y-1.5">
            <div className="text-[11px] text-[var(--text-secondary)] font-medium uppercase tracking-wide mb-2">Cảnh báo</div>
            {warnings.map((w, i) => {
              const cfg = SEV_CONFIG[w.severity as keyof typeof SEV_CONFIG] ?? SEV_CONFIG.low;
              const WarnIcon = cfg.icon;
              return (
                <div key={i} className={`flex items-start gap-2 px-2 py-1.5 rounded-md ${cfg.bg}`}>
                  <WarnIcon className={`w-3 h-3 flex-shrink-0 mt-0.5 ${cfg.text}`} />
                  <div className="min-w-0">
                    <span className={`text-[11px] font-medium ${cfg.text}`}>{w.title}</span>
                    {w.detail && (
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">{w.detail}</p>
                    )}
                  </div>
                  <span className={`text-[9px] uppercase font-bold flex-shrink-0 ${cfg.text}`}>{w.severity}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Footer: Link to detail ───────────────────────────────────── */}
        {slug && (
          <div className="border-t border-border pt-3">
            <a
              href={`/projects/${slug}`}
              className="flex items-center justify-end gap-1 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group"
            >
              <span>Xem chi tiết</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
