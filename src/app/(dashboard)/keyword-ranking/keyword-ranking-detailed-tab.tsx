'use client';

// ---------------------------------------------------------------------------
// Rankings Detailed Tab — SE Ranking style keyword table
// Position filter bar + enhanced keyword table with sorting
// ---------------------------------------------------------------------------

import { useState, useMemo } from 'react';
import { Search, ArrowUp, ArrowDown, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KeywordInsight } from '@/lib/services/keyword-insights-aggregator.service';
import { posColor, posBg } from './keyword-ranking-types-and-helpers';

interface DetailedTabProps {
  keywords: KeywordInsight[];
  checkDates: string[];
  onToggleTracked?: (keyword: string, projectId: string, tracked: boolean) => void;
  projectId?: string;
}

type PosFilter = 'all' | 'top1' | 'top3' | 'top5' | 'top10' | 'top30' | 'beyond';
type SortKey = 'keyword' | 'position' | 'change' | 'clicks';

const POS_FILTERS: { key: PosFilter; label: string; max: number }[] = [
  { key: 'all', label: 'Tất cả', max: Infinity },
  { key: 'top1', label: 'TOP 1', max: 1 },
  { key: 'top3', label: 'TOP 3', max: 3 },
  { key: 'top5', label: 'TOP 5', max: 5 },
  { key: 'top10', label: 'TOP 10', max: 10 },
  { key: 'top30', label: 'TOP 30', max: 30 },
  { key: 'beyond', label: '>100', max: 999 },
];

const TRACKED_PREVIEW_LIMIT = 20;

export function RankingDetailedTab({ keywords, checkDates, onToggleTracked, projectId }: DetailedTabProps) {
  const [posFilter, setPosFilter] = useState<PosFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('position');
  const [sortAsc, setSortAsc] = useState(true);
  const [showAllTracked, setShowAllTracked] = useState(false);

  // Count per filter for badges
  const counts = useMemo(() => {
    const c: Record<PosFilter, number> = {
      all: keywords.length,
      top1: keywords.filter((k) => k.currentPosition === 1).length,
      top3: keywords.filter((k) => k.currentPosition <= 3 && k.currentPosition > 0).length,
      top5: keywords.filter((k) => k.currentPosition <= 5 && k.currentPosition > 0).length,
      top10: keywords.filter((k) => k.currentPosition <= 10 && k.currentPosition > 0).length,
      top30: keywords.filter((k) => k.currentPosition <= 30 && k.currentPosition > 0).length,
      beyond: keywords.filter((k) => k.currentPosition > 100 || k.currentPosition === 0).length,
    };
    return c;
  }, [keywords]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...keywords];

    // Position filter
    if (posFilter !== 'all') {
      const cfg = POS_FILTERS.find((f) => f.key === posFilter)!;
      if (posFilter === 'beyond') {
        result = result.filter((k) => k.currentPosition > 100 || k.currentPosition === 0);
      } else if (posFilter === 'top1') {
        result = result.filter((k) => k.currentPosition === 1);
      } else {
        result = result.filter((k) => k.currentPosition > 0 && k.currentPosition <= cfg.max);
      }
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (k) => k.keyword.toLowerCase().includes(q) || k.url.toLowerCase().includes(q),
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'keyword': cmp = a.keyword.localeCompare(b.keyword); break;
        case 'position': cmp = (a.currentPosition || 999) - (b.currentPosition || 999); break;
        case 'change': cmp = (b.change ?? 0) - (a.change ?? 0); break;
        case 'clicks': cmp = (b.gscClicks ?? 0) - (a.gscClicks ?? 0); break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [keywords, posFilter, searchQuery, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'position'); }
  };

  // Format date columns (show last 4 check dates)
  const dateCols = checkDates.slice(-4);

  // Tracked keywords section
  const trackedKeywords = useMemo(
    () => keywords.filter((k) => k.is_tracked).sort((a, b) => (a.currentPosition || 999) - (b.currentPosition || 999)),
    [keywords],
  );
  const trackedToShow = showAllTracked ? trackedKeywords : trackedKeywords.slice(0, TRACKED_PREVIEW_LIMIT);

  return (
    <div className="space-y-4">
      {/* Tracked keywords section */}
      {trackedKeywords.length > 0 && (
        <div className="bg-card border border-accent/20 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-accent/5">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-accent fill-accent" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Từ khóa cam kết</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-medium">
                {trackedKeywords.filter((k) => k.currentPosition > 0 && k.currentPosition <= 10).length}/{trackedKeywords.length} trong Top 10
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase text-[#8888a0]">
                  <th className="px-3 py-2 text-left">Từ khóa</th>
                  <th className="px-3 py-2 text-center w-16">Vị trí</th>
                  <th className="px-3 py-2 text-center w-16">+/-</th>
                  <th className="px-3 py-2 text-center w-16">Clicks</th>
                  <th className="px-3 py-2 text-left hidden md:table-cell">URL</th>
                </tr>
              </thead>
              <tbody>
                {trackedToShow.map((kw) => (
                  <tr key={kw.keyword} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                    <td className="px-3 py-1.5 font-medium text-[var(--text-primary)]">
                      <div className="flex items-center gap-1.5">
                        {onToggleTracked && projectId && (
                          <button onClick={() => onToggleTracked(kw.keyword, projectId, false)} title="Bỏ theo dõi">
                            <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                          </button>
                        )}
                        {kw.keyword}
                      </div>
                    </td>
                    <td className={cn('px-3 py-1.5 text-center font-bold', posColor(kw.currentPosition))}>
                      {kw.currentPosition > 0 ? kw.currentPosition : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-center"><ChangeCell change={kw.change} /></td>
                    <td className="px-3 py-1.5 text-center text-sky-400">{kw.gscClicks > 0 ? kw.gscClicks : '—'}</td>
                    <td className="px-3 py-1.5 text-[#8888a0] text-[10px] truncate max-w-[180px] hidden md:table-cell">
                      {kw.url ? shortUrl(kw.url) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {trackedKeywords.length > TRACKED_PREVIEW_LIMIT && (
            <button
              onClick={() => setShowAllTracked(!showAllTracked)}
              className="w-full px-4 py-2 border-t border-border text-[11px] text-accent hover:bg-accent/5 transition-colors flex items-center justify-center gap-1"
            >
              {showAllTracked ? (
                <><ChevronUp className="w-3.5 h-3.5" />Thu gọn</>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5" />Xem tất cả {trackedKeywords.length} từ khóa cam kết</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Position filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {POS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setPosFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
              posFilter === f.key
                ? 'bg-accent text-white border-accent shadow-sm shadow-accent/20'
                : 'bg-card border-border text-[#8888a0] hover:text-[var(--text-primary)] hover:border-accent/30',
            )}
          >
            {f.label}
            <span className={cn(
              'ml-1.5 text-[10px] px-1.5 py-0.5 rounded-md',
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
            placeholder="Tìm keyword / URL..."
            className="w-full pl-8 pr-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-xs"
          />
        </div>
      </div>

      {/* Keywords table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-[#8888a0]">
                <th className="px-3 py-2.5 text-left w-8">#</th>
                <SortableHeader label="Từ khóa" sortKey="keyword" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <th className="px-3 py-2.5 text-left hidden lg:table-cell">URL</th>
                <SortableHeader label="Clicks" sortKey="clicks" current={sortKey} asc={sortAsc} onSort={toggleSort} align="center" />
                {/* Date columns */}
                {dateCols.map((d) => (
                  <th key={d} className="px-3 py-2.5 text-center w-20">
                    {formatDateShort(d)}
                  </th>
                ))}
                <SortableHeader label="+/-" sortKey="change" current={sortKey} asc={sortAsc} onSort={toggleSort} align="center" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((kw, idx) => (
                <tr key={kw.keyword} className="hover:bg-secondary/30">
                  <td className="px-3 py-2 text-[10px] text-[#666680]">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {onToggleTracked && projectId && (
                        <button
                          onClick={() => onToggleTracked(kw.keyword, projectId, !kw.is_tracked)}
                          className="flex-shrink-0"
                          title={kw.is_tracked ? 'Bỏ theo dõi' : 'Theo dõi'}
                        >
                          <Star className={cn('w-3.5 h-3.5 transition-colors',
                            kw.is_tracked ? 'text-accent fill-accent' : 'text-[#555570] hover:text-accent')} />
                        </button>
                      )}
                      <span className="text-xs font-medium text-[var(--text-primary)]">{kw.keyword}</span>
                      {kw.is_tracked && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-accent/15 text-accent">cam kết</span>
                      )}
                      {kw.keyword_type === 'KW Blog' && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-sky-400/15 text-sky-400">blog</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[10px] text-[#8888a0] max-w-[180px] truncate hidden lg:table-cell">
                    {kw.url ? shortUrl(kw.url) : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {kw.gscClicks > 0 ? (
                      <span className="text-xs font-medium text-sky-400">{kw.gscClicks}</span>
                    ) : (
                      <span className="text-[10px] text-[#555570]">—</span>
                    )}
                  </td>
                  {/* Position for each date column */}
                  {dateCols.map((d) => {
                    const entry = kw.history.find((h) => h.date === d);
                    if (!entry) return <td key={d} className="px-3 py-2 text-center text-[10px] text-[#555570]">—</td>;
                    return (
                      <td key={d} className="px-3 py-2 text-center">
                        <span className={cn(
                          'inline-block px-2 py-0.5 rounded text-xs font-bold border',
                          posBg(entry.position),
                          posColor(entry.position),
                        )}>
                          {entry.position}
                        </span>
                      </td>
                    );
                  })}
                  {/* Change */}
                  <td className="px-3 py-2 text-center">
                    <ChangeCell change={kw.change} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-[#8888a0] text-sm">Không có kết quả phù hợp</div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-border text-[10px] text-[#666680] text-right">
          {filtered.length} / {keywords.length} từ khóa
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SortableHeader({
  label, sortKey, current, asc, onSort, align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  asc: boolean;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'center';
}) {
  const isActive = current === sortKey;
  return (
    <th
      className={cn(
        'px-3 py-2.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none',
        align === 'center' ? 'text-center' : 'text-left',
        isActive ? 'text-[var(--text-primary)]' : '',
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {isActive && (asc ? ' ↑' : ' ↓')}
      </span>
    </th>
  );
}

function ChangeCell({ change }: { change: number | null }) {
  if (change === null || change === 0) {
    return <span className="text-[#666680] text-xs">—</span>;
  }
  const isPositive = change > 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded',
      isPositive ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10',
    )}>
      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(change)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === '/' ? u.hostname : u.pathname;
  } catch {
    return url;
  }
}
