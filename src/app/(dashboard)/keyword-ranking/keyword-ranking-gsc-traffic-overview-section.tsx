'use client';

// ---------------------------------------------------------------------------
// Keyword Ranking — GSC Traffic Overview Section
// Shows clicks, impressions, CTR, position with period comparison
// ---------------------------------------------------------------------------

import { MousePointerClick, Eye, Percent, Crosshair, BarChart2 } from 'lucide-react';
import { type GscSnapshot, type TopQuery } from './keyword-ranking-types-and-helpers';
import { TrafficCard } from './keyword-ranking-shared-sub-components';

export function GscTrafficSection({ snapshots }: { snapshots: GscSnapshot[] }) {
  const latest = snapshots[0];
  const previous = snapshots[1] ?? null;

  const clicksDelta = previous ? latest.clicks - previous.clicks : null;
  const impressionsDelta = previous ? latest.impressions - previous.impressions : null;
  const ctrDelta = previous ? latest.ctr - previous.ctr : null;
  // position: lower = better, so negative delta = improved
  const positionDelta = previous ? latest.position - previous.position : null;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-[#8888a0]" />
          <span className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Google Search Console</span>
          <span className="text-[10px] text-[#666680]">· {formatDate(latest.date)}</span>
        </div>
        {previous && (
          <span className="text-[10px] text-[#666680]">So sanh voi {formatDate(previous.date)}</span>
        )}
      </div>

      {/* Traffic cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TrafficCard
          label="Clicks"
          value={latest.clicks.toLocaleString('vi-VN')}
          delta={clicksDelta}
          positiveIsGood={true}
          icon={<MousePointerClick className="w-4 h-4" />}
          color="text-sky-400"
          borderColor="border-sky-400/20"
          bgColor="bg-sky-400/5"
        />
        <TrafficCard
          label="Impressions"
          value={latest.impressions.toLocaleString('vi-VN')}
          delta={impressionsDelta}
          positiveIsGood={true}
          icon={<Eye className="w-4 h-4" />}
          color="text-purple-400"
          borderColor="border-purple-400/20"
          bgColor="bg-purple-400/5"
        />
        <TrafficCard
          label="CTR"
          value={`${(latest.ctr * 100).toFixed(1)}%`}
          delta={ctrDelta !== null ? +(ctrDelta * 100).toFixed(2) : null}
          positiveIsGood={true}
          deltaLabel="%"
          icon={<Percent className="w-4 h-4" />}
          color="text-amber-400"
          borderColor="border-amber-400/20"
          bgColor="bg-amber-400/5"
        />
        <TrafficCard
          label="Vi tri TB"
          value={String(Math.round(latest.position))}
          delta={positionDelta !== null ? Math.round(positionDelta) : null}
          positiveIsGood={false}
          deltaLabel=""
          icon={<Crosshair className="w-4 h-4" />}
          color="text-emerald-400"
          borderColor="border-emerald-400/20"
          bgColor="bg-emerald-400/5"
        />
      </div>
    </div>
  );
}
