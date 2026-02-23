'use client';

import { Star } from 'lucide-react';
import { type KeywordInsight, posColor, changeBadge, fmtNum } from './keyword-insights-types-and-helpers';
import { Sparkline } from './keyword-insights-sparkline-mini-chart';
import { cn } from '@/lib/utils';

interface Props {
  kw: KeywordInsight;
  onToggleTracked?: (keyword: string, current: boolean) => void;
  showGsc?: boolean;
}

export function KeywordRow({ kw, onToggleTracked, showGsc = true }: Props) {
  const badge = changeBadge(kw.change);

  return (
    <div className="flex items-center gap-2 px-3 py-2 hover:bg-secondary/50 rounded-lg transition-colors text-sm">
      {/* Star toggle */}
      <button
        onClick={() => onToggleTracked?.(kw.keyword, kw.is_tracked)}
        className="flex-shrink-0"
        title={kw.is_tracked ? 'Bỏ theo dõi' : 'Theo dõi'}
      >
        <Star className={cn('w-3.5 h-3.5', kw.is_tracked ? 'fill-amber-400 text-amber-400' : 'text-[#444460] hover:text-amber-400/50')} />
      </button>

      {/* Position badge */}
      <span className={cn('w-8 text-right font-mono text-xs font-bold flex-shrink-0', posColor(kw.currentPosition))}>
        {Math.round(kw.currentPosition)}
      </span>

      {/* Change */}
      <span className={cn('w-10 text-right font-mono text-[11px] flex-shrink-0', badge.cls)}>
        {badge.text}
      </span>

      {/* Keyword */}
      <span className="flex-1 text-[var(--text-primary)] truncate min-w-0" title={kw.keyword}>
        {kw.keyword}
      </span>

      {/* GSC data */}
      {showGsc && kw.gscClicks > 0 && (
        <span className="text-[10px] text-[#8888a0] flex-shrink-0 tabular-nums">
          {fmtNum(kw.gscClicks)}c / {fmtNum(kw.gscImpressions)}i
        </span>
      )}

      {/* Sparkline */}
      <Sparkline data={kw.history} width={72} height={20} />
    </div>
  );
}
