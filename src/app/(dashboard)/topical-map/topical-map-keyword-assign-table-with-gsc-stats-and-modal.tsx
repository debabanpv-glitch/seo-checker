'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Loader2, TrendingUp, TrendingDown, Minus, MousePointerClick, Eye, Hash } from 'lucide-react';

interface KeywordRow {
  id: string;
  keyword: string;
  current_position: number | null;
  previous_position: number | null;
  url: string | null;
  clicks: number | null;
  impressions: number | null;
}

interface UnassignedKeyword {
  id: string;
  keyword: string;
  current_position: number | null;
}

interface Props {
  clusterId: string;
  projectId: string;
  keywords: KeywordRow[];
  onRefresh: () => void;
}

function PositionChange({ current, previous }: { current: number | null; previous: number | null }) {
  if (!current || !previous) return <span className="text-[var(--text-muted)]">—</span>;
  const diff = previous - current; // positive = improved (position went down numerically)
  if (diff > 0) return <span className="flex items-center gap-0.5 text-emerald-400 text-xs"><TrendingUp className="w-3 h-3" />+{diff}</span>;
  if (diff < 0) return <span className="flex items-center gap-0.5 text-red-400 text-xs"><TrendingDown className="w-3 h-3" />{diff}</span>;
  return <span className="flex items-center gap-0.5 text-[var(--text-muted)] text-xs"><Minus className="w-3 h-3" />0</span>;
}

export function TopicalMapKeywordAssign({ clusterId, projectId, keywords, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [unassigned, setUnassigned] = useState<UnassignedKeyword[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoadingUnassigned, setIsLoadingUnassigned] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Computed stats
  const total = keywords.length;
  const avgPosition = total > 0
    ? Math.round(keywords.filter((k) => k.current_position).reduce((s, k) => s + (k.current_position || 0), 0) / keywords.filter((k) => k.current_position).length) || 0
    : 0;
  const top10 = keywords.filter((k) => k.current_position && k.current_position <= 10).length;
  const totalClicks = keywords.reduce((s, k) => s + (k.clicks || 0), 0);

  const fetchUnassigned = useCallback(async () => {
    if (!projectId) return;
    setIsLoadingUnassigned(true);
    try {
      const res = await fetch(`/api/v1/topic-clusters/keywords?projectId=${projectId}&unassigned=true`);
      const json = await res.json();
      setUnassigned(json.keywords || []);
    } catch (e) {
      console.error('Failed to fetch unassigned keywords:', e);
    } finally {
      setIsLoadingUnassigned(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (showModal) fetchUnassigned();
  }, [showModal, fetchUnassigned]);

  const handleAssign = async () => {
    if (selected.size === 0) return;
    setIsAssigning(true);
    try {
      await fetch('/api/v1/topic-clusters/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: clusterId, keyword_ids: Array.from(selected) }),
      });
      setSelected(new Set());
      setShowModal(false);
      onRefresh();
    } catch (e) {
      console.error('Failed to assign keywords:', e);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemove = async (keywordId: string) => {
    setRemovingId(keywordId);
    try {
      await fetch(`/api/v1/topic-clusters/keywords?cluster_id=${clusterId}&keyword_id=${keywordId}`, {
        method: 'DELETE',
      });
      onRefresh();
    } catch (e) {
      console.error('Failed to remove keyword:', e);
    } finally {
      setRemovingId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Tổng KW', value: total, icon: Hash, color: 'text-blue-400' },
          { label: 'Vị trí TB', value: avgPosition || '—', icon: TrendingUp, color: 'text-purple-400' },
          { label: 'Top 10', value: top10, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Clicks', value: totalClicks, icon: MousePointerClick, color: 'text-amber-400' },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <span className="text-[11px] text-[var(--text-muted)]">{s.label}</span>
            </div>
            <p className="text-lg font-bold text-[var(--text-primary)]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table header + add button */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="text-sm font-medium text-[var(--text-primary)]">Từ khóa đã gán</span>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm từ khóa
          </button>
        </div>

        {keywords.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--text-muted)]">
            Chưa có từ khóa nào. Nhấn "Thêm từ khóa" để gán.
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] bg-[var(--bg-accent)]">
                <th className="px-4 py-2 text-left font-medium">Từ khóa</th>
                <th className="px-4 py-2 text-right font-medium">Vị trí</th>
                <th className="px-4 py-2 text-right font-medium">Thay đổi</th>
                <th className="px-4 py-2 text-left font-medium">URL</th>
                <th className="px-4 py-2 text-right font-medium">Clicks</th>
                <th className="px-4 py-2 text-right font-medium">Impr.</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw) => (
                <tr key={kw.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-accent)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{kw.keyword}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                    {kw.current_position ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PositionChange current={kw.current_position} previous={kw.previous_position} />
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    {kw.url ? (
                      <a href={kw.url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-500 hover:underline truncate block text-xs">
                        {kw.url.replace(/^https?:\/\/[^/]+/, '')}
                      </a>
                    ) : <span className="text-[var(--text-muted)]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                    <span className="flex items-center justify-end gap-1">
                      <MousePointerClick className="w-3 h-3 text-[var(--text-muted)]" />
                      {kw.clicks ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                    <span className="flex items-center justify-end gap-1">
                      <Eye className="w-3 h-3 text-[var(--text-muted)]" />
                      {kw.impressions ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemove(kw.id)}
                      disabled={removingId === kw.id}
                      className="p-1 text-[var(--text-muted)] hover:text-red-400 rounded transition-colors disabled:opacity-50"
                      title="Bỏ gán"
                    >
                      {removingId === kw.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Assign modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] w-full max-w-lg mx-4 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <h3 className="font-medium text-[var(--text-primary)]">Thêm từ khóa vào cluster</h3>
              <button onClick={() => { setShowModal(false); setSelected(new Set()); }}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto">
              {isLoadingUnassigned ? (
                <div className="flex items-center justify-center py-8 text-sm text-[var(--text-muted)]">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang tải...
                </div>
              ) : unassigned.length === 0 ? (
                <p className="text-center text-sm text-[var(--text-muted)] py-8">
                  Tất cả từ khóa đã được gán vào cluster
                </p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase text-[var(--text-muted)]">
                      <th className="pb-2 text-left w-8"></th>
                      <th className="pb-2 text-left font-medium">Từ khóa</th>
                      <th className="pb-2 text-right font-medium">Vị trí</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassigned.map((kw) => (
                      <tr key={kw.id}
                        onClick={() => toggleSelect(kw.id)}
                        className="border-b border-[var(--border)] hover:bg-[var(--bg-accent)] cursor-pointer transition-colors">
                        <td className="py-2 pr-2">
                          <input type="checkbox" readOnly checked={selected.has(kw.id)}
                            className="w-3.5 h-3.5 accent-blue-600" />
                        </td>
                        <td className="py-2 text-[var(--text-primary)]">{kw.keyword}</td>
                        <td className="py-2 text-right text-[var(--text-secondary)]">
                          {kw.current_position ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
              <span className="text-sm text-[var(--text-muted)]">
                {selected.size > 0 ? `Đã chọn ${selected.size} từ khóa` : 'Chọn từ khóa để gán'}
              </span>
              <div className="flex gap-2">
                <button onClick={() => { setShowModal(false); setSelected(new Set()); }}
                  className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  Hủy
                </button>
                <button onClick={handleAssign} disabled={selected.size === 0 || isAssigning}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {isAssigning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Gán ({selected.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
