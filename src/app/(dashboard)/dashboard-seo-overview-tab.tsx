'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe,
  ArrowRight,
  Layers,
  Zap,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import DashboardWPContentStatsSection from './dashboard-wp-content-stats-section';
import DashboardSeoKpiCardsRow from './dashboard-seo-kpi-cards-row';
import DashboardKeywordDistributionBoxes from './dashboard-keyword-distribution-boxes';
import DashboardTrafficTrendMiniChart from './dashboard-traffic-trend-mini-chart';
import DashboardPerProjectSeoSummaryCards from './dashboard-per-project-seo-summary-cards';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectGsc {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  prevClicks: number | null;
  prevImpressions: number | null;
}

interface ProjectKeywords {
  total: number;
  top3: number;
  top10: number;
  top20: number;
  top50: number;
  beyond50: number;
  improved: number;
  declined: number;
}

interface ProjectSummary {
  id: string;
  name: string;
  slug: string | null;
  domain: string | null;
  gsc: ProjectGsc;
  keywords: ProjectKeywords;
  healthScore: number;
  auditDate: string | null;
}

interface SeoSummaryTotals {
  clicks: number;
  impressions: number;
  totalKeywords: number;
  keywordsInTop10: number;
  improved: number;
  declined: number;
}

interface DailyPoint {
  date: string;
  clicks: number;
  impressions: number;
}

interface Distribution {
  top3: number;
  top10: number;
  top20: number;
  top50: number;
  beyond50: number;
}

interface SeoSummaryData {
  projects: ProjectSummary[];
  totals: SeoSummaryTotals;
  dailyTrend: DailyPoint[];
  distribution: Distribution;
}

interface StrategyPhase {
  id: string;
  name: string;
  status: string;
  progress: number;
  phase_type: string;
  priority: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardSEOOverviewTab() {
  const [seoData, setSeoData] = useState<SeoSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [strategyPhases, setStrategyPhases] = useState<StrategyPhase[]>([]);
  const [actionStats, setActionStats] = useState<{ total: number; done: number }>({ total: 0, done: 0 });
  const [activeProjectName, setActiveProjectName] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      // Fetch new SEO summary API
      const res = await fetch('/api/v1/dashboard/seo-summary');
      const data: SeoSummaryData = await res.json();
      setSeoData(data);

      // Fetch strategy phases for first project
      try {
        const projectsRes = await fetch('/api/v1/projects');
        const projectsData = await projectsRes.json();
        const projectsList = projectsData.projects || [];
        if (projectsList.length > 0) {
          const firstProject = projectsList[0];
          setActiveProjectName(firstProject.name);
          const [phasesRes, actionsRes] = await Promise.all([
            fetch(`/api/v1/strategy/phases?project_id=${firstProject.id}`),
            fetch(`/api/v1/strategy/actions?project_id=${firstProject.id}`),
          ]);
          const phasesData = await phasesRes.json();
          const actionsData = await actionsRes.json();
          setStrategyPhases(phasesData.phases || []);
          const allActions = actionsData.actions || [];
          setActionStats({
            total: allActions.length,
            done: allActions.filter((a: { status: string }) => a.status === 'done').length,
          });
        }
      } catch {
        // Strategy optional
      }
    } catch (error) {
      console.error('Failed to fetch SEO summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <PageLoading />;

  if (!seoData || seoData.projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#8888a0]">
        <Globe className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-base font-medium text-[var(--text-primary)]">Chưa có dự án nào</p>
        <p className="text-sm mt-1">Thêm dự án trong phần Cài đặt để bắt đầu</p>
      </div>
    );
  }

  const { projects, totals, dailyTrend, distribution } = seoData;
  const completedPhases = strategyPhases.filter((p) => p.status === 'completed').length;
  const inProgressPhases = strategyPhases.filter((p) => p.status === 'in_progress').length;

  return (
    <div className="space-y-5">

      {/* ── Row 1: KPI Cards ── */}
      <DashboardSeoKpiCardsRow totals={totals} />

      {/* ── Row 2: Keyword Distribution + Traffic Trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardKeywordDistributionBoxes distribution={distribution} />
        <DashboardTrafficTrendMiniChart dailyTrend={dailyTrend} />
      </div>

      {/* ── Row 3: Per-Project Summary Cards ── */}
      <DashboardPerProjectSeoSummaryCards projects={projects} />

      {/* ── Row 4: Strategy Roadmap ── */}
      {strategyPhases.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-accent/10 rounded-xl border border-accent/20">
                <Layers className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Lộ trình chiến lược SEO</h3>
                <p className="text-xs text-[#8888a0]">
                  {activeProjectName && <span className="text-accent font-medium">{activeProjectName}</span>}
                  {activeProjectName && ' · '}
                  {completedPhases}/{strategyPhases.length} phase hoàn thành
                  {inProgressPhases > 0 && ` · ${inProgressPhases} đang thực hiện`}
                  {actionStats.total > 0 && ` · ${actionStats.done}/${actionStats.total} việc`}
                </p>
              </div>
            </div>
            <Link
              href="/strategy"
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 bg-accent/10 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              Chi tiết <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Phase Timeline */}
          <div className="relative">
            <div className="absolute top-4 left-4 right-4 h-px bg-border" />
            <div className="flex items-start gap-0 overflow-x-auto pb-2">
              {strategyPhases.map((phase, idx) => {
                const isCompleted = phase.status === 'completed';
                const isInProgress = phase.status === 'in_progress';
                const isBlocked = phase.status === 'blocked';
                const widthPct = 100 / strategyPhases.length;

                return (
                  <div
                    key={phase.id}
                    className="flex flex-col items-center gap-2 flex-shrink-0"
                    style={{ width: `${widthPct}%`, minWidth: '80px' }}
                  >
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-sm transition-all ${
                      isCompleted
                        ? 'bg-success border-success shadow-success/20'
                        : isInProgress
                        ? 'bg-accent border-accent shadow-accent/30 ring-3 ring-accent/20'
                        : isBlocked
                        ? 'bg-danger/10 border-danger/50'
                        : 'bg-card border-border'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : isInProgress ? (
                        <Zap className="w-3.5 h-3.5 text-white" />
                      ) : isBlocked ? (
                        <AlertCircle className="w-3.5 h-3.5 text-danger" />
                      ) : (
                        <span className="text-xs font-bold text-[#8888a0]">{idx + 1}</span>
                      )}
                    </div>

                    <div className="text-center px-1 w-full">
                      <p className={`text-[10px] font-semibold leading-tight ${
                        isCompleted ? 'text-success'
                          : isInProgress ? 'text-accent'
                          : isBlocked ? 'text-danger'
                          : 'text-[#8888a0]'
                      }`} title={phase.name}>
                        {phase.name.length > 14 ? phase.name.slice(0, 14) + '…' : phase.name}
                      </p>
                      <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        isCompleted ? 'bg-success/15 text-success'
                          : isInProgress ? 'bg-accent/15 text-accent'
                          : isBlocked ? 'bg-danger/15 text-danger'
                          : 'bg-secondary text-[#8888a0]'
                      }`}>
                        {isCompleted ? 'Xong' : isInProgress ? 'Đang làm' : isBlocked ? 'Bị chặn' : 'Chưa bắt đầu'}
                      </span>
                      {phase.progress > 0 && (
                        <>
                          <div className="mt-1.5 w-full h-1 bg-secondary rounded-full overflow-hidden mx-auto" style={{ maxWidth: '60px' }}>
                            <div
                              className={`h-full rounded-full ${isCompleted ? 'bg-success' : isInProgress ? 'bg-accent' : 'bg-[#8888a0]'}`}
                              style={{ width: `${phase.progress}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-[#8888a0] mt-0.5">{phase.progress}%</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[#8888a0]">Tiến độ tổng thể</span>
              <span className="text-xs font-bold text-accent">
                {Math.round((completedPhases / strategyPhases.length) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent/80 rounded-full transition-all"
                style={{ width: `${(completedPhases / strategyPhases.length) * 100}%` }}
              />
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1 text-[10px] text-success">
                <CheckCircle className="w-3 h-3" /> {completedPhases} hoàn thành
              </span>
              <span className="flex items-center gap-1 text-[10px] text-accent">
                <Zap className="w-3 h-3" /> {inProgressPhases} đang làm
              </span>
              <span className="flex items-center gap-1 text-[10px] text-[#8888a0]">
                <div className="w-3 h-3 rounded-full border border-border" />
                {strategyPhases.length - completedPhases - inProgressPhases} chờ
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Row 5: WordPress Content Stats ── */}
      <DashboardWPContentStatsSection />

    </div>
  );
}
