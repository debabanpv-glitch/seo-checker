'use client';

// ---------------------------------------------------------------------------
// Health Check — All Projects Assessment Dashboard
// Reads all data sources, shows per-project health score, warnings,
// priority actions, category bars, trends, and expert summary.
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import ScoreRing from '@/components/score-ring-svg-circle';
import type {
  HealthCheckResponse,
  ProjectHealthAssessment,
  Warning,
  Severity,
  TrendDir,
  CategoryScores,
} from '@/lib/services/health-check-assessment-engine.service';

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------
const SEV: Record<Severity, { bg: string; text: string; icon: typeof AlertTriangle }> = {
  critical: { bg: 'bg-red-500/15', text: 'text-red-400', icon: AlertCircle },
  high: { bg: 'bg-orange-500/15', text: 'text-orange-400', icon: AlertTriangle },
  medium: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', icon: AlertTriangle },
  low: { bg: 'bg-blue-500/15', text: 'text-blue-400', icon: Info },
};

const TREND_ICON: Record<TrendDir, { icon: typeof TrendingUp; color: string }> = {
  up: { icon: TrendingUp, color: 'text-emerald-400' },
  down: { icon: TrendingDown, color: 'text-red-400' },
  stable: { icon: Minus, color: 'text-[#8888a0]' },
  no_data: { icon: Minus, color: 'text-[#555570]' },
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function HealthCheckDashboard() {
  const [data, setData] = useState<HealthCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/health-check');
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('Failed to fetch health check:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportToClipboard = () => {
    if (!data) return;
    const lines: string[] = ['# HEALTH CHECK REPORT\n'];
    for (const p of data.projects) {
      const cs = p.categoryScores;
      lines.push(`## ${p.name} (${p.domain ?? 'no domain'}) — Score: ${p.overallScore}/100 (${p.overallLabel})`);
      lines.push(p.expertSummary);
      lines.push(`Trends: Traffic=${p.trends.traffic}, Keywords=${p.trends.keywords}, SEO=${p.trends.seoScore}`);
      lines.push(`Scores: Technical=${cs.technical ?? '—'}, Content=${cs.content ?? '—'}, Images=${cs.images ?? '—'}, Links=${cs.links ?? '—'}, EEAT=${cs.eeat ?? '—'}, AI=${cs.aiReadiness ?? '—'}, Traffic=${cs.traffic ?? '—'}, KW=${cs.keywords ?? '—'}, Strategy=${cs.strategy ?? '—'}`);
      lines.push('Warnings:');
      for (const w of p.warnings) lines.push(`  [${w.severity.toUpperCase()}] ${w.title} — ${w.detail}`);
      lines.push(`Uu tien xu ly:`);
      for (const a of p.priorityActions) lines.push(`  - [${a.severity.toUpperCase()}] ${a.title} (${a.source})`);
      lines.push(`Data: Audit=${p.dataAge.lastAudit ?? 'chua co'}, GSC=${p.dataAge.lastGscSnapshot ?? 'chua co'}, KW=${p.dataAge.lastKeywordSync ?? 'chua co'}`);
      lines.push('');
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (isLoading) return <PageLoading />;
  if (!data || data.projects.length === 0) {
    return <EmptyState icon={ShieldCheck} title="Chua co du lieu" description="Them du an va import du lieu de bat dau danh gia" />;
  }

  const { projects, meta } = data;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            Health Check
          </h1>
          <p className="text-xs text-[#8888a0] mt-0.5">
            {meta.totalProjects} du an
            {meta.criticalCount > 0 && <span className="text-red-400 font-medium"> · {meta.criticalCount} critical</span>}
            {meta.healthyCount > 0 && <span className="text-emerald-400 font-medium"> · {meta.healthyCount} healthy</span>}
          </p>
        </div>
        <button onClick={exportToClipboard} className={cn('flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm transition-colors', copied ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-card border-border text-[#8888a0] hover:text-[var(--text-primary)]')}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Da copy!' : 'Xuat bao cao'}
        </button>
        <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-[#8888a0] hover:text-[var(--text-primary)] text-sm transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Project Cards */}
      {projects.map((p) => (
        <ProjectHealthCard key={p.id} project={p} isExpanded={expanded.has(p.id)} onToggle={() => toggle(p.id)} />
      ))}

      <p className="text-[10px] text-[#555570] text-right">
        Cap nhat: {new Date(meta.generatedAt).toLocaleString('vi-VN')}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Health Card
// ---------------------------------------------------------------------------
function ProjectHealthCard({ project: p, isExpanded, onToggle }: {
  project: ProjectHealthAssessment; isExpanded: boolean; onToggle: () => void;
}) {
  const hasCritical = p.warnings.some(w => w.severity === 'critical');
  const borderColor = hasCritical ? 'border-red-500/30' : p.overallScore >= 80 ? 'border-emerald-500/20' : 'border-border';

  return (
    <div className={cn('bg-card border rounded-xl overflow-hidden', borderColor)}>
      {/* Main Row */}
      <div className="p-5 cursor-pointer hover:bg-secondary/20 transition-colors" onClick={onToggle}>
        <div className="flex items-start gap-4">
          {/* Score Ring */}
          <div className="flex-shrink-0">
            <ScoreRing score={p.overallScore} size={64} strokeWidth={5} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-[var(--text-primary)]">{p.name}</h2>
              {p.domain && <span className="text-[10px] text-[#8888a0] font-mono">{p.domain}</span>}
              <ChevronDown className={cn('w-4 h-4 text-[#8888a0] transition-transform ml-auto', isExpanded && 'rotate-180')} />
            </div>

            {/* Expert Summary */}
            <p className="text-sm text-[var(--text-primary)] leading-relaxed mb-3">{p.expertSummary}</p>

            {/* Trends */}
            <div className="flex items-center gap-4 mb-3">
              <TrendBadge label="Traffic" dir={p.trends.traffic} />
              <TrendBadge label="Keywords" dir={p.trends.keywords} />
              <TrendBadge label="SEO" dir={p.trends.seoScore} />
            </div>

            {/* Top Warnings (max 3) */}
            <div className="flex flex-wrap gap-1.5">
              {p.warnings.slice(0, 3).map((w, i) => (
                <SeverityBadge key={i} warning={w} />
              ))}
              {p.warnings.length > 3 && (
                <span className="text-[10px] text-[#8888a0] px-2 py-0.5">+{p.warnings.length - 3} khac</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Detail */}
      {isExpanded && (
        <div className="border-t border-border px-5 py-4 space-y-4 bg-secondary/10">
          {/* Category Scores */}
          <div>
            <h3 className="text-[11px] text-[#8888a0] uppercase tracking-wider font-semibold mb-2">Diem theo danh muc</h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
              <CategoryBar label="Technical" score={p.categoryScores.technical} />
              <CategoryBar label="Content" score={p.categoryScores.content} />
              <CategoryBar label="Images" score={p.categoryScores.images} />
              <CategoryBar label="Links" score={p.categoryScores.links} />
              <CategoryBar label="E-E-A-T" score={p.categoryScores.eeat} />
              <CategoryBar label="AI Ready" score={p.categoryScores.aiReadiness} />
              <CategoryBar label="Traffic" score={p.categoryScores.traffic} />
              <CategoryBar label="Keywords" score={p.categoryScores.keywords} />
              <CategoryBar label="Strategy" score={p.categoryScores.strategy} />
            </div>
          </div>

          {/* All Warnings */}
          {p.warnings.length > 0 && (
            <div>
              <h3 className="text-[11px] text-[#8888a0] uppercase tracking-wider font-semibold mb-2">
                Tat ca canh bao ({p.warnings.length})
              </h3>
              <div className="space-y-1.5">
                {p.warnings.map((w, i) => <WarningRow key={i} warning={w} />)}
              </div>
            </div>
          )}

          {/* Priority Actions */}
          {p.priorityActions.length > 0 && (
            <div>
              <h3 className="text-[11px] text-[#8888a0] uppercase tracking-wider font-semibold mb-2">Uu tien xu ly</h3>
              <ol className="space-y-1">
                {p.priorityActions.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold', SEV[a.severity].bg, SEV[a.severity].text)}>
                      {i + 1}
                    </span>
                    <span className="text-[var(--text-primary)]">{a.title}</span>
                    <span className="text-[10px] text-[#666680] ml-auto">{a.source}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Data Freshness */}
          <div className="flex flex-wrap gap-3">
            <DataAgeTag label="Audit" date={p.dataAge.lastAudit} />
            <DataAgeTag label="GSC" date={p.dataAge.lastGscSnapshot} />
            <DataAgeTag label="Keywords" date={p.dataAge.lastKeywordSync} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SeverityBadge({ warning: w }: { warning: Warning }) {
  const cfg = SEV[w.severity];
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium', cfg.bg, cfg.text)}>
      <Icon className="w-3 h-3" />
      {w.title}
    </span>
  );
}

function WarningRow({ warning: w }: { warning: Warning }) {
  const cfg = SEV[w.severity];
  const Icon = cfg.icon;
  return (
    <div className={cn('flex items-start gap-2 px-3 py-2 rounded-lg', cfg.bg)}>
      <Icon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', cfg.text)} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', cfg.text)}>{w.title}</p>
        <p className="text-xs text-[#8888a0]">{w.detail}</p>
      </div>
      <span className="text-[10px] text-[#666680] flex-shrink-0">{w.category}</span>
    </div>
  );
}

function TrendBadge({ label, dir }: { label: string; dir: TrendDir }) {
  const cfg = TREND_ICON[dir];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-[#8888a0]">{label}</span>
      <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
    </div>
  );
}

function CategoryBar({ label, score }: { label: string; score: number | null }) {
  const color = score === null ? 'bg-[#333350]' : score >= 80 ? 'bg-emerald-400' : score >= 60 ? 'bg-yellow-400' : score >= 40 ? 'bg-orange-400' : 'bg-red-400';
  const textColor = score === null ? 'text-[#555570]' : score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : score >= 40 ? 'text-orange-400' : 'text-red-400';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#8888a0]">{label}</span>
        <span className={cn('text-[10px] font-mono font-bold', textColor)}>{score !== null ? score : '—'}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${score ?? 0}%` }} />
      </div>
    </div>
  );
}

function DataAgeTag({ label, date }: { label: string; date: string | null }) {
  if (!date) return (
    <span className="text-[10px] text-[#555570]">{label}: <span className="text-red-400">chua co</span></span>
  );
  const d = new Date(date);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  const color = days <= 7 ? 'text-emerald-400' : days <= 30 ? 'text-yellow-400' : 'text-red-400';
  return (
    <span className="text-[10px] text-[#8888a0]">
      {label}: <span className={cn('font-mono', color)}>{days}d ago</span>
      <span className="text-[#555570] ml-1">({d.toLocaleDateString('vi-VN')})</span>
    </span>
  );
}
