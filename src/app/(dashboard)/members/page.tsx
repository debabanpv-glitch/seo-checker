'use client';

import { useState, useEffect } from 'react';
import { Users, CheckCircle2, Clock, Plus, Trash2, Pencil } from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import ProgressBar from '@/components/ProgressBar';
import { MemberStats, Project } from '@/types';
import { cn } from '@/lib/utils';

interface MemberInfo {
  id: string;
  name: string;
  nickname: string;
  role: string;
  projects: string[];
  start_date: string;
  email: string;
  phone: string;
  bank_name: string;
  bank_account: string;
}

type ViewType = 'day' | 'week' | 'month';

export default function MembersPage() {
  const [members, setMembers] = useState<MemberStats[]>([]);
  const [memberInfos, setMemberInfos] = useState<MemberInfo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewType, setViewType] = useState<ViewType>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberInfo | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, viewType]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [month, year] = selectedMonth.split('-');
      const [membersRes, projectsRes] = await Promise.all([
        fetch(`/api/members?month=${month}&year=${year}&view=${viewType}`),
        fetch('/api/projects'),
      ]);

      const membersData = await membersRes.json();
      const projectsData = await projectsRes.json();

      setMembers(membersData.members || []);
      setMemberInfos(membersData.memberInfos || []);
      setProjects(projectsData.projects || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMember = async (data: Partial<MemberInfo>) => {
    try {
      const method = editingMember ? 'PUT' : 'POST';
      const res = await fetch('/api/members', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingMember ? { ...editingMember, ...data } : data),
      });

      if (res.ok) {
        setShowAddModal(false);
        setEditingMember(null);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to save member:', error);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa thành viên này?')) return;

    try {
      const res = await fetch(`/api/members?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to delete member:', error);
    }
  };

  // Generate month options
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      value: `${date.getMonth() + 1}-${date.getFullYear()}`,
      label: `T${date.getMonth() + 1}/${date.getFullYear()}`,
    });
  }

  // Get member info by name
  const getMemberInfo = (name: string) => {
    return memberInfos.find((m) => m.name === name);
  };

  // Get project names by IDs
  const getProjectNames = (projectIds: string[] | undefined | null) => {
    if (!projectIds || !Array.isArray(projectIds)) return [];
    return projects
      .filter((p) => projectIds.includes(p.id))
      .map((p) => p.name);
  };

  // Get view label
  const getViewLabel = () => {
    if (viewType === 'day') return 'Hôm nay';
    if (viewType === 'week') return 'Tuần này';
    return selectedMonth.split('-').map((s, i) => i === 0 ? `T${s}` : s).join('/');
  };

  // Calculate totals
  const totalPublished = members.reduce((sum, m) => sum + m.published, 0);
  const totalInProgress = members.reduce((sum, m) => sum + m.inProgress, 0);

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-4">
      {/* Header - Compact */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white">Thành viên</h1>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex gap-1 p-1 bg-card border border-border rounded-lg">
            <button
              onClick={() => setViewType('day')}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors",
                viewType === 'day' ? 'bg-accent text-white' : 'text-[#8888a0] hover:text-white'
              )}
            >
              Ngày
            </button>
            <button
              onClick={() => setViewType('week')}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors",
                viewType === 'week' ? 'bg-accent text-white' : 'text-[#8888a0] hover:text-white'
              )}
            >
              Tuần
            </button>
            <button
              onClick={() => setViewType('month')}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors",
                viewType === 'month' ? 'bg-accent text-white' : 'text-[#8888a0] hover:text-white'
              )}
            >
              Tháng
            </button>
          </div>

          {viewType === 'month' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-card border border-border rounded-lg text-white text-sm"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => {
              setEditingMember(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Thêm
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-accent" />
            <span className="text-white font-bold text-lg">{members.length}</span>
            <span className="text-[#8888a0] text-sm">người</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-success font-bold">{totalPublished}</span>
            <span className="text-[#8888a0] text-sm">publish ({getViewLabel()})</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-warning font-bold">{totalInProgress}</span>
            <span className="text-[#8888a0] text-sm">đang làm</span>
          </div>
        </div>
      </div>

      {/* Members Table */}
      {members.length > 0 ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary text-left">
                <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase">Thành viên</th>
                <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase">Dự án</th>
                <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Tổng</th>
                <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Publish</th>
                <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Đang làm</th>
                <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Đúng hạn</th>
                <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase">KPI</th>
                <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((member) => {
                const info = getMemberInfo(member.name);
                const projectNames = info?.projects ? getProjectNames(info.projects) : [];
                const kpiTarget = viewType === 'day' ? 1 : viewType === 'week' ? 5 : 20;

                return (
                  <tr key={member.name} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-accent font-bold text-sm">
                            {member.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{member.name}</p>
                          <p className="text-xs text-[#8888a0]">{info?.role || 'Content Writer'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {projectNames.length > 0 ? (
                          projectNames.slice(0, 2).map((name) => (
                            <span key={name} className="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs">
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[#8888a0] text-xs">-</span>
                        )}
                        {projectNames.length > 2 && (
                          <span className="text-[#8888a0] text-xs">+{projectNames.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-white font-mono">{member.totalThisMonth}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-success font-bold font-mono">{member.published}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-warning font-mono">{member.inProgress}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "font-mono",
                        member.onTimeRate >= 80 ? "text-success" : member.onTimeRate >= 50 ? "text-warning" : "text-danger"
                      )}>
                        {member.onTimeRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16">
                          <ProgressBar value={member.published} max={kpiTarget} showLabel={false} size="sm" />
                        </div>
                        <span className="text-xs text-[#8888a0] w-12">
                          {member.published}/{kpiTarget}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {info && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingMember(info);
                              setShowAddModal(true);
                            }}
                            className="p-1.5 text-[#8888a0] hover:text-accent transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => info.id && handleDeleteMember(info.id)}
                            className="p-1.5 text-[#8888a0] hover:text-danger transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={viewType === 'day' ? 'Chưa có dữ liệu hôm nay' : viewType === 'week' ? 'Chưa có dữ liệu tuần này' : 'Chưa có dữ liệu thành viên'}
          description="Sync dữ liệu từ Google Sheets để xem thống kê"
        />
      )}

      {/* Add/Edit Member Modal */}
      {showAddModal && (
        <MemberModal
          member={editingMember}
          projects={projects}
          onClose={() => {
            setShowAddModal(false);
            setEditingMember(null);
          }}
          onSave={handleSaveMember}
        />
      )}
    </div>
  );
}

function MemberModal({
  member,
  projects,
  onClose,
  onSave,
}: {
  member: MemberInfo | null;
  projects: Project[];
  onClose: () => void;
  onSave: (data: Partial<MemberInfo>) => void;
}) {
  const [formData, setFormData] = useState({
    name: member?.name || '',
    nickname: member?.nickname || '',
    role: member?.role || 'Content Writer',
    projects: member?.projects || [],
    start_date: member?.start_date || '',
    email: member?.email || '',
    phone: member?.phone || '',
    bank_name: member?.bank_name || '',
    bank_account: member?.bank_account || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSave(formData);
    setIsSubmitting(false);
  };

  const toggleProject = (projectId: string) => {
    setFormData((prev) => ({
      ...prev,
      projects: prev.projects.includes(projectId)
        ? prev.projects.filter((p) => p !== projectId)
        : [...prev.projects, projectId],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-white mb-6">
          {member ? 'Chỉnh sửa thành viên' : 'Thêm thành viên'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#8888a0] mb-2">Họ tên</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Nguyễn Văn A"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-white placeholder-[#8888a0] text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-2">Bí danh</label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="VD: Ky"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-white placeholder-[#8888a0] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#8888a0] mb-2">Vai trò</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-white text-sm"
              >
                <option value="Content Writer">Content Writer</option>
                <option value="SEO Specialist">SEO Specialist</option>
                <option value="Editor">Editor</option>
                <option value="Manager">Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-2">Ngày bắt đầu</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#8888a0] mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-white placeholder-[#8888a0] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-2">SĐT (Zalo)</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0912345678"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-white placeholder-[#8888a0] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#8888a0] mb-2">Ngân hàng</label>
              <select
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-white text-sm"
              >
                <option value="">Chọn ngân hàng</option>
                <option value="Vietcombank">Vietcombank</option>
                <option value="Techcombank">Techcombank</option>
                <option value="BIDV">BIDV</option>
                <option value="VietinBank">VietinBank</option>
                <option value="ACB">ACB</option>
                <option value="MB Bank">MB Bank</option>
                <option value="TPBank">TPBank</option>
                <option value="Sacombank">Sacombank</option>
                <option value="VPBank">VPBank</option>
                <option value="HDBank">HDBank</option>
                <option value="OCB">OCB</option>
                <option value="SHB">SHB</option>
                <option value="Agribank">Agribank</option>
                <option value="Momo">Momo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-2">Số tài khoản</label>
              <input
                type="text"
                value={formData.bank_account}
                onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                placeholder="1234567890"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-white placeholder-[#8888a0] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#8888a0] mb-2">Dự án phụ trách</label>
            <div className="flex flex-wrap gap-2">
              {projects.map((project) => (
                <label
                  key={project.id}
                  className={cn(
                    "px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-sm",
                    formData.projects.includes(project.id)
                      ? "bg-accent text-white"
                      : "bg-secondary text-[#8888a0] hover:text-white"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={formData.projects.includes(project.id)}
                    onChange={() => toggleProject(project.id)}
                    className="hidden"
                  />
                  {project.name}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 sticky bottom-0 bg-card">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-secondary hover:bg-border rounded-lg text-white font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-accent hover:bg-accent/90 disabled:bg-accent/50 rounded-lg text-white font-medium transition-colors"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
