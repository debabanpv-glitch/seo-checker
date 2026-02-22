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
  Wand2,
  Loader2,
  BarChart3,
  Target,
  TrendingUp,
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
  technical_data?: {
    seoScore?: number;
    totalUrls?: number;
    contentScore?: number;
    technicalScore?: number;
    imagesScore?: number;
    linksScore?: number;
    eeatScore?: number;
    aiReadinessScore?: number;
  };
  content_data?: {
    totalPhases?: number;
    totalActions?: number;
    doneActions?: number;
    doingActions?: number;
    blockedActions?: number;
    todoActions?: number;
  };
  traffic_data?: {
    clicks?: number;
    impressions?: number;
    ctr?: number;
    avgPosition?: number;
    date?: string;
    clicksDelta?: number;
    impressionsDelta?: number;
    ctrDelta?: number;
    positionDelta?: number;
  };
  keyword_data?: {
    total?: number;
    top3?: number;
    top10?: number;
    top20?: number;
    top30?: number;
    date?: string;
    summary?: {
      top3Change?: number;
      top10Change?: number;
      top20Change?: number;
      top30Change?: number;
      totalChange?: number;
    };
  };
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
  const [sendingTelegramId, setSendingTelegramId] = useState<string | null>(null);
  const [telegramFeedback, setTelegramFeedback] = useState<{ id: string; success: boolean; message: string } | null>(null);

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

  const handleSendTelegram = async (reportId: string) => {
    setSendingTelegramId(reportId);
    setTelegramFeedback(null);
    try {
      const res = await fetch('/api/v1/reports/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId }),
      });
      const data = await res.json();
      if (res.ok) {
        setTelegramFeedback({ id: reportId, success: true, message: 'Đã gửi Telegram thành công!' });
      } else {
        setTelegramFeedback({ id: reportId, success: false, message: data.error || 'Gửi Telegram thất bại.' });
      }
    } catch {
      setTelegramFeedback({ id: reportId, success: false, message: 'Có lỗi kết nối.' });
    } finally {
      setSendingTelegramId(null);
      setTimeout(() => setTelegramFeedback(null), 4000);
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
                    {/* Score cards row */}
                    {report.technical_data?.seoScore != null && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-[#8888a0] flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" /> SEO Scores
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                          <ScoreCard label="SEO" value={report.technical_data.seoScore} />
                          <ScoreCard label="Content" value={report.technical_data.contentScore} />
                          <ScoreCard label="Technical" value={report.technical_data.technicalScore} />
                          <ScoreCard label="Images" value={report.technical_data.imagesScore} />
                          <ScoreCard label="Links" value={report.technical_data.linksScore} />
                          <ScoreCard label="E-E-A-T" value={report.technical_data.eeatScore} />
                          <ScoreCard label="AI Ready" value={report.technical_data.aiReadinessScore} />
                        </div>
                      </div>
                    )}

                    {/* Strategy progress */}
                    {report.content_data?.totalActions != null && report.content_data.totalActions > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-[#8888a0] flex items-center gap-1">
                          <Target className="w-3 h-3" /> Tiến độ chiến lược
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${Math.round(((report.content_data.doneActions ?? 0) / report.content_data.totalActions) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-[var(--text-primary)] font-medium whitespace-nowrap">
                            {report.content_data.doneActions}/{report.content_data.totalActions} done
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-[10px] text-[#8888a0]">
                          {report.content_data.doingActions ? <span className="text-blue-400">{report.content_data.doingActions} đang làm</span> : null}
                          {report.content_data.blockedActions ? <span className="text-red-400">{report.content_data.blockedActions} bị chặn</span> : null}
                          {report.content_data.todoActions ? <span>{report.content_data.todoActions} chờ làm</span> : null}
                        </div>
                      </div>
                    )}

                    {/* Traffic data */}
                    {report.traffic_data?.clicks != null && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-[#8888a0] flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> Traffic (Google Search Console)
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <MetricCard
                            label="Clicks"
                            value={report.traffic_data.clicks}
                            delta={report.traffic_data.clicksDelta}
                            format="number"
                          />
                          <MetricCard
                            label="Impressions"
                            value={report.traffic_data.impressions}
                            delta={report.traffic_data.impressionsDelta}
                            format="number"
                          />
                          <MetricCard
                            label="CTR (%)"
                            value={report.traffic_data.ctr}
                            delta={report.traffic_data.ctrDelta}
                            format="percent"
                          />
                          <MetricCard
                            label="Avg Position"
                            value={report.traffic_data.avgPosition}
                            delta={report.traffic_data.positionDelta}
                            format="position"
                          />
                        </div>
                      </div>
                    )}

                    {/* Keyword data */}
                    {report.keyword_data?.total != null && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-[#8888a0] flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" /> Keyword Rankings
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <MetricCard
                            label="Total KW"
                            value={report.keyword_data.total}
                            delta={report.keyword_data.summary?.totalChange}
                            format="number"
                          />
                          <MetricCard
                            label="Top 3"
                            value={report.keyword_data.top3}
                            delta={report.keyword_data.summary?.top3Change}
                            format="number"
                          />
                          <MetricCard
                            label="Top 10"
                            value={report.keyword_data.top10}
                            delta={report.keyword_data.summary?.top10Change}
                            format="number"
                          />
                          <MetricCard
                            label="Top 30"
                            value={report.keyword_data.top30}
                            delta={report.keyword_data.summary?.top30Change}
                            format="number"
                          />
                        </div>
                      </div>
                    )}

                    {report.highlights && (
                      <div>
                        <p className="text-xs font-medium text-[#8888a0] mb-1 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> Điểm nổi bật
                        </p>
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
                    {!report.highlights && !report.next_month_plan && !report.technical_data?.seoScore && (
                      <p className="text-xs text-[#8888a0] italic">Chưa có nội dung chi tiết.</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {next && (
                        <button
                          onClick={() => handleStatusUpdate(report, next)}
                          disabled={updatingId === report.id}
                          className="px-3 py-1.5 bg-secondary hover:bg-border border border-border rounded-lg text-[var(--text-primary)] text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {updatingId === report.id ? 'Đang cập nhật...' : nextStatusLabel[report.status]}
                        </button>
                      )}
                      <button
                        onClick={() => handleSendTelegram(report.id)}
                        disabled={sendingTelegramId === report.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 rounded-lg text-blue-400 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {sendingTelegramId === report.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        {sendingTelegramId === report.id ? 'Đang gửi...' : 'Gửi Telegram'}
                      </button>
                      {telegramFeedback?.id === report.id && (
                        <span className={cn('text-xs', telegramFeedback.success ? 'text-green-400' : 'text-red-400')}>
                          {telegramFeedback.message}
                        </span>
                      )}
                    </div>
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

function ScoreCard({ label, value }: { label: string; value?: number }) {
  if (value == null) return null;
  const color = value >= 80 ? 'text-green-400' : value >= 60 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="bg-secondary/50 border border-border rounded-lg px-2.5 py-2 text-center">
      <p className={cn('text-lg font-bold', color)}>{value}</p>
      <p className="text-[10px] text-[#8888a0]">{label}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  delta,
  format = 'number',
}: {
  label: string;
  value?: number;
  delta?: number;
  format?: 'number' | 'percent' | 'position';
}) {
  if (value == null) return null;

  const displayValue =
    format === 'percent'
      ? `${(value * 100).toFixed(1)}%`
      : format === 'position'
      ? value.toFixed(1)
      : value.toLocaleString('vi-VN');

  // For position: lower is better (delta < 0 = green)
  const isPositive = format === 'position' ? (delta ?? 0) < 0 : (delta ?? 0) > 0;
  const isNegative = format === 'position' ? (delta ?? 0) > 0 : (delta ?? 0) < 0;

  const deltaDisplay =
    delta == null || delta === 0
      ? null
      : format === 'percent'
      ? `${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`
      : format === 'position'
      ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`
      : `${delta > 0 ? '+' : ''}${delta.toLocaleString('vi-VN')}`;

  return (
    <div className="bg-secondary/50 border border-border rounded-lg px-2.5 py-2 text-center">
      <p className="text-base font-bold text-[var(--text-primary)]">{displayValue}</p>
      {deltaDisplay && (
        <p
          className={cn(
            'text-[10px] font-medium',
            isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-[#8888a0]'
          )}
        >
          {deltaDisplay}
        </p>
      )}
      <p className="text-[10px] text-[#8888a0] mt-0.5">{label}</p>
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
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleAutoGenerate = async () => {
    if (!form.project_id) { setError('Vui lòng chọn dự án trước.'); return; }
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/v1/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: form.project_id }),
      });
      const data = await res.json();
      if (res.ok) {
        setForm((prev) => ({
          ...prev,
          highlights: data.highlights || prev.highlights,
          next_month_plan: data.next_month_plan || prev.next_month_plan,
        }));
        setGeneratedData({ technical_data: data.technical_data, content_data: data.content_data, traffic_data: data.traffic_data, keyword_data: data.keyword_data });
      } else {
        setError(data.error || 'Tạo tự động thất bại.');
      }
    } catch {
      setError('Có lỗi khi tạo tự động.');
    } finally {
      setGenerating(false);
    }
  };

  const [generatedData, setGeneratedData] = useState<{ technical_data?: unknown; content_data?: unknown; traffic_data?: unknown; keyword_data?: unknown } | null>(null);

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
          status: generatedData ? 'generated' : 'draft',
          highlights: form.highlights || undefined,
          next_month_plan: form.next_month_plan || undefined,
          technical_data: generatedData?.technical_data ?? undefined,
          content_data: generatedData?.content_data ?? undefined,
          traffic_data: generatedData?.traffic_data ?? undefined,
          keyword_data: generatedData?.keyword_data ?? undefined,
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

          {/* Auto-generate button */}
          <button
            type="button"
            onClick={handleAutoGenerate}
            disabled={generating || !form.project_id}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {generating ? 'Đang tổng hợp dữ liệu...' : 'Tự động tạo từ Audit + Strategy'}
          </button>

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
