'use client';

import { useState } from 'react';
import { Plus, Check, X, Loader2, AlertTriangle, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageRow {
  id: string;
  url: string;
  title: string | null;
  role: 'pillar' | 'supporting' | 'related';
  links_to_pillar: boolean;
  pillar_links_to_page: boolean;
  anchor_to_pillar: string;
  anchor_from_pillar: string;
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
  anchor_to_pillar: string;
  anchor_from_pillar: string;
  notes: string;
}

// ── Inline anchor edit cell ───────────────────────────────────────────────────

interface AnchorCellProps {
  pageId: string;
  value: string;
  field: 'anchor_to_pillar' | 'anchor_from_pillar';
  onSaved: () => void;
}

function AnchorCell({ pageId, value, field, onSaved }: AnchorCellProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/v1/topic-clusters/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pageId, [field]: text }),
      });
      setEditing(false);
      onSaved();
    } catch (e) {
      console.error('Failed to save anchor:', e);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') { setEditing(false); setText(value); }
          }}
          placeholder="Nhập anchor text..."
          className="flex-1 px-2 py-0.5 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded text-[var(--text-primary)] min-w-[80px]"
        />
        <button onClick={handleSave} disabled={saving}
          className="p-0.5 text-emerald-500 hover:bg-emerald-500/10 rounded shrink-0">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </button>
        <button onClick={() => { setEditing(false); setText(value); }}
          className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded shrink-0">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setText(value); setEditing(true); }}
      className="group flex items-center gap-1 text-left w-full"
    >
      {value ? (
        <span className="text-xs text-[var(--text-primary)] bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 truncate max-w-[120px]">
          {value}
        </span>
      ) : (
        <span className="text-xs text-[var(--text-muted)] italic group-hover:text-blue-400 transition-colors">
          + Thêm anchor
        </span>
      )}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function TopicalMapInternalLinks({ clusterId, pages, pillarUrl, onRefresh }: Props) {
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [checkResult, setCheckResult] = useState<{ total: number; withLinkToPillar: number; withLinkFromPillar: number; bidirectional: number } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<EditState>({
    url: '', title: '', role: 'supporting',
    links_to_pillar: false, pillar_links_to_page: false,
    anchor_to_pillar: '', anchor_from_pillar: '',
    notes: '',
  });
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditState>({
    url: '', title: '', role: 'supporting',
    links_to_pillar: false, pillar_links_to_page: false,
    anchor_to_pillar: '', anchor_from_pillar: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Auto-check internal links by crawling pages
  const handleCheckLinks = async () => {
    setIsCheckingLinks(true);
    setCheckResult(null);
    try {
      const res = await fetch(`/api/v1/topic-clusters/pages?clusterId=${clusterId}&action=check-links`);
      const data = await res.json();
      setCheckResult(data.summary);
      onRefresh(); // Reload pages with updated link status
    } catch (e) {
      console.error('Failed to check links:', e);
    } finally {
      setIsCheckingLinks(false);
    }
  };

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
        body: JSON.stringify({
          cluster_id: clusterId,
          ...addForm,
          title: addForm.title || null,
          notes: addForm.notes || null,
        }),
      });
      setAddForm({
        url: '', title: '', role: 'supporting',
        links_to_pillar: false, pillar_links_to_page: false,
        anchor_to_pillar: '', anchor_from_pillar: '',
        notes: '',
      });
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
      anchor_to_pillar: page.anchor_to_pillar || '',
      anchor_from_pillar: page.anchor_from_pillar || '',
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
        body: JSON.stringify({
          id: editingId,
          ...editForm,
          title: editForm.title || null,
          notes: editForm.notes || null,
        }),
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
                Pillar: <a href={pillarUrl} target="_blank" rel="noopener noreferrer"
                  className="text-blue-500 hover:underline">{pillarUrl}</a>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pages.length > 0 && pillarUrl && (
              <button
                onClick={handleCheckLinks}
                disabled={isCheckingLinks}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {isCheckingLinks ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {isCheckingLinks ? 'Đang kiểm tra...' : 'Kiểm tra links'}
              </button>
            )}
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm bài viết
            </button>
          </div>
        </div>

        {/* Check result banner */}
        {checkResult && (
          <div className="px-4 py-2 border-b border-[var(--border)] bg-emerald-500/5 text-xs flex items-center gap-4">
            <span className="font-medium text-emerald-600">Kết quả kiểm tra:</span>
            <span>{checkResult.withLinkToPillar}/{checkResult.total - 1} bài link → Pillar</span>
            <span>{checkResult.withLinkFromPillar}/{checkResult.total - 1} bài Pillar link →</span>
            <span className="font-medium">{checkResult.bidirectional} liên kết 2 chiều</span>
          </div>
        )}

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
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Anchor → Pillar (tùy chọn)" value={addForm.anchor_to_pillar}
                onChange={(e) => setAddForm((p) => ({ ...p, anchor_to_pillar: e.target.value }))}
                className="px-3 py-1.5 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
              <input type="text" placeholder="Anchor Pillar → (tùy chọn)" value={addForm.anchor_from_pillar}
                onChange={(e) => setAddForm((p) => ({ ...p, anchor_from_pillar: e.target.value }))}
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
            Chưa có bài viết nào. Nhấn &quot;Thêm bài viết&quot; để bắt đầu.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {/* ── Tầng 1: Pillar (Danh mục) ── */}
            {(() => {
              const pillarPages = pages.filter(p => p.role === 'pillar');
              const supportingPages = pages.filter(p => p.role === 'supporting');
              const relatedPages = pages.filter(p => p.role === 'related');

              return (
                <>
                  {/* PILLAR */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🏠</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Tầng 1 — Pillar (Danh mục)</span>
                      <span className="text-xs text-[var(--text-muted)]">{pillarPages.length} trang</span>
                    </div>
                    {pillarPages.length === 0 ? (
                      <div className="text-xs text-[var(--text-muted)] italic pl-8">Chưa có Pillar — cần set trang danh mục làm Pillar</div>
                    ) : (
                      <div className="space-y-2 pl-8">
                        {pillarPages.map(page => (
                          <div key={page.id} className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <a href={page.url} target="_blank" rel="noopener noreferrer"
                                className="text-blue-500 hover:underline text-sm font-medium truncate block">
                                {page.title || page.url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                              </a>
                              <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">{page.url}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => startEdit(page)} className="p-1 text-[var(--text-muted)] hover:text-blue-400 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDelete(page.id)} disabled={deletingId === page.id} className="p-1 text-[var(--text-muted)] hover:text-red-400 rounded">
                                {deletingId === page.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SUPPORTING */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">📦</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Tầng 2 — Supporting (Sản phẩm/Bài chính)</span>
                      <span className="text-xs text-[var(--text-muted)]">{supportingPages.length} trang</span>
                      {supportingPages.length > 0 && (
                        <span className="text-xs text-emerald-500 ml-auto">
                          {supportingPages.filter(p => p.links_to_pillar).length}/{supportingPages.length} link → Pillar
                        </span>
                      )}
                    </div>
                    {supportingPages.length === 0 ? (
                      <div className="text-xs text-[var(--text-muted)] italic pl-8">Chưa có trang Supporting</div>
                    ) : (
                      <div className="pl-8">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-[10px] uppercase text-[var(--text-muted)]">
                              <th className="text-left py-1 font-medium">URL / Tiêu đề</th>
                              <th className="text-center py-1 font-medium w-16">→ Pillar</th>
                              <th className="text-center py-1 font-medium w-16">Pillar →</th>
                              <th className="text-left py-1 font-medium w-36">Anchor</th>
                              <th className="text-right py-1 font-medium w-12"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {supportingPages.map(page => (
                              <tr key={page.id} className="border-t border-[var(--border)]/50 hover:bg-[var(--bg-accent)] transition-colors">
                                <td className="py-2 pr-2 max-w-[200px]">
                                  <a href={page.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs truncate block">
                                    {page.title || page.url.replace(/^https?:\/\/[^/]+/, '')}
                                  </a>
                                </td>
                                <td className="py-2 text-center"><LinkStatus ok={page.links_to_pillar} /></td>
                                <td className="py-2 text-center"><LinkStatus ok={page.pillar_links_to_page} /></td>
                                <td className="py-2 max-w-[140px]">
                                  <AnchorCell pageId={page.id} value={page.anchor_to_pillar || ''} field="anchor_to_pillar" onSaved={onRefresh} />
                                </td>
                                <td className="py-2 text-right">
                                  <div className="flex items-center justify-end gap-0.5">
                                    <button onClick={() => startEdit(page)} className="p-0.5 text-[var(--text-muted)] hover:text-blue-400 rounded"><Edit2 className="w-3 h-3" /></button>
                                    <button onClick={() => handleDelete(page.id)} disabled={deletingId === page.id} className="p-0.5 text-[var(--text-muted)] hover:text-red-400 rounded">
                                      {deletingId === page.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* RELATED */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">📝</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Tầng 3 — Related (Blog/Hướng dẫn)</span>
                      <span className="text-xs text-[var(--text-muted)]">{relatedPages.length} trang</span>
                      {relatedPages.length > 0 && (
                        <span className="text-xs text-emerald-500 ml-auto">
                          {relatedPages.filter(p => p.links_to_pillar).length}/{relatedPages.length} link → Pillar
                        </span>
                      )}
                    </div>
                    {relatedPages.length === 0 ? (
                      <div className="text-xs text-[var(--text-muted)] italic pl-8">Chưa có trang Related (blog, hướng dẫn)</div>
                    ) : (
                      <div className="pl-8">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-[10px] uppercase text-[var(--text-muted)]">
                              <th className="text-left py-1 font-medium">URL / Tiêu đề</th>
                              <th className="text-center py-1 font-medium w-16">→ Pillar</th>
                              <th className="text-center py-1 font-medium w-16">Pillar →</th>
                              <th className="text-left py-1 font-medium w-36">Anchor</th>
                              <th className="text-right py-1 font-medium w-12"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {relatedPages.map(page => (
                              <tr key={page.id} className="border-t border-[var(--border)]/50 hover:bg-[var(--bg-accent)] transition-colors">
                                <td className="py-2 pr-2 max-w-[200px]">
                                  <a href={page.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs truncate block">
                                    {page.title || page.url.replace(/^https?:\/\/[^/]+/, '')}
                                  </a>
                                </td>
                                <td className="py-2 text-center"><LinkStatus ok={page.links_to_pillar} /></td>
                                <td className="py-2 text-center"><LinkStatus ok={page.pillar_links_to_page} /></td>
                                <td className="py-2 max-w-[140px]">
                                  <AnchorCell pageId={page.id} value={page.anchor_to_pillar || ''} field="anchor_to_pillar" onSaved={onRefresh} />
                                </td>
                                <td className="py-2 text-right">
                                  <div className="flex items-center justify-end gap-0.5">
                                    <button onClick={() => startEdit(page)} className="p-0.5 text-[var(--text-muted)] hover:text-blue-400 rounded"><Edit2 className="w-3 h-3" /></button>
                                    <button onClick={() => handleDelete(page.id)} disabled={deletingId === page.id} className="p-0.5 text-[var(--text-muted)] hover:text-red-400 rounded">
                                      {deletingId === page.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Edit form overlay */}
                  {editingId && (
                    <div className="p-4 bg-[var(--bg-accent)] border-t border-[var(--border)]">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-[var(--text-primary)]">Chỉnh sửa trang</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="url" value={editForm.url} onChange={(e) => setEditForm((p) => ({ ...p, url: e.target.value }))}
                            className="px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded text-[var(--text-primary)]" placeholder="URL" />
                          <input type="text" value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                            className="px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded text-[var(--text-primary)]" placeholder="Tiêu đề" />
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <select value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as PageRow['role'] }))}
                            className="px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded text-[var(--text-primary)]">
                            <option value="pillar">Pillar</option>
                            <option value="supporting">Supporting</option>
                            <option value="related">Related</option>
                          </select>
                          <input type="text" placeholder="Ghi chú" value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                            className="flex-1 min-w-[100px] px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded text-[var(--text-primary)]" />
                          <button onClick={handleSaveEdit} disabled={isSaving} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                            {isSaving ? 'Đang lưu...' : 'Lưu'}
                          </button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Hủy</button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
