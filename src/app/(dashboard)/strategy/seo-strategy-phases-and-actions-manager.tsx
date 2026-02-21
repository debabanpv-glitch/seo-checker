'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Target,
  Plus,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Layers,
  Activity,
  Zap,
  Globe,
  Bot,
  MessageSquare,
  Shield,
  Search,
  FileText,
  Link2,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Project } from '@/types';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

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
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

// ─── SEO 2026 Category Config ─────────────────────────────────────────────────
// 4-Layer Framework: SXO → AIO → GEO → AEO

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType; layer: string }> = {
  technical_seo: {
    label: 'Technical SEO',
    color: 'text-blue-400',
    bg: 'bg-blue-500/15 border border-blue-500/30',
    icon: Search,
    layer: 'SXO',
  },
  sxo: {
    label: 'SXO / UX',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15 border border-cyan-500/30',
    icon: Globe,
    layer: 'SXO',
  },
  on_page: {
    label: 'On-Page SEO',
    color: 'text-purple-400',
    bg: 'bg-purple-500/15 border border-purple-500/30',
    icon: FileText,
    layer: 'SXO',
  },
  off_page: {
    label: 'Off-Page / Link',
    color: 'text-orange-400',
    bg: 'bg-orange-500/15 border border-orange-500/30',
    icon: Link2,
    layer: 'AEO',
  },
  content: {
    label: 'Content Strategy',
    color: 'text-green-400',
    bg: 'bg-green-500/15 border border-green-500/30',
    icon: FileText,
    layer: 'AIO',
  },
  geo: {
    label: 'GEO / AI Search',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15 border border-yellow-500/30',
    icon: Bot,
    layer: 'GEO',
  },
  aio: {
    label: 'AIO / AI Tools',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/15 border border-indigo-500/30',
    icon: Zap,
    layer: 'AIO',
  },
  aeo: {
    label: 'AEO / Authority',
    color: 'text-rose-400',
    bg: 'bg-rose-500/15 border border-rose-500/30',
    icon: MessageSquare,
    layer: 'AEO',
  },
  eeat: {
    label: 'E-E-A-T',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15 border border-amber-500/30',
    icon: Shield,
    layer: 'AEO',
  },
};

const LAYER_CONFIG: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  SXO: { label: 'SXO', color: 'text-blue-400', bg: 'bg-blue-500/20', desc: 'Trải nghiệm Tìm kiếm' },
  AIO: { label: 'AIO', color: 'text-indigo-400', bg: 'bg-indigo-500/20', desc: 'Tối ưu bằng AI' },
  GEO: { label: 'GEO', color: 'text-yellow-400', bg: 'bg-yellow-500/20', desc: 'Tối ưu cho AI Search' },
  AEO: { label: 'AEO', color: 'text-rose-400', bg: 'bg-rose-500/20', desc: 'Trả lời Trực tiếp' },
};

// ─── Status / Priority Config ─────────────────────────────────────────────────

const PHASE_STATUS_CONFIG = {
  planned: { label: 'Kế hoạch', color: 'bg-gray-500/20 text-gray-400 border border-gray-500/30', icon: Clock },
  in_progress: { label: 'Đang thực hiện', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', icon: Activity },
  completed: { label: 'Hoàn thành', color: 'bg-green-500/20 text-green-400 border border-green-500/30', icon: CheckCircle2 },
  blocked: { label: 'Bị chặn', color: 'bg-red-500/20 text-red-400 border border-red-500/30', icon: XCircle },
};

const ACTION_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  todo: { label: 'Chờ làm', color: 'bg-gray-500/20 text-gray-400', dot: 'bg-gray-400' },
  doing: { label: 'Đang làm', color: 'bg-yellow-500/20 text-yellow-400', dot: 'bg-yellow-400' },
  done: { label: 'Xong', color: 'bg-green-500/20 text-green-400', dot: 'bg-green-400' },
  blocked: { label: 'Bị chặn', color: 'bg-red-500/20 text-red-400', dot: 'bg-red-400' },
};

const PRIORITY_CONFIG: Record<string, { label: string; dot: string; ring: string }> = {
  low: { label: 'Thấp', dot: 'bg-gray-400', ring: 'ring-gray-400/40' },
  medium: { label: 'TB', dot: 'bg-yellow-400', ring: 'ring-yellow-400/40' },
  high: { label: 'Cao', dot: 'bg-orange-400', ring: 'ring-orange-400/40' },
  critical: { label: 'Khẩn', dot: 'bg-red-500', ring: 'ring-red-500/40' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRelativeDate(dateStr: string): { label: string; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { label: `Quá hạn ${Math.abs(diff)} ngày`, color: 'text-red-400' };
  if (diff === 0) return { label: 'Hôm nay', color: 'text-orange-400' };
  if (diff <= 3) return { label: `Còn ${diff} ngày`, color: 'text-yellow-400' };
  if (diff <= 7) return { label: `Còn ${diff} ngày`, color: 'text-blue-400' };
  return { label: due.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }), color: 'text-[#8888a0]' };
}

function getCategoryConfig(cat?: string) {
  if (!cat) return null;
  const key = cat.toLowerCase().replace(/[\s\-]/g, '_');
  return CATEGORY_CONFIG[key] || {
    label: cat,
    color: 'text-[#8888a0]',
    bg: 'bg-secondary border border-border',
    icon: Target,
    layer: '',
  };
}

function getAvatarInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

interface SummaryStats {
  totalPhases: number;
  totalActions: number;
  doneActions: number;
  overdueActions: number;
  inProgressPhases: number;
}

function SummaryCards({ phases, actions }: { phases: StrategyPhase[]; actions: Record<string, StrategyAction[]> }) {
  const stats = useMemo<SummaryStats>(() => {
    const allActions = Object.values(actions).flat();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = allActions.filter((a) => {
      if (!a.due_date || a.status === 'done') return false;
      return new Date(a.due_date) < today;
    });
    return {
      totalPhases: phases.length,
      totalActions: allActions.length,
      doneActions: allActions.filter((a) => a.status === 'done').length,
      overdueActions: overdue.length,
      inProgressPhases: phases.filter((p) => p.status === 'in_progress').length,
    };
  }, [phases, actions]);

  const completionPct = stats.totalActions > 0
    ? Math.round((stats.doneActions / stats.totalActions) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Overall Progress */}
      <div className="col-span-2 md:col-span-1 bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#8888a0] font-medium">Tiến độ tổng thể</span>
          <TrendingUp className="w-4 h-4 text-accent" />
        </div>
        <div className="text-2xl font-bold text-[var(--text-primary)] mb-2">{completionPct}%</div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-green-500 rounded-full transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <p className="text-xs text-[#8888a0] mt-1.5">
          {stats.doneActions}/{stats.totalActions} việc hoàn thành
        </p>
      </div>

      {/* Phases */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#8888a0] font-medium">Phases</span>
          <Layers className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalPhases}</div>
        <p className="text-xs text-blue-400 mt-1">{stats.inProgressPhases} đang thực hiện</p>
      </div>

      {/* Total Actions */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#8888a0] font-medium">Tổng Actions</span>
          <Activity className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalActions}</div>
        <p className="text-xs text-[#8888a0] mt-1">{stats.doneActions} đã xong</p>
      </div>

      {/* Overdue */}
      <div className={cn('bg-card border rounded-xl p-4', stats.overdueActions > 0 ? 'border-red-500/40' : 'border-border')}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#8888a0] font-medium">Quá hạn</span>
          <AlertTriangle className={cn('w-4 h-4', stats.overdueActions > 0 ? 'text-red-400' : 'text-[#8888a0]')} />
        </div>
        <div className={cn('text-2xl font-bold', stats.overdueActions > 0 ? 'text-red-400' : 'text-[var(--text-primary)]')}>
          {stats.overdueActions}
        </div>
        <p className="text-xs text-[#8888a0] mt-1">actions cần xử lý</p>
      </div>
    </div>
  );
}

// ─── SEO 2026 Layer Banner ─────────────────────────────────────────────────────

function FrameworkBanner() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 overflow-x-auto">
      <p className="text-xs text-[#8888a0] mb-3 font-medium">Framework SEO 2026 - 4 Tầng</p>
      <div className="flex items-center gap-2 min-w-max">
        {(['SXO', 'AIO', 'GEO', 'AEO'] as const).map((layer, idx) => {
          const cfg = LAYER_CONFIG[layer];
          return (
            <div key={layer} className="flex items-center gap-2">
              <div className={cn('flex flex-col items-center px-3 py-2 rounded-lg', cfg.bg)}>
                <span className={cn('text-xs font-bold', cfg.color)}>{cfg.label}</span>
                <span className="text-[10px] text-[#8888a0] whitespace-nowrap">{cfg.desc}</span>
              </div>
              {idx < 3 && <ChevronRight className="w-3 h-3 text-[#8888a0] flex-shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Phase Progress Bar ───────────────────────────────────────────────────────

function PhaseProgressBar({ actions }: { actions: StrategyAction[] }) {
  const total = actions.length;
  if (total === 0) return null;

  const done = actions.filter((a) => a.status === 'done').length;
  const doing = actions.filter((a) => a.status === 'doing').length;
  const blocked = actions.filter((a) => a.status === 'blocked').length;

  const donePct = (done / total) * 100;
  const doingPct = (doing / total) * 100;
  const blockedPct = (blocked / total) * 100;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[10px] text-[#8888a0] mb-1">
        <span>{done}/{total} hoàn thành</span>
        <span className="font-medium text-[var(--text-primary)]">{Math.round(donePct)}%</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary gap-px">
        {donePct > 0 && (
          <div className="bg-green-500 rounded-l transition-all" style={{ width: `${donePct}%` }} />
        )}
        {doingPct > 0 && (
          <div className="bg-yellow-400 transition-all" style={{ width: `${doingPct}%` }} />
        )}
        {blockedPct > 0 && (
          <div className="bg-red-500 rounded-r transition-all" style={{ width: `${blockedPct}%` }} />
        )}
      </div>
      <div className="flex items-center gap-3 mt-1.5 text-[10px]">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /><span className="text-[#8888a0]">Xong {done}</span></span>
        {doing > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" /><span className="text-[#8888a0]">Đang làm {doing}</span></span>}
        {blocked > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /><span className="text-[#8888a0]">Bị chặn {blocked}</span></span>}
      </div>
    </div>
  );
}

// ─── Action Row ───────────────────────────────────────────────────────────────

function ActionRow({
  action,
  phaseId,
  onUpdateStatus,
}: {
  action: StrategyAction;
  phaseId: string;
  onUpdateStatus: (actionId: string, phaseId: string, status: StrategyAction['status']) => void;
}) {
  const actionStatus = ACTION_STATUS_CONFIG[action.status] || ACTION_STATUS_CONFIG.todo;
  const priority = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.medium;
  const catCfg = getCategoryConfig(action.category);
  const isDone = action.status === 'done';
  const isBlocked = action.status === 'blocked';

  const dateInfo = action.due_date ? getRelativeDate(action.due_date) : null;

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors group',
        isBlocked && 'bg-red-500/5',
      )}
    >
      {/* Priority dot + status selector */}
      <div className="flex flex-col items-center gap-1.5 pt-0.5 flex-shrink-0">
        <div className={cn('w-2 h-2 rounded-full ring-2 ring-offset-0 flex-shrink-0', priority.dot, priority.ring)} title={priority.label} />
        <select
          value={action.status}
          onChange={(e) =>
            onUpdateStatus(action.id, phaseId, e.target.value as StrategyAction['status'])
          }
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'px-1.5 py-0.5 rounded text-[10px] font-medium border-0 cursor-pointer',
            actionStatus.color,
          )}
        >
          <option value="todo">Chờ làm</option>
          <option value="doing">Đang làm</option>
          <option value="done">Xong</option>
          <option value="blocked">Bị chặn</option>
        </select>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium leading-snug',
            isDone ? 'text-[#8888a0] line-through' : 'text-[var(--text-primary)]',
            isBlocked && 'text-red-400',
          )}
        >
          {action.title}
        </p>

        {action.description && (
          <p className="text-xs text-[#8888a0] mt-0.5 line-clamp-1">{action.description}</p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {/* Category badge */}
          {catCfg && (
            <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium', catCfg.bg, catCfg.color)}>
              <catCfg.icon className="w-2.5 h-2.5" />
              {catCfg.label}
              {catCfg.layer && (
                <span className="opacity-60">{catCfg.layer}</span>
              )}
            </span>
          )}

          {/* Assignee avatar */}
          {action.assigned_to && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[#8888a0]">
              <span className="w-4 h-4 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                {getAvatarInitials(action.assigned_to)}
              </span>
              {action.assigned_to}
            </span>
          )}

          {/* Due date with relative time */}
          {dateInfo && (
            <span className={cn('inline-flex items-center gap-1 text-[10px]', dateInfo.color)}>
              <Calendar className="w-2.5 h-2.5" />
              {dateInfo.label}
            </span>
          )}
        </div>
      </div>

      {/* Blocked icon */}
      {isBlocked && (
        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
      )}
    </div>
  );
}

// ─── Phase Card ───────────────────────────────────────────────────────────────

function PhaseCard({
  phase,
  isExpanded,
  isLoadingActions,
  phaseActions,
  onToggle,
  onAddAction,
  onUpdateActionStatus,
}: {
  phase: StrategyPhase;
  isExpanded: boolean;
  isLoadingActions: boolean;
  phaseActions: StrategyAction[];
  onToggle: () => void;
  onAddAction: () => void;
  onUpdateActionStatus: (actionId: string, phaseId: string, status: StrategyAction['status']) => void;
}) {
  const statusConfig = PHASE_STATUS_CONFIG[phase.status] || PHASE_STATUS_CONFIG.planned;
  const StatusIcon = statusConfig.icon;

  // Category distribution for this phase (only when loaded)
  const categoryDist = useMemo(() => {
    if (!isExpanded || phaseActions.length === 0) return [];
    const map: Record<string, number> = {};
    phaseActions.forEach((a) => {
      const key = a.category?.toLowerCase().replace(/[\s\-]/g, '_') || 'other';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).slice(0, 4);
  }, [isExpanded, phaseActions]);

  const hasActions = phaseActions.length > 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Phase Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={onToggle}
      >
        <span className="text-[#8888a0] flex-shrink-0 mt-0.5">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h3 className="font-semibold text-[var(--text-primary)]">{phase.name}</h3>
            <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1', statusConfig.color)}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </span>
          </div>

          {/* Date range */}
          {(phase.start_date || phase.end_date) && (
            <div className="flex items-center gap-1 text-[11px] text-[#8888a0] mb-2">
              <Calendar className="w-3 h-3" />
              {phase.start_date && new Date(phase.start_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              {phase.end_date && ` → ${new Date(phase.end_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
            </div>
          )}

          {/* Description */}
          {phase.description && !isExpanded && (
            <p className="text-xs text-[#8888a0] line-clamp-1 mb-2">{phase.description}</p>
          )}

          {/* Progress bar — always visible when actions loaded */}
          {hasActions && <PhaseProgressBar actions={phaseActions} />}

          {/* Category distribution chips */}
          {isExpanded && categoryDist.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {categoryDist.map(([cat, count]) => {
                const cfg = getCategoryConfig(cat);
                if (!cfg) return null;
                return (
                  <span key={cat} className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]', cfg.bg, cfg.color)}>
                    <cfg.icon className="w-2.5 h-2.5" />
                    {cfg.label} ({count})
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Action count badge */}
        <div className="flex-shrink-0 text-right">
          <span className="text-[11px] text-[#8888a0] bg-secondary px-2 py-0.5 rounded-full">
            {phaseActions.length > 0 ? `${phaseActions.length} actions` : '—'}
          </span>
        </div>
      </div>

      {/* Expanded Actions */}
      {isExpanded && (
        <div className="border-t border-border">
          {isLoadingActions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
            </div>
          ) : (
            <>
              {phaseActions.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {phaseActions.map((action) => (
                    <ActionRow
                      key={action.id}
                      action={action}
                      phaseId={phase.id}
                      onUpdateStatus={onUpdateActionStatus}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-[#8888a0]">
                  Chưa có action nào trong phase này
                </div>
              )}

              {/* Add action button */}
              <div className="px-5 py-3 border-t border-border/60 bg-secondary/20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddAction();
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
}

// ─── Main Component ───────────────────────────────────────────────────────────

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

  const fetchActions = useCallback(async (phaseId: string) => {
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
  }, [actions]);

  const togglePhase = useCallback((phaseId: string) => {
    const next = new Set(expandedPhases);
    if (next.has(phaseId)) {
      next.delete(phaseId);
    } else {
      next.add(phaseId);
      fetchActions(phaseId);
    }
    setExpandedPhases(next);
  }, [expandedPhases, fetchActions]);

  const handleUpdateActionStatus = useCallback(async (
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
  }, []);

  if (isLoading && projects.length === 0) return <PageLoading />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Chiến lược SEO</h1>
          <p className="text-xs text-[#8888a0] mt-0.5">Quản lý theo Framework SEO 2026 - 4 Tầng</p>
        </div>
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm Phase
          </button>
        </div>
      </div>

      {/* Framework Banner */}
      <FrameworkBanner />

      {/* Summary Cards */}
      {phases.length > 0 && (
        <SummaryCards phases={phases} actions={actions} />
      )}

      {/* Phases */}
      {isLoading ? (
        <PageLoading />
      ) : phases.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Chưa có phase chiến lược"
          description="Tạo phase đầu tiên để bắt đầu lên kế hoạch SEO theo Framework 4 Tầng"
          action={
            <button
              onClick={() => setShowAddPhase(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Thêm Phase đầu tiên
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {phases.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              isExpanded={expandedPhases.has(phase.id)}
              isLoadingActions={loadingPhases.has(phase.id)}
              phaseActions={actions[phase.id] || []}
              onToggle={() => togglePhase(phase.id)}
              onAddAction={() => setShowAddAction(phase.id)}
              onUpdateActionStatus={handleUpdateActionStatus}
            />
          ))}
        </div>
      )}

      {/* Modals */}
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

// ─── Add Phase Modal ──────────────────────────────────────────────────────────

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
              placeholder="VD: Phase 1 - Nền tảng Kỹ thuật (SXO)"
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
              placeholder="Mô tả mục tiêu của phase này..."
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

// ─── Add Action Modal ─────────────────────────────────────────────────────────

const SEO_CATEGORIES = [
  { value: 'technical_seo', label: 'Technical SEO (SXO)' },
  { value: 'sxo', label: 'SXO / UX Optimization' },
  { value: 'on_page', label: 'On-Page SEO (SXO)' },
  { value: 'content', label: 'Content Strategy (AIO)' },
  { value: 'aio', label: 'AIO / AI Tools' },
  { value: 'geo', label: 'GEO / AI Search Optimization' },
  { value: 'aeo', label: 'AEO / Answer Engine' },
  { value: 'eeat', label: 'E-E-A-T Building' },
  { value: 'off_page', label: 'Off-Page / Link Building' },
];

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
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-5">Thêm Action SEO</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#8888a0] mb-1.5">Tiêu đề *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="VD: Audit Core Web Vitals"
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
              placeholder="Chi tiết thực hiện..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8888a0] mb-1.5">Danh mục SEO 2026</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
            >
              <option value="">-- Chọn danh mục --</option>
              {SEO_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
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
                <option value="critical">Khẩn cấp</option>
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
