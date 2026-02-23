'use client';

// ---------------------------------------------------------------------------
// Keyword Ranking — Keyword Table Row with Expandable History
// Shows position, change, GSC data, URL; expands to show history timeline
// ---------------------------------------------------------------------------

import { ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type KeywordTrend, posColor, posBg } from './keyword-ranking-types-and-helpers';
import { ChangeIndicator } from './keyword-ranking-shared-sub-components';

export function KeywordRow({ trend, idx, expanded, onToggle, showGsc }: {
  trend: KeywordTrend; idx: number; expanded: boolean; onToggle: () => void; showGsc?: boolean;
}) {
  const colSpan = showGsc ? 7 : 5;
  return (
    <>
      <tr className={cn('hover:bg-secondary/30 transition-colors cursor-pointer text-sm', expanded && 'bg-accent/5')} onClick={onToggle}>
        <td className="px-3 py-2.5 text-[#8888a0] text-xs font-mono">{idx + 1}</td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-primary)] font-medium text-sm">{trend.keyword}</span>
            {trend.keyword_type && (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full border',
                trend.keyword_type === 'KW Cam kết' ? 'bg-accent/10 text-accent border-accent/20' : 'bg-sky-400/10 text-sky-400 border-sky-400/20'
              )}>
                {trend.keyword_type === 'KW Cam kết' ? 'CK' : 'Blog'}
              </span>
            )}
            <ChevronDown className={cn('w-3 h-3 text-[#8888a0] transition-transform', expanded && 'rotate-180')} />
          </div>
        </td>
        <td className="px-3 py-2.5 text-center">
          <span className={cn('inline-flex items-center justify-center w-9 h-7 rounded-md border text-sm font-bold font-mono', posBg(trend.currentPosition), posColor(trend.currentPosition))}>
            {trend.currentPosition}
          </span>
        </td>
        <td className="px-3 py-2.5 text-center">
          <ChangeIndicator change={trend.change} />
        </td>
        {showGsc && (
          <>
            <td className="px-3 py-2.5 text-center hidden sm:table-cell">
              {trend.gscClicks !== undefined ? (
                <span className="text-xs font-mono text-sky-400">{trend.gscClicks.toLocaleString('vi-VN')}</span>
              ) : (
                <span className="text-[10px] text-[#555570]">—</span>
              )}
            </td>
            <td className="px-3 py-2.5 text-center hidden lg:table-cell">
              {trend.gscImpressions !== undefined ? (
                <span className="text-xs font-mono text-[#8888a0]">{trend.gscImpressions.toLocaleString('vi-VN')}</span>
              ) : (
                <span className="text-[10px] text-[#555570]">—</span>
              )}
            </td>
          </>
        )}
        <td className="px-3 py-2.5 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
          {trend.url ? (
            <a href={trend.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-accent hover:underline max-w-[280px] truncate">
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{trend.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
            </a>
          ) : (
            <span className="text-[11px] text-[#666680]">—</span>
          )}
        </td>
      </tr>

      {/* Expanded history */}
      {expanded && (
        <tr>
          <td colSpan={colSpan} className="px-3 py-3 bg-secondary/20">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-[10px] text-[#8888a0] uppercase tracking-wider">Lich su:</span>
              {trend.history.map((h, i) => {
                const prev = trend.history[i - 1];
                const delta = prev ? prev.position - h.position : null;
                return (
                  <div key={h.date} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#8888a0]">{new Date(h.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                    <span className={cn('text-xs font-bold font-mono', posColor(h.position))}>{h.position}</span>
                    {delta !== null && delta !== 0 && (
                      <span className={cn('text-[10px] font-mono', delta > 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    )}
                    {i < trend.history.length - 1 && <span className="text-[#666680]">→</span>}
                  </div>
                );
              })}
            </div>
            {/* GSC detail on expand (mobile) */}
            {showGsc && trend.gscClicks !== undefined && (
              <div className="flex items-center gap-4 mt-2 sm:hidden">
                <span className="text-[10px] text-[#8888a0] uppercase tracking-wider">GSC:</span>
                <span className="text-xs text-sky-400 font-mono">{trend.gscClicks} clicks</span>
                <span className="text-xs text-[#8888a0] font-mono">{trend.gscImpressions} impr</span>
                {trend.gscCtr !== undefined && (
                  <span className="text-xs text-amber-400 font-mono">CTR {(trend.gscCtr * 100).toFixed(1)}%</span>
                )}
              </div>
            )}
            {/* Mobile URL */}
            {trend.url && (
              <a href={trend.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-accent hover:underline mt-2 md:hidden">
                <ExternalLink className="w-3 h-3" />
                <span className="truncate">{trend.url.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
