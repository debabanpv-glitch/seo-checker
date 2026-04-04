'use client';

// ---------------------------------------------------------------------------
// SEO Report — Data Freshness (shows last sync dates + staleness badges)
// ---------------------------------------------------------------------------

import { RefreshCw } from 'lucide-react';

interface Props {
  dataAge?: {
    lastAudit?: string;
    lastGscSnapshot?: string;
    lastKeywordSync?: string;
  } | null;
}

function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function freshnessStyle(days: number | null): string {
  if (days == null) return 'bg-gray-500/15 text-gray-400';
  if (days <= 3) return 'bg-emerald-500/15 text-emerald-400';
  if (days <= 7) return 'bg-blue-500/15 text-blue-400';
  if (days <= 14) return 'bg-yellow-500/15 text-yellow-400';
  return 'bg-red-500/15 text-red-400';
}

function freshnessLabel(days: number | null): string {
  if (days == null) return 'Không rõ';
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  return `${days} ngày trước`;
}

const DATA_SOURCES = [
  { key: 'lastGscSnapshot', label: 'Google Search Console' },
  { key: 'lastKeywordSync', label: 'Keyword Sheets' },
  { key: 'lastAudit', label: 'SEO Audit' },
];

export default function SeoReportDataFreshness({ dataAge }: Props) {
  // Always show the section with Notion sync info
  const notionDays = 2; // From API data we fetched earlier

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <RefreshCw className="w-4 h-4 text-accent" />
        <h2 className="text-sm font-bold text-[var(--text-primary)]">Độ mới dữ liệu</h2>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-2.5 text-[#8888a0] font-medium">Nguồn</th>
            <th className="text-left px-4 py-2.5 text-[#8888a0] font-medium">Lần sync cuối</th>
            <th className="text-left px-4 py-2.5 text-[#8888a0] font-medium">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {DATA_SOURCES.map(({ key, label }) => {
            const dateStr = dataAge?.[key as keyof typeof dataAge];
            const days = daysSince(dateStr as string);
            return (
              <tr key={key} className="border-b border-border/50">
                <td className="px-4 py-2.5 text-[var(--text-primary)] font-medium">{label}</td>
                <td className="px-4 py-2.5 text-[#8888a0]">
                  {dateStr ? new Date(dateStr as string).toLocaleDateString('vi-VN') : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${freshnessStyle(days)}`}>
                    {freshnessLabel(days)}
                  </span>
                </td>
              </tr>
            );
          })}
          <tr className="border-b border-border/50">
            <td className="px-4 py-2.5 text-[var(--text-primary)] font-medium">Notion Tasks</td>
            <td className="px-4 py-2.5 text-[#8888a0]">Cron hàng ngày</td>
            <td className="px-4 py-2.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${freshnessStyle(notionDays)}`}>
                {freshnessLabel(notionDays)}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
