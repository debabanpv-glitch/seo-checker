'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Target,
  Plus,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  Tag,
  User,
  Calendar,
  Loader2,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Project } from '@/types';
import { cn } from '@/lib/utils';

interface StrategyPhase {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'blocked';
  start_date?: string;
  end_date?: string;
  order_index: number;
  created_at: string;
}

interface StrategyAction {
  id: string;
  phase_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'doing' | 'done' | 'blocked';
  category?: string;
  assigned_to?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

const PHASE_STATUS_CONFIG = {
  planned: { label: 'Kế hoạch', color: 'bg-gray-500/20 text-gray-400', icon: Clock },
  in_progress: { label: 'Đang thực hiện', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  completed: { label: 'Hoàn thành', color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
  blocked: { label: 'Bị chặn', color: 'bg-red-500/20 text-red-400', icon: XCircle },
};

const ACTION_STATUS_CONFIG = {
  todo: { label: 'Chờ làm', color: 'bg-gray-500/20 text-gray-400' },
  doing: { label: 'Đang làm', color: 'bg-yellow-500/20 text-yellow-400' },
  done: { label: 'Xong', color: 'bg-green-500/20 text-green-400' },
  blocked: { label: 'Bị chặn', color: 'bg-red-500/20 text-red-400' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Thấp', color: 'text-gray-400' },
  medium: { label: 'Trung bình', color: 'text-yellow-400' },
  high: { label: 'Cao', color: 'text-red-400' },
};

export default function SeoStrategyPhasesAndActionsManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [phases, setPhases] = useState<StrategyPhase[]>([]);
  const [actions, setActions] = useState<Record<string, StrategyAction[]>>({});
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [loadingPhases, setLoadingPhases] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [showAddAction, setShowAddAction] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/v1/projects');
      const data = await res.json();
      const projectList = data.projects || [];
      setProjects(projectList);
      if (projectList.length > 0) {
        setSelectedProjectId(projectList[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPhases = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/strategy/phases?project_id=${projectId}`);
      const data = await res.json();
      setPhases(data.phases || []);
    } catch (err) {
      console.error('Failed to fetch phases:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchPhases(selectedProjectId);
      setExpandedPhases(new Set());
      setActions({});
    }
  }, [selectedProjectId, fetchPhases]);

  const fetchActions = async (phaseId: string) => {
    if (actions[phaseId]) return;
    setLoadingPhases((prev) => new Set(prev).add(phaseId));
    try {
      const res = await fetch(`/api/v1/strategy/actions?phase_id=${phaseId}`);
      const data = await res.json();
      setActions((prev) => ({ ...prev, [phaseId]: data.actions || [] }));
    } catch (err) {
      console.error('Failed to fetch actions:', err);
    } finally {
      setLoadingPhases((prev) => {
        const next = new Set(prev);
        next.delete(phaseId);
        return next;
      });
    }
  };

  const togglePhase = (phaseId: string) => {
    const next = new Set(expandedPhases);
    if (next.has(phaseId)) {
      next.delete(phaseId);
    } else {
      next.add(phaseId);
      fetchActions(phaseId);
    }
    setExpandedPhases(next);
  };

  const handleUpdateActionStatus = async (
    actionId: string,
    phaseId: string,
    status: StrategyAction['status']
  ) => {
    try {
      await fetch(`/api/v1/strategy/actions/${actionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setActions((prev) => ({
        ...prev,
        [phaseId]: (prev[phaseId] || []).map((a) =>
          a.id === actionId ? { ...a, status } : a
        ),
      }));
    } catch (err) {
      console.error('Failed to update action:', err);
    }
  };

  const getPhaseProgress = (phaseId: string) => {
    const phaseActions = actions[phaseId] || [];
    if (phaseActions.length === 0) return 0;
    const done = phaseActions.filter((a) => a.status === 'done').length;
    return Math.round((done / phaseActions.length) * 100);
  };

  if (isLoading && projects.length === 0) return <PageLoading />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Chiến lược SEO</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAddPhase(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Thêm Phase
          </button>
        </div>
      </div>

      {/* Phases */}
      {isLoading ? (
        <PageLoading />
      ) : phases.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Chưa có phase chiến lược"
          description="Tạo phase đầu tiên để bắt đầu lên kế hoạch SEO"
          action={
            <button
              onClick={() => setShowAddPhase(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Thêm Phase
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {phases.map((phase) => {
            const isExpanded = expandedPhases.has(phase.id);
            const isLoadingActions = loadingPhases.has(phase.id);
            const phaseActions = actions[phase.id] || [];
            const progress = getPhaseProgress(phase.id);
            const statusConfig = PHASE_STATUS_CONFIG[phase.status];
            const StatusIcon = statusConfig.icon;

            return (
              <div key={phase.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Phase Header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/40 transition-colors"
                  onClick={() => togglePhase(phase.id)}
                >
                  <span className="text-[#8888a0] flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[var(--text-primary)]">{phase.name}</h3>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1', statusConfig.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#8888a0]">
                      {phase.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(phase.start_date).toLocaleDateString('vi-VN')}
                          {phase.end_date && ` → ${new Date(phase.end_date).toLocaleDateString('vi-VN')}`}
                        </span>
                      )}
                      {isExpanded && phaseActions.length > 0 && (
                        <span>{phaseActions.filter((a) => a.status === 'done').length}/{phaseActions.length} việc xong</span>
                      )}
                    </div>
                  </div>

                  {isExpanded && phaseActions.length > 0 && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#8888a0] w-8 text-right">{progress}%</span>
                    </div>
                  )}
                </div>

                {/* Expanded Actions */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {isLoadingActions ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 text-accent animate-spin" />
                      </div>
                    ) : (
                      <>
                        {phaseActions.length > 0 ? (
                          <div className="divide-y divide-border">
                            {phaseActions.map((action) => {
                              const actionStatus = ACTION_STATUS_CONFIG[action.status];
                              const priority = PRIORITY_CONFIG[action.priority];
                              return (
                                <div
                                  key={action.id}
                                  className="flex items-start gap-3 px-6 py-3 hover:bg-secondary/30 transition-colors"
                                >
                                  <select
                                    value={action.status}
                                    onChange={(e) =>
                                      handleUpdateActionStatus(
                                        action.id,
                                        phase.id,
                                        e.target.value as StrategyAction['status']
                                      )
                                    }
                                    className={cn(
                                      'px-2 py-0.5 rounded text-xs font-medium border-0 cursor-pointer flex-shrink-0 mt-0.5',
                                      actionStatus.color
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="todo">Chờ làm</option>
                                    <option value="doing">Đang làm</option>
                                    <option value="done">Xong</option>
                                    <option value="blocked">Bị chặn</option>
                                  </select>

                                  <div className="flex-1 min-w-0">
                                    <p
                                      className={cn(
                                        'text-sm font-medium',
                                        action.status === 'done'
                                          ? 'text-[#8888a0] line-through'
                                          : 'text-[var(--text-primary)]'
                                      )}
                                    >
                                      {action.title}
                                    </p>
                                    {action.description && (
                                      <p className="text-xs text-[#8888a0] mt-0.5 truncate">{action.description}</p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      {action.category && (
                                        <span className="flex items-center gap-1 text-xs text-[#8888a0]">
                                          <Tag className="w-3 h-3" />
                                          {action.category}
                                        </span>
                                      )}
                                      {action.assigned_to && (
                                        <span className="flex items-center gap-1 text-xs text-[#8888a0]">
                                          <User className="w-3 h-3" />
                                          {action.assigned_to}
                                        </span>
                                      )}
                                      <span className={cn('text-xs font-medium', priority.color)}>
                                        {priority.label}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-6 text-center text-sm text-[#8888a0]">
                            Chưa có action nào
                          </div>
                        )}
                        <div className="px-6 py-3 border-t border-border">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAddAction(phase.id);
                            }}
                            className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Thêm action
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddPhase && (
        <AddPhaseModal
          projectId={selectedProjectId}
          onClose={() => setShowAddPhase(false)}
          onSaved={() => {
            setShowAddPhase(false);
            fetchPhases(selectedProjectId);
          }}
        />
      )}

      {showAddAction && (
        <AddActionModal
          phaseId={showAddAction}
          onClose={() => setShowAddAction(null)}
          onSaved={() => {
            const phaseId = showAddAction;
            setShowAddAction(null);
            setActions((prev) => {
              const next = { ...prev };
              delete next[phaseId];
              return next;
            });
            fetchActions(phaseId);
          }}
        />
      )}
    </div>
  );
}

function AddPhaseModal({
  projectId,
  onClose,
  onSaved,
}: {
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'planned' as StrategyPhase['status'],
    start_date: '',
    end_date: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/v1/strategy/phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, project_id: projectId }),
      });
      if (res.ok) onSaved();
    } catch (err) {
      console.error('Failed to create phase:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-5">Thêm Phase chiến lược</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#8888a0] mb-1.5">Tên phase *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Phase 1 - Nghiên cứu từ khóa"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-[#8888a0] mb-1.5">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8888a0] mb-1.5">Trạng thái</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as StrategyPhase['status'] })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
            >
              <option value="planned">Kế hoạch</option>
              <option value="in_progress">Đang thực hiện</option>
              <option value="completed">Hoàn thành</option>
              <option value="blocked">Bị chặn</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#8888a0] mb-1.5">Ngày bắt đầu</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1.5">Ngày kết thúc</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-secondary hover:bg-border rounded-lg text-[var(--text-primary)] text-sm font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddActionModal({
  phaseId,
  onClose,
  onSaved,
}: {
  phaseId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo' as StrategyAction['status'],
    category: '',
    assigned_to: '',
    priority: 'medium' as StrategyAction['priority'],
    due_date: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/v1/strategy/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, phase_id: phaseId }),
      });
      if (res.ok) onSaved();
    } catch (err) {
      console.error('Failed to create action:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-5">Thêm Action</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#8888a0] mb-1.5">Tiêu đề *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="VD: Phân tích từ khóa head term"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-[#8888a0] mb-1.5">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#8888a0] mb-1.5">Danh mục</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="VD: Technical SEO"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1.5">Người phụ trách</label>
              <input
                type="text"
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                placeholder="Tên thành viên"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#8888a0] mb-1.5">Độ ưu tiên</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as StrategyAction['priority'] })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
              >
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1.5">Deadline</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-secondary hover:bg-border rounded-lg text-[var(--text-primary)] text-sm font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
