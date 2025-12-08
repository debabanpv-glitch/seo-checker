'use client';

import { useState, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit2,
  X,
  Target,
  FileText,
  TrendingUp,
} from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Project } from '@/types';
import { cn } from '@/lib/utils';

interface ProjectWithStats extends Project {
  actual: number;
  target: number;
  totalTasks: number;
  thisMonthTotal: number;
  inProgress: number;
  doneQC: number;
  overdue: number;
  pics: string[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithStats | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });

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

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const [month, year] = selectedMonth.split('-');
      const res = await fetch(`/api/projects?month=${month}&year=${year}`);
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa dự án sẽ xóa tất cả tasks liên quan. Bạn có chắc chắn?')) return;

    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const totalPublished = projects.reduce((sum, p) => sum + p.actual, 0);
  const totalTarget = projects.reduce((sum, p) => sum + p.target, 0);
  const totalInProgress = projects.reduce((sum, p) => sum + p.inProgress, 0);
  const totalOverdue = projects.reduce((sum, p) => sum + p.overdue, 0);

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý Dự án</h1>
          <p className="text-[#8888a0] text-sm">Theo dõi tiến độ và quản lý các dự án content</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#8888a0]" />
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
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm dự án
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{projects.length}</p>
              <p className="text-xs text-[#8888a0]">Dự án</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {totalPublished}/{totalTarget}
              </p>
              <p className="text-xs text-[#8888a0]">Đã publish/Target</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalInProgress}</p>
              <p className="text-xs text-[#8888a0]">Đang thực hiện</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-danger/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-danger" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalOverdue}</p>
              <p className="text-xs text-[#8888a0]">Trễ deadline</p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      {projects.length > 0 ? (
        <div className="space-y-4">
          {projects.map((project) => {
            const progressPercent = project.target > 0
              ? Math.round((project.actual / project.target) * 100)
              : 0;
            const isOnTrack = progressPercent >= 50 || project.actual >= project.target;

            return (
              <div
                key={project.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Project Header */}
                <div className="p-4 sm:p-6 border-b border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                        <FolderKanban className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                        <p className="text-sm text-[#8888a0]">
                          Sheet: {project.sheet_name} • {project.totalTasks} tasks tổng
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${project.sheet_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-[#8888a0] hover:text-accent transition-colors"
                        title="Mở Google Sheet"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                      <button
                        onClick={() => setEditingProject(project)}
                        className="p-2 text-[#8888a0] hover:text-white transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="p-2 text-[#8888a0] hover:text-danger transition-colors"
                        title="Xóa dự án"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Project Stats */}
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    {/* Target Progress */}
                    <div className="col-span-2 lg:col-span-1 bg-secondary/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-accent" />
                        <span className="text-sm text-[#8888a0]">Target</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {project.actual}/{project.target}
                      </p>
                      <p className="text-xs text-[#8888a0]">bài publish</p>
                    </div>

                    {/* This Month Total */}
                    <div className="bg-secondary/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-accent" />
                        <span className="text-sm text-[#8888a0]">Tháng này</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{project.thisMonthTotal}</p>
                      <p className="text-xs text-[#8888a0]">tasks</p>
                    </div>

                    {/* In Progress */}
                    <div className="bg-secondary/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-warning" />
                        <span className="text-sm text-[#8888a0]">Đang làm</span>
                      </div>
                      <p className="text-2xl font-bold text-warning">{project.inProgress}</p>
                      <p className="text-xs text-[#8888a0]">tasks</p>
                    </div>

                    {/* Done QC */}
                    <div className="bg-secondary/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span className="text-sm text-[#8888a0]">Chờ publish</span>
                      </div>
                      <p className="text-2xl font-bold text-success">{project.doneQC}</p>
                      <p className="text-xs text-[#8888a0]">tasks</p>
                    </div>

                    {/* Overdue */}
                    <div className="bg-secondary/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-danger" />
                        <span className="text-sm text-[#8888a0]">Trễ hạn</span>
                      </div>
                      <p className="text-2xl font-bold text-danger">{project.overdue}</p>
                      <p className="text-xs text-[#8888a0]">tasks</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#8888a0]">Tiến độ target</span>
                      <div className="flex items-center gap-2">
                        <TrendingUp className={cn(
                          "w-4 h-4",
                          isOnTrack ? "text-success" : "text-warning"
                        )} />
                        <span className={cn(
                          "text-sm font-medium",
                          isOnTrack ? "text-success" : "text-warning"
                        )}>
                          {progressPercent}%
                        </span>
                      </div>
                    </div>
                    <ProgressBar value={project.actual} max={project.target} />
                  </div>

                  {/* Team Members */}
                  {project.pics.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-[#8888a0]" />
                        <span className="text-sm text-[#8888a0]">Thành viên:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {project.pics.map((pic) => (
                          <span
                            key={pic}
                            className="px-3 py-1 bg-secondary rounded-full text-sm text-white"
                          >
                            {pic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="Chưa có dự án nào"
          description="Thêm dự án đầu tiên để bắt đầu theo dõi tiến độ content"
          action={
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white font-medium transition-colors"
            >
              Thêm dự án
            </button>
          }
        />
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <ProjectModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchProjects();
          }}
        />
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <ProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSuccess={() => {
            setEditingProject(null);
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}

function ProjectModal({
  project,
  onClose,
  onSuccess,
}: {
  project?: ProjectWithStats;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = !!project;
  const [formData, setFormData] = useState({
    name: project?.name || '',
    sheet_id: project?.sheet_id || '',
    sheet_name: project?.sheet_name || 'Content',
    monthly_target: project?.monthly_target || 20,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/projects', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { id: project.id, ...formData } : formData),
      });

      if (res.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {isEditing ? 'Chỉnh sửa dự án' : 'Thêm dự án mới'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-[#8888a0] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#8888a0] mb-2">Tên dự án</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Samcotech"
              className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-white placeholder-[#8888a0]"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[#8888a0] mb-2">Google Sheet ID</label>
            <input
              type="text"
              value={formData.sheet_id}
              onChange={(e) => setFormData({ ...formData, sheet_id: e.target.value })}
              placeholder="19FcF4TUJmFpTt..."
              className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-white placeholder-[#8888a0]"
              required
            />
            <p className="text-xs text-[#8888a0] mt-1">
              Lấy từ URL: docs.google.com/spreadsheets/d/<span className="text-accent">SHEET_ID</span>/edit
            </p>
          </div>

          <div>
            <label className="block text-sm text-[#8888a0] mb-2">Tên Sheet</label>
            <input
              type="text"
              value={formData.sheet_name}
              onChange={(e) => setFormData({ ...formData, sheet_name: e.target.value })}
              placeholder="Content"
              className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-white placeholder-[#8888a0]"
            />
            <p className="text-xs text-[#8888a0] mt-1">
              Tên tab sheet chứa dữ liệu content (mặc định: Content)
            </p>
          </div>

          <div>
            <label className="block text-sm text-[#8888a0] mb-2">Target mặc định (bài/tháng)</label>
            <input
              type="number"
              value={formData.monthly_target}
              onChange={(e) => setFormData({ ...formData, monthly_target: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-white"
              min="1"
            />
            <p className="text-xs text-[#8888a0] mt-1">
              Có thể tùy chỉnh target từng tháng trong Cài đặt
            </p>
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
              {isSubmitting ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Thêm dự án'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
