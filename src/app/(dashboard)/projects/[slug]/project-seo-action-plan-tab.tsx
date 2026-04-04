'use client';

import { useState, useEffect } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  Target,
  TrendingUp,
  Clock,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardData } from './project-seo-dashboard-page';

// --- Types matching strategy DB ---
interface StrategyPhase {
  id: string;
  name: string;
  description: string | null;
  phase_type: string;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  status: string; // planned | in_progress | completed | blocked
  progress: number;
  created_at: string;
}

interface StrategyAction {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string; // critical | high | medium | low
  assigned_to: string | null;
  status: string; // todo | doing | done | blocked
  due_date: string | null;
  completed_date: string | null;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  todo: { icon: <Circle className="w-3.5 h-3.5" />, color: 'text-[#8888a0]', label: 'To Do' },
  doing: { icon: <Clock className="w-3.5 h-3.5" />, color: 'text-accent', label: 'Đang làm' },
  done: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-success', label: 'Xong' },
  blocked: { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-danger', label: 'Blocked' },
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-danger/20 text-danger border-danger/30',
  high: 'bg-danger/20 text-danger border-danger/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  low: 'bg-success/20 text-success border-success/30',
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: 'Critical',
  high: 'Cao',
  medium: 'TB',
  low: 'Thấp',
};

const PHASE_COLORS = [
  { color: '#ef4444', bg: 'bg-danger/10 border-danger/20' },
  { color: '#f59e0b', bg: 'bg-warning/10 border-warning/20' },
  { color: '#22c55e', bg: 'bg-success/10 border-success/20' },
  { color: '#6366f1', bg: 'bg-accent/10 border-accent/20' },
  { color: '#8b5cf6', bg: 'bg-purple-500/10 border-purple-500/20' },
];

const NEXT_STATUS: Record<string, string> = { todo: 'doing', doing: 'done', done: 'todo', blocked: 'todo' };

export default function ProjectSeoActionPlanTab({ data }: { data: DashboardData }) {
  const projectId = data.project.id;
  const [phases, setPhases] = useState<StrategyPhase[]>([]);
  const [actions, setActions] = useState<StrategyAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/strategy/phases?project_id=${projectId}`).then((r) => r.json()),
      fetch(`/api/v1/strategy/actions?project_id=${projectId}`).then((r) => r.json()),
    ])
      .then(([pData, aData]) => {
        setPhases(pData.phases || []);
        setActions(aData.actions || []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [projectId]);

  // Toggle action status: todo → doing → done → todo
  const toggleStatus = async (actionId: string) => {
    const action = actions.find(a => a.id === actionId);
    if (!action) return;
    const newStatus = NEXT_STATUS[action.status] || 'todo';
    const body: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'done') body.completed_date = new Date().toISOString().split('T')[0];
    // Optimistic update
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, status: newStatus } : a));
    try {
      await fetch(`/api/v1/strategy/actions/${actionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      // Revert on error
      setActions(prev => prev.map(a => a.id === actionId ? { ...a, status: action.status } : a));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-[#8888a0]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Đang tải kế hoạch...
      </div>
    );
  }

  if (phases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[#8888a0]">
        <ClipboardList className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">Chưa có kế hoạch hành động</p>
        <p className="text-xs mt-1">Import kế hoạch từ Obsidian hoặc tạo mới trong trang Chiến lược</p>
      </div>
    );
  }

  // Group actions by phase
  const actionsByPhase = new Map<string, StrategyAction[]>();
  actions.forEach((a) => {
    const list = actionsByPhase.get(a.phase_id) || [];
    list.push(a);
    actionsByPhase.set(a.phase_id, list);
  });

  // Sort phases by priority
  const sortedPhases = [...phases].sort((a, b) => a.priority - b.priority);

  // Category summary from real actions
  const categoryMap = new Map<string, { total: number; done: number; priorities: string[] }>();
  actions.forEach((a) => {
    const cat = a.category || 'Khác';
    const entry = categoryMap.get(cat) || { total: 0, done: 0, priorities: [] };
    entry.total++;
    if (a.status === 'done') entry.done++;
    entry.priorities.push(a.priority);
    categoryMap.set(cat, entry);
  });

  // Overall stats
  const totalActions = actions.length;
  const doneActions = actions.filter((a) => a.status === 'done').length;
  const doingActions = actions.filter((a) => a.status === 'doing').length;
  const overallProgress = totalActions > 0 ? Math.round((doneActions / totalActions) * 100) : 0;

  // KPI from audit data
  const { latestAudit, seoStats } = data;
  const la = latestAudit;
  const kpiTargets = [
    { metric: 'SEO Score TB', current: seoStats.avgScore > 0 ? `${seoStats.avgScore}` : '—', target: '≥ 80', timeline: '3 tháng' },
    { metric: 'Trang 4xx', current: la ? `${la.status_4xx}` : '—', target: '0', timeline: '2 tuần' },
    { metric: 'Orphan pages', current: la ? `${la.orphan_pages}` : '—', target: '0', timeline: '1 tháng' },
    { metric: 'Avg response', current: la?.avg_response_ms ? `${la.avg_response_ms}ms` : '—', target: '< 500ms', timeline: '1 tháng' },
  ];

  return (
    <div className="space-y-5">
      {/* Overall progress bar */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tiến độ tổng thể</h3>
          <span className="text-xs text-[#8888a0]">
            {doneActions}/{totalActions} hoàn thành · {doingActions} đang làm
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2.5">
          <div
            className="bg-accent h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <p className="text-xs text-[#8888a0] mt-1">{overallProgress}%</p>
      </div>

      {/* Phase cards with real actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedPhases.map((phase, idx) => {
          const phaseActions = actionsByPhase.get(phase.id) || [];
          const colorSet = PHASE_COLORS[idx % PHASE_COLORS.length];
          const phaseDone = phaseActions.filter((a) => a.status === 'done').length;
          const phaseProgress = phaseActions.length > 0
            ? Math.round((phaseDone / phaseActions.length) * 100)
            : 0;
          const timeline = [phase.start_date, phase.end_date].filter(Boolean).join(' → ') || '—';

          return (
            <div key={phase.id} className={`bg-card border rounded-xl p-5 ${colorSet.bg}`}>
              {/* Phase header */}
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{phase.name}</h3>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-medium',
                  phase.status === 'completed' ? 'bg-success/20 text-success'
                    : phase.status === 'in_progress' ? 'bg-accent/20 text-accent'
                      : phase.status === 'blocked' ? 'bg-danger/20 text-danger'
                        : 'bg-secondary text-[#8888a0]'
                )}>
                  {phase.status === 'completed' ? 'Xong' : phase.status === 'in_progress' ? 'Đang làm' : phase.status === 'blocked' ? 'Blocked' : 'Chưa bắt đầu'}
                </span>
              </div>
              <p className="text-[10px] text-[#8888a0] mb-3">{timeline}</p>

              {/* Phase progress */}
              <div className="w-full bg-secondary/80 rounded-full h-1.5 mb-3">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${phaseProgress}%`, backgroundColor: colorSet.color }} />
              </div>

              {/* Action items */}
              <div className="space-y-2">
                {phaseActions.map((action) => {
                  const statusCfg = STATUS_CONFIG[action.status] || STATUS_CONFIG.todo;
                  return (
                    <div key={action.id} className="flex items-start gap-2">
                      <button onClick={() => toggleStatus(action.id)} className={`mt-0.5 shrink-0 cursor-pointer hover:scale-125 transition-transform ${statusCfg.color}`} title={`Click: ${statusCfg.label} → ${STATUS_CONFIG[NEXT_STATUS[action.status]]?.label}`}>{statusCfg.icon}</button>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-xs font-medium',
                          action.status === 'done' ? 'text-[#8888a0] line-through' : 'text-[var(--text-primary)]'
                        )}>
                          {action.title}
                        </p>
                        {action.category && (
                          <span className="text-[9px] text-[#8888a0] bg-secondary px-1 py-0.5 rounded mt-0.5 inline-block">
                            {action.category}
                          </span>
                        )}
                      </div>
                      {action.priority && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border shrink-0 ${PRIORITY_COLOR[action.priority] || PRIORITY_COLOR.medium}`}>
                          {PRIORITY_LABEL[action.priority] || action.priority}
                        </span>
                      )}
                    </div>
                  );
                })}
                {phaseActions.length === 0 && (
                  <p className="text-xs text-[#8888a0] italic">Chưa có action nào</p>
                )}
              </div>
              <p className="text-[10px] text-[#8888a0] mt-2">{phaseDone}/{phaseActions.length} hoàn thành</p>
            </div>
          );
        })}
      </div>

      {/* All actions flat list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Danh sách hành động ({totalActions})
          </h3>
        </div>
        <div className="divide-y divide-border">
          {sortedPhases.flatMap((phase) =>
            (actionsByPhase.get(phase.id) || []).map((action) => {
              const statusCfg = STATUS_CONFIG[action.status] || STATUS_CONFIG.todo;
              return (
                <div key={action.id} className="flex items-start gap-3 px-5 py-3 hover:bg-[var(--hover-bg)] transition-colors">
                  <button onClick={() => toggleStatus(action.id)} className={`mt-0.5 shrink-0 cursor-pointer hover:scale-125 transition-transform ${statusCfg.color}`} title={`Click: ${statusCfg.label} → ${STATUS_CONFIG[NEXT_STATUS[action.status]]?.label}`}>{statusCfg.icon}</button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn(
                        'text-sm font-medium',
                        action.status === 'done' ? 'text-[#8888a0] line-through' : 'text-[var(--text-primary)]'
                      )}>
                        {action.title}
                      </p>
                      {action.priority && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${PRIORITY_COLOR[action.priority] || PRIORITY_COLOR.medium}`}>
                          {PRIORITY_LABEL[action.priority] || action.priority}
                        </span>
                      )}
                      {action.category && (
                        <span className="text-[10px] text-[#8888a0] bg-secondary px-1.5 py-0.5 rounded">
                          {action.category}
                        </span>
                      )}
                    </div>
                    {action.description && (
                      <p className="text-xs text-[#8888a0] mt-0.5">{action.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-[#8888a0]">{phase.name}</span>
                    {action.assigned_to && (
                      <p className="text-[10px] text-accent">{action.assigned_to}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Category summary from real data */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Target className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Theo danh mục</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Danh mục</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-20">Tasks</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-20">Xong</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-28">Tiến độ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from(categoryMap.entries())
                .sort((a, b) => b[1].total - a[1].total)
                .map(([cat, info]) => {
                  const catProgress = Math.round((info.done / info.total) * 100);
                  return (
                    <tr key={cat} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{cat}</td>
                      <td className="px-4 py-3 text-center text-sm text-[#8888a0]">{info.total}</td>
                      <td className="px-4 py-3 text-center text-sm text-success">{info.done}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-secondary rounded-full h-1.5">
                            <div className="bg-accent h-1.5 rounded-full" style={{ width: `${catProgress}%` }} />
                          </div>
                          <span className="text-[10px] text-[#8888a0] w-8 text-right">{catProgress}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPI Targets (from audit data) */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-success" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">KPI Targets</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Chỉ số</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-28">Hiện tại</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-28">Mục tiêu</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-28">Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {kpiTargets.map((row) => (
                <tr key={row.metric} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{row.metric}</td>
                  <td className="px-4 py-3 text-center text-sm text-[#8888a0]">{row.current}</td>
                  <td className="px-4 py-3 text-center"><span className="text-sm font-medium text-success">{row.target}</span></td>
                  <td className="px-4 py-3 text-center text-xs text-[#8888a0]">{row.timeline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
