'use client';

import { useState, useEffect } from 'react';
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Circle,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  projectId?: string;
}

// --- Types matching strategy DB ---
interface StrategyPhase {
  id: string;
  name: string;
  description: string | null;
  phase_type: string;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  progress: number;
}

interface StrategyAction {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  assigned_to: string | null;
  status: string;
  due_date: string | null;
  completed_date: string | null;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  todo: { icon: <Circle className="w-3.5 h-3.5" />, color: 'text-[#8888a0]', label: 'Chờ làm' },
  doing: { icon: <Clock className="w-3.5 h-3.5" />, color: 'text-accent', label: 'Đang làm' },
  done: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-success', label: 'Xong' },
  blocked: { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-danger', label: 'Bị chặn' },
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-danger/20 text-danger border-danger/30',
  high: 'bg-danger/20 text-danger border-danger/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  low: 'bg-success/20 text-success border-success/30',
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: 'Khẩn',
  high: 'Cao',
  medium: 'TB',
  low: 'Thấp',
};

const PHASE_COLORS = [
  { gradient: 'from-red-500/10 to-orange-500/10', border: 'border-red-500/30', bar: '#ef4444' },
  { gradient: 'from-yellow-500/10 to-amber-500/10', border: 'border-yellow-500/30', bar: '#f59e0b' },
  { gradient: 'from-green-500/10 to-emerald-500/10', border: 'border-green-500/30', bar: '#22c55e' },
  { gradient: 'from-blue-500/10 to-cyan-500/10', border: 'border-blue-500/30', bar: '#3b82f6' },
  { gradient: 'from-purple-500/10 to-violet-500/10', border: 'border-purple-500/30', bar: '#8b5cf6' },
];

export default function SEOActionPlanPrioritizedTab({ projectId }: Props) {
  const [phases, setPhases] = useState<StrategyPhase[]>([]);
  const [actions, setActions] = useState<StrategyAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPhaseId, setFilterPhaseId] = useState<string | null>(null);

  useEffect(() => {
    const qs = projectId ? `?project_id=${projectId}` : '';
    Promise.all([
      fetch(`/api/v1/strategy/phases${qs}`).then((r) => r.json()),
      fetch(`/api/v1/strategy/actions${qs.replace('project_id', 'project_id')}`).then((r) => r.json()),
    ])
      .then(([pData, aData]) => {
        setPhases(pData.phases || []);
        setActions(aData.actions || []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-[#8888a0]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang tải kế hoạch...
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

  // Sort phases by priority, group actions by phase
  const sortedPhases = [...phases].sort((a, b) => a.priority - b.priority);
  const actionsByPhase = new Map<string, StrategyAction[]>();
  actions.forEach((a) => {
    const list = actionsByPhase.get(a.phase_id) || [];
    list.push(a);
    actionsByPhase.set(a.phase_id, list);
  });

  // Overall stats
  const totalActions = actions.length;
  const doneActions = actions.filter((a) => a.status === 'done').length;
  const doingActions = actions.filter((a) => a.status === 'doing').length;
  const overallProgress = totalActions > 0 ? Math.round((doneActions / totalActions) * 100) : 0;

  // Filter actions
  const filteredActions = filterPhaseId
    ? actions.filter((a) => a.phase_id === filterPhaseId)
    : actions;

  return (
    <div className="space-y-5 overflow-y-auto pb-4">
      {/* Overall progress */}
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

      {/* Phase timeline cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedPhases.map((phase, idx) => {
          const colorSet = PHASE_COLORS[idx % PHASE_COLORS.length];
          const phaseActions = actionsByPhase.get(phase.id) || [];
          const phaseDone = phaseActions.filter((a) => a.status === 'done').length;
          const phaseProgress = phaseActions.length > 0
            ? Math.round((phaseDone / phaseActions.length) * 100)
            : 0;
          const timeline = [phase.start_date, phase.end_date].filter(Boolean).join(' → ') || '—';

          return (
            <div key={phase.id} className={cn('rounded-xl p-5 border bg-gradient-to-br', colorSet.gradient, colorSet.border)}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-bold text-[var(--text-primary)]">{phase.name}</div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-[#8888a0]">
                    <Clock className="w-3 h-3" /> {timeline}
                  </div>
                </div>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-medium',
                  phase.status === 'completed' ? 'bg-success/20 text-success'
                    : phase.status === 'in_progress' ? 'bg-accent/20 text-accent'
                      : phase.status === 'blocked' ? 'bg-danger/20 text-danger'
                        : 'bg-secondary text-[#8888a0]'
                )}>
                  {phase.status === 'completed' ? 'Xong' : phase.status === 'in_progress' ? 'Đang làm' : phase.status === 'blocked' ? 'Bị chặn' : 'Chưa bắt đầu'}
                </span>
              </div>
              {phase.description && (
                <p className="text-xs text-[#8888a0] leading-relaxed mb-2">{phase.description}</p>
              )}
              {/* Phase progress bar */}
              <div className="w-full bg-secondary/80 rounded-full h-1.5 mb-2">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${phaseProgress}%`, backgroundColor: colorSet.bar }} />
              </div>
              <div className="text-xs text-[#8888a0]">
                {phaseDone}/{phaseActions.length} hành động hoàn thành
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions table with phase filter */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#8888a0]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Kế hoạch hành động ({filteredActions.length})
            </span>
          </div>
          <div className="ml-auto flex gap-1 flex-wrap">
            <button
              onClick={() => setFilterPhaseId(null)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                !filterPhaseId ? 'bg-accent text-white' : 'bg-secondary text-[#8888a0] hover:text-[var(--text-primary)]'
              )}
            >
              Tất cả
            </button>
            {sortedPhases.map((p) => (
              <button
                key={p.id}
                onClick={() => setFilterPhaseId(p.id)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  filterPhaseId === p.id ? 'bg-accent text-white' : 'bg-secondary text-[#8888a0] hover:text-[var(--text-primary)]'
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border">
          {filteredActions.map((action) => {
            const statusCfg = STATUS_CONFIG[action.status] || STATUS_CONFIG.todo;
            const phaseName = phases.find((p) => p.id === action.phase_id)?.name || '';
            return (
              <div key={action.id} className="flex items-start gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors">
                <span className={`mt-0.5 shrink-0 ${statusCfg.color}`}>{statusCfg.icon}</span>
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
                  <span className="text-[10px] text-[#8888a0]">{phaseName}</span>
                  {action.assigned_to && (
                    <p className="text-[10px] text-accent">{action.assigned_to}</p>
                  )}
                </div>
              </div>
            );
          })}
          {filteredActions.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-[#8888a0]">Không có hành động nào</div>
          )}
        </div>
      </div>

      {/* Category summary from real data */}
      {actions.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#8888a0]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Theo danh mục</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-[#8888a0] uppercase">Danh mục</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold text-[#8888a0] uppercase w-16">Việc</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold text-[#8888a0] uppercase w-16">Xong</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold text-[#8888a0] uppercase w-28">Tiến độ</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const catMap = new Map<string, { total: number; done: number }>();
                  actions.forEach((a) => {
                    const cat = a.category || 'Khác';
                    const e = catMap.get(cat) || { total: 0, done: 0 };
                    e.total++;
                    if (a.status === 'done') e.done++;
                    catMap.set(cat, e);
                  });
                  return Array.from(catMap.entries())
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([cat, info], i) => {
                      const pct = Math.round((info.done / info.total) * 100);
                      return (
                        <tr key={cat} className={cn('border-t border-border', i % 2 === 0 ? '' : 'bg-secondary/20')}>
                          <td className="px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]">{cat}</td>
                          <td className="px-4 py-2.5 text-center text-sm text-[#8888a0]">{info.total}</td>
                          <td className="px-4 py-2.5 text-center text-sm text-success">{info.done}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-secondary rounded-full h-1.5">
                                <div className="bg-accent h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] text-[#8888a0] w-8 text-right">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Risk assessment — static guidance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-success/10 border border-success/30">
          <div className="flex items-center gap-2 font-semibold text-green-400 mb-2">
            <CheckCircle className="w-4 h-4" /> An toàn — Làm ngay
          </div>
          <ul className="text-[#8888a0] text-xs space-y-1 list-disc list-inside">
            <li>Viết meta description + alt text</li>
            <li>Chuẩn hóa H1, title tag</li>
            <li>Thêm internal links</li>
            <li>Deploy schema markup</li>
          </ul>
        </div>
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-warning/10 border border-warning/30">
          <div className="flex items-center gap-2 font-semibold text-yellow-400 mb-2">
            <AlertTriangle className="w-4 h-4" /> Thận trọng — Test trước
          </div>
          <ul className="text-[#8888a0] text-xs space-y-1 list-disc list-inside">
            <li>Redirect URLs cũ (301)</li>
            <li>Thay đổi cấu trúc URL</li>
            <li>Merge nội dung duplicate</li>
            <li>Thay đổi canonical tag hàng loạt</li>
          </ul>
        </div>
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-danger/10 border border-danger/30">
          <div className="flex items-center gap-2 font-semibold text-red-400 mb-2">
            <XCircle className="w-4 h-4" /> Tránh — Rủi ro cao
          </div>
          <ul className="text-[#8888a0] text-xs space-y-1 list-disc list-inside">
            <li>noindex trang đang có traffic</li>
            <li>Xóa nội dung không backup</li>
            <li>Thay đổi hàng loạt không monitor</li>
            <li>Link building spam / PBN</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
