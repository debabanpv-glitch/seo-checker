'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe,
  FileText,
  CheckCircle2,
  AlertTriangle,
  LinkIcon,
  ArrowRight,
  Layers,
  Zap,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Activity,
} from 'lucide-react';
import ScoreRing from '@/components/score-ring-svg-circle';
import { PageLoading } from '@/components/LoadingSpinner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryScores {
  content: number;
  technical: number;
  images: number;
  links: number;
  eeat: number;
  aiReadiness: number;
}

interface ProjectCard {
  id: string;
  name: string;
  slug: string | null;
  domain: string | null;
  healthScore: number;
  checkedPages: number;
  auditDate: string | null;
  auditType: string | null;
  stats: {
    totalPages: number;
    status200: number;
    status301: number;
    status404: number;
    avgSpeed: number;
    orphanPages: number;
    indexable: number;
  };
  categoryScores: CategoryScores | null;
}

interface StrategyPhase {
  id: string;
  name: string;
  status: string; // planned | in_progress | completed | blocked
  progress: number;
  phase_type: string;
  priority: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardSEOOverviewTab() {
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [strategyPhases, setStrategyPhases] = useState<StrategyPhase[]>([]);
  const [activeProjectName, setActiveProjectName] = useState('');

  useEffect(() => {
    fetchSEOOverview();
  }, []);

  const fetchSEOOverview = async () => {
    try {
      const res = await fetch('/api/v1/dashboard/seo-overview');
      const data = await res.json();
      setProjects(data.projects || []);

      // Fetch strategy phases for first project
      try {
        const projectsRes = await fetch('/api/v1/projects');
        const projectsData = await projectsRes.json();
        const projectsList = projectsData.projects || [];
        if (projectsList.length > 0) {
          const firstProject = projectsList[0];
          setActiveProjectName(firstProject.name);
          const phasesRes = await fetch(`/api/v1/strategy/phases?project_id=${firstProject.id}`);
          const phasesData = await phasesRes.json();
          setStrategyPhases(phasesData.phases || []);
        }
      } catch {
        // Strategy phases optional
      }
    } catch (error) {
      console.error('Failed to fetch SEO overview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#8888a0]">
        <Globe className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-base font-medium text-[var(--text-primary)]">Chưa có dự án nào</p>
        <p className="text-sm mt-1">Thêm dự án trong phần Cài đặt để bắt đầu</p>
      </div>
    );
  }

  // Summary stats across all projects
  const totalPages = projects.reduce((s, p) => s + p.stats.totalPages, 0);
  const total404 = projects.reduce((s, p) => s + p.stats.status404, 0);
  const avgHealth = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.healthScore, 0) / projects.length)
    : 0;
  const avgSpeed = projects.length
    ? +(projects.reduce((s, p) => s + p.stats.avgSpeed, 0) / projects.length).toFixed(1)
    : 0;

  const completedPhases = strategyPhases.filter(p => p.status === 'completed').length;
  const inProgressPhases = strategyPhases.filter(p => p.status === 'in_progress').length;

  return (
    <div className="space-y-5">

      {/* ── Summary Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#8888a0] text-xs">Tổng trang</span>
            <div className="p-1.5 bg-accent/10 rounded-lg"><FileText className="w-3.5 h-3.5 text-accent" /></div>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{totalPages.toLocaleString()}</p>
          <p className="text-xs text-[#8888a0] mt-0.5">{projects.length} dự án</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#8888a0] text-xs">Health Score TB</span>
            <div className="p-1.5 bg-success/10 rounded-lg"><Activity className="w-3.5 h-3.5 text-success" /></div>
          </div>
          <p className={`text-2xl font-bold ${avgHealth >= 70 ? 'text-success' : avgHealth >= 50 ? 'text-warning' : 'text-danger'}`}>{avgHealth}</p>
          <p className="text-xs text-[#8888a0] mt-0.5">trung bình /100</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none ${total404 > 0 ? 'from-danger/5' : 'from-success/5'} to-transparent`} />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#8888a0] text-xs">Lỗi 404</span>
            <div className={`p-1.5 rounded-lg ${total404 > 0 ? 'bg-danger/10' : 'bg-success/10'}`}>
              <AlertTriangle className={`w-3.5 h-3.5 ${total404 > 0 ? 'text-danger' : 'text-success'}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${total404 > 0 ? 'text-danger' : 'text-success'}`}>{total404}</p>
          <p className="text-xs text-[#8888a0] mt-0.5">{total404 > 0 ? 'cần fix ngay' : 'không có lỗi'}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none ${avgSpeed > 5 ? 'from-danger/5' : avgSpeed > 3 ? 'from-warning/5' : 'from-success/5'} to-transparent`} />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#8888a0] text-xs">Tốc độ TB</span>
            <div className={`p-1.5 rounded-lg ${avgSpeed > 5 ? 'bg-danger/10' : avgSpeed > 3 ? 'bg-warning/10' : 'bg-success/10'}`}>
              <TrendingUp className={`w-3.5 h-3.5 ${avgSpeed > 5 ? 'text-danger' : avgSpeed > 3 ? 'text-warning' : 'text-success'}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${avgSpeed > 5 ? 'text-danger' : avgSpeed > 3 ? 'text-warning' : 'text-success'}`}>
            {avgSpeed > 0 ? `${avgSpeed}s` : '--'}
          </p>
          <p className="text-xs text-[#8888a0] mt-0.5">page load time</p>
        </div>
      </div>

      {/* ── Strategy Roadmap ── */}
      {strategyPhases.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-accent/10 rounded-xl border border-accent/20">
                <Layers className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">SEO Strategy Roadmap</h3>
                <p className="text-xs text-[#8888a0]">
                  {activeProjectName && <span className="text-accent font-medium">{activeProjectName}</span>}
                  {activeProjectName && ' · '}
                  {completedPhases}/{strategyPhases.length} phase hoàn thành
                  {inProgressPhases > 0 && ` · ${inProgressPhases} đang thực hiện`}
                </p>
              </div>
            </div>
            <Link href="/strategy" className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 bg-accent/10 px-3 py-1.5 rounded-lg transition-colors font-medium">
              Chi tiết <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Phase Timeline */}
          <div className="relative">
            {/* Background connector line */}
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
                    {/* Status dot */}
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

                    {/* Phase info */}
                    <div className="text-center px-1 w-full">
                      <p className={`text-[10px] font-semibold leading-tight ${
                        isCompleted ? 'text-success'
                          : isInProgress ? 'text-accent'
                          : isBlocked ? 'text-danger'
                          : 'text-[#8888a0]'
                      }`} title={phase.name}>
                        {phase.name.length > 14 ? phase.name.slice(0, 14) + '…' : phase.name}
                      </p>

                      {/* Status badge */}
                      <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        isCompleted ? 'bg-success/15 text-success'
                          : isInProgress ? 'bg-accent/15 text-accent'
                          : isBlocked ? 'bg-danger/15 text-danger'
                          : 'bg-secondary text-[#8888a0]'
                      }`}>
                        {isCompleted ? 'Xong' : isInProgress ? 'Đang làm' : isBlocked ? 'Bị chặn' : 'Chưa bắt đầu'}
                      </span>

                      {/* Progress bar */}
                      {phase.progress > 0 && (
                        <div className="mt-1.5 w-full h-1 bg-secondary rounded-full overflow-hidden mx-auto" style={{ maxWidth: '60px' }}>
                          <div
                            className={`h-full rounded-full ${isCompleted ? 'bg-success' : isInProgress ? 'bg-accent' : 'bg-[#8888a0]'}`}
                            style={{ width: `${phase.progress}%` }}
                          />
                        </div>
                      )}
                      {phase.progress > 0 && (
                        <p className="text-[9px] text-[#8888a0] mt-0.5">{phase.progress}%</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overall strategy progress bar */}
          {strategyPhases.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-[#8888a0]">Tiến độ tổng thể</span>
                <span className="text-xs font-bold text-accent">{Math.round((completedPhases / strategyPhases.length) * 100)}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent/80 rounded-full transition-all"
                  style={{ width: `${(completedPhases / strategyPhases.length) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1 text-[10px] text-success"><CheckCircle className="w-3 h-3" /> {completedPhases} hoàn thành</span>
                <span className="flex items-center gap-1 text-[10px] text-accent"><Zap className="w-3 h-3" /> {inProgressPhases} đang làm</span>
                <span className="flex items-center gap-1 text-[10px] text-[#8888a0]">
                  <div className="w-3 h-3 rounded-full border border-border" />
                  {strategyPhases.length - completedPhases - inProgressPhases} chờ
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Project Cards Grid ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tổng quan các dự án</h3>
          <span className="px-2 py-0.5 bg-secondary text-[#8888a0] text-xs rounded-full">{projects.length} dự án</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectSEOCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Project SEO Card ─────────────────────────────────────────────────────────

function ProjectSEOCard({ project }: { project: ProjectCard }) {
  const { stats } = project;
  const hasAuditData = stats.totalPages > 0 || project.checkedPages > 0;
  const projectUrl = `/projects/${project.slug || project.id}`;

  return (
    <Link
      href={projectUrl}
      className="group bg-card border border-border rounded-xl p-5 hover:border-accent/40 transition-all hover:shadow-lg hover:shadow-accent/5 block"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-accent transition-colors">
            {project.name}
          </h3>
          {project.domain && (
            <p className="text-xs text-[#8888a0] mt-0.5 flex items-center gap-1">
              <Globe className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{project.domain}</span>
            </p>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-[#8888a0] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5 ml-2" />
      </div>

      {hasAuditData ? (
        <>
          {/* Score Ring + Key Stats */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-shrink-0">
              <ScoreRing score={project.healthScore} size={76} strokeWidth={7} />
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              <StatRow label="Tổng trang" value={stats.totalPages.toLocaleString()} icon={<FileText className="w-3 h-3" />} />
              <StatRow label="200 OK" value={stats.status200.toLocaleString()} icon={<CheckCircle2 className="w-3 h-3" />} color="text-success" />
              <StatRow label="301" value={stats.status301.toLocaleString()} icon={<LinkIcon className="w-3 h-3" />} color="text-warning" />
            </div>
          </div>

          {/* Category Scores or Fallback Stats */}
          {project.categoryScores ? (
            <div className="pt-3 border-t border-border space-y-1.5">
              {([
                ['Content', project.categoryScores.content],
                ['Technical', project.categoryScores.technical],
                ['Images', project.categoryScores.images],
                ['Links', project.categoryScores.links],
                ['E-E-A-T', project.categoryScores.eeat],
                ['AI Ready', project.categoryScores.aiReadiness],
              ] as [string, number][]).map(([label, score]) => (
                <ScoreBar key={label} label={label} score={score} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
              <MiniStat
                label="404"
                value={stats.status404}
                color={stats.status404 > 0 ? 'text-danger' : 'text-success'}
                bg={stats.status404 > 0 ? 'bg-danger/8' : 'bg-success/8'}
              />
              <MiniStat
                label="Speed"
                value={stats.avgSpeed > 0 ? `${stats.avgSpeed.toFixed(1)}s` : '--'}
                color={stats.avgSpeed > 5 ? 'text-danger' : stats.avgSpeed > 3 ? 'text-warning' : 'text-success'}
                bg={stats.avgSpeed > 5 ? 'bg-danger/8' : stats.avgSpeed > 3 ? 'bg-warning/8' : 'bg-success/8'}
              />
              <MiniStat
                label="Orphan"
                value={stats.orphanPages}
                color={stats.orphanPages > 0 ? 'text-warning' : 'text-success'}
                bg={stats.orphanPages > 0 ? 'bg-warning/8' : 'bg-success/8'}
              />
            </div>
          )}

          {/* Audit Date */}
          {project.auditDate && (
            <p className="text-[10px] text-[#8888a0] mt-3 pt-2 border-t border-border">
              Crawl lần cuối: {new Date(project.auditDate).toLocaleDateString('vi-VN')}
            </p>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-[#8888a0]">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 opacity-40" />
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Chưa có dữ liệu audit</p>
          <p className="text-xs mt-1">Chạy SEO Audit để xem kết quả</p>
          <span className="mt-3 text-xs px-3 py-1.5 bg-accent/10 text-accent rounded-lg font-medium group-hover:bg-accent group-hover:text-white transition-colors">
            Bắt đầu Audit
          </span>
        </div>
      )}
    </Link>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  icon,
  color = 'text-[var(--text-primary)]',
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1 text-[#8888a0]">
        {icon}
        {label}
      </span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color = 'text-[var(--text-primary)]',
  bg = 'bg-secondary',
}: {
  label: string;
  value: string | number;
  color?: string;
  bg?: string;
}) {
  return (
    <div className={`text-center py-2 px-1 rounded-lg ${bg}`}>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-[#8888a0] mt-0.5">{label}</p>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-danger';
  const textColor = score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-danger';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[#8888a0] w-14 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[10px] font-semibold w-7 text-right ${textColor}`}>{score}</span>
    </div>
  );
}
