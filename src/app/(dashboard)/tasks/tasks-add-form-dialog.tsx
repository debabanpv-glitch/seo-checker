'use client';

import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { Project } from '@/types';
import { cn } from '@/lib/utils';

export const CATEGORIES = [
  { value: 'content', label: 'Content', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'technical', label: 'Technical SEO', color: 'bg-orange-500/20 text-orange-400' },
  { value: 'linkbuilding', label: 'Link Building', color: 'bg-green-500/20 text-green-400' },
  { value: 'onpage', label: 'On-page', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'audit', label: 'Audit', color: 'bg-yellow-500/20 text-yellow-400' },
];

export const PRIORITIES = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500/20 text-red-400' },
  { value: 'high', label: 'High', color: 'bg-orange-500/20 text-orange-400' },
  { value: 'medium', label: 'Medium', color: 'bg-secondary text-[#8888a0]' },
  { value: 'low', label: 'Low', color: 'bg-secondary text-[#8888a0]/60' },
];

interface TasksAddFormDialogProps {
  projects: Project[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TasksAddFormDialog({ projects, onSuccess, onCancel }: TasksAddFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    category: '',
    priority: 'medium',
    project_id: '',
    pic: '',
    deadline: '',
    estimated_hours: '',
    note: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Tiêu đề không được để trống');
      return;
    }
    if (!form.project_id) {
      setError('Vui lòng chọn dự án');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        project_id: form.project_id,
        category: form.category || null,
        priority: form.priority || null,
        pic: form.pic || null,
        deadline: form.deadline || null,
        note: form.note || null,
        source: 'manual',
      };
      if (form.estimated_hours) {
        body.estimated_hours = parseFloat(form.estimated_hours);
      }

      const res = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi tạo task');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm focus:outline-none focus:border-accent';
  const labelClass = 'block text-xs text-[#8888a0] mb-1';

  return (
    <div className="bg-card border border-accent/30 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Plus className="w-4 h-4 text-accent" />
          Thêm task mới
        </h3>
        <button
          onClick={onCancel}
          className="text-[#8888a0] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title - full width */}
          <div className="md:col-span-2">
            <label className={labelClass}>Tiêu đề <span className="text-danger">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Nhập tiêu đề task..."
              className={inputClass}
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className={labelClass}>Danh mục</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
            >
              <option value="">-- Chọn danh mục --</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className={labelClass}>Độ ưu tiên</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className={inputClass}
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className={labelClass}>Dự án <span className="text-danger">*</span></label>
            <select
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              className={inputClass}
            >
              <option value="">-- Chọn dự án --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* PIC */}
          <div>
            <label className={labelClass}>Người phụ trách</label>
            <input
              type="text"
              value={form.pic}
              onChange={(e) => setForm({ ...form, pic: e.target.value })}
              placeholder="Tên PIC..."
              className={inputClass}
            />
          </div>

          {/* Deadline */}
          <div>
            <label className={labelClass}>Deadline</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className={inputClass}
            />
          </div>

          {/* Estimated hours */}
          <div>
            <label className={labelClass}>Giờ ước tính</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={form.estimated_hours}
              onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
              placeholder="0"
              className={inputClass}
            />
          </div>

          {/* Note - full width */}
          <div className="md:col-span-2">
            <label className={labelClass}>Ghi chú</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Ghi chú thêm..."
              rows={2}
              className={cn(inputClass, 'resize-none')}
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-danger">{error}</p>
        )}

        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[#8888a0] hover:text-[var(--text-primary)] transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Thêm task
          </button>
        </div>
      </form>
    </div>
  );
}
