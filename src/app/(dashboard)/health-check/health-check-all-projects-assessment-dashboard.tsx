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
  Send,
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
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramSent, setTelegramSent] = useState(false);

  const sendTelegram = async () => {
    setSendingTelegram(true);
    setTelegramSent(false);
    try {
      const res = await fetch('/api/v1/health-check/send-telegram', { method: 'POST' });
      if (res.ok) {
        setTelegramSent(true);
        setTimeout(() => setTelegramSent(false), 3000);
      } else {
        const err = await res.json();
        alert(err.error ?? 'Gửi Telegram thất bại');
      }
    } catch (err) {
      alert('Lỗi kết nối khi gửi Telegram');
    } finally {
      setSendingTelegram(false);
    }
  };

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

  const trendVi = (d: string) => d === 'up' ? 'Tăng' : d === 'down' ? 'Giảm' : d === 'stable' ? 'Ổn định' : 'Chưa có';
  const sevVi: Record<string, string> = { critical: 'NGHIÊM TRỌNG', high: 'CAO', medium: 'TRUNG BÌNH', low: 'THẤP' };
  const priVi: Record<string, string> = { critical: 'Khẩn cấp', high: 'Cao', medium: 'TB', low: 'Thấp' };

  const exportToClipboard = () => {
    if (!data) return;
    const lines: string[] = [`# BÁO CÁO TÌNH TRẠNG SEO — ${new Date().toLocaleDateString('vi-VN')}\n`];

    for (const p of data.projects) {
      const cs = p.categoryScores;
      lines.push(`## ${p.name} (${p.domain ?? 'chưa có domain'}) — Điểm: ${p.overallScore}/100 (${p.overallLabel})`);
      lines.push(`**Đánh giá:** ${p.expertSummary}`);
      lines.push('');

      // Xu hướng
      lines.push(`### Xu hướng`);
      lines.push(`- Traffic: ${trendVi(p.trends.traffic)}`);
      lines.push(`- Từ khóa: ${trendVi(p.trends.keywords)}`);
      lines.push(`- Điểm SEO: ${trendVi(p.trends.seoScore)}`);
      lines.push('');

      // Traffic GSC
      if (p.trafficData) {
        const t = p.trafficData;
        lines.push(`### Lưu lượng truy cập (GSC)`);
        lines.push(`- Clicks: ${t.clicks}${t.prevClicks != null ? ` (trước: ${t.prevClicks}, ${t.clicks >= t.prevClicks ? '+' : ''}${t.clicks - t.prevClicks})` : ''}`);
        lines.push(`- Hiển thị: ${t.impressions}${t.prevImpressions != null ? ` (trước: ${t.prevImpressions})` : ''}`);
        lines.push(`- CTR: ${(t.ctr * 100).toFixed(2)}%`);
        lines.push(`- Vị trí TB: ${t.position.toFixed(1)}`);
        lines.push('');
      }

      // Keyword
      if (p.keywordData) {
        const k = p.keywordData;
        lines.push(`### Từ khóa`);
        lines.push(`- Tổng: ${k.total} từ khóa`);
        lines.push(`- Top 3: ${k.top3} (${k.top3Change >= 0 ? '+' : ''}${k.top3Change})`);
        lines.push(`- Top 10: ${k.top10} (${k.top10Change >= 0 ? '+' : ''}${k.top10Change})`);
        lines.push('');
      }

      // Điểm theo danh mục
      lines.push(`### Điểm theo danh mục`);
      const cats = [
        ['Kỹ thuật', cs.technical], ['Nội dung', cs.content], ['Hình ảnh', cs.images],
        ['Liên kết', cs.links], ['E-E-A-T', cs.eeat], ['AI Readiness', cs.aiReadiness],
        ['Traffic', cs.traffic], ['Từ khóa', cs.keywords], ['Chiến lược', cs.strategy],
      ] as [string, number | null][];
      for (const [label, val] of cats) {
        lines.push(`- ${label}: ${val != null ? `${val}/100` : 'Chưa có'}`);
      }
      lines.push('');

      // Cảnh báo
      if (p.warnings.length > 0) {
        lines.push(`### Cảnh báo (${p.warnings.length})`);
        for (const w of p.warnings) {
          lines.push(`- [${sevVi[w.severity] ?? w.severity.toUpperCase()}] ${w.title} — ${w.detail}`);
        }
        lines.push('');
      }

      // Kế hoạch hành động
      if (p.strategyData) {
        const s = p.strategyData;
        lines.push(`### Tiến độ chiến lược`);
        lines.push(`- Tổng: ${s.totalActions} actions | Hoàn thành: ${s.doneActions} | Đang làm: ${s.doingActions} | Chờ: ${s.todoActions} | Bị chặn: ${s.blockedActions}`);
        lines.push(`- Tiến độ: ${s.totalActions > 0 ? Math.round((s.doneActions / s.totalActions) * 100) : 0}%`);
        lines.push('');

        if (s.phases.length > 0) {
          lines.push(`**Phases:**`);
          for (const ph of s.phases) {
            lines.push(`- ${ph.name}: ${ph.done}/${ph.total} (${ph.progress}%) — ${ph.status}`);
          }
          lines.push('');
        }

        if (s.nextActions.length > 0) {
          lines.push(`**Ưu tiên xử lý tiếp:**`);
          for (let i = 0; i < s.nextActions.length; i++) {
            const a = s.nextActions[i];
            lines.push(`${i + 1}. [${priVi[a.priority] ?? a.priority}] ${a.title}${a.phase ? ` (${a.phase})` : ''}${a.status === 'doing' ? ' ⬅ đang làm' : ''}`);
          }
          lines.push('');
        }
      }

      // Ưu tiên xử lý (từ warnings)
      if (p.priorityActions.length > 0) {
        lines.push(`### Ưu tiên xử lý ngay`);
        for (let i = 0; i < p.priorityActions.length; i++) {
          const a = p.priorityActions[i];
          lines.push(`${i + 1}. [${sevVi[a.severity] ?? a.severity.toUpperCase()}] ${a.title} (${a.source})`);
        }
        lines.push('');
      }

      // Tiến độ dự án
      if (p.progressReport) {
        const pr = p.progressReport;
        lines.push(`### Tiến độ dự án`);
        lines.push(`- Bắt đầu: ${new Date(pr.startDate).toLocaleDateString('vi-VN')} → Hạn: ${new Date(pr.deadline).toLocaleDateString('vi-VN')}`);
        lines.push(`- Thời gian: ${pr.daysElapsed} ngày đã qua / ${pr.daysRemaining} ngày còn lại (${pr.timelineProgress}%)`);
        lines.push(`- Tiến độ KPI tổng: ${pr.overallKpiPercent}% ${pr.onTrack ? '✓ Đúng tiến độ' : '⚠ Chậm tiến độ'}`);
        for (const k of pr.kpiProgress) {
          lines.push(`  - ${k.label}: ${k.current}/${k.target} (${k.percent}%)`);
        }
        lines.push(`- **Dự báo:** ${pr.forecast}`);
        lines.push('');
      }

      // Độ mới dữ liệu
      lines.push(`### Dữ liệu`);
      lines.push(`- Audit: ${p.dataAge.lastAudit ?? 'Chưa có'}`);
      lines.push(`- GSC: ${p.dataAge.lastGscSnapshot ?? 'Chưa có'}`);
      lines.push(`- Keywords: ${p.dataAge.lastKeywordSync ?? 'Chưa có'}`);
      lines.push('\n---\n');
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (isLoading) return <PageLoading />;
  if (!data || data.projects.length === 0) {
    return <EmptyState icon={ShieldCheck} title="Chưa có dữ liệu" description="Thêm dự án và import dữ liệu để bắt đầu đánh giá" />;
  }

  const { projects, meta } = data;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            Kiểm tra sức khỏe
          </h1>
          <p className="text-xs text-[#8888a0] mt-0.5">
            {meta.totalProjects} dự án
            {meta.criticalCount > 0 && <span className="text-red-400 font-medium"> · {meta.criticalCount} nghiêm trọng</span>}
            {meta.healthyCount > 0 && <span className="text-emerald-400 font-medium"> · {meta.healthyCount} khỏe mạnh</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={sendTelegram} disabled={sendingTelegram} className={cn('flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm transition-colors', telegramSent ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-card border-border text-[#8888a0] hover:text-[var(--text-primary)]', sendingTelegram && 'opacity-50 cursor-not-allowed')}>
            {telegramSent ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            {sendingTelegram ? 'Đang gửi...' : telegramSent ? 'Đã gửi!' : 'Gửi Telegram'}
          </button>
          <button onClick={exportToClipboard} className={cn('flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm transition-colors', copied ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-card border-border text-[#8888a0] hover:text-[var(--text-primary)]')}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Đã copy!' : 'Xuất báo cáo'}
          </button>
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-[#8888a0] hover:text-[var(--text-primary)] text-sm transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Làm mới
          </button>
        </div>
      </div>

      {/* Project Cards */}
      {projects.map((p) => (
        <ProjectHealthCard key={p.id} project={p} isExpanded={expanded.has(p.id)} onToggle={() => toggle(p.id)} />
      ))}

      <p className="text-[10px] text-[#555570] text-right">
        Cập nhật: {new Date(meta.generatedAt).toLocaleString('vi-VN')}
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
                <span className="text-[10px] text-[#8888a0] px-2 py-0.5">+{p.warnings.length - 3} khác</span>
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
            <h3 className="text-[11px] text-[#8888a0] uppercase tracking-wider font-semibold mb-2">Điểm theo danh mục</h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
              <CategoryBar label="Kỹ thuật" score={p.categoryScores.technical} />
              <CategoryBar label="Nội dung" score={p.categoryScores.content} />
              <CategoryBar label="Hình ảnh" score={p.categoryScores.images} />
              <CategoryBar label="Liên kết" score={p.categoryScores.links} />
              <CategoryBar label="E-E-A-T" score={p.categoryScores.eeat} />
              <CategoryBar label="AI" score={p.categoryScores.aiReadiness} />
              <CategoryBar label="Traffic" score={p.categoryScores.traffic} />
              <CategoryBar label="Từ khóa" score={p.categoryScores.keywords} />
              <CategoryBar label="Chiến lược" score={p.categoryScores.strategy} />
            </div>
          </div>

          {/* All Warnings */}
          {p.warnings.length > 0 && (
            <div>
              <h3 className="text-[11px] text-[#8888a0] uppercase tracking-wider font-semibold mb-2">
                Tất cả cảnh báo ({p.warnings.length})
              </h3>
              <div className="space-y-1.5">
                {p.warnings.map((w, i) => <WarningRow key={i} warning={w} />)}
              </div>
            </div>
          )}

          {/* Priority Actions */}
          {p.priorityActions.length > 0 && (
            <div>
              <h3 className="text-[11px] text-[#8888a0] uppercase tracking-wider font-semibold mb-2">Ưu tiên xử lý</h3>
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
            <DataAgeTag label="Từ khóa" date={p.dataAge.lastKeywordSync} />
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
    <span className="text-[10px] text-[#555570]">{label}: <span className="text-red-400">chưa có</span></span>
  );
  const d = new Date(date);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  const color = days <= 7 ? 'text-emerald-400' : days <= 30 ? 'text-yellow-400' : 'text-red-400';
  return (
    <span className="text-[10px] text-[#8888a0]">
      {label}: <span className={cn('font-mono', color)}>{days} ngày trước</span>
      <span className="text-[#555570] ml-1">({d.toLocaleDateString('vi-VN')})</span>
    </span>
  );
}
