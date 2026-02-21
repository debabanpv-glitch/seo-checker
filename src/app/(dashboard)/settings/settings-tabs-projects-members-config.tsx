'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Check, AlertCircle, Plus, Trash2, Save,
  FolderKanban, X, Edit3, Users, Wrench, FileSpreadsheet,
  Globe, TrendingUp, Target,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import { Project, Member } from '@/types';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabType = 'projects' | 'members' | 'config';

interface AppConfig {
  screaming_frog_path: string;
  default_monthly_target: string;
  [key: string]: string;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('projects');
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Projects state ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState({ name: '', slug: '', domain: '', sheet_id: '', sheet_name: 'Content', monthly_target: 20, ranking_sheet_url: '' });
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Members state ---
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberForm, setMemberForm] = useState({ name: '', nickname: '', role: 'Content Writer', projects: [] as string[], salary_rate: 0 });
  const [isSavingMember, setIsSavingMember] = useState(false);

  // --- Config state ---
  const [config, setConfig] = useState<AppConfig>({ screaming_frog_path: '/Users/puchinpham/Developer/SEO/', default_monthly_target: '20' });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  const fetchProjects = useCallback(async () => {
    try {
      const pRes = await fetch('/api/v1/projects');
      const pData = await pRes.json();
      setProjects(pData.projects || []);
    } catch (err) { console.error('fetch projects error', err); }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/members?list=true');
      const data = await res.json();
      setMembersList(data.members || []);
    } catch (err) { console.error('fetch members error', err); }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/settings/config');
      const data = await res.json();
      setConfig(prev => ({ ...prev, ...data.config }));
    } catch (err) { console.error('fetch config error', err); }
  }, []);

  useEffect(() => {
    Promise.all([fetchProjects(), fetchMembers(), fetchConfig()])
      .finally(() => setIsLoading(false));
  }, [fetchProjects, fetchMembers, fetchConfig]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const parseSheetIdFromUrl = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleSheetUrlChange = (url: string) => {
    setSheetUrlInput(url);
    const sheetId = parseSheetIdFromUrl(url);
    if (sheetId) setProjectForm(f => ({ ...f, sheet_id: sheetId }));
  };

  const showAlert = (success: boolean, message: string) => {
    setSyncResult({ success, message });
    setTimeout(() => setSyncResult(null), 4000);
  };

  // ---------------------------------------------------------------------------
  // Project handlers
  // ---------------------------------------------------------------------------

  const openProjectModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        name: project.name,
        slug: project.slug || '',
        domain: project.domain || '',
        sheet_id: project.sheet_id,
        sheet_name: project.sheet_name || 'Content',
        monthly_target: project.monthly_target || 20,
        ranking_sheet_url: project.ranking_sheet_url || '',
      });
    } else {
      setEditingProject(null);
      setProjectForm({ name: '', slug: '', domain: '', sheet_id: '', sheet_name: 'Content', monthly_target: 20, ranking_sheet_url: '' });
    }
    setSheetUrlInput('');
    setShowProjectModal(true);
  };

  const handleSaveProject = async () => {
    if (!projectForm.name || !projectForm.sheet_id) {
      showAlert(false, 'Tên dự án và Sheet ID là bắt buộc');
      return;
    }
    setIsSavingProject(true);
    try {
      const method = editingProject ? 'PUT' : 'POST';
      const body = editingProject ? { ...projectForm, id: editingProject.id } : projectForm;
      const res = await fetch('/api/v1/projects', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (res.ok) {
        await fetchProjects();
        setShowProjectModal(false);
        showAlert(true, editingProject ? 'Đã cập nhật dự án!' : 'Đã thêm dự án mới!');
      } else {
        const data = await res.json();
        showAlert(false, data.error || 'Lỗi khi lưu dự án');
      }
    } catch { showAlert(false, 'Có lỗi xảy ra'); }
    finally { setIsSavingProject(false); }
  };

  const handleDeleteProject = async (id: string) => {
    const p = projects.find(p => p.id === id);
    if (!confirm(`Xóa dự án "${p?.name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/projects?id=${id}`, { method: 'DELETE' });
      if (res.ok) { await fetchProjects(); showAlert(true, 'Đã xóa dự án!'); }
    } catch { showAlert(false, 'Có lỗi xảy ra'); }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/v1/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showAlert(true, `Đồng bộ thành công! ${data.syncedCount || 0} tasks được cập nhật.`);
        await fetchProjects();
      } else {
        showAlert(false, data.error || 'Đồng bộ thất bại');
      }
    } catch { showAlert(false, 'Có lỗi xảy ra khi đồng bộ'); }
    finally { setIsSyncing(false); }
  };

  // ---------------------------------------------------------------------------
  // Member handlers
  // ---------------------------------------------------------------------------

  const openMemberModal = (member?: Member) => {
    if (member) {
      setEditingMember(member);
      setMemberForm({
        name: member.name,
        nickname: member.nickname || '',
        role: member.role,
        projects: member.projects || [],
        salary_rate: member.salary_rate ?? 0,
      });
    } else {
      setEditingMember(null);
      setMemberForm({ name: '', nickname: '', role: 'Content Writer', projects: [], salary_rate: 0 });
    }
    setShowMemberModal(true);
  };

  const handleSaveMember = async () => {
    if (!memberForm.name) { showAlert(false, 'Tên thành viên là bắt buộc'); return; }
    setIsSavingMember(true);
    try {
      const method = editingMember ? 'PUT' : 'POST';
      const body = editingMember ? { ...memberForm, id: editingMember.id } : memberForm;
      const res = await fetch('/api/v1/members', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (res.ok) {
        await fetchMembers();
        setShowMemberModal(false);
        showAlert(true, editingMember ? 'Đã cập nhật thành viên!' : 'Đã thêm thành viên!');
      } else {
        const data = await res.json();
        showAlert(false, data.error || 'Lỗi khi lưu thành viên');
      }
    } catch { showAlert(false, 'Có lỗi xảy ra'); }
    finally { setIsSavingMember(false); }
  };

  const handleDeleteMember = async (id: string) => {
    const m = membersList.find(m => m.id === id);
    if (!confirm(`Xóa thành viên "${m?.name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/members?id=${id}`, { method: 'DELETE' });
      if (res.ok) { await fetchMembers(); showAlert(true, 'Đã xóa thành viên!'); }
    } catch { showAlert(false, 'Có lỗi xảy ra'); }
  };

  const toggleProjectForMember = (projectId: string) => {
    setMemberForm(f => ({
      ...f,
      projects: f.projects.includes(projectId)
        ? f.projects.filter(p => p !== projectId)
        : [...f.projects, projectId],
    }));
  };

  // ---------------------------------------------------------------------------
  // Config handlers
  // ---------------------------------------------------------------------------

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await Promise.all([
        fetch('/api/v1/settings/config', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'screaming_frog_path', value: config.screaming_frog_path }),
        }),
        fetch('/api/v1/settings/config', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'default_monthly_target', value: config.default_monthly_target }),
        }),
      ]);
      showAlert(true, 'Đã lưu cấu hình!');
    } catch { showAlert(false, 'Lỗi khi lưu cấu hình'); }
    finally { setIsSavingConfig(false); }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) return <PageLoading />;

  const tabs = [
    { id: 'projects' as TabType, label: 'Dự án', icon: FolderKanban },
    { id: 'members' as TabType, label: 'Thành viên', icon: Users },
    { id: 'config' as TabType, label: 'Cấu hình', icon: Wrench },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Cài đặt</h1>
        <p className="text-[#8888a0] text-sm">Quản lý dự án, thành viên và cấu hình hệ thống</p>
      </div>

      {/* Alert */}
      {syncResult && (
        <div className={cn('flex items-center gap-2 px-4 py-3 rounded-lg', syncResult.success ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
          {syncResult.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm">{syncResult.message}</span>
          <button onClick={() => setSyncResult(null)} className="ml-auto"><X className="w-4 h-4" /></button>
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
              activeTab === tab.id ? 'bg-accent text-white' : 'text-[#8888a0] hover:text-[var(--text-primary)]'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* TAB: Dự án                                                         */}
      {/* ================================================================== */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#8888a0]">{projects.length} dự án</span>
            <div className="flex items-center gap-2">
              <button onClick={handleSyncNow} disabled={isSyncing} className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/70 rounded-lg text-[var(--text-primary)] text-sm font-medium disabled:opacity-50">
                <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
                {isSyncing ? 'Đang sync...' : 'Sync ngay'}
              </button>
              <button onClick={() => openProjectModal()} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium">
                <Plus className="w-4 h-4" />
                Thêm dự án
              </button>
            </div>
          </div>

          {/* Project table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-[#8888a0] font-medium">Tên dự án</th>
                  <th className="text-left px-4 py-3 text-[#8888a0] font-medium hidden md:table-cell">Domain</th>
                  <th className="text-left px-4 py-3 text-[#8888a0] font-medium hidden md:table-cell">Sheet</th>
                  <th className="text-center px-4 py-3 text-[#8888a0] font-medium">Target</th>
                  <th className="text-right px-4 py-3 text-[#8888a0] font-medium w-24"></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--text-primary)]">{p.name}</div>
                      {p.slug && <div className="text-xs text-[#8888a0]">/{p.slug}</div>}
                    </td>
                    <td className="px-4 py-3 text-[#8888a0] hidden md:table-cell">
                      {p.domain ? (
                        <a href={`https://${p.domain}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center gap-1">
                          <Globe className="w-3 h-3" />{p.domain}
                        </a>
                      ) : <span className="text-[#8888a0]/50">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-[#8888a0]">
                        <FileSpreadsheet className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{p.sheet_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded text-xs font-medium">
                        <Target className="w-3 h-3" />{p.monthly_target}/th
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openProjectModal(p)} className="p-1.5 text-[#8888a0] hover:text-accent transition-colors rounded-lg hover:bg-secondary">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteProject(p.id)} className="p-1.5 text-[#8888a0] hover:text-danger transition-colors rounded-lg hover:bg-secondary">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {projects.length === 0 && (
              <div className="text-center py-12 text-[#8888a0]">
                <FolderKanban className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Chưa có dự án nào</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB: Thành viên                                                    */}
      {/* ================================================================== */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#8888a0]">{membersList.length} thành viên</span>
            <button onClick={() => openMemberModal()} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium">
              <Plus className="w-4 h-4" />
              Thêm thành viên
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-[#8888a0] font-medium">Tên</th>
                  <th className="text-left px-4 py-3 text-[#8888a0] font-medium hidden md:table-cell">Nickname</th>
                  <th className="text-left px-4 py-3 text-[#8888a0] font-medium">Role</th>
                  <th className="text-left px-4 py-3 text-[#8888a0] font-medium hidden md:table-cell">Dự án</th>
                  <th className="text-right px-4 py-3 text-[#8888a0] font-medium">Đơn giá</th>
                  <th className="text-right px-4 py-3 text-[#8888a0] font-medium w-24"></th>
                </tr>
              </thead>
              <tbody>
                {membersList.map((m) => (
                  <tr key={m.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{m.name}</td>
                    <td className="px-4 py-3 text-[#8888a0] hidden md:table-cell">{m.nickname || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-secondary rounded text-xs text-[var(--text-primary)]">{m.role}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(m.projects || []).map((pid) => {
                          const proj = projects.find(p => p.id === pid);
                          return proj ? (
                            <span key={pid} className="px-2 py-0.5 bg-accent/10 text-accent rounded text-xs">{proj.name}</span>
                          ) : null;
                        })}
                        {(!m.projects || m.projects.length === 0) && <span className="text-[#8888a0]/50 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--text-primary)]">
                      {(m.salary_rate ?? 0).toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openMemberModal(m)} className="p-1.5 text-[#8888a0] hover:text-accent transition-colors rounded-lg hover:bg-secondary">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteMember(m.id)} className="p-1.5 text-[#8888a0] hover:text-danger transition-colors rounded-lg hover:bg-secondary">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {membersList.length === 0 && (
              <div className="text-center py-12 text-[#8888a0]">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Chưa có thành viên nào</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB: Cấu hình                                                      */}
      {/* ================================================================== */}
      {activeTab === 'config' && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
              <Wrench className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">Cấu hình chung</h3>
              <p className="text-xs text-[#8888a0]">Đường dẫn dữ liệu và giá trị mặc định</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#8888a0] mb-2">Screaming Frog data path</label>
              <input
                type="text"
                value={config.screaming_frog_path}
                onChange={(e) => setConfig(c => ({ ...c, screaming_frog_path: e.target.value }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] font-mono text-sm"
              />
              <p className="text-xs text-[#8888a0] mt-1">Thư mục chứa dữ liệu crawl từ Screaming Frog</p>
            </div>

            <div>
              <label className="block text-sm text-[#8888a0] mb-2">Monthly target mặc định</label>
              <input
                type="number"
                value={config.default_monthly_target}
                onChange={(e) => setConfig(c => ({ ...c, default_monthly_target: e.target.value }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] font-mono text-sm"
                min="1"
              />
              <p className="text-xs text-[#8888a0] mt-1">Số bài target mặc định cho dự án mới</p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSaveConfig}
              disabled={isSavingConfig}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent/90 disabled:bg-accent/50 rounded-lg text-white font-medium text-sm"
            >
              <Save className="w-4 h-4" />
              {isSavingConfig ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: Dự án                                                       */}
      {/* ================================================================== */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {editingProject ? 'Chỉnh sửa dự án' : 'Thêm dự án mới'}
              </h3>
              <button onClick={() => setShowProjectModal(false)} className="p-1 text-[#8888a0] hover:text-[var(--text-primary)]"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-[#8888a0] mb-2">Tên dự án *</label>
                <input type="text" value={projectForm.name} onChange={(e) => setProjectForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="VD: BĐS Hà Nội" className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#8888a0] mb-2">Slug</label>
                  <input type="text" value={projectForm.slug} onChange={(e) => setProjectForm(f => ({ ...f, slug: e.target.value }))}
                    placeholder="bds-ha-noi" className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-[#8888a0] mb-2">Domain</label>
                  <input type="text" value={projectForm.domain} onChange={(e) => setProjectForm(f => ({ ...f, domain: e.target.value }))}
                    placeholder="example.com" className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#8888a0] mb-2">Link Google Sheet *</label>
                <input type="url" value={sheetUrlInput || (editingProject ? `https://docs.google.com/spreadsheets/d/${projectForm.sheet_id}` : '')}
                  onChange={(e) => handleSheetUrlChange(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm" />
                {projectForm.sheet_id && (
                  <p className="text-xs text-success mt-1 flex items-center gap-1"><Check className="w-3 h-3" />ID: {projectForm.sheet_id.substring(0, 20)}...</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#8888a0] mb-2">Tên Sheet</label>
                  <input type="text" value={projectForm.sheet_name} onChange={(e) => setProjectForm(f => ({ ...f, sheet_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-[#8888a0] mb-2">Target/tháng</label>
                  <input type="number" value={projectForm.monthly_target} onChange={(e) => setProjectForm(f => ({ ...f, monthly_target: parseInt(e.target.value) || 20 }))}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] font-mono text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#8888a0] mb-2">
                  <TrendingUp className="w-4 h-4 inline mr-1" />Link Sheet Ranking
                </label>
                <input type="url" value={projectForm.ranking_sheet_url} onChange={(e) => setProjectForm(f => ({ ...f, ranking_sheet_url: e.target.value }))}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-secondary/30">
              <button onClick={() => setShowProjectModal(false)} className="px-4 py-2 text-[#8888a0] text-sm">Hủy</button>
              <button onClick={handleSaveProject} disabled={isSavingProject || !projectForm.name || !projectForm.sheet_id}
                className="flex items-center gap-2 px-6 py-2 bg-accent disabled:bg-accent/50 rounded-lg text-white font-medium text-sm">
                <Save className="w-4 h-4" />{isSavingProject ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: Thành viên                                                  */}
      {/* ================================================================== */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {editingMember ? 'Chỉnh sửa thành viên' : 'Thêm thành viên'}
              </h3>
              <button onClick={() => setShowMemberModal(false)} className="p-1 text-[#8888a0] hover:text-[var(--text-primary)]"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#8888a0] mb-2">Tên *</label>
                  <input type="text" value={memberForm.name} onChange={(e) => setMemberForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nguyễn Văn A" className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-[#8888a0] mb-2">Nickname</label>
                  <input type="text" value={memberForm.nickname} onChange={(e) => setMemberForm(f => ({ ...f, nickname: e.target.value }))}
                    placeholder="VanA" className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#8888a0] mb-2">Role</label>
                  <select value={memberForm.role} onChange={(e) => setMemberForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm">
                    <option>Content Writer</option>
                    <option>SEO Specialist</option>
                    <option>Editor</option>
                    <option>Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#8888a0] mb-2">Đơn giá (VNĐ/bài)</label>
                  <input type="number" value={memberForm.salary_rate} onChange={(e) => setMemberForm(f => ({ ...f, salary_rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] font-mono text-sm" min="0" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#8888a0] mb-2">Dự án phụ trách</label>
                <div className="flex flex-wrap gap-2">
                  {projects.map((p) => (
                    <button key={p.id} type="button" onClick={() => toggleProjectForMember(p.id)}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        memberForm.projects.includes(p.id) ? 'bg-accent/20 border-accent text-accent' : 'bg-secondary border-border text-[#8888a0] hover:text-[var(--text-primary)]'
                      )}>
                      {p.name}
                    </button>
                  ))}
                  {projects.length === 0 && <p className="text-xs text-[#8888a0]">Chưa có dự án</p>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-secondary/30">
              <button onClick={() => setShowMemberModal(false)} className="px-4 py-2 text-[#8888a0] text-sm">Hủy</button>
              <button onClick={handleSaveMember} disabled={isSavingMember || !memberForm.name}
                className="flex items-center gap-2 px-6 py-2 bg-accent disabled:bg-accent/50 rounded-lg text-white font-medium text-sm">
                <Save className="w-4 h-4" />{isSavingMember ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
