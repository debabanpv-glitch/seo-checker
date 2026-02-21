'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Project } from '@/types';
import { cn } from '@/lib/utils';

interface AuditSummary {
  total_urls: number;
  status_codes: Record<string, number>;
}

interface AuditResult {
  id: string;
  project_id: string;
  audit_type: string;
  audit_date: string;
  summary: AuditSummary;
  details?: unknown;
  created_at: string;
}

const AUDIT_TYPE_COLORS: Record<string, string> = {
  screaming_frog: 'bg-orange-500/20 text-orange-400',
  manual: 'bg-gray-500/20 text-gray-400',
  sitebulb: 'bg-blue-500/20 text-blue-400',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    return headers.reduce<Record<string, string>>((obj, header, i) => {
      obj[header] = values[i] || '';
      return obj;
    }, {});
  });
}

function buildSummary(rows: Record<string, string>[]): AuditSummary {
  const statusCodes: Record<string, number> = {};
  const statusKey = ['Status Code', 'Status', 'status_code', 'status'].find((k) =>
    rows[0]?.[k] !== undefined
  ) || '';
  rows.forEach((row) => {
    const code = statusKey ? (row[statusKey] || 'unknown') : 'unknown';
    statusCodes[code] = (statusCodes[code] || 0) + 1;
  });
  return { total_urls: rows.length, status_codes: statusCodes };
}

export default function AuditImportUploadAndHistory() {
  const [audits, setAudits] = useState<AuditResult[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProjectId, setUploadProjectId] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/v1/projects')
      .then((r) => r.json())
      .then((d) => {
        const list = d.projects || [];
        setProjects(list);
        if (list.length > 0) setUploadProjectId(list[0].id);
      })
      .catch(console.error);
  }, []);

  const fetchAudits = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProjectId) params.set('project_id', selectedProjectId);
      const res = await fetch(`/api/v1/audit-import?${params}`);
      const data = await res.json();
      setAudits(data.audits || []);
    } catch (err) {
      console.error('Failed to fetch audits:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!uploadProjectId) {
      setUploadError('Vui lòng chọn dự án trước khi upload.');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setUploadError('File CSV rỗng hoặc không đúng định dạng.');
        return;
      }
      const summary = buildSummary(rows);
      const body = {
        project_id: uploadProjectId,
        audit_type: 'screaming_frog',
        audit_date: new Date().toISOString().split('T')[0],
        summary,
        details: rows,
      };
      const res = await fetch('/api/v1/audit-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        fetchAudits();
      } else {
        setUploadError('Upload thất bại. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('Lỗi khi đọc file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getStatusCodeColor = (code: string) => {
    const num = parseInt(code, 10);
    if (num >= 200 && num < 300) return 'text-green-400';
    if (num >= 300 && num < 400) return 'text-yellow-400';
    if (num >= 400) return 'text-red-400';
    return 'text-[#8888a0]';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Audit Import</h1>
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
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Upload CSV mới</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8888a0]">Dự án</label>
            <select
              value={uploadProjectId}
              onChange={(e) => setUploadProjectId(e.target.value)}
              className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
            >
              <option value="">Chọn dự án</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm font-medium cursor-pointer transition-colors',
                uploading
                  ? 'bg-accent/50 cursor-not-allowed'
                  : 'bg-accent hover:bg-accent/90'
              )}
            >
              {uploading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Upload CSV
                </>
              )}
            </label>
          </div>
        </div>
        {uploadError && (
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {uploadError}
          </div>
        )}
        <p className="text-xs text-[#8888a0]">
          Hỗ trợ file CSV từ Screaming Frog. Cột &ldquo;Status Code&rdquo; sẽ được dùng để thống kê.
        </p>
      </div>

      {/* Audit History */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Lịch sử audit</h2>
        {isLoading ? (
          <PageLoading />
        ) : audits.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Chưa có audit nào"
            description="Upload file CSV để bắt đầu lưu lịch sử audit"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {audits.map((audit) => {
              const typeColor = AUDIT_TYPE_COLORS[audit.audit_type] || AUDIT_TYPE_COLORS.manual;
              const summary = audit.summary || { total_urls: 0, status_codes: {} };
              const errorCount = Object.entries(summary.status_codes || {})
                .filter(([code]) => parseInt(code, 10) >= 400)
                .reduce((sum, [, cnt]) => sum + cnt, 0);
              const warningCount = Object.entries(summary.status_codes || {})
                .filter(([code]) => { const n = parseInt(code, 10); return n >= 300 && n < 400; })
                .reduce((sum, [, cnt]) => sum + cnt, 0);

              return (
                <div
                  key={audit.id}
                  className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-accent/30 transition-colors"
                >
                  {/* Top */}
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', typeColor)}>
                      {audit.audit_type}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#8888a0]">
                      <Clock className="w-3 h-3" />
                      {formatDate(audit.audit_date)}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center bg-secondary rounded-lg py-2">
                      <span className="text-base font-bold text-[var(--text-primary)]">
                        {summary.total_urls}
                      </span>
                      <span className="text-xs text-[#8888a0]">URLs</span>
                    </div>
                    <div className="flex flex-col items-center bg-secondary rounded-lg py-2">
                      <span className="text-base font-bold text-red-400">{errorCount}</span>
                      <span className="text-xs text-[#8888a0]">Lỗi</span>
                    </div>
                    <div className="flex flex-col items-center bg-secondary rounded-lg py-2">
                      <span className="text-base font-bold text-yellow-400">{warningCount}</span>
                      <span className="text-xs text-[#8888a0]">Redirect</span>
                    </div>
                  </div>

                  {/* Status codes breakdown */}
                  {Object.keys(summary.status_codes || {}).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-[#8888a0] font-medium">Phân loại mã trạng thái:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(summary.status_codes).map(([code, cnt]) => (
                          <span
                            key={code}
                            className={cn('text-xs font-medium', getStatusCodeColor(code))}
                          >
                            {code}: {cnt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-border">
                    <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                    <span className="text-xs text-[#8888a0]">
                      Tạo lúc {formatDate(audit.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
