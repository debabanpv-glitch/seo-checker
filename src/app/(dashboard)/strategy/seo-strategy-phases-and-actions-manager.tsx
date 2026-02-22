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
  List,
  GitBranch,
  Upload,
  LayoutList,
  CheckSquare,
  Square,
  ChevronUp,
  ArrowRight,
  User,
  Code,
  Save,
  Clipboard,
  ClipboardCheck,
  History,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Project } from '@/types';
import { cn } from '@/lib/utils';
import { buildExecutionPrompt } from '@/lib/utils/strategy-execution-prompt-builder';

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
  executor_type?: 'human' | 'ai';
  ai_prompt?: string;
  platform_type?: 'wordpress' | 'nextjs' | 'custom' | 'other';
  implementation_notes?: string;
  result?: string;
}

interface ObsidianAction {
  title: string;
  category?: string;
  priority?: string;
  owner?: string;
  selected: boolean;
}

interface ObsidianPhase {
  name: string;
  description?: string;
  timeline?: string;
  order?: number;
  actions: ObsidianAction[];
  selected: boolean;
  expanded: boolean;
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
  planned: { label: 'Kế hoạch', color: 'bg-gray-500/20 text-gray-400 border border-gray-500/30', icon: Clock, nodeColor: 'border-gray-500 bg-gray-500/10' },
  in_progress: { label: 'Đang thực hiện', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', icon: Activity, nodeColor: 'border-blue-500 bg-blue-500/10' },
  completed: { label: 'Hoàn thành', color: 'bg-green-500/20 text-green-400 border border-green-500/30', icon: CheckCircle2, nodeColor: 'border-green-500 bg-green-500/10' },
  blocked: { label: 'Bị chặn', color: 'bg-red-500/20 text-red-400 border border-red-500/30', icon: XCircle, nodeColor: 'border-red-500 bg-red-500/10' },
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

// ─── Technical categories that warrant platform selection ─────────────────────
const TECHNICAL_CATEGORIES = new Set(['technical_seo', 'sxo', 'on_page', 'aio']);

// ─── Action Row ───────────────────────────────────────────────────────────────

function ActionRow({
  action,
  phaseId,
  onUpdateStatus,
  onUpdateAction,
  projectName,
  projectDomain,
  phaseName,
  phaseDescription,
}: {
  action: StrategyAction;
  phaseId: string;
  onUpdateStatus: (actionId: string, phaseId: string, status: StrategyAction['status']) => void;
  onUpdateAction: (actionId: string, phaseId: string, data: Partial<StrategyAction>) => void;
  projectName?: string;
  projectDomain?: string;
  phaseName?: string;
  phaseDescription?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [executorType, setExecutorType] = useState<'human' | 'ai'>(action.executor_type ?? 'human');
  const [platformType, setPlatformType] = useState<string>(action.platform_type ?? '');
  const [aiPrompt, setAiPrompt] = useState(action.ai_prompt ?? '');
  const [implNotes, setImplNotes] = useState(action.implementation_notes ?? '');
  const [resultText, setResultText] = useState(action.result ?? '');
  const [isCopied, setIsCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<Array<{id: string; executor: string; status: string; started_at: string; result_text?: string}>>([]);

  const actionStatus = ACTION_STATUS_CONFIG[action.status] || ACTION_STATUS_CONFIG.todo;
  const priority = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.medium;
  const catCfg = getCategoryConfig(action.category);
  const isDone = action.status === 'done';
  const isBlocked = action.status === 'blocked';
  const isTechnical = TECHNICAL_CATEGORIES.has(action.category?.toLowerCase().replace(/[\s\-]/g, '_') ?? '');

  const dateInfo = action.due_date ? getRelativeDate(action.due_date) : null;

  const handleSaveDetail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    const data: Partial<StrategyAction> = {
      executor_type: executorType,
      platform_type: platformType as StrategyAction['platform_type'] || undefined,
      ai_prompt: aiPrompt || undefined,
      implementation_notes: implNotes || undefined,
    };
    try {
      await fetch(`/api/v1/strategy/actions/${action.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      onUpdateAction(action.id, phaseId, data);
    } catch (err) {
      console.error('Failed to save action detail:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyPrompt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = buildExecutionPrompt({
      project: { name: projectName || '', domain: projectDomain },
      phase: { name: phaseName || '', description: phaseDescription },
      action: {
        title: action.title,
        description: action.description,
        category: action.category,
        priority: action.priority,
        ai_prompt: aiPrompt,
        platform_type: platformType || undefined,
        implementation_notes: implNotes,
      },
    });
    await navigator.clipboard.writeText(prompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveResult = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
      await fetch(`/api/v1/strategy/actions/${action.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: resultText }),
      });
      onUpdateAction(action.id, phaseId, { result: resultText });

      await fetch('/api/v1/strategy/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: action.id,
          executor: executorType === 'ai' ? 'ai_chat' : 'human',
          result_text: resultText,
          status: 'success',
        }),
      });
    } catch (err) {
      console.error('Failed to save result:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkDone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await handleSaveResult(e);
    onUpdateStatus(action.id, phaseId, 'done');
  };

  const fetchExecutionLogs = async () => {
    try {
      const res = await fetch(`/api/v1/strategy/executions?action_id=${action.id}`);
      const data = await res.json();
      setExecutionLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={cn('transition-colors', isBlocked && 'bg-red-500/5')}>
      {/* Main row */}
      <div className={cn(
        'flex items-start gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors group',
        isExpanded && 'bg-secondary/20',
      )}>
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

        {/* Main content — clickable to expand */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setIsExpanded((v) => !v)}
        >
          <div className="flex items-center gap-1.5">
            <p
              className={cn(
                'text-sm font-medium leading-snug',
                isDone ? 'text-[#8888a0] line-through' : 'text-[var(--text-primary)]',
                isBlocked && 'text-red-400',
              )}
            >
              {action.title}
            </p>
            {/* Executor badge */}
            {executorType === 'ai' ? (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[9px] font-medium flex-shrink-0">
                <Bot className="w-2.5 h-2.5" />AI
              </span>
            ) : null}
            {/* Platform badge */}
            {platformType && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[9px] font-medium flex-shrink-0">
                <Code className="w-2.5 h-2.5" />
                {platformType === 'wordpress' ? 'WP' : platformType === 'nextjs' ? 'Next' : platformType === 'custom' ? 'Custom' : 'Khác'}
              </span>
            )}
            {/* Expand caret */}
            <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[#8888a0]">
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
          </div>

          {action.description && (
            <p className="text-xs text-[#8888a0] mt-0.5 line-clamp-1">{action.description}</p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {catCfg && (
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium', catCfg.bg, catCfg.color)}>
                <catCfg.icon className="w-2.5 h-2.5" />
                {catCfg.label}
                {catCfg.layer && <span className="opacity-60">{catCfg.layer}</span>}
              </span>
            )}
            {action.assigned_to && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#8888a0]">
                <span className="w-4 h-4 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                  {getAvatarInitials(action.assigned_to)}
                </span>
                {action.assigned_to}
              </span>
            )}
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

      {/* Expanded detail panel */}
      {isExpanded && (
        <div className={cn(
          'mx-5 mb-3 rounded-lg border p-3 space-y-3',
          executorType === 'ai'
            ? 'bg-blue-500/5 border-blue-500/20'
            : 'bg-secondary/30 border-border',
        )}>
          <div className="flex flex-wrap gap-4">
            {/* Executor type */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-[#8888a0] uppercase tracking-wide">Ai thực hiện</p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`executor-${action.id}`}
                    value="human"
                    checked={executorType === 'human'}
                    onChange={() => setExecutorType('human')}
                    className="w-3 h-3 accent-orange-400"
                  />
                  <User className="w-3 h-3 text-[#8888a0]" />
                  <span className="text-xs text-[var(--text-primary)]">Nhân sự</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`executor-${action.id}`}
                    value="ai"
                    checked={executorType === 'ai'}
                    onChange={() => setExecutorType('ai')}
                    className="w-3 h-3 accent-blue-400"
                  />
                  <Bot className="w-3 h-3 text-blue-400" />
                  <span className="text-xs text-blue-400">AI (Claude)</span>
                </label>
              </div>
            </div>

            {/* Platform type — only for technical categories */}
            {isTechnical && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-[#8888a0] uppercase tracking-wide">Platform</p>
                <div className="flex flex-wrap items-center gap-3">
                  {(['wordpress', 'nextjs', 'custom', 'other'] as const).map((p) => (
                    <label key={p} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name={`platform-${action.id}`}
                        value={p}
                        checked={platformType === p}
                        onChange={() => setPlatformType(p)}
                        className="w-3 h-3 accent-purple-400"
                      />
                      <span className="text-xs text-[var(--text-primary)]">
                        {p === 'wordpress' ? 'WordPress' : p === 'nextjs' ? 'NextJS' : p === 'custom' ? 'Custom' : 'Khác'}
                      </span>
                    </label>
                  ))}
                  {platformType && (
                    <button
                      type="button"
                      onClick={() => setPlatformType('')}
                      className="text-[10px] text-[#8888a0] hover:text-red-400 transition-colors"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI Prompt — only when executor is ai */}
          {executorType === 'ai' && (
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-blue-400 uppercase tracking-wide flex items-center gap-1">
                <Bot className="w-3 h-3" />
                AI Prompt
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Prompt để AI triển khai action này..."
                rows={3}
                className="w-full text-xs bg-blue-500/10 border border-blue-500/30 rounded-md px-2.5 py-2 text-[var(--text-primary)] placeholder:text-[#8888a0]/60 resize-none focus:outline-none focus:border-blue-500/60"
              />
            </div>
          )}

          {/* Copy Prompt — show whenever prompt exists */}
          {aiPrompt && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyPrompt}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  isCopied
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30'
                )}
              >
                {isCopied ? <ClipboardCheck className="w-3 h-3" /> : <Clipboard className="w-3 h-3" />}
                {isCopied ? 'Đã copy!' : 'Copy Prompt'}
              </button>
              <span className="text-[10px] text-[#8888a0]">Paste vào Claude Chat để thực thi</span>
            </div>
          )}

          {/* Implementation notes */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-[#8888a0] uppercase tracking-wide flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Ghi chú triển khai
            </label>
            <textarea
              value={implNotes}
              onChange={(e) => setImplNotes(e.target.value)}
              placeholder="Hướng dẫn xử lý từng bước..."
              rows={3}
              className="w-full text-xs bg-secondary/50 border border-border rounded-md px-2.5 py-2 text-[var(--text-primary)] placeholder:text-[#8888a0]/60 resize-none focus:outline-none focus:border-accent/50"
            />
          </div>

          {/* Kết quả thực thi */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-green-400 uppercase tracking-wide flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Kết quả thực thi
            </label>
            <textarea
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              placeholder="Paste kết quả từ Claude Chat vào đây..."
              rows={4}
              className="w-full text-xs bg-green-500/5 border border-green-500/20 rounded-md px-2.5 py-2 text-[var(--text-primary)] placeholder:text-[#8888a0]/60 resize-none focus:outline-none focus:border-green-500/40"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!showHistory) fetchExecutionLogs();
                  setShowHistory(!showHistory);
                }}
                className="flex items-center gap-1 text-[10px] text-[#8888a0] hover:text-[var(--text-primary)] transition-colors"
              >
                <History className="w-3 h-3" />
                Lịch sử
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveDetail}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-border border border-border rounded-md text-[var(--text-primary)] text-xs font-medium transition-colors disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Lưu
              </button>
              {resultText && action.status !== 'done' && (
                <button
                  onClick={handleMarkDone}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-md text-white text-xs font-medium transition-colors disabled:opacity-60"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Hoàn thành
                </button>
              )}
            </div>
          </div>

          {/* Execution History */}
          {showHistory && (
            <div className="mt-2 p-2 bg-secondary/30 rounded-md space-y-1.5">
              <p className="text-[10px] font-medium text-[#8888a0] uppercase tracking-wide">Lịch sử thực thi</p>
              {executionLogs.length === 0 ? (
                <p className="text-[10px] text-[#8888a0]">Chưa có lịch sử</p>
              ) : (
                executionLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        log.status === 'success' ? 'bg-green-400' : log.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
                      )} />
                      <span className="text-[#8888a0]">
                        {log.executor === 'ai_chat' ? 'AI Chat' : log.executor === 'wp_api' ? 'WP API' : 'Thủ công'}
                      </span>
                    </div>
                    <span className="text-[#8888a0]">{new Date(log.started_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Timeline View ────────────────────────────────────────────────────────────

function TimelineView({
  phases,
  actions,
  onPhaseClick,
}: {
  phases: StrategyPhase[];
  actions: Record<string, StrategyAction[]>;
  onPhaseClick: (phaseId: string) => void;
}) {
  if (phases.length === 0) return null;

  const sortedPhases = [...phases].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <GitBranch className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Lộ trình dự án</h3>
        <span className="text-xs text-[#8888a0]">— Nhấn vào phase để xem chi tiết</span>
      </div>

      {/* Horizontal timeline scroll */}
      <div className="overflow-x-auto pb-4">
        <div className="flex items-start gap-0 min-w-max">
          {sortedPhases.map((phase, idx) => {
            const statusConfig = PHASE_STATUS_CONFIG[phase.status] || PHASE_STATUS_CONFIG.planned;
            const StatusIcon = statusConfig.icon;
            const phaseActions = actions[phase.id] || [];
            const total = phaseActions.length;
            const done = phaseActions.filter((a) => a.status === 'done').length;
            const donePct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isActive = phase.status === 'in_progress';

            return (
              <div key={phase.id} className="flex items-start">
                {/* Phase Node */}
                <div
                  className={cn(
                    'flex flex-col items-center w-44 cursor-pointer group',
                  )}
                  onClick={() => onPhaseClick(phase.id)}
                >
                  {/* Circle node */}
                  <div className="relative flex flex-col items-center">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all',
                        statusConfig.nodeColor,
                        isActive && 'shadow-[0_0_0_4px_rgba(59,130,246,0.2)]',
                        'group-hover:scale-110',
                      )}
                    >
                      <span className={cn(
                        'text-xs font-bold',
                        phase.status === 'completed' ? 'text-green-400' :
                        phase.status === 'in_progress' ? 'text-blue-400' :
                        phase.status === 'blocked' ? 'text-red-400' :
                        'text-gray-400'
                      )}>
                        {idx + 1}
                      </span>
                    </div>
                    {isActive && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </div>

                  {/* Phase info card */}
                  <div className={cn(
                    'mt-3 w-40 rounded-lg border p-3 transition-all group-hover:border-accent/50',
                    'bg-secondary/50 border-border',
                  )}>
                    {/* Status badge */}
                    <div className="flex items-center gap-1 mb-1.5">
                      <StatusIcon className={cn('w-3 h-3',
                        phase.status === 'completed' ? 'text-green-400' :
                        phase.status === 'in_progress' ? 'text-blue-400' :
                        phase.status === 'blocked' ? 'text-red-400' :
                        'text-gray-400'
                      )} />
                      <span className="text-[10px] text-[#8888a0]">{statusConfig.label}</span>
                    </div>

                    <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight mb-2 line-clamp-2">
                      {phase.name}
                    </p>

                    {/* Date range */}
                    {(phase.start_date || phase.end_date) && (
                      <p className="text-[10px] text-[#8888a0] mb-2 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                        {phase.start_date && new Date(phase.start_date).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}
                        {phase.end_date && ` – ${new Date(phase.end_date).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}`}
                      </p>
                    )}

                    {/* Mini progress bar */}
                    <div className="w-full h-1 bg-border rounded-full overflow-hidden mb-1">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          phase.status === 'completed' ? 'bg-green-500' :
                          phase.status === 'in_progress' ? 'bg-blue-500' :
                          phase.status === 'blocked' ? 'bg-red-500' :
                          'bg-gray-500'
                        )}
                        style={{ width: `${donePct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#8888a0]">
                      {total > 0 ? `${done}/${total} actions · ${donePct}%` : 'Chưa có action'}
                    </p>
                  </div>
                </div>

                {/* Connector arrow between phases */}
                {idx < sortedPhases.length - 1 && (
                  <div className="flex items-center mt-5 mx-1 flex-shrink-0">
                    <div className="w-6 h-px bg-border" />
                    <ArrowRight className="w-3 h-3 text-[#8888a0] flex-shrink-0" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border">
        {Object.entries(PHASE_STATUS_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <Icon className={cn('w-3 h-3',
                key === 'completed' ? 'text-green-400' :
                key === 'in_progress' ? 'text-blue-400' :
                key === 'blocked' ? 'text-red-400' : 'text-gray-400'
              )} />
              <span className="text-[10px] text-[#8888a0]">{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Phase Card (List View) ───────────────────────────────────────────────────

function PhaseCard({
  phase,
  phaseIndex,
  totalPhases,
  isExpanded,
  isLoadingActions,
  phaseActions,
  onToggle,
  onAddAction,
  onBulkAddAction,
  onUpdateActionStatus,
  onUpdateActionDetail,
  projectName,
  projectDomain,
}: {
  phase: StrategyPhase;
  phaseIndex: number;
  totalPhases: number;
  isExpanded: boolean;
  isLoadingActions: boolean;
  phaseActions: StrategyAction[];
  onToggle: () => void;
  onAddAction: () => void;
  onBulkAddAction: () => void;
  onUpdateActionStatus: (actionId: string, phaseId: string, status: StrategyAction['status']) => void;
  onUpdateActionDetail: (actionId: string, phaseId: string, data: Partial<StrategyAction>) => void;
  projectName?: string;
  projectDomain?: string;
}) {
  const statusConfig = PHASE_STATUS_CONFIG[phase.status] || PHASE_STATUS_CONFIG.planned;
  const StatusIcon = statusConfig.icon;
  const isLast = phaseIndex === totalPhases - 1;

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
    <div className="flex gap-0">
      {/* Left timeline connector */}
      <div className="flex flex-col items-center flex-shrink-0 mr-4">
        {/* Order badge */}
        <div className={cn(
          'w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 z-10',
          statusConfig.nodeColor,
          phase.status === 'completed' ? 'text-green-400' :
          phase.status === 'in_progress' ? 'text-blue-400' :
          phase.status === 'blocked' ? 'text-red-400' :
          'text-gray-400',
        )}>
          {phaseIndex + 1}
        </div>
        {/* Vertical connector line */}
        {!isLast && (
          <div className="w-px flex-1 mt-1 bg-border min-h-[2rem]" />
        )}
      </div>

      {/* Phase card */}
      <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden mb-3">
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

            {/* Dependency hint */}
            {phaseIndex > 0 && (
              <p className="text-[10px] text-[#8888a0] mb-1.5 flex items-center gap-1">
                <ArrowRight className="w-2.5 h-2.5" />
                Yêu cầu: Phase {phaseIndex} hoàn thành
              </p>
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
                        onUpdateAction={onUpdateActionDetail}
                        projectName={projectName}
                        projectDomain={projectDomain}
                        phaseName={phase.name}
                        phaseDescription={phase.description}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-[#8888a0]">
                    Chưa có action nào trong phase này
                  </div>
                )}

                {/* Add action buttons */}
                <div className="px-5 py-3 border-t border-border/60 bg-secondary/20 flex items-center gap-4">
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBulkAddAction();
                    }}
                    className="flex items-center gap-1.5 text-sm text-[#8888a0] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <LayoutList className="w-4 h-4" />
                    Thêm nhiều
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
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
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [showAddAction, setShowAddAction] = useState<string | null>(null);
  const [showBulkAddAction, setShowBulkAddAction] = useState<string | null>(null);
  const [showImportObsidian, setShowImportObsidian] = useState(false);

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

  // When timeline phase node clicked, switch to list and expand
  const handleTimelinePhaseClick = useCallback((phaseId: string) => {
    setViewMode('list');
    const next = new Set(expandedPhases);
    next.add(phaseId);
    setExpandedPhases(next);
    fetchActions(phaseId);
    // Scroll after a tick
    setTimeout(() => {
      const el = document.getElementById(`phase-card-${phaseId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
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

  const handleUpdateActionDetail = useCallback((
    actionId: string,
    phaseId: string,
    data: Partial<StrategyAction>
  ) => {
    setActions((prev) => ({
      ...prev,
      [phaseId]: (prev[phaseId] || []).map((a) =>
        a.id === actionId ? { ...a, ...data } : a
      ),
    }));
  }, []);

  const handleGeneratePrompts = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch('/api/v1/strategy/actions/generate-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: selectedProjectId }),
      });
      const data = await res.json();
      alert(`Đã generate ${data.updated} prompts (bỏ qua ${data.skipped})`);
      // Refresh actions for all expanded phases by fetching directly
      const phaseIds = Array.from(expandedPhases);
      const results = await Promise.all(
        phaseIds.map((phaseId) =>
          fetch(`/api/v1/strategy/actions?phase_id=${phaseId}`).then((r) => r.json()).then((d) => ({ phaseId, actions: d.actions || [] }))
        )
      );
      setActions((prev) => {
        const next = { ...prev };
        results.forEach(({ phaseId, actions: phaseActions }) => {
          next[phaseId] = phaseActions;
        });
        return next;
      });
    } catch (err) {
      console.error('Failed to generate prompts:', err);
    }
  };

  const sortedPhases = useMemo(() => [...phases].sort((a, b) => a.order_index - b.order_index), [phases]);

  if (isLoading && projects.length === 0) return <PageLoading />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Chiến lược SEO</h1>
          <p className="text-xs text-[#8888a0] mt-0.5">Quản lý theo Framework SEO 2026 - 4 Tầng</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Import from Obsidian */}
          <button
            onClick={() => setShowImportObsidian(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-border border border-border rounded-lg text-[var(--text-primary)] text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4 text-[#8888a0]" />
            Import từ Obsidian
          </button>

          {/* Generate AI Prompts */}
          <button
            onClick={handleGeneratePrompts}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium transition-colors"
          >
            <Bot className="w-4 h-4" />
            Generate Prompts
          </button>

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

      {/* View Mode Toggle */}
      {phases.length > 0 && (
        <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg w-fit">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              viewMode === 'list'
                ? 'bg-card text-[var(--text-primary)] shadow-sm'
                : 'text-[#8888a0] hover:text-[var(--text-primary)]',
            )}
          >
            <List className="w-4 h-4" />
            Danh sách
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              viewMode === 'timeline'
                ? 'bg-card text-[var(--text-primary)] shadow-sm'
                : 'text-[#8888a0] hover:text-[var(--text-primary)]',
            )}
          >
            <GitBranch className="w-4 h-4" />
            Timeline
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {phases.length > 0 && (
        <SummaryCards phases={phases} actions={actions} />
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && phases.length > 0 && (
        <TimelineView
          phases={sortedPhases}
          actions={actions}
          onPhaseClick={handleTimelinePhaseClick}
        />
      )}

      {/* List View */}
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
      ) : viewMode === 'list' ? (
        <div className="space-y-0">
          {sortedPhases.map((phase, idx) => {
            const selectedProject = projects.find(p => p.id === selectedProjectId);
            return (
              <div key={phase.id} id={`phase-card-${phase.id}`}>
                <PhaseCard
                  phase={phase}
                  phaseIndex={idx}
                  totalPhases={sortedPhases.length}
                  isExpanded={expandedPhases.has(phase.id)}
                  isLoadingActions={loadingPhases.has(phase.id)}
                  phaseActions={actions[phase.id] || []}
                  onToggle={() => togglePhase(phase.id)}
                  onAddAction={() => setShowAddAction(phase.id)}
                  onBulkAddAction={() => setShowBulkAddAction(phase.id)}
                  onUpdateActionStatus={handleUpdateActionStatus}
                  onUpdateActionDetail={handleUpdateActionDetail}
                  projectName={selectedProject?.name}
                  projectDomain={selectedProject?.domain}
                />
              </div>
            );
          })}
        </div>
      ) : null}

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

      {showBulkAddAction && (
        <BulkAddActionsModal
          phaseId={showBulkAddAction}
          projectId={selectedProjectId}
          onClose={() => setShowBulkAddAction(null)}
          onSaved={() => {
            const phaseId = showBulkAddAction;
            setShowBulkAddAction(null);
            setActions((prev) => {
              const next = { ...prev };
              delete next[phaseId];
              return next;
            });
            fetchActions(phaseId);
          }}
        />
      )}

      {showImportObsidian && (
        <ImportObsidianModal
          projectId={selectedProjectId}
          onClose={() => setShowImportObsidian(false)}
          onSaved={() => {
            setShowImportObsidian(false);
            fetchPhases(selectedProjectId);
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

// ─── Bulk Add Actions Modal ───────────────────────────────────────────────────

function BulkAddActionsModal({
  phaseId,
  projectId,
  onClose,
  onSaved,
}: {
  phaseId: string;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rawText, setRawText] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<StrategyAction['priority']>('medium');
  const [saving, setSaving] = useState(false);

  const parsedLines = useMemo(() => {
    return rawText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [rawText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedLines.length === 0) return;
    setSaving(true);
    try {
      const actionItems = parsedLines.map((title) => ({ title, category, priority }));
      await fetch('/api/v1/strategy/bulk-create-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase_id: phaseId, project_id: projectId, actions: actionItems }),
      });
      onSaved();
    } catch (err) {
      console.error('Failed to bulk create actions:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Thêm nhiều Actions</h2>
          <span className="text-xs text-[#8888a0] bg-secondary px-2 py-1 rounded-full">
            Mỗi dòng = 1 action
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Textarea */}
          <div>
            <label className="block text-sm text-[#8888a0] mb-1.5">
              Danh sách actions <span className="text-[10px]">(mỗi dòng 1 action)</span>
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              placeholder={`Audit Core Web Vitals\nTối ưu tốc độ trang\nCài đặt Schema Markup\nSubmit Sitemap lên GSC\nKiểm tra robots.txt`}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm font-mono resize-none"
              required
            />
          </div>

          {/* Shared category + priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#8888a0] mb-1.5">Danh mục (áp dụng tất cả)</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
              >
                <option value="">-- Chọn danh mục --</option>
                {SEO_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1.5">Độ ưu tiên (áp dụng tất cả)</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as StrategyAction['priority'])}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
              >
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
                <option value="critical">Khẩn cấp</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          {parsedLines.length > 0 && (
            <div className="bg-secondary/50 border border-border rounded-lg p-3">
              <p className="text-xs text-[#8888a0] mb-2 font-medium">
                Xem trước — {parsedLines.length} actions sẽ được thêm
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {parsedLines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-[var(--text-primary)]">
                    <span className="w-4 h-4 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

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
              disabled={saving || parsedLines.length === 0}
              className="flex-1 py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
            >
              {saving ? 'Đang lưu...' : `Thêm ${parsedLines.length} actions`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Import Obsidian Modal ────────────────────────────────────────────────────

function ImportObsidianModal({
  projectId,
  onClose,
  onSaved,
}: {
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState<'loading' | 'preview' | 'importing' | 'done' | 'error'>('loading');
  const [obsidianPhases, setObsidianPhases] = useState<ObsidianPhase[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadObsidianData();
  }, []);

  const loadObsidianData = async () => {
    setStep('loading');
    try {
      const res = await fetch('/api/v1/strategy/import-obsidian');
      if (!res.ok) throw new Error('Không thể kết nối Obsidian vault');
      const data = await res.json();
      const phasesRaw = data.phases || [];
      setObsidianPhases(
        phasesRaw.map((p: Omit<ObsidianPhase, 'selected' | 'expanded'> & { actions: Omit<ObsidianAction, 'selected'>[] }) => ({
          ...p,
          selected: true,
          expanded: false,
          actions: (p.actions || []).map((a: Omit<ObsidianAction, 'selected'>) => ({ ...a, selected: true })),
        }))
      );
      setStep('preview');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi không xác định');
      setStep('error');
    }
  };

  const togglePhase = (idx: number) => {
    setObsidianPhases((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, selected: !p.selected } : p))
    );
  };

  const togglePhaseExpand = (idx: number) => {
    setObsidianPhases((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, expanded: !p.expanded } : p))
    );
  };

  const toggleAction = (phaseIdx: number, actionIdx: number) => {
    setObsidianPhases((prev) =>
      prev.map((p, i) =>
        i === phaseIdx
          ? {
              ...p,
              actions: p.actions.map((a, j) =>
                j === actionIdx ? { ...a, selected: !a.selected } : a
              ),
            }
          : p
      )
    );
  };

  const toggleSelectAll = () => {
    const allSelected = obsidianPhases.every((p) => p.selected && p.actions.every((a) => a.selected));
    setObsidianPhases((prev) =>
      prev.map((p) => ({
        ...p,
        selected: !allSelected,
        actions: p.actions.map((a) => ({ ...a, selected: !allSelected })),
      }))
    );
  };

  const selectedPhasesCount = obsidianPhases.filter((p) => p.selected).length;
  const selectedActionsCount = obsidianPhases.reduce(
    (sum, p) => sum + p.actions.filter((a) => a.selected && p.selected).length,
    0
  );
  const allSelected = obsidianPhases.length > 0 && obsidianPhases.every((p) => p.selected && p.actions.every((a) => a.selected));

  const handleImport = async () => {
    setImporting(true);
    try {
      await fetch('/api/v1/strategy/import-obsidian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          phases: obsidianPhases,
        }),
      });
      setStep('done');
      setTimeout(() => {
        onSaved();
      }, 1200);
    } catch (err) {
      console.error('Import failed:', err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Upload className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Import từ Obsidian</h2>
              <p className="text-xs text-[#8888a0]">Quét vault và chọn phases cần import</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8888a0] hover:text-[var(--text-primary)] transition-colors p-1"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-sm text-[#8888a0]">Đang quét Obsidian vault...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-red-400">{errorMsg}</p>
              <button
                onClick={loadObsidianData}
                className="px-4 py-2 bg-secondary hover:bg-border rounded-lg text-sm text-[var(--text-primary)] transition-colors"
              >
                Thử lại
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <p className="text-sm text-green-400">Import thành công!</p>
            </div>
          )}

          {step === 'preview' && (
            <div className="p-4 space-y-3">
              {/* Select all toggle */}
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-[#8888a0] hover:text-[var(--text-primary)] transition-colors"
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 text-accent" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
                <span className="text-xs text-[#8888a0]">
                  {obsidianPhases.length} phases tìm thấy
                </span>
              </div>

              {/* Phase list */}
              {obsidianPhases.map((phase, phaseIdx) => (
                <div key={phaseIdx} className="border border-border rounded-xl overflow-hidden">
                  {/* Phase header */}
                  <div className="flex items-center gap-3 p-3 bg-secondary/30">
                    <button
                      onClick={() => togglePhase(phaseIdx)}
                      className="flex-shrink-0"
                    >
                      {phase.selected ? (
                        <CheckSquare className="w-4 h-4 text-accent" />
                      ) : (
                        <Square className="w-4 h-4 text-[#8888a0]" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{phase.name}</p>
                      {phase.timeline && (
                        <p className="text-xs text-[#8888a0]">{phase.timeline}</p>
                      )}
                    </div>
                    <span className="text-xs text-[#8888a0] flex-shrink-0">
                      {phase.actions.length} actions
                    </span>
                    <button
                      onClick={() => togglePhaseExpand(phaseIdx)}
                      className="text-[#8888a0] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
                    >
                      {phase.expanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Actions list (expanded) */}
                  {phase.expanded && phase.actions.length > 0 && (
                    <div className="divide-y divide-border/40">
                      {phase.actions.map((action, actionIdx) => (
                        <div
                          key={actionIdx}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-secondary/20 transition-colors"
                        >
                          <button
                            onClick={() => toggleAction(phaseIdx, actionIdx)}
                            className="flex-shrink-0"
                          >
                            {action.selected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-accent" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-[#8888a0]" />
                            )}
                          </button>
                          <span className="text-xs text-[var(--text-primary)] flex-1 min-w-0 truncate">
                            {action.title}
                          </span>
                          {action.category && (
                            <span className="text-[10px] text-[#8888a0] flex-shrink-0 bg-secondary px-1.5 py-0.5 rounded">
                              {action.category}
                            </span>
                          )}
                          {action.priority && (
                            <span className={cn(
                              'text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded',
                              action.priority === 'critical' ? 'text-red-400 bg-red-500/10' :
                              action.priority === 'high' ? 'text-orange-400 bg-orange-500/10' :
                              action.priority === 'medium' ? 'text-yellow-400 bg-yellow-500/10' :
                              'text-gray-400 bg-gray-500/10'
                            )}>
                              {action.priority === 'critical' ? 'Khẩn' :
                               action.priority === 'high' ? 'Cao' :
                               action.priority === 'medium' ? 'TB' : 'Thấp'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="flex items-center justify-between p-6 border-t border-border flex-shrink-0">
            <div className="text-sm text-[#8888a0]">
              <span className="text-[var(--text-primary)] font-medium">{selectedPhasesCount} phases</span>
              {', '}
              <span className="text-[var(--text-primary)] font-medium">{selectedActionsCount} actions</span>
              {' sẽ được import'}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-secondary hover:bg-border rounded-lg text-[var(--text-primary)] text-sm font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleImport}
                disabled={importing || selectedPhasesCount === 0}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang import...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
