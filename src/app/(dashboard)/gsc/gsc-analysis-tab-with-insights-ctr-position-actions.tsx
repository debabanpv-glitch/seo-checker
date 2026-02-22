'use client';

import { useMemo } from 'react';
import { Sparkles, Shield, Lightbulb, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ComparedQuery, type ComparedPage } from './gsc-comparison-utils';
import { type GscSnapshot, fmtDateFull, fmtNum, fmtCtr, fmtPos, shortUrl } from './gsc-types-and-helpers';
import { DeltaBadge } from './gsc-shared-sub-components';

// ---------------------------------------------------------------------------
// ActionItems — prioritized action list generated from data
// ---------------------------------------------------------------------------

function ActionItems({
  queries,
  pages,
  ctrAnalysis,
}: {
  queries: ComparedQuery[];
  pages: ComparedPage[];
  ctrAnalysis: { posRange: string; verdict: string; count: number }[];
}) {
  const actions: { priority: 'high' | 'medium' | 'low'; text: string }[] = [];

  // High priority: losing keywords that had good traffic
  const bigLosers = queries
    .filter((q) => q.status === 'loser' && q.prev_clicks >= 5)
    .sort((a, b) => a.clicks_delta - b.clicks_delta)
    .slice(0, 3);

  for (const q of bigLosers) {
    actions.push({
      priority: 'high',
      text: `Khôi phục "${q.query}" — mất ${Math.abs(q.clicks_delta)} clicks, vị trí ${fmtPos(q.prev_position)} → ${fmtPos(q.position)}. Kiểm tra content freshness + competitor analysis.`,
    });
  }

  // High priority: CTR issues
  const ctrIssues = ctrAnalysis.filter((r) => r.verdict === 'Cần cải thiện title/meta' && r.count >= 2);
  for (const issue of ctrIssues) {
    actions.push({
      priority: 'high',
      text: `Cải thiện title & meta description cho ${issue.count} từ khóa ở ${issue.posRange} — CTR đang thấp hơn trung bình ngành.`,
    });
  }

  // Medium priority: Opportunities
  const opps = queries
    .filter((q) => q.position >= 4 && q.position <= 15 && q.impressions >= 50)
    .sort((a, b) => a.position - b.position)
    .slice(0, 3);

  for (const q of opps) {
    actions.push({
      priority: 'medium',
      text: `Đẩy "${q.query}" lên top 3 — đang ở vị trí ${fmtPos(q.position)} với ${fmtNum(q.impressions)} impressions. Thêm internal links + content depth.`,
    });
  }

  // Low: pages declining
  const decliningPages = pages
    .filter((p) => p.status === 'loser' && p.prev_clicks >= 3)
    .sort((a, b) => a.clicks_delta - b.clicks_delta)
    .slice(0, 2);

  for (const p of decliningPages) {
    actions.push({
      priority: 'low',
      text: `Review trang ${shortUrl(p.page)} — giảm ${Math.abs(p.clicks_delta)} clicks. Cập nhật nội dung + kiểm tra technical issues.`,
    });
  }

  if (actions.length === 0) {
    return <p className="text-xs text-[#8888a0]">Cần thêm dữ liệu so sánh để đưa ra hành động cụ thể.</p>;
  }

  const priorityConfig = {
    high: { label: 'Cao', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
    medium: { label: 'TB', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
    low: { label: 'Thấp', cls: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
  };

  return (
    <div className="space-y-2">
      {actions.map((a, i) => {
        const cfg = priorityConfig[a.priority];
        return (
          <div key={i} className="flex items-start gap-2">
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 mt-0.5', cfg.cls)}>
              {cfg.label}
            </span>
            <p className="text-xs text-[var(--text-primary)] leading-relaxed">{a.text}</p>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AnalysisTab — expert insights, period comparison, position distribution, CTR analysis
// ---------------------------------------------------------------------------

export function AnalysisTab({
  insights,
  queries,
  pages,
  latest,
  prev,
}: {
  insights: string[];
  queries: ComparedQuery[];
  pages: ComparedPage[];
  latest: GscSnapshot;
  prev: GscSnapshot | null;
}) {
  // Position distribution
  const positionBuckets = useMemo(() => {
    const buckets = { '1-3': 0, '4-10': 0, '11-20': 0, '21-50': 0, '50+': 0 };
    for (const q of queries) {
      if (q.position <= 3) buckets['1-3']++;
      else if (q.position <= 10) buckets['4-10']++;
      else if (q.position <= 20) buckets['11-20']++;
      else if (q.position <= 50) buckets['21-50']++;
      else buckets['50+']++;
    }
    return buckets;
  }, [queries]);

  const totalQ = queries.length || 1;
  const bucketColors: Record<string, string> = {
    '1-3': 'bg-green-500',
    '4-10': 'bg-blue-500',
    '11-20': 'bg-orange-500',
    '21-50': 'bg-yellow-500',
    '50+': 'bg-red-500',
  };

  // CTR analysis: actual CTR vs expected by position
  const ctrByPosition = useMemo(() => {
    // Expected CTR curve (industry average)
    const expected: Record<string, number> = {
      '1': 0.28, '2': 0.15, '3': 0.11, '4': 0.08, '5': 0.06,
      '6': 0.04, '7': 0.03, '8': 0.03, '9': 0.02, '10': 0.02,
    };
    const results: { posRange: string; avgCtr: number; expectedCtr: number; count: number; verdict: string }[] = [];

    for (let pos = 1; pos <= 10; pos++) {
      const inRange = queries.filter((q) => Math.round(q.position) === pos);
      if (inRange.length === 0) continue;
      const avgCtr = inRange.reduce((sum, q) => sum + q.ctr, 0) / inRange.length;
      const exp = expected[String(pos)] ?? 0.02;
      const verdict = avgCtr >= exp ? 'Tốt' : avgCtr >= exp * 0.7 ? 'Trung bình' : 'Cần cải thiện title/meta';
      results.push({
        posRange: `Vị trí ${pos}`,
        avgCtr,
        expectedCtr: exp,
        count: inRange.length,
        verdict,
      });
    }
    return results;
  }, [queries]);

  // Detailed period comparison
  const periodDiff = prev ? {
    clicks: latest.clicks - prev.clicks,
    impressions: latest.impressions - prev.impressions,
    ctr: latest.ctr - prev.ctr,
    position: latest.position - prev.position,
  } : null;

  return (
    <div className="space-y-4">
      {/* Expert Insights */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Nhận định chuyên gia</h3>
        </div>
        {insights.length === 0 ? (
          <p className="text-xs text-[#8888a0]">Cần ít nhất 2 kỳ dữ liệu để phân tích xu hướng.</p>
        ) : (
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2">
                <ArrowUpRight className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Period Comparison */}
      {periodDiff && prev && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            So sánh: {fmtDateFull(prev.date)} vs {fmtDateFull(latest.date)}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Clicks', prev: prev.clicks, cur: latest.clicks, diff: periodDiff.clicks, fmt: fmtNum },
              { label: 'Impressions', prev: prev.impressions, cur: latest.impressions, diff: periodDiff.impressions, fmt: fmtNum },
              { label: 'CTR', prev: prev.ctr, cur: latest.ctr, diff: periodDiff.ctr, fmt: fmtCtr },
              { label: 'Vị trí TB', prev: prev.position, cur: latest.position, diff: periodDiff.position, fmt: fmtPos, invert: true },
            ].map(({ label, prev: pv, cur, diff, fmt, invert }) => (
              <div key={label} className="bg-secondary/30 rounded-lg p-3">
                <p className="text-[10px] text-[#8888a0] mb-1">{label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-[var(--text-primary)]">{fmt(cur)}</span>
                  <DeltaBadge value={diff} invert={invert} />
                </div>
                <p className="text-[10px] text-[#8888a0] mt-0.5">Trước: {fmt(pv)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Position Distribution */}
      {queries.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Phân bố vị trí từ khóa</h3>
          <div className="space-y-2">
            {Object.entries(positionBuckets).map(([range, count]) => {
              const pct = (count / totalQ) * 100;
              return (
                <div key={range} className="flex items-center gap-3">
                  <span className="text-xs text-[#8888a0] w-12 text-right">{range}</span>
                  <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', bucketColors[range])}
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-[var(--text-primary)] w-16 text-right">
                    {count} ({pct.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-[#8888a0]">
            Mục tiêu: tối đa từ khóa ở vị trí 1-3. Hiện có {positionBuckets['1-3']} từ khóa top 3
            ({((positionBuckets['1-3'] / totalQ) * 100).toFixed(0)}%).
          </p>
        </div>
      )}

      {/* CTR Analysis */}
      {ctrByPosition.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Phân tích CTR theo vị trí</h3>
          </div>
          <p className="text-[10px] text-[#8888a0]">So sánh CTR thực tế vs CTR trung bình ngành. CTR thấp = cần cải thiện title/meta description.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Vị trí', 'Số KW', 'CTR thực tế', 'CTR TB ngành', 'Đánh giá'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[#8888a0] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ctrByPosition.map((row) => (
                  <tr key={row.posRange} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-[var(--text-primary)] font-medium">{row.posRange}</td>
                    <td className="px-3 py-2 text-[var(--text-primary)]">{row.count}</td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        'font-medium',
                        row.avgCtr >= row.expectedCtr ? 'text-green-400' : 'text-red-400',
                      )}>
                        {fmtCtr(row.avgCtr)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[#8888a0]">{fmtCtr(row.expectedCtr)}</td>
                    <td className="px-3 py-2">
                      <span className={cn('text-xs',
                        row.verdict === 'Tốt' ? 'text-green-400' : row.verdict === 'Trung bình' ? 'text-yellow-400' : 'text-red-400',
                      )}>
                        {row.verdict}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Items */}
      <div className="bg-card border border-accent/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Hành động ưu tiên</h3>
        </div>
        <ActionItems queries={queries} pages={pages} ctrAnalysis={ctrByPosition} />
      </div>
    </div>
  );
}
