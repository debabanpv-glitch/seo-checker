'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  StickyNote,
  Plus,
  Trash2,
  Tag,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  FolderKanban,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Project } from '@/types';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  title: string;
  content: string;
  project_id?: string;
  tags: string[];
  source?: string;
  created_at: string;
  updated_at: string;
}

const SOURCE_COLORS: Record<string, string> = {
  manual: 'bg-gray-500/20 text-gray-400',
  claude: 'bg-purple-500/20 text-purple-400',
  audit: 'bg-blue-500/20 text-blue-400',
  import: 'bg-yellow-500/20 text-yellow-400',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function ProjectNotesGridWithTagsAndSearch() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/v1/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(console.error);
  }, []);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProjectId) params.set('project_id', selectedProjectId);
      const res = await fetch(`/api/v1/notes?${params}`);
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa ghi chú này?')) return;
    try {
      const res = await fetch(`/api/v1/notes?id=${id}`, { method: 'DELETE' });
      if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId)?.name;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Ghi chú</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm"
          >
            <option value="">Tất cả dự án</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Thêm ghi chú
          </button>
        </div>
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <PageLoading />
      ) : notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="Chưa có ghi chú nào"
          description="Tạo ghi chú đầu tiên để lưu thông tin quan trọng"
          action={
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Thêm ghi chú
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map((note) => {
            const isExpanded = expandedNotes.has(note.id);
            const projectName = getProjectName(note.project_id);
            const sourceColor = SOURCE_COLORS[note.source || 'manual'] || SOURCE_COLORS.manual;
            const contentPreview = note.content?.slice(0, 120);
            const hasMore = (note.content?.length || 0) > 120;

            return (
              <div
                key={note.id}
                className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-accent/30 transition-colors"
              >
                {/* Top: title + delete */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-snug flex-1">
                    {note.title}
                  </h3>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1 text-[#8888a0] hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Content */}
                <p className="text-xs text-[#8888a0] leading-relaxed">
                  {isExpanded ? note.content : contentPreview}
                  {hasMore && !isExpanded && '…'}
                </p>
                {hasMore && (
                  <button
                    onClick={() => toggleExpand(note.id)}
                    className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors self-start"
                  >
                    {isExpanded ? (
                      <><ChevronUp className="w-3 h-3" />Thu gọn</>
                    ) : (
                      <><ChevronDown className="w-3 h-3" />Xem thêm</>
                    )}
                  </button>
                )}

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-accent/10 text-accent rounded text-xs"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer: project + source + date */}
                <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-border">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {projectName && (
                      <span className="flex items-center gap-1 text-xs text-[#8888a0]">
                        <FolderKanban className="w-3 h-3" />
                        {projectName}
                      </span>
                    )}
                    {note.source && (
                      <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', sourceColor)}>
                        {note.source}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-[#8888a0]">
                    <Clock className="w-3 h-3" />
                    {formatDate(note.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Note Modal */}
      {showAddForm && (
        <AddNoteModal
          projects={projects}
          onClose={() => setShowAddForm(false)}
          onSaved={() => {
            setShowAddForm(false);
            fetchNotes();
          }}
        />
      )}
    </div>
  );
}

function AddNoteModal({
  projects,
  onClose,
  onSaved,
}: {
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: '',
    content: '',
    project_id: '',
    source: 'manual',
    tagsInput: '',
  });
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleAddTag = () => {
    const trimmed = form.tagsInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setForm((prev) => ({ ...prev, tagsInput: '' }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/v1/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          project_id: form.project_id || undefined,
          source: form.source,
          tags,
        }),
      });
      if (res.ok) onSaved();
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Thêm ghi chú</h2>
          <button onClick={onClose} className="p-1 text-[#8888a0] hover:text-[var(--text-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-sm text-[#8888a0] mb-1.5">Tiêu đề *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Tiêu đề ghi chú"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[#8888a0] mb-1.5">Nội dung</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={5}
              placeholder="Nội dung ghi chú..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#8888a0] mb-1.5">Dự án</label>
              <select
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
              >
                <option value="">Không chọn</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1.5">Nguồn</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
              >
                <option value="manual">Thủ công</option>
                <option value="claude">Claude</option>
                <option value="audit">Audit</option>
                <option value="import">Import</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#8888a0] mb-1.5">Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.tagsInput}
                onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
                onKeyDown={handleTagKeyDown}
                placeholder="Nhập tag rồi Enter"
                className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 bg-secondary hover:bg-border border border-border rounded-lg text-[var(--text-primary)] text-sm transition-colors"
              >
                Thêm
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded text-xs"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2 sticky bottom-0 bg-card">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-secondary hover:bg-border rounded-lg text-[var(--text-primary)] text-sm font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
