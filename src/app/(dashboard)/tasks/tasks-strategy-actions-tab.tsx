'use client';

// ---------------------------------------------------------------------------
// Strategy Actions Tab — shows all strategy_actions grouped by category
// with status badges, priority, and phase info
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo } from 'react';
import { Target, ChevronDown, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageLoading } from '@/components/LoadingSpinner';

interface StrategyAction {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  phase_id: string;
  project_id: string;
  assigned_to?: string;
  executor_type?: string;
}

interface Phase {
  id: string;
  name: string;
  project_id: string;
}

interface Project {
  id: string;
  name: string;
}

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  todo: { label: 'Chờ', bg: 'bg-secondary', text: 'text-[#8888a0]' },
  doing: { label: 'Đang làm', bg: 'bg-blue-500/15', text: 'text-blue-400' },
  done: { label: 'Xong', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  blocked: { label: 'Blocked', bg: 'bg-red-500/15', text: 'text-red-400' },
};

const PRI_CFG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Khẩn', color: 'text-red-400' },
  high: { label: 'Cao', color: 'text-orange-400' },
  medium: { label: 'TB', color: 'text-yellow-400' },
  low: { label: 'Thấp', color: 'text-blue-400' },
};

const CAT_LABELS: Record<string, string> = {
  technical_seo: 'Technical SEO',
  content: 'Content',
  on_page: 'On-Page',
  off_page: 'Off-Page / Links',
  aeo: 'AEO (Answer Engine)',
  aio: 'AIO (AI Optimization)',
  geo: 'GEO (Local SEO)',
};

export default function TasksStrategyActionsTab({ projects }: { projects: Project[] }) {
  const [actions, setActions] = useState<StrategyAction[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const projectIds = selectedProject ? [selectedProject] : projects.map(p => p.id);
        const results = await Promise.all(
          projectIds.map(pid =>
            Promise.all([
              fetch(`/api/v1/strategy/actions?project_id=${pid}`).then(r => r.json()),
              fetch(`/api/v1/strategy/phases?project_id=${pid}`).then(r => r.json()),
            ])
          )
        );
        const allActions: StrategyAction[] = [];
        const allPhases: Phase[] = [];
        for (const [aRes, pRes] of results) {
          allActions.push(...(aRes.actions || []));
          allPhases.push(...(pRes.phases || []));
        }
        setActions(allActions);
        setPhases(allPhases);
      } catch (err) {
        console.error('Failed to fetch strategy actions:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [selectedProject, projects]);

  const filtered = useMemo(() => {
    let list = actions;
    if (selectedCategory) list = list.filter(a => a.category === selectedCategory);
    if (selectedStatus) list = list.filter(a => a.status === selectedStatus);
    return list;
  }, [actions, selectedCategory, selectedStatus]);

  const grouped = useMemo(() => {
    const map = new Map<string, StrategyAction[]>();
    for (const a of filtered) {
      const cat = a.category || 'other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(a);
    }
    // Sort by count desc
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const stats = useMemo(() => {
    const total = actions.length;
    const done = actions.filter(a => a.status === 'done').length;
    const doing = actions.filter(a => a.status === 'doing').length;
    const blocked = actions.filter(a => a.status === 'blocked').length;
    return { total, done, doing, blocked, todo: total - done - doing - blocked };
  }, [actions]);

  const categories = useMemo(() => [...new Set(actions.map(a => a.category || 'other'))], [actions]);
  const phaseMap = useMemo(() => new Map(phases.map(p => [p.id, p.name])), [phases]);

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="px-3 py-1 bg-card border border-border rounded-lg">
          Tổng: <b className="text-[var(--text-primary)]">{stats.total}</b>
        </span>
        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
          Xong: {stats.done}
        </span>
        <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
          Đang làm: {stats.doing}
        </span>
        <span className="px-3 py-1 bg-secondary border border-border rounded-lg text-[#8888a0]">
          Chờ: {stats.todo}
        </span>
        {stats.blocked > 0 && (
          <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            Blocked: {stats.blocked}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-[#8888a0]" />
        <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
          className="px-2 py-1 bg-card border border-border rounded-lg text-sm text-[var(--text-primary)]">
          <option value="">Tất cả dự án</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
          className="px-2 py-1 bg-card border border-border rounded-lg text-sm text-[var(--text-primary)]">
          <option value="">Tất cả danh mục</option>
          {categories.map(c => <option key={c} value={c}>{CAT_LABELS[c] || c}</option>)}
        </select>
        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
          className="px-2 py-1 bg-card border border-border rounded-lg text-sm text-[var(--text-primary)]">
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Grouped Actions */}
      {grouped.map(([cat, catActions]) => {
        const isOpen = expandedCats.has(cat);
        const catDone = catActions.filter(a => a.status === 'done').length;
        return (
          <div key={cat} className="bg-card border border-border rounded-xl overflow-hidden">
            <button onClick={() => toggleCat(cat)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-accent" />
                <span className="text-sm font-bold text-[var(--text-primary)]">{CAT_LABELS[cat] || cat}</span>
                <span className="text-xs text-[#8888a0]">{catDone}/{catActions.length}</span>
              </div>
              <ChevronDown className={cn('w-4 h-4 text-[#8888a0] transition-transform', isOpen && 'rotate-180')} />
            </button>

            {isOpen && (
              <div className="border-t border-border">
                {catActions
                  .sort((a, b) => {
                    const pOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
                    const sOrder: Record<string, number> = { doing: 0, blocked: 1, todo: 2, done: 3 };
                    return (sOrder[a.status] ?? 2) - (sOrder[b.status] ?? 2) || (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
                  })
                  .map(a => {
                    const sCfg = STATUS_CFG[a.status] || STATUS_CFG.todo;
                    const pCfg = PRI_CFG[a.priority] || PRI_CFG.medium;
                    return (
                      <div key={a.id} className="flex items-center gap-3 px-4 py-2 border-b border-border/50 last:border-0 hover:bg-secondary/10">
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', sCfg.bg, sCfg.text)}>{sCfg.label}</span>
                        <span className={cn('text-[10px] font-medium w-8', pCfg.color)}>{pCfg.label}</span>
                        <span className="text-sm text-[var(--text-primary)] flex-1 min-w-0 truncate">{a.title}</span>
                        <span className="text-[10px] text-[#666680] flex-shrink-0">{phaseMap.get(a.phase_id) ?? ''}</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-8 text-[#8888a0] text-sm">Không có actions nào</div>
      )}
    </div>
  );
}
