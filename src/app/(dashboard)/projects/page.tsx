'use client';

import { useState, useEffect } from 'react';
import { FolderKanban, Plus, Trash2, ExternalLink } from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Project } from '@/types';

interface ProjectWithStats extends Project {
  actual: number;
  target: number;
  totalTasks: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa dự án này?')) return;

    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dự án</h1>
          <p className="text-[#8888a0] text-sm">Quản lý các dự án content</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm dự án
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-card border border-border rounded-xl p-6 card-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{project.name}</h3>
                    <p className="text-xs text-[#8888a0]">{project.totalTasks} tasks</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="p-2 text-[#8888a0] hover:text-danger transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <ProgressBar value={project.actual} max={project.target} />

                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8888a0]">Target tháng này</span>
                  <span className="text-white font-medium">{project.target} bài</span>
                </div>

                <div className="pt-4 border-t border-border">
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${project.sheet_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-accent hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Xem Google Sheet
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="Chưa có dự án nào"
          description="Thêm dự án đầu tiên để bắt đầu theo dõi"
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
        <AddProjectModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}

function AddProjectModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    sheet_id: '',
    sheet_name: 'Content',
    monthly_target: 20,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to add project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-white mb-6">Thêm dự án mới</h2>

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
          </div>

          <div>
            <label className="block text-sm text-[#8888a0] mb-2">Target hàng tháng</label>
            <input
              type="number"
              value={formData.monthly_target}
              onChange={(e) => setFormData({ ...formData, monthly_target: parseInt(e.target.value) })}
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
              {isSubmitting ? 'Đang thêm...' : 'Thêm dự án'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
