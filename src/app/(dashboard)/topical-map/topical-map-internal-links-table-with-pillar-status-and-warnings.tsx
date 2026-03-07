'use client';

import { useState } from 'react';
import { Plus, Check, X, Loader2, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageRow {
  id: string;
  url: string;
  title: string | null;
  role: 'pillar' | 'supporting' | 'related';
  links_to_pillar: boolean;
  pillar_links_to_page: boolean;
  notes: string | null;
}

interface Props {
  clusterId: string;
  pages: PageRow[];
  pillarUrl: string | null;
  onRefresh: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  pillar: 'Pillar',
  supporting: 'Supporting',
  related: 'Related',
};

const ROLE_COLORS: Record<string, string> = {
  pillar: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  supporting: 'bg-[var(--bg-accent)] text-[var(--text-secondary)] border-[var(--border)]',
  related: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

function LinkStatus({ ok }: { ok: boolean }) {
  return ok
    ? <Check className="w-4 h-4 text-emerald-400 mx-auto" />
    : <X className="w-4 h-4 text-red-400 mx-auto" />;
}

interface EditState {
  url: string;
  title: string;
  role: 'pillar' | 'supporting' | 'related';
  links_to_pillar: boolean;
  pillar_links_to_page: boolean;
  notes: string;
}

export function TopicalMapInternalLinks({ clusterId, pages, pillarUrl, onRefresh }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<EditState>({
    url: '', title: '', role: 'supporting', links_to_pillar: false, pillar_links_to_page: false, notes: '',
  });
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditState>({
    url: '', title: '', role: 'supporting', links_to_pillar: false, pillar_links_to_page: false, notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Warnings
  const missingLinksFromPage = pages.filter((p) => p.role !== 'pillar' && !p.links_to_pillar).length;
  const missingLinksFromPillar = pages.filter((p) => p.role !== 'pillar' && !p.pillar_links_to_page).length;

  const handleAdd = async () => {
    if (!addForm.url.trim()) return;
    setIsAdding(true);
    try {
      await fetch('/api/v1/topic-clusters/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: clusterId, ...addForm, title: addForm.title || null, notes: addForm.notes || null }),
      });
      setAddForm({ url: '', title: '', role: 'supporting', links_to_pillar: false, pillar_links_to_page: false, notes: '' });
      setShowAddForm(false);
      onRefresh();
    } catch (e) {
      console.error('Failed to add page:', e);
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (page: PageRow) => {
    setEditingId(page.id);
    setEditForm({
      url: page.url,
      title: page.title || '',
      role: page.role,
      links_to_pillar: page.links_to_pillar,
      pillar_links_to_page: page.pillar_links_to_page,
      notes: page.notes || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setIsSaving(true);
    try {
      await fetch('/api/v1/topic-clusters/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...editForm, title: editForm.title || null, notes: editForm.notes || null }),
      });
      setEditingId(null);
      onRefresh();
    } catch (e) {
      console.error('Failed to save page:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa bài viết này khỏi cluster?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/v1/topic-clusters/pages?id=${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (e) {
      console.error('Failed to delete page:', e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Warning banners */}
      {missingLinksFromPage > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{missingLinksFromPage} bài chưa link về pillar</span>
        </div>
      )}
      {missingLinksFromPillar > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm text-orange-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Pillar chưa link tới {missingLinksFromPillar} bài</span>
        </div>
      )}

      {/* Table card */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div>
            <span className="text-sm font-medium text-[var(--text-primary)]">Bài viết & Liên kết nội bộ</span>
            {pillarUrl && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Pillar: <a href={pillarUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{pillarUrl}</a>
              </p>
            )}
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm bài viết
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-accent)] space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input type="url" placeholder="URL bài viết *" value={addForm.url}
                onChange={(e) => setAddForm((p) => ({ ...p, url: e.target.value }))}
                className="px-3 py-1.5 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
              <input type="text" placeholder="Tiêu đề (tùy chọn)" value={addForm.title}
                onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))}
                className="px-3 py-1.5 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select value={addForm.role} onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value as PageRow['role'] }))}
                className="px-3 py-1.5 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]">
                <option value="pillar">Pillar</option>
                <option value="supporting">Supporting</option>
                <option value="related">Related</option>
              </select>
              <label className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={addForm.links_to_pillar}
                  onChange={(e) => setAddForm((p) => ({ ...p, links_to_pillar: e.target.checked }))}
                  className="w-3.5 h-3.5 accent-blue-600" />
                Link → Pillar
              </label>
              <label className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={addForm.pillar_links_to_page}
                  onChange={(e) => setAddForm((p) => ({ ...p, pillar_links_to_page: e.target.checked }))}
                  className="w-3.5 h-3.5 accent-blue-600" />
                Pillar → Link
              </label>
              <input type="text" placeholder="Ghi chú" value={addForm.notes}
                onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))}
                className="flex-1 min-w-[120px] px-3 py-1.5 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={isAdding || !addForm.url.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {isAdding && <Loader2 className="w-3 h-3 animate-spin" />}
                Thêm
              </button>
              <button onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                Hủy
              </button>
            </div>
          </div>
        )}

        {pages.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--text-muted)]">
            Chưa có bài viết nào. Nhấn "Thêm bài viết" để bắt đầu.
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] bg-[var(--bg-accent)]">
                <th className="px-4 py-2 text-left font-medium">URL / Tiêu đề</th>
                <th className="px-4 py-2 text-left font-medium">Vai trò</th>
                <th className="px-4 py-2 text-center font-medium">→ Pillar</th>
                <th className="px-4 py-2 text-center font-medium">Pillar →</th>
                <th className="px-4 py-2 text-left font-medium">Ghi chú</th>
                <th className="px-4 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const isEditing = editingId === page.id;
                return (
                  <tr key={page.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-accent)] transition-colors">
                    {isEditing ? (
                      <>
                        <td className="px-4 py-2" colSpan={5}>
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <input type="url" value={editForm.url}
                                onChange={(e) => setEditForm((p) => ({ ...p, url: e.target.value }))}
                                className="px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded text-[var(--text-primary)]" />
                              <input type="text" placeholder="Tiêu đề" value={editForm.title}
                                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                                className="px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded text-[var(--text-primary)]" />
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <select value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as PageRow['role'] }))}
                                className="px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded text-[var(--text-primary)]">
                                <option value="pillar">Pillar</option>
                                <option value="supporting">Supporting</option>
                                <option value="related">Related</option>
                              </select>
                              <label className="flex items-center gap-1 text-xs text-[var(--text-secondary)] cursor-pointer">
                                <input type="checkbox" checked={editForm.links_to_pillar}
                                  onChange={(e) => setEditForm((p) => ({ ...p, links_to_pillar: e.target.checked }))}
                                  className="w-3 h-3 accent-blue-600" />
                                → Pillar
                              </label>
                              <label className="flex items-center gap-1 text-xs text-[var(--text-secondary)] cursor-pointer">
                                <input type="checkbox" checked={editForm.pillar_links_to_page}
                                  onChange={(e) => setEditForm((p) => ({ ...p, pillar_links_to_page: e.target.checked }))}
                                  className="w-3 h-3 accent-blue-600" />
                                Pillar →
                              </label>
                              <input type="text" placeholder="Ghi chú" value={editForm.notes}
                                onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                                className="flex-1 min-w-[100px] px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded text-[var(--text-primary)]" />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={handleSaveEdit} disabled={isSaving}
                              className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded">
                              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 max-w-[220px]">
                          <a href={page.url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-xs truncate block">
                            {page.url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                          </a>
                          {page.title && <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{page.title}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium border', ROLE_COLORS[page.role])}>
                            {ROLE_LABELS[page.role]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <LinkStatus ok={page.links_to_pillar} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <LinkStatus ok={page.pillar_links_to_page} />
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)] max-w-[160px] truncate">
                          {page.notes || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => startEdit(page)}
                              className="p-1 text-[var(--text-muted)] hover:text-blue-400 rounded transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(page.id)} disabled={deletingId === page.id}
                              className="p-1 text-[var(--text-muted)] hover:text-red-400 rounded transition-colors disabled:opacity-50">
                              {deletingId === page.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
