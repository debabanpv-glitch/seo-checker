'use client';

import { Star } from 'lucide-react';
import { type KeywordInsight } from './keyword-insights-types-and-helpers';
import { KeywordRow } from './keyword-insights-keyword-row-with-sparkline';

interface Props {
  tracked: KeywordInsight[];
  onToggleTracked: (keyword: string, current: boolean) => void;
}

export function TrackedKeywordsSection({ tracked, onToggleTracked }: Props) {
  if (tracked.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-[#8888a0] text-sm">Chưa có từ khóa theo dõi. Bấm ngôi sao để đánh dấu.</p>
      </div>
    );
  }

  const inTop10 = tracked.filter((k) => k.currentPosition <= 10);
  const outTop10 = tracked.filter((k) => k.currentPosition > 10);

  return (
    <div className="space-y-3">
      {/* In top 10 */}
      <div className="bg-card border border-emerald-500/20 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2 px-2">
          <Star className="w-4 h-4 fill-emerald-400 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-400">Trong Top 10</span>
          <span className="text-[10px] text-[#8888a0]">({inTop10.length})</span>
        </div>
        {inTop10.length === 0 ? (
          <p className="text-[#666680] text-xs px-2 py-4 text-center">Chưa có từ khóa theo dõi nào trong Top 10</p>
        ) : (
          inTop10.map((kw) => (
            <KeywordRow key={kw.keyword} kw={kw} onToggleTracked={onToggleTracked} />
          ))
        )}
      </div>

      {/* Outside top 10 */}
      {outTop10.length > 0 && (
        <div className="bg-card border border-amber-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2 px-2">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">Ngoài Top 10</span>
            <span className="text-[10px] text-[#8888a0]">({outTop10.length})</span>
          </div>
          {outTop10.map((kw) => (
            <KeywordRow key={kw.keyword} kw={kw} onToggleTracked={onToggleTracked} />
          ))}
        </div>
      )}
    </div>
  );
}
