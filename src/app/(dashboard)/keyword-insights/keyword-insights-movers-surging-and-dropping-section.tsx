'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { type KeywordInsight } from './keyword-insights-types-and-helpers';
import { KeywordRow } from './keyword-insights-keyword-row-with-sparkline';

interface Props {
  surging: KeywordInsight[];
  dropping: KeywordInsight[];
  onToggleTracked: (keyword: string, current: boolean) => void;
}

export function MoversSection({ surging, dropping, onToggleTracked }: Props) {
  if (surging.length === 0 && dropping.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-[#8888a0] text-sm">Khong co tu khoa bien dong lon (thay doi &ge; 5 bac)</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Surging */}
      <div className="bg-card border border-emerald-500/20 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2 px-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-400">Tang manh</span>
          <span className="text-[10px] text-[#8888a0]">({surging.length})</span>
        </div>
        {surging.length === 0 ? (
          <p className="text-[#666680] text-xs px-2 py-4 text-center">Khong co</p>
        ) : (
          surging.map((kw) => (
            <KeywordRow key={kw.keyword} kw={kw} onToggleTracked={onToggleTracked} />
          ))
        )}
      </div>

      {/* Dropping */}
      <div className="bg-card border border-red-500/20 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2 px-2">
          <TrendingDown className="w-4 h-4 text-red-400" />
          <span className="text-sm font-semibold text-red-400">Giam manh</span>
          <span className="text-[10px] text-[#8888a0]">({dropping.length})</span>
        </div>
        {dropping.length === 0 ? (
          <p className="text-[#666680] text-xs px-2 py-4 text-center">Khong co</p>
        ) : (
          dropping.map((kw) => (
            <KeywordRow key={kw.keyword} kw={kw} onToggleTracked={onToggleTracked} />
          ))
        )}
      </div>
    </div>
  );
}
