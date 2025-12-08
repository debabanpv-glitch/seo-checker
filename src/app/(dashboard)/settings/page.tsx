'use client';

import { useState, useEffect } from 'react';
import { Settings, RefreshCw, Check, AlertCircle, Database } from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import { Project } from '@/types';

export default function SettingsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [targets, setTargets] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects || []);

      // Initialize targets
      const initialTargets: Record<string, number> = {};
      (data.projects || []).forEach((p: Project) => {
        initialTargets[p.id] = p.monthly_target;
      });
      setTargets(initialTargets);
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

  const handleUpdateTarget = async (projectId: string, target: number) => {
    // Update in local state
    setTargets((prev) => ({ ...prev, [projectId]: target }));

    // TODO: API to update target
    // For now, just update local state
  };

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
          Đồng bộ dữ liệu từ Google Sheets về Supabase. Hệ thống tự động sync mỗi 5 phút.
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

      {/* Project Targets */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-white">Target hàng tháng</h2>
        </div>

        <p className="text-[#8888a0] text-sm mb-6">
          Thiết lập chỉ tiêu bài viết hàng tháng cho từng dự án.
        </p>

        <div className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between p-4 bg-secondary rounded-lg"
            >
              <div>
                <h3 className="text-white font-medium">{project.name}</h3>
                <p className="text-xs text-[#8888a0]">Sheet: {project.sheet_name}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#8888a0] text-sm">Target:</span>
                <input
                  type="number"
                  value={targets[project.id] || 20}
                  onChange={(e) => handleUpdateTarget(project.id, parseInt(e.target.value))}
                  className="w-20 px-3 py-2 bg-card border border-border rounded-lg text-white text-center font-mono"
                  min="1"
                />
                <span className="text-[#8888a0] text-sm">bài/tháng</span>
              </div>
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
            <p className="text-white font-mono">5 phút (Vercel Cron)</p>
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
