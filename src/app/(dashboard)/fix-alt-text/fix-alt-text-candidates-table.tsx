'use client';

import { useState } from 'react';
import { Check, X, Edit3, Image, FileText } from 'lucide-react';

export interface AltTextCandidate {
  type: 'media' | 'inline';
  mediaId?: number;
  postId?: number;
  postTitle?: string;
  imageUrl: string;
  currentAlt: string;
  suggestedAlt: string;
  source: string;
  selected?: boolean;
}

interface Props {
  candidates: AltTextCandidate[];
  onUpdate: (updated: AltTextCandidate[]) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  caption: 'Caption',
  title: 'Tiêu đề',
  filename: 'Tên file',
  post_context: 'Ngữ cảnh bài viết',
};

export default function FixAltTextCandidatesTable({ candidates, onUpdate }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const toggleAll = (checked: boolean) => {
    onUpdate(candidates.map(c => ({ ...c, selected: checked })));
  };

  const toggleOne = (idx: number) => {
    const updated = [...candidates];
    updated[idx] = { ...updated[idx], selected: !updated[idx].selected };
    onUpdate(updated);
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditValue(candidates[idx].suggestedAlt);
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    const updated = [...candidates];
    updated[editingIdx] = { ...updated[editingIdx], suggestedAlt: editValue };
    onUpdate(updated);
    setEditingIdx(null);
  };

  const allSelected = candidates.every(c => c.selected !== false);
  const selectedCount = candidates.filter(c => c.selected !== false).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-[var(--text-secondary)]">
          Đã chọn <strong>{selectedCount}</strong>/{candidates.length} ảnh
        </span>
        <button
          onClick={() => toggleAll(!allSelected)}
          className="text-xs px-3 py-1 rounded-md bg-[var(--bg-accent)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </button>
      </div>

      {/* Table */}
      <div className="border border-[var(--border-primary)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-accent)] sticky top-0 z-10">
              <tr>
                <th className="w-10 px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={e => toggleAll(e.target.checked)}
                    className="rounded"
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)]">Loại</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)]">Ảnh</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] min-w-[250px]">Alt Text đề xuất</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)]">Nguồn</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c, idx) => (
                <tr
                  key={`${c.type}-${c.mediaId ?? c.postId}-${idx}`}
                  className={`border-t border-[var(--border-primary)] hover:bg-[var(--bg-hover)] transition-colors ${
                    c.selected === false ? 'opacity-40' : ''
                  }`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={c.selected !== false}
                      onChange={() => toggleOne(idx)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {c.type === 'media' ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">
                        <Image className="w-3 h-3" /> Media
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">
                        <FileText className="w-3 h-3" /> Inline
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.imageUrl}
                        alt="preview"
                        className="w-10 h-10 rounded object-cover bg-[var(--bg-accent)] flex-shrink-0"
                        loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs text-[var(--text-secondary)] truncate max-w-[200px]" title={c.imageUrl}>
                          {c.imageUrl.split('/').pop()}
                        </div>
                        {c.postTitle && (
                          <div className="text-xs text-[var(--text-tertiary)] truncate max-w-[200px]">
                            Bài: {c.postTitle}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {editingIdx === idx ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEdit()}
                          className="flex-1 px-2 py-1 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                          autoFocus
                        />
                        <button onClick={saveEdit} className="p-1 text-green-400 hover:text-green-300">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingIdx(null)} className="p-1 text-red-400 hover:text-red-300">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[var(--text-primary)]">{c.suggestedAlt}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {SOURCE_LABELS[c.source] ?? c.source}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {editingIdx !== idx && (
                      <button
                        onClick={() => startEdit(idx)}
                        className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title="Chỉnh sửa"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
