'use client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnPageScoresProps {
  scores: Record<string, number>;
  avgScore: number;
}

// ─── Category Label Map ───────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  content: 'Nội dung',
  technical: 'Kỹ thuật',
  images: 'Hình ảnh',
  links: 'Liên kết',
  eeat: 'E-E-A-T',
  ai_readiness: 'AI Readiness',
};

const CATEGORY_ORDER = ['content', 'technical', 'images', 'links', 'eeat', 'ai_readiness'];

// ─── Color Helpers ─────────────────────────────────────────────────────────────

function barColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

function avgBgColor(score: number): string {
  if (score >= 70) return 'bg-green-500/15 text-green-400 border-green-500/30';
  if (score >= 50) return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
  return 'bg-red-500/15 text-red-400 border-red-500/30';
}

// ─── Score Bar Row ─────────────────────────────────────────────────────────────

function ScoreBarRow({ category, score }: { category: string; score: number }) {
  const label = CATEGORY_LABELS[category] ?? category;
  const clamped = Math.min(100, Math.max(0, score));
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[var(--text-primary)]">{label}</span>
        <span className={`text-[11px] font-semibold ${scoreColor(clamped)}`}>{clamped}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DashboardV2SeoStrengthOnPageAuditScoresBars({
  scores,
  avgScore,
}: OnPageScoresProps) {
  const hasScores = Object.keys(scores).length > 0;

  const orderedCategories = CATEGORY_ORDER.filter((k) => k in scores).concat(
    Object.keys(scores).filter((k) => !CATEGORY_ORDER.includes(k))
  );

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">Điểm On-Page Audit</h3>
        {hasScores && (
          <div className={`text-xs font-bold px-2 py-0.5 rounded-full border ${avgBgColor(avgScore)}`}>
            TB {Math.round(avgScore)}
          </div>
        )}
      </div>

      {hasScores ? (
        <div className="divide-y divide-border">
          {orderedCategories.map((cat) => (
            <ScoreBarRow key={cat} category={cat} score={scores[cat]} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-32">
          <p className="text-xs text-[#8888a0]">Chưa có dữ liệu audit</p>
        </div>
      )}
    </div>
  );
}
