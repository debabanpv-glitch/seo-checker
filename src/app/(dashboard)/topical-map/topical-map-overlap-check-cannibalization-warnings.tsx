'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface OverlapItem {
  keyword: string;
  urls: { url: string; position: number | null }[];
  recommendation: string;
}

interface OverlapData {
  hasOverlap: boolean;
  items: OverlapItem[];
  checkedAt: string | null;
}

interface Props {
  clusterId: string;
}

export function TopicalMapOverlapCheck({ clusterId }: Props) {
  const [data, setData] = useState<OverlapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOverlap = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/topic-clusters?id=${clusterId}&overlap=true`);
      const json = await res.json();
      setData(json.overlap || null);
    } catch (e) {
      console.error('Failed to fetch overlap data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [clusterId]);

  useEffect(() => { fetchOverlap(); }, [fetchOverlap]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[var(--text-muted)]">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Đang phân tích trùng lặp...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[var(--text-muted)]">
        Không có dữ liệu đánh giá
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header info */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)]">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>
          Phát hiện từ khóa trùng lặp giữa các bài viết trong cluster (keyword cannibalization)
        </span>
      </div>

      {!data.hasOverlap ? (
        /* No overlap — green success state */
        <div className="flex flex-col items-center justify-center py-12 bg-[var(--bg-card)] rounded-xl border border-emerald-500/20">
          <CheckCircle className="w-12 h-12 text-emerald-400 mb-3" />
          <p className="text-base font-medium text-[var(--text-primary)]">Không phát hiện trùng lặp</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Các bài viết trong cluster không cạnh tranh từ khóa với nhau
          </p>
        </div>
      ) : (
        /* Overlap items */
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Phát hiện {data.items.length} từ khóa bị cạnh tranh nội bộ</span>
          </div>

          {data.items.map((item, idx) => (
            <div key={idx} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
              {/* Keyword header */}
              <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-accent)]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-medium text-[var(--text-primary)] text-sm">{item.keyword}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    — {item.urls.length} URL cùng xếp hạng
                  </span>
                </div>
              </div>

              {/* URLs table */}
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="px-4 py-2 text-left font-medium">URL</th>
                    <th className="px-4 py-2 text-right font-medium">Vị trí</th>
                  </tr>
                </thead>
                <tbody>
                  {item.urls.map((u, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-2.5">
                        <a href={u.url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-xs truncate block max-w-sm">
                          {u.url}
                        </a>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {u.position != null ? (
                          <span className={`text-sm font-medium ${u.position <= 10 ? 'text-emerald-400' : 'text-[var(--text-secondary)]'}`}>
                            #{u.position}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Recommendation */}
              <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-accent)]">
                <p className="text-xs text-[var(--text-muted)]">
                  <span className="font-medium text-[var(--text-secondary)]">Gợi ý: </span>
                  {item.recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
