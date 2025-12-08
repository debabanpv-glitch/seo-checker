'use client';

import { useState, useEffect } from 'react';
import { Settings, RefreshCw, Check, AlertCircle, Database, Plus, Trash2, Save } from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import { Project } from '@/types';

interface MonthlyTarget {
  id: string;
  project_id: string;
  month: number;
  year: number;
  target: number;
}

export default function SettingsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // New target form
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [targetValue, setTargetValue] = useState(20);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [projectsRes, targetsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/targets'),
      ]);

      const projectsData = await projectsRes.json();
      const targetsData = await targetsRes.json();

      setProjects(projectsData.projects || []);
      setMonthlyTargets(targetsData.targets || []);

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

  const getMonthName = (month: number) => {
    return `Tháng ${month}`;
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
        <h1 className="text-2xl font-bold text-white">Cài đặt</h1>
        <p className="text-[#8888a0] text-sm">Quản lý cấu hình hệ thống</p>
      </div>

      {/* Sync Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-white">Đồng bộ dữ liệu</h2>
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
      </div>

      {/* Add New Target */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-white">Thêm Target mới</h2>
        </div>

        <div className="grid sm:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm text-[#8888a0] mb-2">Dự án</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-white"
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
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-white"
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
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-white"
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
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-white font-mono"
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
          <h2 className="text-lg font-semibold text-white">Target theo tháng</h2>
        </div>

        <div className="space-y-6">
          {targetsByProject.map(({ project, targets }) => (
            <div key={project.id} className="border border-border rounded-lg overflow-hidden">
              <div className="bg-secondary px-4 py-3">
                <h3 className="text-white font-medium">{project.name}</h3>
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
                        <span className="text-white">
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
        <h2 className="text-lg font-semibold text-white mb-4">Thông tin hệ thống</h2>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-[#8888a0] mb-1">Database</p>
            <p className="text-white font-mono">Supabase PostgreSQL</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-[#8888a0] mb-1">Sync Interval</p>
            <p className="text-white font-mono">Hàng ngày lúc 8h (Vercel Cron)</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-[#8888a0] mb-1">Số dự án</p>
            <p className="text-white font-mono">{projects.length}</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-[#8888a0] mb-1">Version</p>
            <p className="text-white font-mono">1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
