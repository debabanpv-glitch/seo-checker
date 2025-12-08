'use client';

import { useState, useEffect } from 'react';
import { Users, FileText, CheckCircle2, Clock, TrendingUp, Plus, Trash2, Calendar, Pencil } from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import ProgressBar from '@/components/ProgressBar';
import { MemberStats, Project } from '@/types';
import { formatDate } from '@/lib/utils';

interface MemberInfo {
  id: string;
  name: string;
  role: string;
  projects: string[];
  start_date: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberStats[]>([]);
  const [memberInfos, setMemberInfos] = useState<MemberInfo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberInfo | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [month, year] = selectedMonth.split('-');
      const [membersRes, projectsRes] = await Promise.all([
        fetch(`/api/members?month=${month}&year=${year}`),
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
      label: `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
    });
  }

  // Get member info by name
  const getMemberInfo = (name: string) => {
    return memberInfos.find((m) => m.name === name);
  };

  // Get project names by IDs
  const getProjectNames = (projectIds: string[]) => {
    return projects
      .filter((p) => projectIds.includes(p.id))
      .map((p) => p.name);
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Thành viên</h1>
          <p className="text-[#8888a0] text-sm">Thống kê hiệu suất từng người</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-card border border-border rounded-lg text-white"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setEditingMember(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm
          </button>
        </div>
      </div>

      {/* Members Grid */}
      {members.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => {
            const info = getMemberInfo(member.name);
            const projectNames = info?.projects ? getProjectNames(info.projects) : [];

            return (
              <div
                key={member.name}
                className="bg-card border border-border rounded-xl p-6 card-hover"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                      <span className="text-accent font-bold text-lg">
                        {member.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{member.name}</h3>
                      <p className="text-xs text-[#8888a0]">{info?.role || 'Content Writer'}</p>
                    </div>
                  </div>
                  {info && (
                    <div className="flex gap-1">
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
                </div>

                {/* Project & Start Date Info */}
                {(projectNames.length > 0 || info?.start_date) && (
                  <div className="mb-4 p-3 bg-secondary rounded-lg space-y-2">
                    {projectNames.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-[#8888a0] w-16 flex-shrink-0">Dự án:</span>
                        <div className="flex flex-wrap gap-1">
                          {projectNames.map((name) => (
                            <span key={name} className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {info?.start_date && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#8888a0] w-16 flex-shrink-0">Bắt đầu:</span>
                        <span className="text-xs text-white flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(info.start_date)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-secondary rounded-lg p-3">
                    <div className="flex items-center gap-2 text-[#8888a0] text-xs mb-1">
                      <FileText className="w-3 h-3" />
                      Tổng bài
                    </div>
                    <p className="text-white font-bold font-mono text-lg">
                      {member.totalThisMonth}
                    </p>
                  </div>
                  <div className="bg-secondary rounded-lg p-3">
                    <div className="flex items-center gap-2 text-[#8888a0] text-xs mb-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Đã publish
                    </div>
                    <p className="text-success font-bold font-mono text-lg">
                      {member.published}
                    </p>
                  </div>
                  <div className="bg-secondary rounded-lg p-3">
                    <div className="flex items-center gap-2 text-[#8888a0] text-xs mb-1">
                      <Clock className="w-3 h-3" />
                      Đang làm
                    </div>
                    <p className="text-warning font-bold font-mono text-lg">
                      {member.inProgress}
                    </p>
                  </div>
                  <div className="bg-secondary rounded-lg p-3">
                    <div className="flex items-center gap-2 text-[#8888a0] text-xs mb-1">
                      <TrendingUp className="w-3 h-3" />
                      Đúng hạn
                    </div>
                    <p className="text-accent font-bold font-mono text-lg">
                      {member.onTimeRate}%
                    </p>
                  </div>
                </div>

                {/* Progress to KPI */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#8888a0]">Tiến độ KPI</span>
                    <span className="text-white">{member.published}/20</span>
                  </div>
                  <ProgressBar value={member.published} max={20} showLabel={false} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Chưa có dữ liệu thành viên"
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
    role: member?.role || 'Content Writer',
    projects: member?.projects || [],
    start_date: member?.start_date || '',
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#8888a0] mb-2">Tên</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Nguyễn Văn A"
              className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-white placeholder-[#8888a0]"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[#8888a0] mb-2">Vai trò</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-white"
            >
              <option value="Content Writer">Content Writer</option>
              <option value="SEO Specialist">SEO Specialist</option>
              <option value="Editor">Editor</option>
              <option value="Manager">Manager</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#8888a0] mb-2">Dự án phụ trách</label>
            <div className="space-y-2 max-h-[150px] overflow-y-auto">
              {projects.map((project) => (
                <label
                  key={project.id}
                  className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-border transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.projects.includes(project.id)}
                    onChange={() => toggleProject(project.id)}
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="text-white">{project.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#8888a0] mb-2">Ngày bắt đầu</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-white"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-secondary hover:bg-border rounded-lg text-white font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-accent hover:bg-accent/90 disabled:bg-accent/50 rounded-lg text-white font-medium transition-colors"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
