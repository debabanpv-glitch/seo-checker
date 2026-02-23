'use client';

import { ExternalLink } from 'lucide-react';
import type { KeywordSummary } from './backlinks-types-and-helpers';
import { truncate } from './backlinks-types-and-helpers';

interface Props {
  keywords: KeywordSummary[];
  gscData: Map<string, { clicks: number; impressions: number; position: number }>;
}

export function BacklinksKeywordSummaryTable({ keywords, gscData }: Props) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Từ khóa & Ranking</h3>
        <p className="text-xs text-[#8888a0]">Tổng hợp backlinks theo từ khóa, kết hợp GSC ranking</p>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-wider text-[#8888a0]">
            <th className="px-4 py-2.5 text-left">Từ khóa</th>
            <th className="px-4 py-2.5 text-center w-24">Backlinks</th>
            <th className="px-4 py-2.5 text-center w-24">Domains</th>
            <th className="px-4 py-2.5 text-center w-24">Vị trí GSC</th>
            <th className="px-4 py-2.5 text-center w-20 hidden sm:table-cell">Clicks</th>
            <th className="px-4 py-2.5 text-center w-24 hidden md:table-cell">Impressions</th>
            <th className="px-4 py-2.5 text-left hidden lg:table-cell">Target URL</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {keywords.map((kw) => {
            const gsc = gscData.get(kw.keyword.toLowerCase().trim());
            return (
              <tr key={kw.keyword} className="hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]">{kw.keyword}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className="text-sm font-semibold text-accent">{kw.backlink_count}</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className="text-sm text-sky-400">{kw.domain_count}</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  {gsc ? (
                    <span className={`text-sm font-semibold ${gsc.position <= 10 ? 'text-emerald-400' : gsc.position <= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {Math.round(gsc.position * 10) / 10}
                    </span>
                  ) : (
                    <span className="text-xs text-[#666680]">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                  <span className="text-sm text-[var(--text-primary)]">{gsc?.clicks ?? '—'}</span>
                </td>
                <td className="px-4 py-2.5 text-center hidden md:table-cell">
                  <span className="text-xs text-[#8888a0]">{gsc?.impressions?.toLocaleString() ?? '—'}</span>
                </td>
                <td className="px-4 py-2.5 hidden lg:table-cell">
                  {kw.target_url && (
                    <a href={kw.target_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                      {truncate(kw.target_url.replace(/^https?:\/\//, ''), 40)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {keywords.length === 0 && (
        <div className="p-6 text-center text-[#8888a0] text-sm">Chưa có dữ liệu</div>
      )}
    </div>
  );
}
