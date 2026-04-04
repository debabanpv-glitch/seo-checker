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
          <div className="p-4">
            {(() => {
              const pillarPages = pages.filter(p => p.role === 'pillar');
              const supportingPages = pages.filter(p => p.role === 'supporting');
              const relatedPages = pages.filter(p => p.role === 'related');

              // Shared page row renderer
              const PageItem = ({ page, indent = 0 }: { page: PageRow; indent?: number }) => (
                <div className="flex items-center gap-2 group" style={{ paddingLeft: `${indent * 24}px` }}>
                  {/* Connector line */}
                  {indent > 0 && <span className="text-[var(--border)] text-xs select-none">└─</span>}
                  {/* Link status dots */}
                  <span title={page.links_to_pillar ? '→ Pillar ✓' : '→ Pillar ✗'}>
                    {page.links_to_pillar ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-red-400/50" />}
                  </span>
                  <span title={page.pillar_links_to_page ? 'Pillar → ✓' : 'Pillar → ✗'}>
                    {page.pillar_links_to_page ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-red-400/50" />}
                  </span>
                  {/* URL */}
                  <a href={page.url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-xs truncate flex-1 min-w-0">
                    {page.title || page.url.replace(/^https?:\/\/[^/]+/, '')}
                  </a>
                  {/* Anchor badge */}
                  {page.anchor_to_pillar && (
                    <span className="text-[9px] text-[var(--text-muted)] bg-[var(--bg-accent)] px-1.5 py-0.5 rounded truncate max-w-[100px] shrink-0" title={`Anchor: ${page.anchor_to_pillar}`}>
                      {page.anchor_to_pillar}
                    </span>
                  )}
                  {/* Actions (show on hover) */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                    <button onClick={() => startEdit(page)} className="p-0.5 text-[var(--text-muted)] hover:text-blue-400 rounded"><Edit2 className="w-3 h-3" /></button>
                    <button onClick={() => handleDelete(page.id)} disabled={deletingId === page.id} className="p-0.5 text-[var(--text-muted)] hover:text-red-400 rounded">
                      {deletingId === page.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              );

              return (
                <div className="space-y-1">
                  {/* ── PILLAR — top of pyramid ── */}
                  {pillarPages.map(page => (
                    <div key={page.id} className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2.5 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🏠</span>
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border', ROLE_COLORS.pillar)}>Pillar</span>
                        <a href={page.url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-sm font-medium truncate flex-1 min-w-0">
                          {page.title || page.url.replace(/^https?:\/\/[^/]+/, '')}
                        </a>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => startEdit(page)} className="p-0.5 text-[var(--text-muted)] hover:text-blue-400 rounded"><Edit2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] truncate mt-1 pl-7">{page.url}</p>
                    </div>
                  ))}

                  {pillarPages.length === 0 && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2.5 mb-2 text-xs text-red-400">
                      ⚠️ Chưa có Pillar — cần set trang danh mục làm Pillar
                    </div>
                  )}

                  {/* ── SUPPORTING — level 2, connected to pillar ── */}
                  {supportingPages.length > 0 && (
                    <div className="ml-4 border-l-2 border-blue-500/20 pl-2 space-y-1.5 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs">📦</span>
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                          Supporting ({supportingPages.length})
                        </span>
                        <span className="text-[10px] text-emerald-500">
                          {supportingPages.filter(p => p.links_to_pillar).length}/{supportingPages.length} ↔ Pillar
                        </span>
                      </div>
                      {supportingPages.map(page => (
                        <PageItem key={page.id} page={page} indent={1} />
                      ))}
                    </div>
                  )}

                  {/* ── RELATED — level 3, connected to pillar ── */}
                  {relatedPages.length > 0 && (
                    <div className="ml-4 border-l-2 border-amber-500/20 pl-2 space-y-1.5 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs">📝</span>
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                          Related ({relatedPages.length})
                        </span>
                        <span className="text-[10px] text-emerald-500">
                          {relatedPages.filter(p => p.links_to_pillar).length}/{relatedPages.length} ↔ Pillar
                        </span>
                      </div>
                      {relatedPages.map(page => (
                        <PageItem key={page.id} page={page} indent={1} />
                      ))}
                    </div>
                  )}

                  {/* Edit form overlay */}
                  {editingId && (
                    <div className="mt-3 p-3 bg-[var(--bg-accent)] border border-[var(--border)] rounded-lg space-y-2">
                      <p className="text-xs font-medium text-[var(--text-primary)]">Chỉnh sửa</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="url" value={editForm.url} onChange={(e) => setEditForm((p) => ({ ...p, url: e.target.value }))}
                          className="px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded text-[var(--text-primary)]" placeholder="URL" />
                        <input type="text" value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                          className="px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded text-[var(--text-primary)]" placeholder="Tiêu đề" />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <select value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as PageRow['role'] }))}
                          className="px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded text-[var(--text-primary)]">
                          <option value="pillar">Pillar</option>
                          <option value="supporting">Supporting</option>
                          <option value="related">Related</option>
                        </select>
                        <button onClick={handleSaveEdit} disabled={isSaving} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                          {isSaving ? 'Lưu...' : 'Lưu'}
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs text-[var(--text-muted)]">Hủy</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
