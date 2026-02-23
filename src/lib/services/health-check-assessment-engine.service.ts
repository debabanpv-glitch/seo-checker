// ---------------------------------------------------------------------------
// Health Check Assessment Engine
// Reads ALL data sources → generates per-project health score, warnings,
// priority actions, trends, and expert summary.
// ---------------------------------------------------------------------------

import { getProjects } from './project.service';
import { getAudits } from './audit-results-crud.service';
import { getSnapshots } from './gsc-snapshots-save-and-query.service';
import { getRankingGrowth } from './keyword.service';
import { getPhases, getActions } from './strategy-phases-and-actions-crud.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type TrendDir = 'up' | 'down' | 'stable' | 'no_data';

export interface Warning {
  severity: Severity;
  category: string;
  title: string;
  detail: string;
}

export interface PriorityAction {
  title: string;
  severity: Severity;
  source: string;
}

export interface CategoryScores {
  technical: number | null;
  content: number | null;
  images: number | null;
  links: number | null;
  eeat: number | null;
  aiReadiness: number | null;
  traffic: number | null;
  keywords: number | null;
  strategy: number | null;
}

export interface StrategyPhaseData {
  name: string;
  status: string;
  total: number;
  done: number;
  progress: number;
}

export interface StrategyActionData {
  title: string;
  priority: string;
  status: string;
  category: string;
  phase: string;
}

export interface TrafficData {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  prevClicks: number | null;
  prevImpressions: number | null;
}

export interface KeywordData {
  total: number;
  top3: number;
  top10: number;
  top3Change: number;
  top10Change: number;
}

export interface ProjectHealthAssessment {
  id: string;
  name: string;
  slug: string | null;
  domain: string | null;
  overallScore: number;
  overallLabel: string;
  categoryScores: CategoryScores;
  warnings: Warning[];
  priorityActions: PriorityAction[];
  trends: { traffic: TrendDir; keywords: TrendDir; seoScore: TrendDir };
  expertSummary: string;
  dataAge: {
    lastAudit: string | null;
    lastGscSnapshot: string | null;
    lastKeywordSync: string | null;
  };
  trafficData: TrafficData | null;
  keywordData: KeywordData | null;
  strategyData: {
    totalActions: number;
    doneActions: number;
    doingActions: number;
    todoActions: number;
    blockedActions: number;
    phases: StrategyPhaseData[];
    nextActions: StrategyActionData[];
  } | null;
}

export interface HealthCheckResponse {
  projects: ProjectHealthAssessment[];
  meta: {
    generatedAt: string;
    totalProjects: number;
    criticalCount: number;
    healthyCount: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuditSummary = Record<string, any>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function scoreLabel(s: number): string {
  if (s >= 80) return 'Tot';
  if (s >= 60) return 'Trung binh';
  if (s >= 40) return 'Yeu';
  return 'Kem';
}

function clamp(v: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }

// ---------------------------------------------------------------------------
// Score calculators
// ---------------------------------------------------------------------------

function calcTrafficScore(latest: { clicks: number }, prev: { clicks: number }): number {
  const pct = prev.clicks > 0 ? ((latest.clicks - prev.clicks) / prev.clicks) * 100 : 0;
  if (pct > 20) return 95;
  if (pct > 0) return clamp(75 + pct);
  if (pct > -10) return clamp(60 + pct);
  if (pct > -30) return 40;
  return 20;
}

function calcKeywordScore(summary: {
  top3Last: number; top10Last: number; total: number;
  top3Change: number; top10Change: number;
}): number {
  if (summary.total === 0) return 0;
  const ratio = summary.top10Last / summary.total;
  const base = Math.min(ratio * 100, 80);
  const bonus = (summary.top10Change > 0 ? 10 : 0) + (summary.top3Change > 0 ? 10 : 0);
  const penalty = summary.top10Change < -3 ? -15 : 0;
  return clamp(Math.round(base + bonus + penalty));
}

function calcFreshnessScore(dataAge: { lastAudit: string | null; lastGscSnapshot: string | null; lastKeywordSync: string | null }): number {
  let score = 100;
  const da = daysAgo(dataAge.lastAudit);
  const dg = daysAgo(dataAge.lastGscSnapshot);
  const dk = daysAgo(dataAge.lastKeywordSync);

  if (da === null) score -= 40; else if (da > 30) score -= 30; else if (da > 14) score -= 15;
  if (dg === null) score -= 30; else if (dg > 14) score -= 20; else if (dg > 7) score -= 10;
  if (dk === null) score -= 30; else if (dk > 30) score -= 20; else if (dk > 14) score -= 10;
  return Math.max(0, score);
}

// ---------------------------------------------------------------------------
// Warning generator
// ---------------------------------------------------------------------------

function generateWarnings(
  summary: AuditSummary | null,
  gscLatest: { clicks: number; impressions: number; ctr: number; position: number } | null,
  gscPrev: { clicks: number; impressions: number; ctr: number; position: number } | null,
  kwSummary: { top10Change: number; top3Change: number; top10Last: number; total: number } | null,
  kwSnapshots: { date: string }[],
  actions: { status: string; priority: string }[],
  strategyProgress: number,
  dataAge: { lastAudit: string | null; lastGscSnapshot: string | null; lastKeywordSync: string | null },
): Warning[] {
  const w: Warning[] = [];

  const seoScore = summary?.seo_score as number | undefined;
  const totalUrls = (summary?.total_urls as number) ?? 0;
  const status4xx = (summary?.status_4xx as number) ?? 0;
  const imagesScore = (summary?.images_score as number) ?? null;
  const eeatScore = (summary?.eeat_score as number) ?? null;
  const aiScore = (summary?.ai_readiness_score as number) ?? null;
  const avgResp = (summary?.avg_response_ms as number) ?? 0;

  // ── CRITICAL ──
  if (seoScore !== undefined && seoScore < 40) {
    w.push({ severity: 'critical', category: 'technical', title: `SEO Score cuc ky thap (${seoScore}/100)`, detail: 'Can audit lai va xu ly ngay cac loi ky thuat nghiem trong' });
  }
  if (totalUrls > 0 && status4xx / totalUrls > 0.10) {
    w.push({ severity: 'critical', category: 'technical', title: `Loi 404 qua cao (${Math.round(status4xx / totalUrls * 100)}%)`, detail: `${status4xx}/${totalUrls} URL tra ve loi 404` });
  }
  if (gscLatest && gscPrev && gscPrev.clicks > 10) {
    const drop = ((gscLatest.clicks - gscPrev.clicks) / gscPrev.clicks) * 100;
    if (drop < -50) {
      w.push({ severity: 'critical', category: 'traffic', title: `Traffic sut giam nghiem trong (${Math.round(drop)}%)`, detail: `${gscPrev.clicks} → ${gscLatest.clicks} clicks` });
    }
  }
  if (!summary && !gscLatest && kwSnapshots.length === 0) {
    w.push({ severity: 'critical', category: 'data', title: 'Khong co du lieu nao', detail: 'Can import audit, dong bo GSC va keyword ranking' });
  }

  const blockedActions = actions.filter(a => a.status === 'blocked').length;
  if (blockedActions > 3) {
    w.push({ severity: 'critical', category: 'strategy', title: `${blockedActions} actions bi blocked`, detail: 'Chien luoc dang bi dinh tre nghiem trong' });
  }

  // ── HIGH ──
  if (seoScore !== undefined && seoScore >= 40 && seoScore < 60) {
    w.push({ severity: 'high', category: 'technical', title: `SEO Score can cai thien (${seoScore}/100)`, detail: 'Nhieu van de ky thuat can xu ly' });
  }
  if (gscLatest && gscPrev) {
    const posDelta = gscLatest.position - gscPrev.position;
    if (posDelta > 2) {
      w.push({ severity: 'high', category: 'traffic', title: `Vi tri TB tang ${posDelta.toFixed(1)} bac (xau di)`, detail: `${gscPrev.position.toFixed(1)} → ${gscLatest.position.toFixed(1)}` });
    }
    if (gscLatest.ctr < 0.01) {
      w.push({ severity: 'high', category: 'traffic', title: 'CTR duoi 1%', detail: `CTR hien tai: ${(gscLatest.ctr * 100).toFixed(2)}% — can cai thien title & description` });
    }
    const clickDrop = ((gscLatest.clicks - gscPrev.clicks) / Math.max(gscPrev.clicks, 1)) * 100;
    if (clickDrop < -20 && clickDrop >= -50) {
      w.push({ severity: 'high', category: 'traffic', title: `Traffic giam ${Math.abs(Math.round(clickDrop))}%`, detail: `${gscPrev.clicks} → ${gscLatest.clicks} clicks` });
    }
  }
  if (kwSummary && kwSummary.top10Change < -3) {
    w.push({ severity: 'high', category: 'keywords', title: `${Math.abs(kwSummary.top10Change)} keyword rot khoi top 10`, detail: 'Keyword dang mat vi tri — can review content va backlinks' });
  }
  if (actions.length > 5 && strategyProgress < 20) {
    w.push({ severity: 'high', category: 'strategy', title: `Tien do chien luoc moi ${strategyProgress}%`, detail: `${actions.filter(a => a.status === 'done').length}/${actions.length} actions hoan thanh` });
  }
  if (avgResp > 3000) {
    w.push({ severity: 'high', category: 'technical', title: 'Toc do phan hoi cham (>3s)', detail: `Trung binh ${(avgResp / 1000).toFixed(1)}s — anh huong UX va ranking` });
  }

  // ── MEDIUM ──
  if (imagesScore !== null && imagesScore < 50) {
    w.push({ severity: 'medium', category: 'content', title: `Diem hinh anh thap (${imagesScore}/100)`, detail: 'Nhieu anh thieu alt text hoac chua toi uu' });
  }
  if (eeatScore !== null && eeatScore < 50) {
    w.push({ severity: 'medium', category: 'content', title: `E-E-A-T can cai thien (${eeatScore}/100)`, detail: 'Tang do tin cay: author bio, citations, schema markup' });
  }
  const dAudit = daysAgo(dataAge.lastAudit);
  if (dAudit !== null && dAudit > 30) {
    w.push({ severity: 'medium', category: 'data', title: `Chua audit lai tu ${dAudit} ngay`, detail: 'Nen chay lai audit de cap nhat tinh trang' });
  }
  if (summary) {
    const status3xx = (summary.status_3xx as number) ?? 0;
    if (totalUrls > 0 && status3xx / totalUrls > 0.15) {
      w.push({ severity: 'medium', category: 'technical', title: `Nhieu redirect (${Math.round(status3xx / totalUrls * 100)}%)`, detail: `${status3xx} URL redirect — don dep redirect chains` });
    }
  }

  // ── LOW ──
  if (kwSummary && kwSummary.total > 0) {
    // rough opportunity count: total - top10
    const opp = kwSummary.total - kwSummary.top10Last;
    if (opp > 10) {
      w.push({ severity: 'low', category: 'keywords', title: `${opp} keyword ngoai top 10`, detail: 'Co hoi toi uu de nang thu hang' });
    }
  }
  if (gscLatest && gscLatest.ctr >= 0.01 && gscLatest.ctr < 0.03) {
    w.push({ severity: 'low', category: 'traffic', title: 'CTR duoi trung binh nganh', detail: `CTR ${(gscLatest.ctr * 100).toFixed(1)}% — target 3-5%` });
  }
  if (aiScore !== null && aiScore < 50) {
    w.push({ severity: 'low', category: 'content', title: `AI Readiness thap (${aiScore}/100)`, detail: 'Them Schema, FAQ, Breadcrumb de san sang cho AI search' });
  }
  const dKw = daysAgo(dataAge.lastKeywordSync);
  if (dKw !== null && dKw > 14) {
    w.push({ severity: 'low', category: 'data', title: `Du lieu keyword chua cap nhat ${dKw} ngay`, detail: 'Sync lai tu Google Sheets' });
  }

  // Sort by severity priority
  const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  w.sort((a, b) => order[a.severity] - order[b.severity]);
  return w;
}

// ---------------------------------------------------------------------------
// Expert summary generator
// ---------------------------------------------------------------------------

function generateExpertSummary(name: string, warnings: Warning[], score: number): string {
  const critical = warnings.filter(w => w.severity === 'critical').length;
  const high = warnings.filter(w => w.severity === 'high').length;

  if (critical > 0) {
    return `${name} dang trong tinh trang NGUY CAP voi ${critical} van de critical. Can xu ly ngay: ${warnings[0].title}.`;
  }
  if (high > 0) {
    return `${name} can duoc chu y voi ${high} van de quan trong. Uu tien: ${warnings[0].title}.`;
  }
  if (score >= 80) {
    return `${name} dang hoat dong tot (${score}/100). Duy tri va toi uu hoa cac co hoi.`;
  }
  if (score >= 60) {
    return `${name} o muc trung binh (${score}/100). ${warnings.length > 0 ? warnings[0].title + '.' : 'Can review tong the.'}`;
  }
  return `${name} can cai thien (${score}/100). ${warnings.length > 0 ? 'Uu tien: ' + warnings[0].title + '.' : ''}`;
}

// ---------------------------------------------------------------------------
// Priority actions from warnings + blocked strategy actions
// ---------------------------------------------------------------------------

function generatePriorityActions(warnings: Warning[], actions: { title: string; status: string; priority: string }[]): PriorityAction[] {
  const items: PriorityAction[] = [];

  // Top warnings as actions
  for (const w of warnings.slice(0, 4)) {
    items.push({ title: w.title, severity: w.severity, source: w.category });
  }

  // Blocked strategy actions
  const blocked = actions.filter(a => a.status === 'blocked');
  for (const a of blocked.slice(0, 2)) {
    if (!items.some(i => i.title === a.title)) {
      items.push({ title: `Unblock: ${a.title}`, severity: 'high', source: 'strategy' });
    }
  }

  return items.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Main: assess single project
// ---------------------------------------------------------------------------

function assessProject(project: { id: string; name: string; slug: string | null; domain: string | null }): ProjectHealthAssessment {
  // 1. Fetch all data
  const audits = getAudits(project.id);
  const latestAudit = audits[0] ?? null;
  const summary: AuditSummary | null = latestAudit ? (latestAudit.summary as AuditSummary) ?? null : null;

  const gscSnaps = getSnapshots(project.id, 2);
  const gscLatest = gscSnaps[0] ?? null;
  const gscPrev = gscSnaps[1] ?? null;

  const kwGrowth = getRankingGrowth(project.id, 90);
  const kwSnapshots = kwGrowth.snapshots;
  const kwLast = kwSnapshots.length > 0 ? kwSnapshots[kwSnapshots.length - 1] : null;
  const kwSummary = kwGrowth.summary;

  const phases = getPhases(project.id);
  const actions = getActions(undefined, project.id);

  // 2. Data age
  const dataAge = {
    lastAudit: latestAudit?.audit_date ?? null,
    lastGscSnapshot: gscLatest?.date ?? null,
    lastKeywordSync: kwSnapshots.length > 0 ? kwSnapshots[kwSnapshots.length - 1].date : null,
  };

  // 3. Category scores
  const seoScore = (summary?.seo_score as number) ?? null;
  const doneActions = actions.filter(a => a.status === 'done').length;
  const strategyProgress = actions.length > 0 ? Math.round((doneActions / actions.length) * 100) : 0;

  let trafficScore: number | null = null;
  if (gscLatest && gscPrev) trafficScore = calcTrafficScore(gscLatest, gscPrev);

  let keywordScore: number | null = null;
  if (kwSummary && kwLast) {
    keywordScore = calcKeywordScore({
      top3Last: kwLast.top3, top10Last: kwLast.top10, total: kwLast.total,
      top3Change: kwSummary.top3Change, top10Change: kwSummary.top10Change,
    });
  }

  const categoryScores: CategoryScores = {
    technical: (summary?.technical_score as number) ?? null,
    content: (summary?.content_score as number) ?? null,
    images: (summary?.images_score as number) ?? null,
    links: (summary?.links_score as number) ?? null,
    eeat: (summary?.eeat_score as number) ?? null,
    aiReadiness: (summary?.ai_readiness_score as number) ?? null,
    traffic: trafficScore,
    keywords: keywordScore,
    strategy: actions.length > 0 ? strategyProgress : null,
  };

  // 4. Overall score (weighted avg of available data)
  const weights: [number | null, number][] = [
    [seoScore, 30],
    [trafficScore, 20],
    [keywordScore, 20],
    [actions.length > 0 ? strategyProgress : null, 15],
    [calcFreshnessScore(dataAge), 15],
  ];
  let totalWeight = 0;
  let weightedSum = 0;
  for (const [val, weight] of weights) {
    if (val !== null) { weightedSum += val * weight; totalWeight += weight; }
  }
  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  // 5. Warnings
  const kwSummaryForWarnings = kwSummary ? {
    top10Change: kwSummary.top10Change, top3Change: kwSummary.top3Change,
    top10Last: kwLast?.top10 ?? 0, total: kwLast?.total ?? 0,
  } : null;

  const warnings = generateWarnings(
    summary, gscLatest, gscPrev, kwSummaryForWarnings, kwSnapshots, actions, strategyProgress, dataAge,
  );

  // 6. Trends
  let trafficTrend: TrendDir = 'no_data';
  if (gscLatest && gscPrev) {
    const d = gscLatest.clicks - gscPrev.clicks;
    trafficTrend = d > 0 ? 'up' : d < 0 ? 'down' : 'stable';
  }

  let keywordTrend: TrendDir = 'no_data';
  if (kwSummary) {
    const d = kwSummary.top10Change;
    keywordTrend = d > 0 ? 'up' : d < 0 ? 'down' : 'stable';
  }

  // SEO score trend: compare 2 most recent audits
  let seoScoreTrend: TrendDir = 'no_data';
  if (audits.length >= 2) {
    const s1 = (audits[0].summary as AuditSummary)?.seo_score as number | undefined;
    const s2 = (audits[1].summary as AuditSummary)?.seo_score as number | undefined;
    if (s1 !== undefined && s2 !== undefined) {
      seoScoreTrend = s1 > s2 ? 'up' : s1 < s2 ? 'down' : 'stable';
    }
  }

  // 7. Priority actions
  const priorityActions = generatePriorityActions(warnings, actions);

  // 8. Traffic data for export
  const trafficData: ProjectHealthAssessment['trafficData'] = gscLatest ? {
    clicks: gscLatest.clicks,
    impressions: gscLatest.impressions,
    ctr: gscLatest.ctr,
    position: gscLatest.position,
    prevClicks: gscPrev?.clicks ?? null,
    prevImpressions: gscPrev?.impressions ?? null,
  } : null;

  // 9. Keyword data for export
  const keywordData: ProjectHealthAssessment['keywordData'] = kwLast ? {
    total: kwLast.total,
    top3: kwLast.top3,
    top10: kwLast.top10,
    top3Change: kwSummary?.top3Change ?? 0,
    top10Change: kwSummary?.top10Change ?? 0,
  } : null;

  // 10. Strategy data for export
  const doingActions = actions.filter(a => a.status === 'doing').length;
  const todoActionsCount = actions.filter(a => a.status === 'todo').length;
  const blockedActionsCount = actions.filter(a => a.status === 'blocked').length;

  const phaseData: StrategyPhaseData[] = phases.map(p => {
    const pActions = actions.filter(a => a.phase_id === p.id);
    const pDone = pActions.filter(a => a.status === 'done').length;
    return { name: p.name, status: p.status, total: pActions.length, done: pDone, progress: pActions.length > 0 ? Math.round((pDone / pActions.length) * 100) : 0 };
  });

  const nextActions: StrategyActionData[] = actions
    .filter(a => a.status === 'todo' || a.status === 'doing')
    .sort((a, b) => {
      const pOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
    })
    .slice(0, 10)
    .map(a => ({
      title: a.title,
      priority: a.priority,
      status: a.status,
      category: a.category ?? '',
      phase: phases.find(p => p.id === a.phase_id)?.name ?? '',
    }));

  const strategyData = actions.length > 0 ? {
    totalActions: actions.length,
    doneActions,
    doingActions,
    todoActions: todoActionsCount,
    blockedActions: blockedActionsCount,
    phases: phaseData,
    nextActions,
  } : null;

  return {
    id: project.id,
    name: project.name,
    slug: project.slug ?? null,
    domain: project.domain ?? null,
    overallScore,
    overallLabel: scoreLabel(overallScore),
    categoryScores,
    warnings,
    priorityActions,
    trends: { traffic: trafficTrend, keywords: keywordTrend, seoScore: seoScoreTrend },
    expertSummary: generateExpertSummary(project.name, warnings, overallScore),
    dataAge,
    trafficData,
    keywordData,
    strategyData,
  };
}

// ---------------------------------------------------------------------------
// Public: get all projects health check
// ---------------------------------------------------------------------------

export function getAllProjectsHealthCheck(): HealthCheckResponse {
  const allProjects = getProjects().filter((p) => p.status === 'active');

  const assessments = allProjects.map((p) =>
    assessProject({ id: p.id, name: p.name, slug: p.slug, domain: p.domain }),
  );

  // Sort worst-first
  assessments.sort((a, b) => a.overallScore - b.overallScore);

  return {
    projects: assessments,
    meta: {
      generatedAt: new Date().toISOString(),
      totalProjects: assessments.length,
      criticalCount: assessments.filter(a => a.warnings.some(w => w.severity === 'critical')).length,
      healthyCount: assessments.filter(a => a.overallScore >= 80).length,
    },
  };
}
