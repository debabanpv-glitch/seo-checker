'use client';

import { useState } from 'react';
import { ExternalLink, ArrowUpDown } from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContentSource = 'notion' | 'sheet' | 'wp';

export interface ContentItem {
  id: string;
  title: string;
  source: ContentSource;
  status: string;
  assignee?: string;
  deadline?: string;
  publishUrl?: string;
  publishDate?: string;
  project?: string;
}

interface Props {
  items: ContentItem[];
  loading: boolean;
}

// ─── Source Badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: ContentSource }) {
  const map: Record<ContentSource, { label: string; className: string }> = {
    notion: { label: 'Notion', className: 'bg-purple-500/15 text-purple-400 border border-purple-500/20' },
    sheet:  { label: 'Sheet',  className: 'bg-green-500/15 text-green-400 border border-green-500/20' },
    wp:     { label: 'WP',     className: 'bg-orange-500/15 text-orange-400 border border-orange-500/20' },
  };
  const { label, className } = map[source] ?? { label: source || '?', className: 'bg-gray-500/15 text-gray-400 border border-gray-500/20' };
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ${className}`}>
      {label}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const normalize = status.toLowerCase();

  let className = 'bg-secondary text-[#8888a0]';
  let label = status;

  if (['published', 'done', 'hoàn thành', 'đã đăng'].includes(normalize)) {
    className = 'bg-green-500/15 text-green-400';
    label = 'Đã đăng';
  } else if (['in-progress', 'in_progress', 'đang làm', 'đang viết'].includes(normalize)) {
    className = 'bg-yellow-500/15 text-yellow-400';
    label = 'Đang làm';
  } else if (['draft', 'nháp'].includes(normalize)) {
    className = 'bg-secondary text-[#8888a0]';
    label = 'Nháp';
  } else if (['overdue', 'trễ hạn', 'quá hạn'].includes(normalize)) {
    className = 'bg-red-500/15 text-red-400';
    label = 'Trễ hạn';
  }

  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardV2ExecutionContentTrackerTable({ items, loading }: Props) {
  const [sortAsc, setSortAsc] = useState(true);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <PageLoading />
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return sortAsc
      ? a.deadline.localeCompare(b.deadline)
      : b.deadline.localeCompare(a.deadline);
  });

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-primary)]">
          Danh sách nội dung ({items.length})
        </span>
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center text-sm text-[#8888a0]">Chưa có nội dung nào</div>
      ) : (
        <div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card border-b border-border z-10">
              <tr>
                <th className="text-left px-4 py-2.5 text-[#8888a0] font-medium w-8">STT</th>
                <th className="text-left px-4 py-2.5 text-[#8888a0] font-medium">Tiêu đề</th>
                <th className="text-left px-4 py-2.5 text-[#8888a0] font-medium w-20">Nguồn</th>
                <th className="text-left px-4 py-2.5 text-[#8888a0] font-medium w-24">Trạng thái</th>
                <th className="text-left px-4 py-2.5 text-[#8888a0] font-medium w-28">PIC</th>
                <th className="px-4 py-2.5 text-[#8888a0] font-medium w-28">
                  <button
                    onClick={() => setSortAsc(!sortAsc)}
                    className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
                  >
                    Deadline
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-center px-4 py-2.5 text-[#8888a0] font-medium w-16">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((item, idx) => (
                <tr key={item.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="px-4 py-3 text-[#8888a0]">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="text-[var(--text-primary)] font-medium leading-snug line-clamp-2 max-w-xs">
                      {item.title}
                    </div>
                    {item.project && (
                      <div className="text-[10px] text-[#8888a0] mt-0.5">{item.project}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <SourceBadge source={item.source} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-[#8888a0] truncate max-w-[7rem]">
                    {item.assignee ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[#8888a0]">
                    {item.deadline
                      ? new Date(item.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.publishUrl ? (
                      <a
                        href={item.publishUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-[#8888a0]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
