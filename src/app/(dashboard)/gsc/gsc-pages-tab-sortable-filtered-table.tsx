'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { type ComparedPage } from './gsc-comparison-utils';
import { type PageFilter, type SortDir, fmtNum, fmtCtr, fmtPos, shortUrl } from './gsc-types-and-helpers';
import { DeltaBadge, StatusBadge, MiniBar, SortHeader } from './gsc-shared-sub-components';

export function PagesTab({ pages }: { pages: ComparedPage[] }) {
  const [filter, setFilter] = useState<PageFilter>('all');
  const [sortKey, setSortKey] = useState('clicks');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    let list = pages;
    switch (filter) {
      case 'winner': list = pages.filter((p) => p.status === 'winner'); break;
      case 'loser': list = pages.filter((p) => p.status === 'loser'); break;
      case 'new': list = pages.filter((p) => p.status === 'new'); break;
    }
    return [...list].sort((a, b) => {
      const aVal = (a as unknown as Record<string, number>)[sortKey] ?? 0;
      const bVal = (b as unknown as Record<string, number>)[sortKey] ?? 0;
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [pages, filter, sortKey, sortDir]);

  const maxClicks = Math.max(...pages.map((p) => p.clicks), 1);

  const FILTERS: { key: PageFilter; label: string; count: number; cls: string }[] = [
    { key: 'all', label: 'Tất cả', count: pages.length, cls: '' },
    { key: 'winner', label: 'Tăng', count: pages.filter((p) => p.status === 'winner').length, cls: 'text-green-400' },
    { key: 'loser', label: 'Giảm', count: pages.filter((p) => p.status === 'loser').length, cls: 'text-red-400' },
    { key: 'new', label: 'Mới', count: pages.filter((p) => p.status === 'new').length, cls: 'text-blue-400' },
  ];

  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              filter === f.key
                ? 'bg-accent text-white'
                : 'bg-card border border-border text-[#8888a0] hover:text-[var(--text-primary)]',
            )}
          >
            <span className={filter !== f.key ? f.cls : ''}>{f.label}</span>
            {f.count > 0 && <span className="ml-1 opacity-70">{f.count}</span>}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-medium text-[#8888a0] w-8">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[#8888a0]">URL</th>
                <SortHeader label="Clicks" sortKey="clicks" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <th className="px-3 py-2 text-right text-xs font-medium text-[#8888a0]">+/-</th>
                <SortHeader label="Impr" sortKey="impressions" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="CTR" sortKey="ctr" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="Vị trí" sortKey="position" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <th className="px-3 py-2 text-right text-xs font-medium text-[#8888a0]">+/-</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-[#8888a0]">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-[#8888a0]">Không có dữ liệu.</td></tr>
              ) : (
                filtered.map((p, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-3 py-2 text-[#8888a0]">{i + 1}</td>
                    <td className="px-3 py-2 text-[var(--text-primary)] font-medium max-w-[300px]">
                      <span className="truncate block" title={p.page}>{shortUrl(p.page)}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <MiniBar value={p.clicks} max={maxClicks} color="bg-blue-500" />
                        <span className="text-blue-400 font-medium w-8 text-right">{fmtNum(p.clicks)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right"><DeltaBadge value={p.clicks_delta} /></td>
                    <td className="px-3 py-2 text-right text-[var(--text-primary)]">{fmtNum(p.impressions)}</td>
                    <td className="px-3 py-2 text-right text-[var(--text-primary)]">{fmtCtr(p.ctr)}</td>
                    <td className="px-3 py-2 text-right text-[var(--text-primary)] font-medium">{fmtPos(p.position)}</td>
                    <td className="px-3 py-2 text-right"><DeltaBadge value={p.position_delta} invert /></td>
                    <td className="px-3 py-2 text-center"><StatusBadge status={p.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
