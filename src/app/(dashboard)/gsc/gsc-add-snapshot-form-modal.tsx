'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Project } from '@/types';

export function AddSnapshotModal({
  projects,
  defaultProjectId,
  onClose,
  onSaved,
}: {
  projects: Project[];
  defaultProjectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    project_slug: projects.find((p) => p.id === defaultProjectId)?.slug || projects[0]?.slug || '',
    date: new Date().toISOString().split('T')[0],
    clicks: '',
    impressions: '',
    ctr: '',
    position: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_slug || !form.date) { setError('Vui lòng điền đầy đủ.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/v1/gsc/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_slug: form.project_slug,
          date: form.date,
          period: 'weekly',
          clicks: parseInt(form.clicks) || 0,
          impressions: parseInt(form.impressions) || 0,
          ctr: parseFloat(form.ctr) || 0,
          position: parseFloat(form.position) || 0,
        }),
      });
      if (res.ok) { onSaved(); } else {
        const data = await res.json();
        setError(data.error || 'Lưu thất bại.');
      }
    } catch {
      setError('Có lỗi xảy ra.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Thêm GSC Snapshot</h2>
          <button onClick={onClose} className="p-1 text-[#8888a0] hover:text-[var(--text-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-[#8888a0] mb-1">Dự án *</label>
            <select
              value={form.project_slug}
              onChange={(e) => setForm({ ...form, project_slug: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
              required
            >
              {projects.map((p) => (
                <option key={p.id} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#8888a0] mb-1">Ngày *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#8888a0] mb-1">Clicks</label>
              <input type="number" value={form.clicks} onChange={(e) => setForm({ ...form, clicks: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1">Impressions</label>
              <input type="number" value={form.impressions} onChange={(e) => setForm({ ...form, impressions: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1">CTR (0-1)</label>
              <input type="number" step="0.001" value={form.ctr} onChange={(e) => setForm({ ...form, ctr: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm" placeholder="0.035" />
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1">Vị trí TB</label>
              <input type="number" step="0.1" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm" placeholder="15.2" />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 bg-secondary hover:bg-border rounded-lg text-[var(--text-primary)] text-sm font-medium transition-colors">
              Hủy
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors">
              {saving ? 'Đang lưu...' : 'Lưu snapshot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
