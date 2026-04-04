'use client';

// ---------------------------------------------------------------------------
// GSC Queries Tab — Enhanced keyword table with position filters,
// search, history columns, and SE Ranking-inspired styling
// ---------------------------------------------------------------------------

import { useState, useMemo } from 'react';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ComparedQuery } from './gsc-comparison-utils';
import { type QueryFilter, type SortDir, fmtNum, fmtCtr, fmtPos } from './gsc-types-and-helpers';
import { DeltaBadge, StatusBadge, MiniBar, SortHeader } from './gsc-shared-sub-components';

// Query with history across weekly snapshots
export interface QueryWithHistory {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  history: { date: string; clicks: number; impressions: number; position: number }[];
}

type PosFilter = 'all' | 'top3' | 'top10' | 'top20' | 'top50' | 'beyond';
type StatusFilter = 'all' | 'winner' | 'loser' | 'new';

const POS_FILTERS: { key: PosFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'top3', label: 'TOP 3' },
  { key: 'top10', label: 'TOP 10' },
  { key: 'top20', label: 'TOP 20' },
  { key: 'top50', label: 'TOP 50' },
  { key: 'beyond', label: '>50' },
];

const STATUS_FILTERS: { key: StatusFilter; label: string; cls: string; activeCls: string }[] = [
  { key: 'all', label: 'Tất cả', cls: 'text-[#8888a0]', activeCls: 'bg-accent text-white border-accent' },
  { key: 'winner', label: 'Tăng', cls: 'text-green-400', activeCls: 'bg-green-500 text-white border-green-500' },
  { key: 'loser', label: 'Giảm', cls: 'text-red-400', activeCls: 'bg-red-500 text-white border-red-500' },
  { key: 'new', label: 'Mới', cls: 'text-blue-400', activeCls: 'bg-blue-500 text-white border-blue-500' },
];

export function QueriesTab({
  queries,
  opportunities,
  atRisk,
  allQueries,
}: {
  queries: ComparedQuery[];
  opportunities: ComparedQuery[];
  atRisk: ComparedQuery[];
  allQueries?: QueryWithHistory[];
}) {
  const [posFilter, setPosFilter] = useState<PosFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('clicks');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  // Use allQueries (merged from all snapshots) if available, else fall back to compared queries
  const sourceData = allQueries ?? queries.map((q) => ({
    query: q.query, clicks: q.clicks, impressions: q.impressions,
    ctr: q.ctr, position: q.position, history: [],
  }));

  // Build compared lookup for delta/status
  const comparedMap = useMemo(() => {
    const m = new Map<string, ComparedQuery>();
    queries.forEach((q) => m.set(q.query.toLowerCase().trim(), q));
    return m;
  }, [queries]);

  const oppSet = useMemo(() => new Set(opportunities.map((q) => q.query.toLowerCase().trim())), [opportunities]);
  const riskSet = useMemo(() => new Set(atRisk.map((q) => q.query.toLowerCase().trim())), [atRisk]);

  // Position filter counts
  const counts = useMemo(() => {
    const c: Record<PosFilter, number> = { all: 0, top3: 0, top10: 0, top20: 0, top50: 0, beyond: 0 };
    for (const q of sourceData) {
      c.all++;
      if (q.position > 0 && q.position <= 3) c.top3++;
      if (q.position > 0 && q.position <= 10) c.top10++;
      if (q.position > 0 && q.position <= 20) c.top20++;
      if (q.position > 0 && q.position <= 50) c.top50++;
      if (q.position > 50 || q.position === 0) c.beyond++;
    }
    return c;
  }, [sourceData]);

  // Status counts from compared data
  const statusCounts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: sourceData.length, winner: 0, loser: 0, new: 0 };
    comparedMap.forEach((q) => {
      if (q.status === 'winner') c.winner++;
      else if (q.status === 'loser') c.loser++;
      else if (q.status === 'new') c.new++;
    });
    return c;
  }, [sourceData, comparedMap]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...sourceData];

    // Position filter
    if (posFilter === 'top3') result = result.filter((q) => q.position > 0 && q.position <= 3);
    else if (posFilter === 'top10') result = result.filter((q) => q.position > 0 && q.position <= 10);
    else if (posFilter === 'top20') result = result.filter((q) => q.position > 0 && q.position <= 20);
    else if (posFilter === 'top50') result = result.filter((q) => q.position > 0 && q.position <= 50);
    else if (posFilter === 'beyond') result = result.filter((q) => q.position > 50 || q.position === 0);

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((r) => {
        const compared = comparedMap.get(r.query.toLowerCase().trim());
        return compared?.status === statusFilter;
      });
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => r.query.toLowerCase().includes(q));
    }

    // Sort
    result.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortKey] as number ?? 0;
      const bVal = (b as unknown as Record<string, unknown>)[sortKey] as number ?? 0;
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [sourceData, posFilter, statusFilter, searchQuery, sortKey, sortDir, comparedMap]);

  const maxClicks = Math.max(...sourceData.map((q) => q.clicks), 1);

  // History date columns (from allQueries)
  const historyDates = useMemo(() => {
    const dates = new Set<string>();
    sourceData.forEach((q) => q.history?.forEach((h) => dates.add(h.date)));
    return [...dates].sort().slice(-4); // last 4 dates
  }, [sourceData]);

  // Summary counts from compared queries
  const summaryCounts = useMemo(() => {
    let winner = 0, loser = 0, newKw = 0, stable = 0;
    queries.forEach((q) => {
      if (q.status === 'winner') winner++;
      else if (q.status === 'loser') loser++;
      else if (q.status === 'new') newKw++;
      else stable++;
    });
    return { winner, loser, newKw, stable, total: queries.length };
  }, [queries]);

  return (
    <div className="space-y-4">
      {/* Biến động từ khóa — summary bar */}
      {summaryCounts.total > 0 && (
        <GscKeywordChangesBar {...summaryCounts} />
      )}

      {/* Filter bars */}
      <div className="space-y-2">
        {/* Status filter — Tăng/Giảm/Mới */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                statusFilter === f.key
                  ? f.activeCls + ' shadow-sm'
                  : 'bg-card border-border ' + f.cls + ' hover:border-accent/30',
              )}
            >
              {f.label}
              <span className={cn(
                'ml-1.5 text-[10px] px-1.5 py-0.5 rounded-md',
                statusFilter === f.key ? 'bg-white/20' : 'bg-secondary',
              )}>
                {statusCounts[f.key]}
              </span>
            </button>
          ))}

          <span className="w-px h-5 bg-border mx-1" />

          {/* Position filter */}
          {POS_FILTERS.filter((f) => f.key !== 'all').map((f) => (
            <button
              key={f.key}
              onClick={() => setPosFilter(posFilter === f.key ? 'all' : f.key)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border',
                posFilter === f.key
                  ? 'bg-accent text-white border-accent shadow-sm shadow-accent/20'
                  : 'bg-card border-border text-[#8888a0] hover:text-[var(--text-primary)]',
              )}
            >
              {f.label}
              <span className={cn(
                'ml-1 text-[10px] px-1 py-0.5 rounded',
                posFilter === f.key ? 'bg-white/20' : 'bg-secondary',
              )}>
                {counts[f.key]}
              </span>
            </button>
          ))}

          {/* Search */}
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8888a0]" />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm keyword..."
              className="w-full pl-8 pr-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-xs"
            />
          </div>
        </div>
      </div>

      {/* Keywords table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-[#8888a0]">
                <th className="px-3 py-2.5 text-left w-8">#</th>
                <th className="px-3 py-2.5 text-left">Từ khóa</th>
                <SortHeader label="Clicks" sortKey="clicks" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="Impr" sortKey="impressions" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="CTR" sortKey="ctr" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="Vị trí" sortKey="position" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                {historyDates.length > 1 && historyDates.map((d) => (
                  <th key={d} className="px-2 py-2.5 text-center w-16">
                    {formatDateShort(d)}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center w-16">+/-</th>
                <th className="px-3 py-2.5 text-center w-16">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.length === 0 ? (
                <tr><td colSpan={10 + historyDates.length} className="px-4 py-8 text-center text-[#8888a0] text-sm">Không có kết quả phù hợp</td></tr>
              ) : (
                filtered.map((q, i) => {
                  const key = q.query.toLowerCase().trim();
                  const compared = comparedMap.get(key);
                  const isOpp = oppSet.has(key);
                  const isRisk = riskSet.has(key);

                  return (
                    <tr key={q.query} className="hover:bg-secondary/30">
                      <td className="px-3 py-2 text-[10px] text-[#666680]">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-[var(--text-primary)]">{q.query}</span>
                          {isOpp && <span className="text-[9px] px-1 py-0.5 rounded bg-orange-400/15 text-orange-400">cơ hội</span>}
                          {isRisk && <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-400/15 text-yellow-400">rủi ro</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <MiniBar value={q.clicks} max={maxClicks} color="bg-blue-500" />
                          <span className="text-blue-400 font-medium w-8 text-right">{fmtNum(q.clicks)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)]">{fmtNum(q.impressions)}</td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)]">{fmtCtr(q.ctr)}</td>
                      <td className={cn('px-3 py-2 text-right font-bold', posColorGsc(q.position))}>
                        {q.position > 0 ? fmtPos(q.position) : '—'}
                      </td>
                      {/* History position columns */}
                      {historyDates.length > 1 && historyDates.map((d) => {
                        const h = q.history?.find((entry) => entry.date === d);
                        if (!h) return <td key={d} className="px-2 py-2 text-center text-[10px] text-[#555570]">—</td>;
                        return (
                          <td key={d} className="px-2 py-2 text-center">
                            <span className={cn(
                              'inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border',
                              posBgGsc(h.position),
                              posColorGsc(h.position),
                            )}>
                              {fmtPos(h.position)}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center">
                        {compared ? <ChangeCell clicks_delta={compared.clicks_delta} position_delta={compared.position_delta} /> : <span className="text-[#666680] text-[10px]">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {compared ? <StatusBadge status={isOpp ? 'opportunity' as ComparedQuery['status'] : isRisk ? 'at_risk' as ComparedQuery['status'] : compared.status} /> : <span className="text-[9px] text-[#555570]">—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border text-[10px] text-[#666680] text-right">
          {filtered.length} / {sourceData.length} từ khóa
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components + Helpers
// ---------------------------------------------------------------------------

function ChangeCell({ clicks_delta, position_delta }: { clicks_delta: number; position_delta: number }) {
  // Show position change (positive delta = position dropped = bad, negative = improved = good)
  const posChange = -position_delta; // flip: positive = improved
  if (posChange === 0 && clicks_delta === 0) return <span className="text-[#666680] text-xs">—</span>;

  if (posChange !== 0) {
    const isGood = posChange > 0;
    return (
      <span className={cn(
        'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded',
        isGood ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10',
      )}>
        {isGood ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
        {Math.abs(Number(posChange.toFixed(1)))}
      </span>
    );
  }
  return <span className="text-[#666680] text-xs">—</span>;
}

function posColorGsc(pos: number): string {
  if (pos <= 0) return 'text-[#555570]';
  if (pos <= 3) return 'text-emerald-400';
  if (pos <= 10) return 'text-green-400';
  if (pos <= 20) return 'text-yellow-400';
  if (pos <= 50) return 'text-orange-400';
  return 'text-red-400';
}

function posBgGsc(pos: number): string {
  if (pos <= 0) return 'bg-transparent border-transparent';
  if (pos <= 3) return 'bg-emerald-400/10 border-emerald-400/20';
  if (pos <= 10) return 'bg-green-400/10 border-green-400/20';
  if (pos <= 20) return 'bg-yellow-400/10 border-yellow-400/20';
  if (pos <= 50) return 'bg-orange-400/10 border-orange-400/20';
  return 'bg-red-400/10 border-red-400/20';
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ---------------------------------------------------------------------------
// GSC Keyword Changes Summary Bar
// ---------------------------------------------------------------------------

function GscKeywordChangesBar({
  winner, loser, newKw, stable, total,
}: {
  winner: number;
  loser: number;
  newKw: number;
  stable: number;
  total: number;
}) {
  const winnerPct = (winner / total) * 100;
  const loserPct = (loser / total) * 100;
  const newPct = (newKw / total) * 100;
  const stablePct = (stable / total) * 100;

  const segments: { pct: number; color: string; title: string }[] = [
    { pct: winnerPct, color: 'bg-green-400', title: `Tăng: ${winner}` },
    { pct: loserPct, color: 'bg-red-400', title: `Giảm: ${loser}` },
    { pct: newPct, color: 'bg-blue-400', title: `Mới: ${newKw}` },
    { pct: stablePct, color: 'bg-[#555570]', title: `Giữ nguyên: ${stable}` },
  ];

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-primary)]">Biến động từ khóa</span>
        <span className="text-[11px] text-[#8888a0]">{total} queries</span>
      </div>

      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden flex bg-secondary">
        {segments.map((s) =>
          s.pct > 0 ? (
            <div
              key={s.color}
              className={cn('h-full transition-all', s.color)}
              style={{ width: `${s.pct}%` }}
              title={s.title}
            />
          ) : null
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-green-400 flex-shrink-0" />
          <span className="text-[#8888a0]">Tăng</span>
          <span className="font-semibold text-green-400">{winner}</span>
          <span className="text-[#666680]">({winnerPct.toFixed(0)}%)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-red-400 flex-shrink-0" />
          <span className="text-[#8888a0]">Giảm</span>
          <span className="font-semibold text-red-400">{loser}</span>
          <span className="text-[#666680]">({loserPct.toFixed(0)}%)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-blue-400 flex-shrink-0" />
          <span className="text-[#8888a0]">Mới</span>
          <span className="font-semibold text-blue-400">{newKw}</span>
          <span className="text-[#666680]">({newPct.toFixed(0)}%)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-[#555570] flex-shrink-0" />
          <span className="text-[#8888a0]">Giữ nguyên</span>
          <span className="font-semibold text-[#8888a0]">{stable}</span>
          <span className="text-[#666680]">({stablePct.toFixed(0)}%)</span>
        </span>
      </div>
    </div>
  );
}
