'use client';

import { useState } from 'react';
// Tier distribution with expandable keyword lists
import { type KeywordInsight, TIER_CONFIG } from './keyword-insights-types-and-helpers';
import { KeywordRow } from './keyword-insights-keyword-row-with-sparkline';
import { cn } from '@/lib/utils';

interface Props {
  tiers: Record<string, KeywordInsight[]>;
  onToggleTracked: (keyword: string, current: boolean) => void;
}

export function TierDistributionSection({ tiers, onToggleTracked }: Props) {
  const [expanded, setExpanded] = useState<string | null>('top5');

  return (
    <div className="space-y-2">
      {/* Tier summary cards */}
      <div className="grid grid-cols-5 gap-2">
        {TIER_CONFIG.map((t) => {
          const count = (tiers[t.key] ?? []).length;
          return (
            <button
              key={t.key}
              onClick={() => setExpanded(expanded === t.key ? null : t.key)}
              className={cn(
                'rounded-lg border p-3 text-center transition-all',
                expanded === t.key ? `${t.bg} ${t.border}` : 'bg-card border-border hover:border-[#555570]',
              )}
            >
              <p className={cn('text-xl font-bold', t.color)}>{count}</p>
              <p className="text-[11px] text-[#8888a0]">{t.label}</p>
              <p className="text-[10px] text-[#666680]">{t.range[0]}-{t.range[1] === 999 ? '200' : t.range[1]}</p>
            </button>
          );
        })}
      </div>

      {/* Expanded keyword list */}
      {expanded && (tiers[expanded] ?? []).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-2">
          <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-[#666680] uppercase tracking-wider">
            <span className="w-3.5" />
            <span className="w-8 text-right">Pos</span>
            <span className="w-10 text-right">+/-</span>
            <span className="flex-1">Từ khóa</span>
            <span className="w-20 text-right">GSC</span>
            <span className="w-[72px]">Trend</span>
          </div>
          {(tiers[expanded] ?? []).map((kw) => (
            <KeywordRow key={kw.keyword} kw={kw} onToggleTracked={onToggleTracked} />
          ))}
        </div>
      )}
    </div>
  );
}
