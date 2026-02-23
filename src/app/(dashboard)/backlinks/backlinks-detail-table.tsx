'use client';

import { useState, useMemo } from 'react';
import { ExternalLink, Search, ChevronDown, ChevronUp, ShieldCheck, ShieldOff } from 'lucide-react';
import type { Backlink } from './backlinks-types-and-helpers';
import { fmtDate, truncate, isExpired, isExpiringSoon } from './backlinks-types-and-helpers';
import { cn } from '@/lib/utils';

interface Props {
  backlinks: Backlink[];
}

type SortKey = 'keyword' | 'source_domain' | 'end_date' | 'dofollow';

export function BacklinksDetailTable({ backlinks }: Props) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('keyword');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const perPage = 50;

  const filtered = useMemo(() => {
    let items = [...backlinks];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((b) =>
        b.keyword.toLowerCase().includes(q) ||
        b.source_domain.toLowerCase().includes(q) ||
        b.target_url.toLowerCase().includes(q) ||
        b.order_name.toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'keyword') cmp = a.keyword.localeCompare(b.keyword);
      else if (sortBy === 'source_domain') cmp = a.source_domain.localeCompare(b.source_domain);
      else if (sortBy === 'end_date') cmp = (a.end_date ?? '').localeCompare(b.end_date ?? '');
      else if (sortBy === 'dofollow') cmp = (a.dofollow ? 1 : 0) - (b.dofollow ? 1 : 0);
      return sortAsc ? cmp : -cmp;
    });
    return items;
  }, [backlinks, search, sortBy, sortAsc]);

  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(true); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortBy !== col) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />;
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Chi tiết Backlinks</h3>
          <p className="text-xs text-[#8888a0]">{filtered.length} backlinks</p>
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8888a0]" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Tìm keyword, domain, URL..."
            className="w-full pl-8 pr-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-xs" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-[#8888a0]">
              <th className="px-3 py-2.5 text-left w-10">#</th>
              <th className="px-3 py-2.5 text-left cursor-pointer hover:text-[var(--text-primary)]" onClick={() => toggleSort('source_domain')}>
                Source Domain <SortIcon col="source_domain" />
              </th>
              <th className="px-3 py-2.5 text-left cursor-pointer hover:text-[var(--text-primary)]" onClick={() => toggleSort('keyword')}>
                Keyword <SortIcon col="keyword" />
              </th>
              <th className="px-3 py-2.5 text-left hidden md:table-cell">Target URL</th>
              <th className="px-3 py-2.5 text-center w-20 cursor-pointer hover:text-[var(--text-primary)]" onClick={() => toggleSort('dofollow')}>
                Follow <SortIcon col="dofollow" />
              </th>
              <th className="px-3 py-2.5 text-center w-28 cursor-pointer hover:text-[var(--text-primary)] hidden sm:table-cell" onClick={() => toggleSort('end_date')}>
                Hết hạn <SortIcon col="end_date" />
              </th>
              <th className="px-3 py-2.5 text-left hidden lg:table-cell">Đơn hàng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {paged.map((b, idx) => {
              const expired = isExpired(b.end_date);
              const expiring = isExpiringSoon(b.end_date);
              return (
                <tr key={b.id} className={cn('hover:bg-secondary/30 transition-colors', expired && 'opacity-50')}>
                  <td className="px-3 py-2 text-xs text-[#666680]">{page * perPage + idx + 1}</td>
                  <td className="px-3 py-2">
                    <a href={b.source_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-sky-400 hover:underline inline-flex items-center gap-1">
                      {truncate(b.source_domain, 30)}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-sm text-[var(--text-primary)]">{b.keyword}</span>
                    {b.anchor_text_before && (
                      <p className="text-[10px] text-[#666680] mt-0.5 leading-tight">
                        {truncate(b.anchor_text_before, 30)} <strong>{b.keyword}</strong> {truncate(b.anchor_text_after, 30)}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <a href={b.target_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                      {truncate(b.target_url.replace(/^https?:\/\//, ''), 35)}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {b.dofollow
                      ? <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto" />
                      : <ShieldOff className="w-4 h-4 text-orange-400 mx-auto" />}
                  </td>
                  <td className="px-3 py-2 text-center hidden sm:table-cell">
                    <span className={cn('text-xs', expired ? 'text-red-400' : expiring ? 'text-yellow-400' : 'text-[#8888a0]')}>
                      {fmtDate(b.end_date)}
                      {expired && ' ⛔'}
                      {expiring && !expired && ' ⚠️'}
                    </span>
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell">
                    <span className="text-xs text-[#8888a0]">{b.order_name}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="p-6 text-center text-[#8888a0] text-sm">Không tìm thấy backlink nào</div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
          <span className="text-xs text-[#8888a0]">
            Trang {page + 1} / {totalPages} ({filtered.length} kết quả)
          </span>
          <div className="flex gap-1">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              className="px-2.5 py-1 text-xs rounded border border-border hover:bg-secondary disabled:opacity-30 text-[var(--text-primary)]">←</button>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
              className="px-2.5 py-1 text-xs rounded border border-border hover:bg-secondary disabled:opacity-30 text-[var(--text-primary)]">→</button>
          </div>
        </div>
      )}
    </div>
  );
}
