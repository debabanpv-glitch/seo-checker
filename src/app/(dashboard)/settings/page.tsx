'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  RefreshCw,
  Check,
  AlertCircle,
  Database,
  Plus,
  Trash2,
  Save,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  User,
  Globe,
  Monitor,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import { Project } from '@/types';
import { ActivityLog } from '@/types/auth';

interface MonthlyTarget {
  id: string;
  project_id: string;
  month: number;
  year: number;
  target: number;
}

interface SyncLog {
  id: number;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'success' | 'failed';
  tasks_synced: number;
  projects_synced: number;
  error: string | null;
  duration_ms: number | null;
}

// Action labels
const actionLabels: Record<string, { label: string; color: string }> = {
  login: { label: 'Đăng nhập', color: 'text-success' },
  logout: { label: 'Đăng xuất', color: 'text-[#8888a0]' },
  login_failed: { label: 'Đăng nhập thất bại', color: 'text-danger' },
  sync: { label: 'Đồng bộ dữ liệu', color: 'text-accent' },
  check_seo: { label: 'Check SEO', color: 'text-accent' },
  create_user: { label: 'Tạo user', color: 'text-success' },
  update_user: { label: 'Cập nhật user', color: 'text-warning' },
  delete_user: { label: 'Xóa user', color: 'text-danger' },
  view_salary: { label: 'Xem lương', color: 'text-[#8888a0]' },
};

export default function SettingsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyTarget[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // New target form
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [targetValue, setTargetValue] = useState(20);

  // Keyword ranking sync
  const [rankingSheetUrl, setRankingSheetUrl] = useState('');
  const [rankingProjectId, setRankingProjectId] = useState('');
  const [isSyncingRanking, setIsSyncingRanking] = useState(false);
  const [isDeletingRanking, setIsDeletingRanking] = useState(false);
  const [rankingSyncResult, setRankingSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [projectsRes, targetsRes, logsRes, activityRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/targets'),
        fetch('/api/sync/logs'),
        fetch('/api/activity-logs?limit=20'),
      ]);

      const projectsData = await projectsRes.json();
      const targetsData = await targetsRes.json();
      const logsData = await logsRes.json();
      const activityData = await activityRes.json();

      setProjects(projectsData.projects || []);
      setMonthlyTargets(targetsData.targets || []);
      setSyncLogs(logsData.logs || []);
      setLastSync(logsData.lastSync || null);
      setActivityLogs(activityData.logs || []);

      if (projectsData.projects?.length > 0) {
        setSelectedProject(projectsData.projects[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setSyncResult({
          success: true,
          message: `Đồng bộ thành công! ${data.syncedCount || 0} tasks được cập nhật.`,
        });
        // Refresh sync logs
        const logsRes = await fetch('/api/sync/logs');
        const logsData = await logsRes.json();
        setSyncLogs(logsData.logs || []);
        setLastSync(logsData.lastSync || null);
      } else {
        setSyncResult({
          success: false,
          message: data.error || 'Đồng bộ thất bại',
        });
      }
    } catch {
      setSyncResult({
        success: false,
        message: 'Có lỗi xảy ra khi đồng bộ',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddTarget = async () => {
    if (!selectedProject) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          month: selectedMonth,
          year: selectedYear,
          target: targetValue,
        }),
      });

      if (res.ok) {
        await fetchData(); // Refresh data
        setSyncResult({
          success: true,
          message: 'Đã lưu target thành công!',
        });
      } else {
        const data = await res.json();
        setSyncResult({
          success: false,
          message: data.error || 'Lưu target thất bại',
        });
      }
    } catch {
      setSyncResult({
        success: false,
        message: 'Có lỗi xảy ra',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTarget = async (targetId: string) => {
    if (!confirm('Bạn có chắc muốn xóa target này?')) return;

    try {
      const res = await fetch(`/api/targets?id=${targetId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMonthlyTargets((prev) => prev.filter((t) => t.id !== targetId));
      }
    } catch (error) {
      console.error('Failed to delete target:', error);
    }
  };

  const handleSyncKeywordRanking = async () => {
    if (!rankingSheetUrl) {
      setRankingSyncResult({ success: false, message: 'Vui lòng nhập URL Google Sheet' });
      return;
    }

    setIsSyncingRanking(true);
    setRankingSyncResult(null);

    try {
      const res = await fetch('/api/keyword-rankings/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetUrl: rankingSheetUrl,
          projectId: rankingProjectId || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setRankingSyncResult({
          success: true,
          message: data.message || `Đồng bộ thành công ${data.stats?.total || 0} từ khóa!`,
        });
      } else {
        setRankingSyncResult({
          success: false,
          message: data.error || 'Đồng bộ thất bại',
        });
      }
    } catch {
      setRankingSyncResult({
        success: false,
        message: 'Có lỗi xảy ra khi đồng bộ',
      });
    } finally {
      setIsSyncingRanking(false);
    }
  };

  const handleDeleteKeywordRanking = async (deleteAll: boolean = false) => {
    const projectName = projects.find(p => p.id === rankingProjectId)?.name;
    const confirmMsg = deleteAll
      ? 'Bạn có chắc muốn XÓA TẤT CẢ dữ liệu keyword ranking?'
      : `Bạn có chắc muốn xóa dữ liệu keyword ranking của dự án "${projectName}"?`;

    if (!confirm(confirmMsg)) return;

    setIsDeletingRanking(true);
    setRankingSyncResult(null);

    try {
      const params = new URLSearchParams();
      if (!deleteAll && rankingProjectId) {
        params.set('projectId', rankingProjectId);
      }
      params.set('deleteAll', deleteAll ? 'true' : 'false');

      const res = await fetch(`/api/keyword-rankings?${params.toString()}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        setRankingSyncResult({
          success: true,
          message: data.message || 'Đã xóa dữ liệu keyword ranking!',
        });
      } else {
        setRankingSyncResult({
          success: false,
          message: data.error || 'Xóa thất bại',
        });
      }
    } catch {
      setRankingSyncResult({
        success: false,
        message: 'Có lỗi xảy ra khi xóa',
      });
    } finally {
      setIsDeletingRanking(false);
    }
  };

  const getMonthName = (month: number) => {
    return `Tháng ${month}`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Group targets by project
  const targetsByProject = projects.map((project) => ({
    project,
    targets: monthlyTargets
      .filter((t) => t.project_id === project.id)
      .sort((a, b) => b.year - a.year || b.month - a.month),
  }));

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Cài đặt</h1>
        <p className="text-[#8888a0] text-sm">Quản lý cấu hình hệ thống</p>
      </div>

      {/* Sync Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Đồng bộ dữ liệu</h2>
        </div>

        <p className="text-[#8888a0] text-sm mb-4">
          Đồng bộ dữ liệu từ Google Sheets về Supabase. Hệ thống tự động sync mỗi ngày lúc 8h sáng.
        </p>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 disabled:bg-accent/50 rounded-lg text-white font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
          </button>

          {syncResult && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                syncResult.success
                  ? 'bg-success/10 text-success'
                  : 'bg-danger/10 text-danger'
              }`}
            >
              {syncResult.success ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{syncResult.message}</span>
            </div>
          )}
        </div>

        {/* Last Sync Info */}
        {lastSync && (
          <div className="mt-4 p-4 bg-secondary rounded-lg">
            <div className="flex items-center gap-3">
              {lastSync.status === 'success' ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : lastSync.status === 'failed' ? (
                <XCircle className="w-5 h-5 text-danger" />
              ) : (
                <RefreshCw className="w-5 h-5 text-accent animate-spin" />
              )}
              <div>
                <p className="text-[var(--text-primary)] text-sm font-medium">
                  Lần đồng bộ gần nhất: {formatDateTime(lastSync.started_at)}
                </p>
                <p className="text-[#8888a0] text-xs">
                  {lastSync.status === 'success'
                    ? `${lastSync.tasks_synced} tasks từ ${lastSync.projects_synced} dự án • ${lastSync.duration_ms}ms`
                    : lastSync.status === 'failed'
                    ? `Lỗi: ${lastSync.error || 'Unknown error'}`
                    : 'Đang chạy...'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keyword Ranking Sync Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Đồng bộ Keyword Ranking</h2>
        </div>

        <p className="text-[#8888a0] text-sm mb-4">
          Đồng bộ dữ liệu xếp hạng từ khóa từ Google Sheets. Sheet cần có các cột: <code className="bg-secondary px-1 rounded">keyword</code>, <code className="bg-secondary px-1 rounded">position/top</code>, <code className="bg-secondary px-1 rounded">date</code> (tùy chọn), <code className="bg-secondary px-1 rounded">url</code> (tùy chọn).
        </p>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm text-[#8888a0] mb-2">URL Google Sheet</label>
              <div className="relative">
                <FileSpreadsheet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888a0]" />
                <input
                  type="url"
                  value={rankingSheetUrl}
                  onChange={(e) => setRankingSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#8888a0] mb-2">Dự án (tùy chọn)</label>
              <select
                value={rankingProjectId}
                onChange={(e) => setRankingProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)]"
              >
                <option value="">-- Tất cả dự án --</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSyncKeywordRanking}
              disabled={isSyncingRanking || isDeletingRanking || !rankingSheetUrl}
              className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 disabled:bg-accent/50 rounded-lg text-white font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingRanking ? 'animate-spin' : ''}`} />
              {isSyncingRanking ? 'Đang đồng bộ...' : 'Đồng bộ Ranking'}
            </button>

            {/* Xóa theo dự án */}
            {rankingProjectId && (
              <button
                onClick={() => handleDeleteKeywordRanking(false)}
                disabled={isSyncingRanking || isDeletingRanking}
                className="flex items-center gap-2 px-4 py-3 bg-warning/20 hover:bg-warning/30 disabled:opacity-50 rounded-lg text-warning font-medium transition-colors"
              >
                <Trash2 className={`w-4 h-4 ${isDeletingRanking ? 'animate-pulse' : ''}`} />
                Xóa dự án này
              </button>
            )}

            {/* Xóa tất cả */}
            <button
              onClick={() => handleDeleteKeywordRanking(true)}
              disabled={isSyncingRanking || isDeletingRanking}
              className="flex items-center gap-2 px-4 py-3 bg-danger/20 hover:bg-danger/30 disabled:opacity-50 rounded-lg text-danger font-medium transition-colors"
            >
              <Trash2 className={`w-4 h-4 ${isDeletingRanking ? 'animate-pulse' : ''}`} />
              Xóa tất cả
            </button>
          </div>

          {rankingSyncResult && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                rankingSyncResult.success
                  ? 'bg-success/10 text-success'
                  : 'bg-danger/10 text-danger'
              }`}
            >
              {rankingSyncResult.success ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{rankingSyncResult.message}</span>
            </div>
          )}

          <div className="p-4 bg-secondary/50 rounded-lg text-sm text-[#8888a0]">
            <p className="font-medium text-[var(--text-primary)] mb-2">Format Sheet mẫu:</p>
            <div className="overflow-x-auto">
              <table className="text-xs border border-border rounded">
                <thead>
                  <tr className="bg-secondary">
                    <th className="px-3 py-1 border-r border-border">keyword</th>
                    <th className="px-3 py-1 border-r border-border">url</th>
                    <th className="px-3 py-1 border-r border-border">top</th>
                    <th className="px-3 py-1">date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-1 border-r border-border">mua nhà hà nội</td>
                    <td className="px-3 py-1 border-r border-border">https://...</td>
                    <td className="px-3 py-1 border-r border-border">5</td>
                    <td className="px-3 py-1">2024-12-01</td>
                  </tr>
                  <tr className="bg-secondary/30">
                    <td className="px-3 py-1 border-r border-border">thuê căn hộ</td>
                    <td className="px-3 py-1 border-r border-border">https://...</td>
                    <td className="px-3 py-1 border-r border-border">12</td>
                    <td className="px-3 py-1">2024-12-01</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs">
              * Sheet cần được public (Chia sẻ → Bất kỳ ai có đường liên kết)
            </p>
          </div>
        </div>
      </div>

      {/* Sync History */}
      {syncLogs.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Lịch sử đồng bộ</h2>
          </div>

          <div className="space-y-2">
            {syncLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  {log.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-success" />
                  ) : log.status === 'failed' ? (
                    <XCircle className="w-4 h-4 text-danger" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-accent animate-spin" />
                  )}
                  <span className="text-[var(--text-primary)] text-sm">{formatDateTime(log.started_at)}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  {log.status === 'success' ? (
                    <>
                      <span className="text-[#8888a0]">{log.tasks_synced} tasks</span>
                      <span className="text-[#8888a0]">{log.projects_synced} dự án</span>
                      <span className="text-[#8888a0] font-mono">{log.duration_ms}ms</span>
                    </>
                  ) : log.status === 'failed' ? (
                    <span className="text-danger truncate max-w-[200px]">{log.error}</span>
                  ) : (
                    <span className="text-accent">Đang chạy...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Logs */}
      {activityLogs.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Nhật ký hoạt động</h2>
          </div>

          <div className="space-y-2">
            {activityLogs.slice(0, 10).map((log) => {
              const actionInfo = actionLabels[log.action] || { label: log.action, color: 'text-[#8888a0]' };
              return (
                <div key={log.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text-primary)] text-sm font-medium">{log.username}</span>
                        <span className={`text-xs ${actionInfo.color}`}>{actionInfo.label}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#8888a0]">
                        <span>{formatDateTime(log.created_at)}</span>
                        {log.ip_address && log.ip_address !== 'unknown' && (
                          <>
                            <span>•</span>
                            <Globe className="w-3 h-3" />
                            <span>{log.ip_address}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="text-xs text-[#8888a0] max-w-[200px] truncate">
                      {JSON.stringify(log.details)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add New Target */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Thêm Target mới</h2>
        </div>

        <div className="grid sm:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm text-[#8888a0] mb-2">Dự án</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)]"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#8888a0] mb-2">Tháng</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)]"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#8888a0] mb-2">Năm</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)]"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#8888a0] mb-2">Target (bài)</label>
            <input
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] font-mono"
              min="1"
            />
          </div>

          <button
            onClick={handleAddTarget}
            disabled={isSaving || !selectedProject}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 rounded-lg text-white font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>

      {/* Monthly Targets by Project */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Target theo tháng</h2>
        </div>

        <div className="space-y-6">
          {targetsByProject.map(({ project, targets }) => (
            <div key={project.id} className="border border-border rounded-lg overflow-hidden">
              <div className="bg-secondary px-4 py-3">
                <h3 className="text-[var(--text-primary)] font-medium">{project.name}</h3>
                <p className="text-xs text-[#8888a0]">Sheet: {project.sheet_name}</p>
              </div>

              {targets.length > 0 ? (
                <div className="divide-y divide-border">
                  {targets.map((target) => (
                    <div
                      key={target.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-[var(--text-primary)]">
                          {getMonthName(target.month)}/{target.year}
                        </span>
                        <span className="text-accent font-mono font-bold">
                          {target.target} bài
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteTarget(target.id)}
                        className="p-2 text-[#8888a0] hover:text-danger transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-[#8888a0] text-sm">
                  Chưa có target nào. Thêm target mới ở trên.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Thông tin hệ thống</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-[#8888a0] mb-1">Database</p>
            <p className="text-[var(--text-primary)] font-mono">Supabase PostgreSQL</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-[#8888a0] mb-1">Sync</p>
            <p className="text-[var(--text-primary)] font-mono">Thủ công (nút Đồng bộ ngay)</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-[#8888a0] mb-1">Số dự án</p>
            <p className="text-[var(--text-primary)] font-mono">{projects.length}</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-[#8888a0] mb-1">Version</p>
            <p className="text-[var(--text-primary)] font-mono">1.4.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
