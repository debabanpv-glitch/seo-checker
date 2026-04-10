'use client';

// ---------------------------------------------------------------------------
// Top Pages Tab — Group committed keywords by ranking page
// Each keyword = 1 row, grouped by URL, first row shows URL + total KW count
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KeywordInsight } from '@/lib/services/keyword-insights-aggregator.service';
import { posColor, posBg } from './keyword-ranking-types-and-helpers';

interface TopPagesTabProps {
  keywords: KeywordInsight[];
}

interface PageGroup {
  url: string;
  keywords: { keyword: string; position: number }[];
  bestPosition: number;
}

export function RankingTopPagesTab({ keywords }: TopPagesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Group by URL, only committed keywords with position > 0
  const pageGroups = useMemo(() => {
    const ranked = keywords.filter(k => k.is_tracked && k.currentPosition > 0 && k.url);
    const map = new Map<string, { keyword: string; position: number }[]>();

    for (const kw of ranked) {
      const url = kw.url;
      if (!map.has(url)) map.set(url, []);
      map.get(url)!.push({ keyword: kw.keyword, position: kw.currentPosition });
    }

    const groups: PageGroup[] = [];
    for (const [url, kws] of map) {
      kws.sort((a, b) => a.position - b.position);
      groups.push({ url, keywords: kws, bestPosition: kws[0].position });
    }

    groups.sort((a, b) => a.bestPosition - b.bestPosition);
    return groups;
  }, [keywords]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!searchQuery) return pageGroups;
    const q = searchQuery.toLowerCase();
    return pageGroups
      .map(g => ({
        ...g,
        keywords: g.keywords.filter(
          k => k.keyword.toLowerCase().includes(q) || g.url.toLowerCase().includes(q),
        ),
      }))
      .filter(g => g.keywords.length > 0);
  }, [pageGroups, searchQuery]);

  // Count totals
  const totalPages = filtered.length;
  const totalKw = filtered.reduce((sum, g) => sum + g.keywords.length, 0);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8888a0]" />
          <input
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm URL / từ khóa..."
            className="w-full pl-8 pr-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-xs"
          />
        </div>
        <span className="text-[11px] text-[#8888a0]">
          {totalPages} trang · {totalKw} từ khóa đang rank
        </span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-[#8888a0]">
                <th className="px-3 py-2.5 text-left w-8">#</th>
                <th className="px-3 py-2.5 text-left">Ranking Page</th>
                <th className="px-3 py-2.5 text-center w-20">Tổng KW</th>
                <th className="px-3 py-2.5 text-left">Từ khóa cam kết</th>
                <th className="px-3 py-2.5 text-center w-16">Top</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((group, gIdx) => (
                group.keywords.map((kw, kwIdx) => (
                  <tr key={`${group.url}-${kw.keyword}`} className="hover:bg-secondary/30">
                    {/* Row number — only on first keyword of group */}
                    <td className="px-3 py-1.5 text-[10px] text-[#666680]">
                      {kwIdx === 0 ? gIdx + 1 : ''}
                    </td>
                    {/* URL — only on first keyword of group */}
                    <td className={cn(
                      'px-3 py-1.5 text-[11px]',
                      kwIdx === 0 ? 'text-[var(--text-primary)] font-medium' : '',
                    )}>
                      {kwIdx === 0 ? (
                        <a href={group.url} target="_blank" rel="noopener noreferrer"
                          className="hover:text-accent hover:underline transition-colors">
                          {shortUrl(group.url)}
                        </a>
                      ) : ''}
                    </td>
                    {/* Total KW — only on first keyword of group */}
                    <td className="px-3 py-1.5 text-center">
                      {kwIdx === 0 ? (
                        <span className="text-xs font-semibold text-accent">{group.keywords.length}</span>
                      ) : ''}
                    </td>
                    {/* Keyword */}
                    <td className="px-3 py-1.5 text-xs text-[var(--text-primary)]">
                      {kw.keyword}
                    </td>
                    {/* Position */}
                    <td className="px-3 py-1.5 text-center">
                      <span className={cn(
                        'inline-block px-2 py-0.5 rounded text-xs font-bold border',
                        posBg(kw.position),
                        posColor(kw.position),
                      )}>
                        {kw.position}
                      </span>
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-[#8888a0] text-sm">Không có kết quả phù hợp</div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-border text-[10px] text-[#666680] text-right">
          {totalPages} trang · {totalKw} từ khóa
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === '/' ? u.hostname : u.pathname;
  } catch {
    return url;
  }
}
