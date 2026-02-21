'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileBarChart,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Send,
  FileEdit,
  CheckCircle,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Project } from '@/types';
import { cn } from '@/lib/utils';

interface MonthlyReport {
  id: string;
  project_id: string;
  month: number;
  year: number;
  status: 'draft' | 'generated' | 'sent';
  highlights?: string;
  next_month_plan?: string;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG = {
  draft: { label: 'Nháp', color: 'bg-gray-500/20 text-gray-400', icon: FileEdit },
  generated: { label: 'Đã tạo', color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle },
  sent: { label: 'Đã gửi', color: 'bg-green-500/20 text-green-400', icon: Send },
};

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const YEARS = [2024, 2025, 2026, 2027];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function MonthlyReportsManager() {
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(console.error);
  }, []);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProjectId) params.set('project_id', selectedProjectId);
      const res = await fetch(`/api/v1/reports?${params}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleStatusUpdate = async (report: MonthlyReport, newStatus: MonthlyReport['status']) => {
    setUpdatingId(report.id);
    try {
      const res = await fetch(`/api/v1/reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r.id === report.id ? { ...r, status: newStatus } : r))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getProjectName = (projectId: string) =>
    projects.find((p) => p.id === projectId)?.name || projectId;

  const nextStatus: Record<MonthlyReport['status'], MonthlyReport['status'] | null> = {
    draft: 'generated',
    generated: 'sent',
    sent: null,
  };

  const nextStatusLabel: Record<MonthlyReport['status'], string> = {
    draft: 'Đánh dấu đã tạo',
    generated: 'Đánh dấu đã gửi',
    sent: '',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Báo cáo tháng</h1>
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
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Tạo báo cáo
          </button>
        </div>
      </div>

      {/* Report List */}
      {isLoading ? (
        <PageLoading />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileBarChart}
          title="Chưa có báo cáo nào"
          description="Tạo báo cáo tháng đầu tiên để theo dõi hiệu suất dự án"
          action={
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Tạo báo cáo
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const isExpanded = expandedIds.has(report.id);
            const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.draft;
            const StatusIcon = statusCfg.icon;
            const next = nextStatus[report.status];

            return (
              <div
                key={report.id}
                className="bg-card border border-border rounded-xl overflow-hidden hover:border-accent/30 transition-colors"
              >
                {/* Card Header */}
                <button
                  onClick={() => toggleExpand(report.id)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      Tháng {report.month}/{report.year}
                    </span>
                    <span className="text-xs text-[#8888a0]">{getProjectName(report.project_id)}</span>
                    <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium', statusCfg.color)}>
                      <StatusIcon className="w-3 h-3" />
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="flex items-center gap-1 text-xs text-[#8888a0]">
                      <Clock className="w-3 h-3" />
                      {formatDate(report.created_at)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#8888a0]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#8888a0]" />
                    )}
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border space-y-3 pt-3">
                    {report.highlights && (
                      <div>
                        <p className="text-xs font-medium text-[#8888a0] mb-1">Điểm nổi bật</p>
                        <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                          {report.highlights}
                        </p>
                      </div>
                    )}
                    {report.next_month_plan && (
                      <div>
                        <p className="text-xs font-medium text-[#8888a0] mb-1">Kế hoạch tháng tới</p>
                        <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                          {report.next_month_plan}
                        </p>
                      </div>
                    )}
                    {!report.highlights && !report.next_month_plan && (
                      <p className="text-xs text-[#8888a0] italic">Chưa có nội dung chi tiết.</p>
                    )}
                    {next && (
                      <button
                        onClick={() => handleStatusUpdate(report, next)}
                        disabled={updatingId === report.id}
                        className="px-3 py-1.5 bg-secondary hover:bg-border border border-border rounded-lg text-[var(--text-primary)] text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {updatingId === report.id ? 'Đang cập nhật...' : nextStatusLabel[report.status]}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateReportModal
          projects={projects}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            fetchReports();
          }}
        />
      )}
    </div>
  );
}

function CreateReportModal({
  projects,
  onClose,
  onSaved,
}: {
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const now = new Date();
  const [form, setForm] = useState({
    project_id: projects[0]?.id || '',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    highlights: '',
    next_month_plan: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id) { setError('Vui lòng chọn dự án.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/v1/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: form.project_id,
          month: form.month,
          year: form.year,
          status: 'draft',
          highlights: form.highlights || undefined,
          next_month_plan: form.next_month_plan || undefined,
        }),
      });
      if (res.ok) {
        onSaved();
      } else {
        const data = await res.json();
        setError(data.error || 'Lưu thất bại.');
      }
    } catch (err) {
      console.error('Failed to create report:', err);
      setError('Có lỗi xảy ra.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Tạo báo cáo tháng</h2>
          <button onClick={onClose} className="p-1 text-[#8888a0] hover:text-[var(--text-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#8888a0] mb-1.5">Dự án *</label>
            <select
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
              required
            >
              <option value="">Chọn dự án</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#8888a0] mb-1.5">Tháng *</label>
              <select
                value={form.month}
                onChange={(e) => setForm({ ...form, month: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1.5">Năm *</label>
              <select
                value={form.year}
                onChange={(e) => setForm({ ...form, year: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#8888a0] mb-1.5">Điểm nổi bật</label>
            <textarea
              value={form.highlights}
              onChange={(e) => setForm({ ...form, highlights: e.target.value })}
              rows={3}
              placeholder="Những kết quả nổi bật trong tháng..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-[#8888a0] mb-1.5">Kế hoạch tháng tới</label>
            <textarea
              value={form.next_month_plan}
              onChange={(e) => setForm({ ...form, next_month_plan: e.target.value })}
              rows={3}
              placeholder="Kế hoạch dự kiến cho tháng tiếp theo..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
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
              {saving ? 'Đang lưu...' : 'Tạo báo cáo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
