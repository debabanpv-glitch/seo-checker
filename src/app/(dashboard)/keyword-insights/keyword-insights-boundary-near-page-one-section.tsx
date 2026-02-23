'use client';

import { AlertCircle } from 'lucide-react';
import { type KeywordInsight } from './keyword-insights-types-and-helpers';
import { KeywordRow } from './keyword-insights-keyword-row-with-sparkline';

interface Props {
  boundary: KeywordInsight[];
  onToggleTracked: (keyword: string, current: boolean) => void;
}

export function BoundarySection({ boundary, onToggleTracked }: Props) {
  if (boundary.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-[#8888a0] text-sm">Khong co tu khoa o vi tri 8-12</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-amber-500/20 rounded-xl p-3">
      <div className="flex items-start gap-2 mb-3 px-2">
        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-400">
            Tren vong — {boundary.length} tu khoa (vi tri 8-12)
          </p>
          <p className="text-[11px] text-[#8888a0] mt-0.5">
            Sap vao trang 1 hoac co nguy co xuong trang 2. Can tap trung cai thien.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-1 text-[10px] text-[#666680] uppercase tracking-wider">
        <span className="w-3.5" />
        <span className="w-8 text-right">Pos</span>
        <span className="w-10 text-right">+/-</span>
        <span className="flex-1">Tu khoa</span>
        <span className="w-20 text-right">GSC</span>
        <span className="w-[72px]">Trend</span>
      </div>

      {boundary.map((kw) => (
        <KeywordRow key={kw.keyword} kw={kw} onToggleTracked={onToggleTracked} />
      ))}
    </div>
  );
}
