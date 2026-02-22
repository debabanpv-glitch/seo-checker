'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { type ComparedQuery } from './gsc-comparison-utils';
import { type QueryFilter, type SortDir, fmtNum, fmtCtr, fmtPos } from './gsc-types-and-helpers';
import { DeltaBadge, StatusBadge, MiniBar, SortHeader } from './gsc-shared-sub-components';

export function QueriesTab({
  queries,
  opportunities,
  atRisk,
}: {
  queries: ComparedQuery[];
  opportunities: ComparedQuery[];
  atRisk: ComparedQuery[];
}) {
  const [filter, setFilter] = useState<QueryFilter>('all');
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

  // Mark opportunities and at-risk
  const oppSet = new Set(opportunities.map((q) => q.query));
  const riskSet = new Set(atRisk.map((q) => q.query));

  const filtered = useMemo(() => {
    let list = queries;
    switch (filter) {
      case 'winner': list = queries.filter((q) => q.status === 'winner'); break;
      case 'loser': list = queries.filter((q) => q.status === 'loser'); break;
      case 'new': list = queries.filter((q) => q.status === 'new'); break;
      case 'opportunity': list = queries.filter((q) => oppSet.has(q.query)); break;
      case 'at_risk': list = queries.filter((q) => riskSet.has(q.query)); break;
    }

    return [...list].sort((a, b) => {
      const aVal = (a as unknown as Record<string, number>)[sortKey] ?? 0;
      const bVal = (b as unknown as Record<string, number>)[sortKey] ?? 0;
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [queries, filter, sortKey, sortDir, oppSet, riskSet]);

  const maxClicks = Math.max(...queries.map((q) => q.clicks), 1);

  const FILTERS: { key: QueryFilter; label: string; count: number; cls: string }[] = [
    { key: 'all', label: 'Tất cả', count: queries.length, cls: '' },
    { key: 'winner', label: 'Tăng', count: queries.filter((q) => q.status === 'winner').length, cls: 'text-green-400' },
    { key: 'loser', label: 'Giảm', count: queries.filter((q) => q.status === 'loser').length, cls: 'text-red-400' },
    { key: 'new', label: 'Mới', count: queries.filter((q) => q.status === 'new').length, cls: 'text-blue-400' },
    { key: 'opportunity', label: 'Cơ hội', count: opportunities.length, cls: 'text-orange-400' },
    { key: 'at_risk', label: 'Rủi ro', count: atRisk.length, cls: 'text-yellow-400' },
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

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-medium text-[#8888a0] w-8">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[#8888a0]">Từ khóa</th>
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
                filtered.map((q, i) => {
                  let displayStatus = q.status;
                  if (oppSet.has(q.query)) displayStatus = 'opportunity' as ComparedQuery['status'];
                  if (riskSet.has(q.query)) displayStatus = 'at_risk' as ComparedQuery['status'];

                  return (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="px-3 py-2 text-[#8888a0]">{i + 1}</td>
                      <td className="px-3 py-2 text-[var(--text-primary)] font-medium max-w-[250px]">
                        <span className="truncate block">{q.query}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <MiniBar value={q.clicks} max={maxClicks} color="bg-blue-500" />
                          <span className="text-blue-400 font-medium w-8 text-right">{fmtNum(q.clicks)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right"><DeltaBadge value={q.clicks_delta} /></td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)]">{fmtNum(q.impressions)}</td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)]">{fmtCtr(q.ctr)}</td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)] font-medium">{fmtPos(q.position)}</td>
                      <td className="px-3 py-2 text-right"><DeltaBadge value={q.position_delta} invert /></td>
                      <td className="px-3 py-2 text-center"><StatusBadge status={displayStatus} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
