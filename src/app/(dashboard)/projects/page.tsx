'use client';

import { useState, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Trash2,
  ExternalLink,
  Edit2,
  X,
  ChevronDown,
  ChevronUp,
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
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
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
      label: `T${date.getMonth() + 1}/${date.getFullYear()}`,
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
  const overallProgress = totalTarget > 0 ? Math.round((totalPublished / totalTarget) * 100) : 0;

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-4">
      {/* Header - Compact */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white">Dự án</h1>
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Thêm
          </button>
        </div>
      </div>

      {/* Summary - Single Row */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <FolderKanban className="w-5 h-5 text-accent" />
            <span className="text-white font-bold text-lg">{projects.length}</span>
            <span className="text-[#8888a0] text-sm">dự án</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-success font-bold">{totalPublished}</span>
            <span className="text-[#8888a0]">/</span>
            <span className="text-white">{totalTarget}</span>
            <span className="text-[#8888a0] text-sm">publish</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-warning font-bold">{totalInProgress}</span>
            <span className="text-[#8888a0] text-sm">đang làm</span>
          </div>
          {totalOverdue > 0 && (
            <>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-danger font-bold">{totalOverdue}</span>
                <span className="text-[#8888a0] text-sm">trễ hạn</span>
              </div>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="w-24">
              <ProgressBar value={totalPublished} max={totalTarget} showLabel={false} size="sm" />
            </div>
            <span className={cn(
              "font-bold text-sm",
              overallProgress >= 100 ? "text-success" : overallProgress >= 70 ? "text-warning" : "text-white"
            )}>
              {overallProgress}%
            </span>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      {projects.length > 0 ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary text-left">
                <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase">Dự án</th>
                <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Target</th>
                <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Publish</th>
                <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Đang làm</th>
                <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Chờ pub</th>
                <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Trễ</th>
                <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase">Tiến độ</th>
                <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((project) => {
                const progress = project.target > 0 ? Math.round((project.actual / project.target) * 100) : 0;
                const isExpanded = expandedProject === project.id;

                return (
                  <>
                    <tr key={project.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                          className="flex items-center gap-2 text-left"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[#8888a0]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[#8888a0]" />
                          )}
                          <span className="text-white font-medium">{project.name}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-white font-mono">{project.target}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-success font-bold font-mono">{project.actual}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-warning font-mono">{project.inProgress}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-accent font-mono">{project.doneQC}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {project.overdue > 0 ? (
                          <span className="text-danger font-mono">{project.overdue}</span>
                        ) : (
                          <span className="text-[#8888a0]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20">
                            <ProgressBar value={project.actual} max={project.target} showLabel={false} size="sm" />
                          </div>
                          <span className={cn(
                            "text-xs font-bold w-10",
                            progress >= 100 ? "text-success" : progress >= 70 ? "text-warning" : "text-white"
                          )}>
                            {progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${project.sheet_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-[#8888a0] hover:text-accent transition-colors"
                            title="Mở Sheet"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => setEditingProject(project)}
                            className="p-1.5 text-[#8888a0] hover:text-white transition-colors"
                            title="Sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
                            className="p-1.5 text-[#8888a0] hover:text-danger transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Details */}
                    {isExpanded && (
                      <tr key={`${project.id}-details`}>
                        <td colSpan={8} className="px-4 py-3 bg-secondary/30">
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div>
                              <span className="text-[#8888a0]">Sheet: </span>
                              <span className="text-white">{project.sheet_name}</span>
                            </div>
                            <div>
                              <span className="text-[#8888a0]">Tổng tasks: </span>
                              <span className="text-white">{project.totalTasks}</span>
                            </div>
                            <div>
                              <span className="text-[#8888a0]">Tháng này: </span>
                              <span className="text-white">{project.thisMonthTotal} tasks</span>
                            </div>
                            {project.pics.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[#8888a0]">Team: </span>
                                <div className="flex gap-1">
                                  {project.pics.map((pic) => (
                                    <span key={pic} className="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs">
                                      {pic}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="Chưa có dự án nào"
          description="Thêm dự án đầu tiên để bắt đầu theo dõi"
          action={
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white font-medium"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#8888a0] mb-2">Tên Sheet</label>
              <input
                type="text"
                value={formData.sheet_name}
                onChange={(e) => setFormData({ ...formData, sheet_name: e.target.value })}
                placeholder="Content"
                className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-white placeholder-[#8888a0]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-2">Target/tháng</label>
              <input
                type="number"
                value={formData.monthly_target}
                onChange={(e) => setFormData({ ...formData, monthly_target: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-white"
                min="1"
              />
            </div>
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
              {isSubmitting ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Thêm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
