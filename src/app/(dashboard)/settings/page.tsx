'use client';

import { useState, useEffect } from 'react';
import {
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
  Edit3,
  FolderKanban,
  X,
  Download,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
  Upload,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import { Project } from '@/types';
import { ActivityLog } from '@/types/auth';
import { cn } from '@/lib/utils';

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

interface SiteCrawl {
  id: string;
  crawl_date: string;
  health_score: number;
  total_urls: number;
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

type TabType = 'projects' | 'sync' | 'activity' | 'system';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyTarget[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [crawlsByProject, setCrawlsByProject] = useState<Record<string, SiteCrawl[]>>({});

  // Project modal
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState({
    name: '',
    sheet_id: '',
    sheet_name: 'Content',
    monthly_target: 20,
    ranking_sheet_url: '',
  });
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState('');

  // Target modal
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState('');
  const [targetMonth, setTargetMonth] = useState(new Date().getMonth() + 1);
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [targetValue, setTargetValue] = useState(20);
  const [isSavingTarget, setIsSavingTarget] = useState(false);

  // Screaming Frog import modal
  const [showCrawlModal, setShowCrawlModal] = useState(false);
  const [crawlProjectId, setCrawlProjectId] = useState('');
  const [crawlDate, setCrawlDate] = useState(new Date().toISOString().split('T')[0]);
  const [crawlSheetUrl, setCrawlSheetUrl] = useState('');
  const [isImportingCrawl, setIsImportingCrawl] = useState(false);

  // Keyword ranking sync
  const [isSyncingRanking, setIsSyncingRanking] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [projectsRes, targetsRes, logsRes, activityRes, crawlsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/targets'),
        fetch('/api/sync/logs'),
        fetch('/api/activity-logs?limit=20'),
        fetch('/api/site-crawl'),
      ]);

      const projectsData = await projectsRes.json();
      const targetsData = await targetsRes.json();
      const logsData = await logsRes.json();
      const activityData = await activityRes.json();
      const crawlsData = await crawlsRes.json();

      setProjects(projectsData.projects || []);
      setMonthlyTargets(targetsData.targets || []);
      setSyncLogs(logsData.logs || []);
      setLastSync(logsData.lastSync || null);
      setActivityLogs(activityData.logs || []);

      // Group crawls by project
      const crawlsGrouped: Record<string, SiteCrawl[]> = {};
      (crawlsData.crawls || []).forEach((crawl: SiteCrawl & { project_id: string }) => {
        if (!crawlsGrouped[crawl.project_id]) {
          crawlsGrouped[crawl.project_id] = [];
        }
        crawlsGrouped[crawl.project_id].push(crawl);
      });
      setCrawlsByProject(crawlsGrouped);

      if (projectsData.projects?.length > 0 && !expandedProject) {
        setExpandedProject(projectsData.projects[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Parse Google Sheet URL
  const parseSheetIdFromUrl = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleSheetUrlChange = (url: string) => {
    setSheetUrlInput(url);
    const sheetId = parseSheetIdFromUrl(url);
    if (sheetId) {
      setProjectForm({ ...projectForm, sheet_id: sheetId });
    }
  };

  // Sync handlers
  const handleSyncContent = async () => {
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
        const logsRes = await fetch('/api/sync/logs');
        const logsData = await logsRes.json();
        setSyncLogs(logsData.logs || []);
        setLastSync(logsData.lastSync || null);
      } else {
        setSyncResult({ success: false, message: data.error || 'Đồng bộ thất bại' });
      }
    } catch {
      setSyncResult({ success: false, message: 'Có lỗi xảy ra khi đồng bộ' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncRanking = async (projectId: string, rankingUrl: string) => {
    if (!rankingUrl) {
      setSyncResult({ success: false, message: 'Dự án chưa có link Google Sheet ranking' });
      return;
    }

    setIsSyncingRanking(projectId);
    setSyncResult(null);

    try {
      const res = await fetch('/api/keyword-rankings/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: rankingUrl, projectId }),
      });

      const data = await res.json();

      if (res.ok) {
        setSyncResult({
          success: true,
          message: data.message || `Đồng bộ thành công ${data.stats?.total || 0} từ khóa!`,
        });
      } else {
        setSyncResult({ success: false, message: data.error || 'Đồng bộ thất bại' });
      }
    } catch {
      setSyncResult({ success: false, message: 'Có lỗi xảy ra khi đồng bộ' });
    } finally {
      setIsSyncingRanking(null);
    }
  };

  // Project handlers
  const openProjectModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        name: project.name,
        sheet_id: project.sheet_id,
        sheet_name: project.sheet_name || 'Content',
        monthly_target: project.monthly_target || 20,
        ranking_sheet_url: project.ranking_sheet_url || '',
      });
      setSheetUrlInput('');
    } else {
      setEditingProject(null);
      setProjectForm({
        name: '',
        sheet_id: '',
        sheet_name: 'Content',
        monthly_target: 20,
        ranking_sheet_url: '',
      });
      setSheetUrlInput('');
    }
    setShowProjectModal(true);
  };

  const handleSaveProject = async () => {
    if (!projectForm.name || !projectForm.sheet_id) {
      setSyncResult({ success: false, message: 'Tên dự án và Sheet ID là bắt buộc' });
      return;
    }

    setIsSavingProject(true);
    try {
      const method = editingProject ? 'PUT' : 'POST';
      const body = editingProject ? { ...projectForm, id: editingProject.id } : projectForm;

      const res = await fetch('/api/projects', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchData();
        setShowProjectModal(false);
        setSyncResult({
          success: true,
          message: editingProject ? 'Đã cập nhật dự án!' : 'Đã thêm dự án mới!',
        });
      } else {
        const data = await res.json();
        setSyncResult({ success: false, message: data.error || 'Lỗi khi lưu dự án' });
      }
    } catch {
      setSyncResult({ success: false, message: 'Có lỗi xảy ra' });
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!confirm(`Bạn có chắc muốn xóa dự án "${project?.name}"?`)) return;

    try {
      const res = await fetch(`/api/projects?id=${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
        setSyncResult({ success: true, message: 'Đã xóa dự án!' });
      }
    } catch {
      setSyncResult({ success: false, message: 'Có lỗi xảy ra' });
    }
  };

  // Target handlers
  const openTargetModal = (projectId: string) => {
    setTargetProjectId(projectId);
    setTargetMonth(new Date().getMonth() + 1);
    setTargetYear(new Date().getFullYear());
    setTargetValue(20);
    setShowTargetModal(true);
  };

  const handleSaveTarget = async () => {
    if (!targetProjectId) return;

    setIsSavingTarget(true);
    try {
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: targetProjectId,
          month: targetMonth,
          year: targetYear,
          target: targetValue,
        }),
      });

      if (res.ok) {
        await fetchData();
        setShowTargetModal(false);
        setSyncResult({ success: true, message: 'Đã lưu target!' });
      }
    } catch {
      setSyncResult({ success: false, message: 'Có lỗi xảy ra' });
    } finally {
      setIsSavingTarget(false);
    }
  };

  const handleDeleteTarget = async (targetId: string) => {
    if (!confirm('Xóa target này?')) return;
    try {
      await fetch(`/api/targets?id=${targetId}`, { method: 'DELETE' });
      setMonthlyTargets((prev) => prev.filter((t) => t.id !== targetId));
    } catch (error) {
      console.error('Failed to delete target:', error);
    }
  };

  // Crawl import handlers
  const openCrawlModal = (projectId: string) => {
    setCrawlProjectId(projectId);
    setCrawlDate(new Date().toISOString().split('T')[0]);
    setCrawlSheetUrl('');
    setShowCrawlModal(true);
  };

  const handleImportCrawl = async () => {
    if (!crawlProjectId || !crawlSheetUrl.trim()) {
      setSyncResult({ success: false, message: 'Vui lòng nhập Google Sheets URL' });
      return;
    }

    // Validate Google Sheets URL
    if (!crawlSheetUrl.includes('docs.google.com/spreadsheets')) {
      setSyncResult({ success: false, message: 'URL không hợp lệ. Vui lòng nhập link Google Sheets.' });
      return;
    }

    setIsImportingCrawl(true);
    try {
      const res = await fetch('/api/site-crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: crawlProjectId,
          crawl_date: crawlDate,
          sheet_url: crawlSheetUrl,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        await fetchData();
        setShowCrawlModal(false);
        setSyncResult({ success: true, message: `Import thành công ${result.imported} URLs!` });
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (err) {
      setSyncResult({ success: false, message: err instanceof Error ? err.message : 'Import failed' });
    } finally {
      setIsImportingCrawl(false);
    }
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

  const downloadCSVTemplate = () => {
    const csvContent = `keyword,url,top,date
mua nhà hà nội,https://example.com/mua-nha,5,2024/12/01
thuê căn hộ chung cư,https://example.com/thue-can-ho,12,2024/12/01`;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'keyword_ranking_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return <PageLoading />;
  }

  const tabs = [
    { id: 'projects' as TabType, label: 'Dự án', icon: FolderKanban },
    { id: 'sync' as TabType, label: 'Đồng bộ', icon: RefreshCw },
    { id: 'activity' as TabType, label: 'Hoạt động', icon: Activity },
    { id: 'system' as TabType, label: 'Hệ thống', icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Cài đặt</h1>
          <p className="text-[#8888a0] text-sm">Quản lý dự án và cấu hình hệ thống</p>
        </div>
      </div>

      {/* Alert */}
      {syncResult && (
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-lg',
            syncResult.success ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
          )}
        >
          {syncResult.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm">{syncResult.message}</span>
          <button onClick={() => setSyncResult(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-secondary rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-accent text-white'
                : 'text-[#8888a0] hover:text-[var(--text-primary)]'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          {/* Add Project Button */}
          <div className="flex justify-end">
            <button
              onClick={() => openProjectModal()}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Thêm dự án
            </button>
          </div>

          {/* Project Cards */}
          {projects.map((project) => {
            const projectTargets = monthlyTargets.filter((t) => t.project_id === project.id);
            const projectCrawls = crawlsByProject[project.id] || [];
            const isExpanded = expandedProject === project.id;

            return (
              <div key={project.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Project Header */}
                <button
                  onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FolderKanban className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-[var(--text-primary)] font-semibold">{project.name}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#8888a0] mt-1">
                      <span className="flex items-center gap-1">
                        <FileSpreadsheet className="w-3 h-3" />
                        {project.sheet_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {project.monthly_target}/tháng
                      </span>
                      {project.ranking_sheet_url && (
                        <span className="text-success flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Có ranking
                        </span>
                      )}
                      {projectCrawls.length > 0 && (
                        <span className="text-blue-400 flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {projectCrawls.length} crawl
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openProjectModal(project);
                      }}
                      className="p-2 text-[#8888a0] hover:text-accent transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      className="p-2 text-[#8888a0] hover:text-danger transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[#8888a0]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#8888a0]" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <button
                        onClick={() => openTargetModal(project.id)}
                        className="flex items-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary/70 rounded-lg text-sm transition-colors"
                      >
                        <Target className="w-4 h-4 text-accent" />
                        <span className="text-[var(--text-primary)]">Thêm Target</span>
                      </button>
                      <button
                        onClick={() => handleSyncRanking(project.id, project.ranking_sheet_url || '')}
                        disabled={!project.ranking_sheet_url || isSyncingRanking === project.id}
                        className="flex items-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary/70 disabled:opacity-50 rounded-lg text-sm transition-colors"
                      >
                        <TrendingUp className={cn('w-4 h-4 text-success', isSyncingRanking === project.id && 'animate-spin')} />
                        <span className="text-[var(--text-primary)]">
                          {isSyncingRanking === project.id ? 'Đang sync...' : 'Sync Ranking'}
                        </span>
                      </button>
                      <button
                        onClick={() => openCrawlModal(project.id)}
                        className="flex items-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary/70 rounded-lg text-sm transition-colors"
                      >
                        <Upload className="w-4 h-4 text-blue-400" />
                        <span className="text-[var(--text-primary)]">Import Crawl</span>
                      </button>
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${project.sheet_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary/70 rounded-lg text-sm transition-colors"
                      >
                        <Globe className="w-4 h-4 text-[#8888a0]" />
                        <span className="text-[var(--text-primary)]">Mở Sheet</span>
                      </a>
                    </div>

                    {/* Targets */}
                    <div className="bg-secondary/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-[var(--text-primary)]">Target theo tháng</h4>
                      </div>
                      {projectTargets.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {projectTargets
                            .sort((a, b) => b.year - a.year || b.month - a.month)
                            .slice(0, 8)
                            .map((target) => (
                              <div
                                key={target.id}
                                className="flex items-center justify-between px-3 py-2 bg-card rounded-lg"
                              >
                                <span className="text-sm text-[#8888a0]">
                                  T{target.month}/{target.year}
                                </span>
                                <span className="text-sm font-bold text-accent">{target.target}</span>
                                <button
                                  onClick={() => handleDeleteTarget(target.id)}
                                  className="p-1 text-[#8888a0] hover:text-danger"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#8888a0]">Chưa có target. Nhấn &quot;Thêm Target&quot; để tạo.</p>
                      )}
                    </div>

                    {/* Recent Crawls */}
                    {projectCrawls.length > 0 && (
                      <div className="bg-secondary/30 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                          Screaming Frog Crawls gần đây
                        </h4>
                        <div className="space-y-2">
                          {projectCrawls.slice(0, 3).map((crawl) => (
                            <div
                              key={crawl.id}
                              className="flex items-center justify-between px-3 py-2 bg-card rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Activity className="w-4 h-4 text-blue-400" />
                                <span className="text-sm text-[var(--text-primary)]">
                                  {new Date(crawl.crawl_date).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-[#8888a0]">{crawl.total_urls} URLs</span>
                                <span
                                  className={cn(
                                    'text-sm font-bold',
                                    crawl.health_score >= 80
                                      ? 'text-green-400'
                                      : crawl.health_score >= 60
                                      ? 'text-yellow-400'
                                      : 'text-red-400'
                                  )}
                                >
                                  {crawl.health_score}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sheet Info */}
                    <div className="text-xs text-[#8888a0] space-y-1">
                      <p>
                        <span className="font-medium">Sheet ID:</span> {project.sheet_id}
                      </p>
                      {project.ranking_sheet_url && (
                        <p>
                          <span className="font-medium">Ranking URL:</span>{' '}
                          <a href={project.ranking_sheet_url} target="_blank" className="text-accent hover:underline">
                            {project.ranking_sheet_url.substring(0, 50)}...
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {projects.length === 0 && (
            <div className="text-center py-12 text-[#8888a0]">
              <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Chưa có dự án nào</p>
              <button
                onClick={() => openProjectModal()}
                className="mt-4 px-4 py-2 bg-accent text-white rounded-lg text-sm"
              >
                Thêm dự án đầu tiên
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'sync' && (
        <div className="space-y-6">
          {/* Content Sync */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                <Database className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Đồng bộ Content</h3>
                <p className="text-xs text-[#8888a0]">Sync dữ liệu từ Google Sheets về database</p>
              </div>
            </div>

            <button
              onClick={handleSyncContent}
              disabled={isSyncing}
              className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 disabled:bg-accent/50 rounded-lg text-white font-medium"
            >
              <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
              {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
            </button>

            {lastSync && (
              <div className="mt-4 p-3 bg-secondary rounded-lg flex items-center gap-3">
                {lastSync.status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-danger" />
                )}
                <div>
                  <p className="text-sm text-[var(--text-primary)]">
                    Lần sync gần nhất: {formatDateTime(lastSync.started_at)}
                  </p>
                  <p className="text-xs text-[#8888a0]">
                    {lastSync.tasks_synced} tasks • {lastSync.projects_synced} dự án • {lastSync.duration_ms}ms
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Keyword Ranking Guide */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-success/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Keyword Ranking</h3>
                <p className="text-xs text-[#8888a0]">Sync từ Google Sheet của từng dự án</p>
              </div>
            </div>

            <div className="p-4 bg-secondary/50 rounded-lg text-sm text-[#8888a0]">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-[var(--text-primary)]">Format Sheet mẫu:</p>
                <button
                  onClick={downloadCSVTemplate}
                  className="flex items-center gap-1 px-3 py-1.5 bg-accent hover:bg-accent/90 rounded-lg text-white text-xs font-medium"
                >
                  <Download className="w-3 h-3" />
                  Tải CSV mẫu
                </button>
              </div>
              <table className="text-xs border border-border rounded w-full mt-2">
                <thead>
                  <tr className="bg-secondary">
                    <th className="px-3 py-1 text-left">keyword</th>
                    <th className="px-3 py-1 text-left">url</th>
                    <th className="px-3 py-1 text-left">top</th>
                    <th className="px-3 py-1 text-left">date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-1">mua nhà hà nội</td>
                    <td className="px-3 py-1">https://...</td>
                    <td className="px-3 py-1">5</td>
                    <td className="px-3 py-1">2024/12/01</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2 text-xs text-warning">
                * Headers phải là: keyword, url, top, date (viết thường)
              </p>
            </div>
          </div>

          {/* Sync History */}
          {syncLogs.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-[var(--text-primary)]">Lịch sử đồng bộ</h3>
              </div>

              <div className="space-y-2">
                {syncLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex items-center gap-3">
                      {log.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-danger" />
                      )}
                      <span className="text-sm text-[var(--text-primary)]">{formatDateTime(log.started_at)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#8888a0]">
                      <span>{log.tasks_synced} tasks</span>
                      <span>{log.duration_ms}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-[var(--text-primary)]">Nhật ký hoạt động</h3>
          </div>

          <div className="space-y-2">
            {activityLogs.map((log) => {
              const actionInfo = actionLabels[log.action] || { label: log.action, color: 'text-[#8888a0]' };
              return (
                <div key={log.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--text-primary)]">{log.username}</span>
                        <span className={`text-xs ${actionInfo.color}`}>{actionInfo.label}</span>
                      </div>
                      <span className="text-xs text-[#8888a0]">{formatDateTime(log.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-[var(--text-primary)]">Thông tin hệ thống</h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-[#8888a0] text-xs mb-1">Database</p>
              <p className="text-[var(--text-primary)] font-mono">Supabase PostgreSQL</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-[#8888a0] text-xs mb-1">Số dự án</p>
              <p className="text-[var(--text-primary)] font-mono">{projects.length}</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-[#8888a0] text-xs mb-1">Phiên bản</p>
              <p className="text-[var(--text-primary)] font-mono">2.0.0</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-[#8888a0] text-xs mb-1">Last Update</p>
              <p className="text-[var(--text-primary)] font-mono">Dec 2024</p>
            </div>
          </div>
        </div>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {editingProject ? 'Chỉnh sửa dự án' : 'Thêm dự án mới'}
              </h3>
              <button onClick={() => setShowProjectModal(false)} className="p-1 text-[#8888a0] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-[#8888a0] mb-2">Tên dự án *</label>
                <input
                  type="text"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="VD: BĐS Hà Nội"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm text-[#8888a0] mb-2">Link Google Sheet (Content) *</label>
                <input
                  type="url"
                  value={sheetUrlInput}
                  onChange={(e) => handleSheetUrlChange(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
                />
                {projectForm.sheet_id && (
                  <p className="text-xs text-success mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    ID: {projectForm.sheet_id.substring(0, 20)}...
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#8888a0] mb-2">Tên Sheet</label>
                  <input
                    type="text"
                    value={projectForm.sheet_name}
                    onChange={(e) => setProjectForm({ ...projectForm, sheet_name: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#8888a0] mb-2">Target/tháng</label>
                  <input
                    type="number"
                    value={projectForm.monthly_target}
                    onChange={(e) => setProjectForm({ ...projectForm, monthly_target: parseInt(e.target.value) || 20 })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#8888a0] mb-2">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  Link Sheet Keyword Ranking
                </label>
                <input
                  type="url"
                  value={projectForm.ranking_sheet_url}
                  onChange={(e) => setProjectForm({ ...projectForm, ranking_sheet_url: e.target.value })}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-secondary/30">
              <button onClick={() => setShowProjectModal(false)} className="px-4 py-2 text-[#8888a0]">
                Hủy
              </button>
              <button
                onClick={handleSaveProject}
                disabled={isSavingProject || !projectForm.name || !projectForm.sheet_id}
                className="flex items-center gap-2 px-6 py-2 bg-accent disabled:bg-accent/50 rounded-lg text-white font-medium"
              >
                <Save className="w-4 h-4" />
                {isSavingProject ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Target Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Thêm Target</h3>
              <button onClick={() => setShowTargetModal(false)} className="p-1 text-[#8888a0]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#8888a0] mb-2">Tháng</label>
                  <select
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)]"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Tháng {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#8888a0] mb-2">Năm</label>
                  <select
                    value={targetYear}
                    onChange={(e) => setTargetYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)]"
                  >
                    {[2024, 2025, 2026].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
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
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowTargetModal(false)} className="px-4 py-2 text-[#8888a0]">
                Hủy
              </button>
              <button
                onClick={handleSaveTarget}
                disabled={isSavingTarget}
                className="px-6 py-2 bg-accent rounded-lg text-white font-medium"
              >
                {isSavingTarget ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crawl Import Modal */}
      {showCrawlModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Import Screaming Frog</h3>
              </div>
              <button onClick={() => setShowCrawlModal(false)} className="p-1 text-[#8888a0]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div>
                <label className="block text-sm text-[#8888a0] mb-2">Google Sheets URL</label>
                <input
                  type="url"
                  value={crawlSheetUrl}
                  onChange={(e) => setCrawlSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm text-[#8888a0] mb-2">Ngày crawl</label>
                <input
                  type="date"
                  value={crawlDate}
                  onChange={(e) => setCrawlDate(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div className="text-xs text-[#8888a0] p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="font-medium mb-2 text-blue-400">Hướng dẫn:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Export từ Screaming Frog (File → Export → Internal → All)</li>
                  <li>Upload file lên Google Sheets</li>
                  <li>Đảm bảo Sheet được chia sẻ công khai (Anyone with link can view)</li>
                  <li>Copy link Google Sheets và paste vào ô trên</li>
                </ol>
                <p className="mt-2 text-[#8888a0]">
                  <span className="text-yellow-400">Lưu ý:</span> Headers cần giữ nguyên tên gốc từ Screaming Frog (Address, Status Code, Title 1, etc.)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowCrawlModal(false)} className="px-4 py-2 text-[#8888a0]">
                Hủy
              </button>
              <button
                onClick={handleImportCrawl}
                disabled={isImportingCrawl || !crawlSheetUrl.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 rounded-lg text-white font-medium"
              >
                <Upload className="w-4 h-4" />
                {isImportingCrawl ? 'Đang import...' : 'Import từ Sheet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
