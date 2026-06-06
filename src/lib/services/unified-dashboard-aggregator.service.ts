// ---------------------------------------------------------------------------
// Unified Dashboard Aggregator Service
// Reads ALL data sources → produces a unified KPI summary for the dashboard.
// ---------------------------------------------------------------------------

import { db } from '@/lib/db';
import {
  projects,
  gscSnapshots,
  keywordRankings,
  notionContent,
  notionBacklinks,
  sheetContent,
  backlinks,
  auditResults,
  topicClusters,
  topicClusterPages,
  strategyPhases,
  strategyActions,
  activityLog,
  tasks,
} from '@/lib/db/schema';
import { eq, and, desc, sql, isNotNull } from 'drizzle-orm';
import { getAppConfig } from './app-config-crud.service';
import { isPublishedStatus } from '@/lib/task-helpers';
import { safePct, computeStrategyCompletion } from './kpi-calculators';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UnifiedDashboardSummary {
  traffic: {
    totalClicks: number;
    totalImpressions: number;
    avgPosition: number;
    clicksTrend: number; // % change vs previous period
    impressionsTrend: number;
  };
  keywords: {
    total: number;
    top3: number;
    top10: number;
    top30: number;
    trackedFromNotion: number;
    moversUp: number;
    moversDown: number;
  };
  content: {
    totalPublished: number;
    totalDrafts: number;
    publishedThisMonth: number;
    fromAI: number; // notion_content source
    fromManual: number; // sheet_content source
  };
  tasks: {
    total: number;
    done: number;
    inProgress: number;
    overdue: number;
    byCategory: Record<string, { total: number; done: number }>;
  };
  backlinks: {
    total: number;
    alive: number;
    dead: number;
    newThisMonth: number;
    avgDR: number;
  };
  seoStrength: {
    auditScores: Record<string, number>;
    avgAuditScore: number;
    clusterCount: number;
    avgCompleteness: number;
    orphanPages: number;
  };
  strategy: {
    totalActions: number;
    completedActions: number;
    completionRate: number;
    activePhases: number;
  };
  projects: Array<{
    id: string;
    name: string;
    clicks: number;
    kwTop10: number;
    kwTrackedTotal: number;
    kwTrackedTop10: number;
    kwFollowTotal: number;
    kwFollowTop10: number;
    contentPublished: number;
    auditScore: number;
    progressPercent: number;
    tasksDone: number;
    tasksTotal: number;
    backlinksAlive: number;
    backlinksTotal: number;
    strategyRate: number;
  }>;
  recentActivity: Array<{
    source: string;
    action: string;
    description: string;
    project_id?: string;
    created_at: string;
  }>;
  projectGoals: Record<string, {
    start_date: string;
    deadline: string;
    targets: { weekly_clicks: number; top10_keywords: number; strategy_completion: number; seo_score: number };
  }>;
  meta: {
    generatedAt: string;
    projectFilter: string | null;
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// safePct → đã chuyển sang ./kpi-calculators (dùng chung)

function currentMonthPrefix(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${m}`;
}

// ---------------------------------------------------------------------------
// Traffic — latest vs previous GSC snapshot
// ---------------------------------------------------------------------------

async function getTrafficKpi(projectId?: string): Promise<UnifiedDashboardSummary['traffic']> {
  // Fetch 2 most recent snapshots per project (or overall)
  const baseQuery = db
    .select({
      project_id: gscSnapshots.project_id,
      date: gscSnapshots.date,
      clicks: gscSnapshots.clicks,
      impressions: gscSnapshots.impressions,
      position: gscSnapshots.position,
    })
    .from(gscSnapshots);

  const rows = projectId
    ? await baseQuery.where(and(eq(gscSnapshots.project_id, projectId), eq(gscSnapshots.period, 'weekly')))
        .orderBy(desc(gscSnapshots.date))
        .limit(10)
    : await baseQuery.where(eq(gscSnapshots.period, 'weekly'))
        .orderBy(desc(gscSnapshots.date))
        .limit(30);

  if (rows.length === 0) {
    return { totalClicks: 0, totalImpressions: 0, avgPosition: 0, clicksTrend: 0, impressionsTrend: 0 };
  }

  // Group by project, take latest 2 dates
  const byProject = new Map<string, typeof rows>();
  for (const r of rows) {
    const arr = byProject.get(r.project_id) ?? [];
    arr.push(r);
    byProject.set(r.project_id, arr);
  }

  let latestClicks = 0;
  let latestImpressions = 0;
  let latestPositionSum = 0;
  let latestPositionCount = 0;
  let prevClicks = 0;
  let prevImpressions = 0;

  for (const snapshots of byProject.values()) {
    // Already ordered desc by date
    const latest = snapshots[0];
    const prev = snapshots[1] ?? null;

    latestClicks += latest.clicks;
    latestImpressions += latest.impressions;
    if (latest.position > 0) {
      latestPositionSum += latest.position;
      latestPositionCount++;
    }
    if (prev) {
      prevClicks += prev.clicks;
      prevImpressions += prev.impressions;
    }
  }

  return {
    totalClicks: latestClicks,
    totalImpressions: latestImpressions,
    avgPosition: latestPositionCount > 0 ? Math.round((latestPositionSum / latestPositionCount) * 10) / 10 : 0,
    clicksTrend: safePct(latestClicks, prevClicks),
    impressionsTrend: safePct(latestImpressions, prevImpressions),
  };
}

// ---------------------------------------------------------------------------
// Keywords — positions from latest check date
// ---------------------------------------------------------------------------

async function getKeywordsKpi(projectId?: string): Promise<UnifiedDashboardSummary['keywords']> {
  // Get all unique check dates for this project, latest 2
  const dateQuery = db
    .selectDistinct({ date: keywordRankings.date })
    .from(keywordRankings);

  const dates = projectId
    ? await dateQuery.where(and(eq(keywordRankings.project_id, projectId), isNotNull(keywordRankings.date)))
        .orderBy(desc(keywordRankings.date))
        .limit(2)
    : await dateQuery.where(isNotNull(keywordRankings.date))
        .orderBy(desc(keywordRankings.date))
        .limit(2);

  if (dates.length === 0) {
    return { total: 0, top3: 0, top10: 0, top30: 0, trackedFromNotion: 0, moversUp: 0, moversDown: 0 };
  }

  const latestDate = dates[0].date;
  const prevDate = dates[1]?.date ?? null;

  // Latest snapshot counts
  const latestRows = projectId
    ? await db.select({ position: keywordRankings.position, is_tracked: keywordRankings.is_tracked, keyword: keywordRankings.keyword })
        .from(keywordRankings)
        .where(and(eq(keywordRankings.project_id, projectId), eq(keywordRankings.date, latestDate)))
    : await db.select({ position: keywordRankings.position, is_tracked: keywordRankings.is_tracked, keyword: keywordRankings.keyword })
        .from(keywordRankings)
        .where(eq(keywordRankings.date, latestDate));

  let top3 = 0, top10 = 0, top30 = 0, trackedCount = 0;
  const latestByKw = new Map<string, number>();

  for (const r of latestRows) {
    const pos = r.position;
    latestByKw.set(r.keyword, pos);
    if (pos > 0 && pos <= 3) top3++;
    if (pos > 0 && pos <= 10) top10++;
    if (pos > 0 && pos <= 30) top30++;
    if (r.is_tracked) trackedCount++;
  }

  // Movers — compare with previous date
  let moversUp = 0, moversDown = 0;

  if (prevDate) {
    const prevRows = projectId
      ? await db.select({ keyword: keywordRankings.keyword, position: keywordRankings.position })
          .from(keywordRankings)
          .where(and(eq(keywordRankings.project_id, projectId), eq(keywordRankings.date, prevDate)))
      : await db.select({ keyword: keywordRankings.keyword, position: keywordRankings.position })
          .from(keywordRankings)
          .where(eq(keywordRankings.date, prevDate));

    const prevByKw = new Map<string, number>();
    for (const r of prevRows) prevByKw.set(r.keyword, r.position);

    for (const [kw, curPos] of latestByKw.entries()) {
      const prevPos = prevByKw.get(kw);
      if (prevPos !== undefined && curPos > 0 && prevPos > 0) {
        const delta = prevPos - curPos; // positive = improved (lower rank number)
        if (delta >= 5) moversUp++;
        else if (delta <= -5) moversDown++;
      }
    }
  }

  return {
    total: latestRows.length,
    top3,
    top10,
    top30,
    trackedFromNotion: trackedCount,
    moversUp,
    moversDown,
  };
}

// ---------------------------------------------------------------------------
// Content — notion_content + sheet_content
// ---------------------------------------------------------------------------

async function getContentKpi(projectId?: string): Promise<UnifiedDashboardSummary['content']> {
  const monthPrefix = currentMonthPrefix();

  // notion_content: published items
  const notionRows = await db
    .select({ status: notionContent.status, publish_date: notionContent.publish_date })
    .from(notionContent);

  let notionPublished = 0, notionDrafts = 0, notionThisMonth = 0;

  for (const r of notionRows) {
    const status = (r.status ?? '').toLowerCase();
    if (isPublishedStatus(status)) {
      notionPublished++;
      if (r.publish_date && r.publish_date.startsWith(monthPrefix)) notionThisMonth++;
    } else {
      notionDrafts++;
    }
  }

  // sheet_content: filter by project if needed
  const sheetRows: { content_status: string | null; publish_date: string | null }[] = projectId
    ? await db
        .select({ content_status: sheetContent.content_status, publish_date: sheetContent.publish_date })
        .from(sheetContent)
        .where(eq(sheetContent.project_id, projectId))
    : await db
        .select({ content_status: sheetContent.content_status, publish_date: sheetContent.publish_date })
        .from(sheetContent);

  let sheetPublished = 0, sheetDrafts = 0, sheetThisMonth = 0;
  for (const r of sheetRows) {
    const status = (r.content_status ?? '').toLowerCase();
    if (isPublishedStatus(status)) {
      sheetPublished++;
      if (r.publish_date && r.publish_date.startsWith(monthPrefix)) sheetThisMonth++;
    } else if (status.length > 0) {
      sheetDrafts++;
    }
  }

  return {
    totalPublished: notionPublished + sheetPublished,
    totalDrafts: notionDrafts + sheetDrafts,
    publishedThisMonth: notionThisMonth + sheetThisMonth,
    fromAI: notionPublished,
    fromManual: sheetPublished,
  };
}

// ---------------------------------------------------------------------------
// Tasks — tasks table (project tasks)
// ---------------------------------------------------------------------------

async function getTasksKpi(projectId?: string): Promise<UnifiedDashboardSummary['tasks']> {
  const today = new Date().toISOString().slice(0, 10);

  const taskRows = projectId
    ? await db.select({
        status_content: tasks.status_content,
        category: tasks.category,
        deadline: tasks.deadline,
      }).from(tasks).where(eq(tasks.project_id, projectId))
    : await db.select({
        status_content: tasks.status_content,
        category: tasks.category,
        deadline: tasks.deadline,
      }).from(tasks);

  let done = 0, inProgress = 0, overdue = 0;
  const byCategory: Record<string, { total: number; done: number }> = {};

  for (const t of taskRows) {
    const status = (t.status_content ?? '').toLowerCase();
    const cat = t.category ?? 'other';

    if (!byCategory[cat]) byCategory[cat] = { total: 0, done: 0 };
    byCategory[cat].total++;

    if (isPublishedStatus(status)) {
      done++;
      byCategory[cat].done++;
    } else if (status.includes('qc') || status.includes('fix') || status.includes('doing') || status.includes('progress') || status.includes('writing')) {
      inProgress++;
    }

    if (t.deadline && t.deadline < today && !isPublishedStatus(status)) {
      overdue++;
    }
  }

  return {
    total: taskRows.length,
    done,
    inProgress,
    overdue,
    byCategory,
  };
}

// ---------------------------------------------------------------------------
// Backlinks
// ---------------------------------------------------------------------------

async function getBacklinksKpi(projectId?: string): Promise<UnifiedDashboardSummary['backlinks']> {
  const monthPrefix = currentMonthPrefix();

  const blRows = projectId
    ? await db.select({
        status: backlinks.status,
        created_at: backlinks.created_at,
      }).from(backlinks).where(eq(backlinks.project_id, projectId))
    : await db.select({
        status: backlinks.status,
        created_at: backlinks.created_at,
      }).from(backlinks);

  let alive = 0, dead = 0, newThisMonth = 0;
  for (const bl of blRows) {
    if (bl.status === 'alive') alive++;
    else if (bl.status === 'dead') dead++;
    if (bl.created_at && bl.created_at.startsWith(monthPrefix)) newThisMonth++;
  }

  // avgDR from notion_backlinks (has dr column, no project_id FK)
  const drResult = ((await db
    .select({ avgDR: sql<number>`AVG(${notionBacklinks.dr})` })
    .from(notionBacklinks)
    .where(isNotNull(notionBacklinks.dr)))[0]) as { avgDR: number | null } | undefined;

  return {
    total: blRows.length,
    alive,
    dead,
    newThisMonth,
    avgDR: drResult?.avgDR ? Math.round(drResult.avgDR) : 0,
  };
}

// ---------------------------------------------------------------------------
// SEO Strength — audit scores + cluster completeness
// ---------------------------------------------------------------------------

async function getSeoStrengthKpi(projectId?: string): Promise<UnifiedDashboardSummary['seoStrength']> {
  // Latest audit per project
  const auditRows = projectId
    ? await db.select({ project_id: auditResults.project_id, summary: auditResults.summary })
        .from(auditResults)
        .where(and(eq(auditResults.project_id, projectId), isNotNull(auditResults.summary)))
        .orderBy(desc(auditResults.created_at))
        .limit(1)
    : await db.select({ project_id: auditResults.project_id, summary: auditResults.summary })
        .from(auditResults)
        .where(isNotNull(auditResults.summary))
        .orderBy(desc(auditResults.created_at))
        .limit(20);

  // Dedupe by project_id, keep latest
  const latestByProject = new Map<string, { seo_score?: number }>();
  for (const row of auditRows) {
    if (row.project_id && !latestByProject.has(row.project_id)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const summary = row.summary as Record<string, any> | null;
      latestByProject.set(row.project_id, summary ?? {});
    }
  }

  const auditScores: Record<string, number> = {};
  let scoreSum = 0, scoreCount = 0;

  for (const [pid, summary] of latestByProject.entries()) {
    const score = typeof summary?.seo_score === 'number' ? summary.seo_score : 0;
    auditScores[pid] = score;
    if (score > 0) { scoreSum += score; scoreCount++; }
  }

  // Topic clusters
  const clusterRows = projectId
    ? await db.select({ id: topicClusters.id, target_keyword_count: topicClusters.target_keyword_count })
        .from(topicClusters)
        .where(eq(topicClusters.project_id, projectId))
    : await db.select({ id: topicClusters.id, target_keyword_count: topicClusters.target_keyword_count })
        .from(topicClusters);

  const clusterCount = clusterRows.length;

  // Completeness: pages with both pillar links / total pages per cluster
  let completenessSum = 0;
  let completenessCount = 0;

  if (clusterCount > 0) {
    for (const cluster of clusterRows) {
      const pages = await db
        .select({
          has_link_to_pillar: topicClusterPages.has_link_to_pillar,
          has_link_from_pillar: topicClusterPages.has_link_from_pillar,
          role: topicClusterPages.role,
        })
        .from(topicClusterPages)
        .where(eq(topicClusterPages.cluster_id, cluster.id));

      if (pages.length === 0) continue;

      const supporting = pages.filter(p => p.role !== 'pillar');
      if (supporting.length === 0) continue;

      const linked = supporting.filter(p => p.has_link_to_pillar && p.has_link_from_pillar).length;
      completenessSum += linked / supporting.length;
      completenessCount++;
    }
  }

  // Orphan pages: cluster pages with neither link direction
  const orphanResult = ((await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(topicClusterPages)
    .where(
      and(
        eq(topicClusterPages.has_link_to_pillar, false),
        eq(topicClusterPages.has_link_from_pillar, false),
        sql`${topicClusterPages.role} != 'pillar'`
      )
    ))[0]) as { count: number } | undefined;

  return {
    auditScores,
    avgAuditScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0,
    clusterCount,
    avgCompleteness: completenessCount > 0 ? Math.round((completenessSum / completenessCount) * 100) : 0,
    orphanPages: orphanResult?.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Strategy
// ---------------------------------------------------------------------------

async function getStrategyKpi(projectId?: string): Promise<UnifiedDashboardSummary['strategy']> {
  const phaseRows = projectId
    ? await db.select({ id: strategyPhases.id, status: strategyPhases.status })
        .from(strategyPhases)
        .where(eq(strategyPhases.project_id, projectId))
    : await db.select({ id: strategyPhases.id, status: strategyPhases.status })
        .from(strategyPhases);

  const activePhases = phaseRows.filter(p => p.status === 'in_progress').length;

  const actionRows = projectId
    ? await db.select({ status: strategyActions.status })
        .from(strategyActions)
        .where(eq(strategyActions.project_id, projectId))
    : await db.select({ status: strategyActions.status })
        .from(strategyActions);

  const { total: totalActions, done: completedActions, rate: completionRate } = computeStrategyCompletion(actionRows);

  return {
    totalActions,
    completedActions,
    completionRate,
    activePhases,
  };
}

// ---------------------------------------------------------------------------
// Per-project summary row
// ---------------------------------------------------------------------------

async function getProjectRows(projectId?: string): Promise<UnifiedDashboardSummary['projects']> {
  const projectList = projectId
    ? await db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId))
    : await db.select({ id: projects.id, name: projects.name }).from(projects);

  return Promise.all(projectList.map(async proj => {
    // Clicks: latest weekly snapshot
    const snap = ((await db
      .select({ clicks: gscSnapshots.clicks })
      .from(gscSnapshots)
      .where(and(eq(gscSnapshots.project_id, proj.id), eq(gscSnapshots.period, 'weekly')))
      .orderBy(desc(gscSnapshots.date))
      .limit(1))[0]) as { clicks: number } | undefined;

    // KW top10: latest date
    const latestDateRow = ((await db
      .selectDistinct({ date: keywordRankings.date })
      .from(keywordRankings)
      .where(eq(keywordRankings.project_id, proj.id))
      .orderBy(desc(keywordRankings.date))
      .limit(1))[0]) as { date: string } | undefined;

    let kwTop10 = 0;
    let kwTrackedTotal = 0;
    let kwTrackedTop10 = 0;
    let kwFollowTotal = 0;
    let kwFollowTop10 = 0;
    if (latestDateRow) {
      const kwResult = ((await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(keywordRankings)
        .where(
          and(
            eq(keywordRankings.project_id, proj.id),
            eq(keywordRankings.date, latestDateRow.date),
            sql`${keywordRankings.position} > 0`,
            sql`${keywordRankings.position} <= 10`
          )
        ))[0]) as { count: number } | undefined;
      kwTop10 = kwResult?.count ?? 0;

      // Cam kết (tracked) keyword stats — count unique across all dates
      const trackedStats = ((await db
        .select({
          total: sql<number>`COUNT(DISTINCT LOWER(keyword))`,
          top10: sql<number>`SUM(CASE WHEN position > 0 AND position <= 10 THEN 1 ELSE 0 END)`,
        })
        .from(keywordRankings)
        .where(
          and(
            eq(keywordRankings.project_id, proj.id),
            eq(keywordRankings.date, latestDateRow.date),
            sql`${keywordRankings.is_tracked} = true`
          )
        ))[0]) as { total: number; top10: number } | undefined;
      kwTrackedTotal = trackedStats?.total ?? 0;
      kwTrackedTop10 = trackedStats?.top10 ?? 0;

      // Tự follow keyword stats
      const followStats = ((await db
        .select({
          total: sql<number>`COUNT(DISTINCT LOWER(keyword))`,
          top10: sql<number>`SUM(CASE WHEN position > 0 AND position <= 10 THEN 1 ELSE 0 END)`,
        })
        .from(keywordRankings)
        .where(
          and(
            eq(keywordRankings.project_id, proj.id),
            eq(keywordRankings.date, latestDateRow.date),
            sql`${keywordRankings.is_tracked} = false`
          )
        ))[0]) as { total: number; top10: number } | undefined;
      kwFollowTotal = followStats?.total ?? 0;
      kwFollowTop10 = followStats?.top10 ?? 0;
    }

    // Content published (sheet_content) — filter JS để DRY với isPublishedStatus
    const contentRows = await db
      .select({ content_status: sheetContent.content_status })
      .from(sheetContent)
      .where(eq(sheetContent.project_id, proj.id));
    const contentPublishedCount = contentRows.filter((r) => isPublishedStatus(r.content_status)).length;

    // Audit score: latest
    const auditRow = ((await db
      .select({ summary: auditResults.summary })
      .from(auditResults)
      .where(and(eq(auditResults.project_id, proj.id), isNotNull(auditResults.summary)))
      .orderBy(desc(auditResults.created_at))
      .limit(1))[0]) as { summary: Record<string, number> | null } | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auditScore = typeof (auditRow?.summary as any)?.seo_score === 'number'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (auditRow!.summary as any).seo_score as number
      : 0;

    // Strategy progress
    const allActions = await db
      .select({ status: strategyActions.status })
      .from(strategyActions)
      .where(eq(strategyActions.project_id, proj.id));

    const { done: doneActions, rate: progressPercent } = computeStrategyCompletion(allActions);
    const strategyRate = progressPercent;

    // Tasks per project (status_content holds content task status)
    const allTasks = await db
      .select({ status_content: tasks.status_content })
      .from(tasks)
      .where(eq(tasks.project_id, proj.id));
    const tasksDone = allTasks.filter(t => isPublishedStatus(t.status_content)).length;
    const tasksTotal = allTasks.length;

    // Backlinks per project
    const blAliveResult = ((await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(backlinks)
      .where(and(eq(backlinks.project_id, proj.id), sql`${backlinks.status} = 'alive'`)))[0]) as { count: number } | undefined;
    const blTotalResult = ((await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(backlinks)
      .where(eq(backlinks.project_id, proj.id)))[0]) as { count: number } | undefined;

    return {
      id: proj.id,
      name: proj.name,
      clicks: snap?.clicks ?? 0,
      kwTop10,
      kwTrackedTotal,
      kwTrackedTop10,
      kwFollowTotal,
      kwFollowTop10,
      contentPublished: contentPublishedCount,
      auditScore,
      progressPercent,
      tasksDone,
      tasksTotal,
      backlinksAlive: blAliveResult?.count ?? 0,
      backlinksTotal: blTotalResult?.count ?? 0,
      strategyRate,
    };
  }));
}

// ---------------------------------------------------------------------------
// Recent Activity
// ---------------------------------------------------------------------------

async function getRecentActivity(projectId?: string): Promise<UnifiedDashboardSummary['recentActivity']> {
  const rows = projectId
    ? await db.select({
        source: activityLog.source,
        action: activityLog.action,
        description: activityLog.description,
        project_id: activityLog.project_id,
        created_at: activityLog.created_at,
      })
        .from(activityLog)
        .where(eq(activityLog.project_id, projectId))
        .orderBy(desc(activityLog.created_at))
        .limit(20)
    : await db.select({
        source: activityLog.source,
        action: activityLog.action,
        description: activityLog.description,
        project_id: activityLog.project_id,
        created_at: activityLog.created_at,
      })
        .from(activityLog)
        .orderBy(desc(activityLog.created_at))
        .limit(20);

  return rows.map(r => ({
    source: r.source,
    action: r.action,
    description: r.description,
    project_id: r.project_id ?? undefined,
    created_at: r.created_at,
  }));
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

export async function getUnifiedDashboardSummary(projectId?: string): Promise<UnifiedDashboardSummary> {
  // Load project goals from app_config
  const goalsRow = await getAppConfig('project_goals');
  const goalsArr: Array<{ project_id: string; start_date: string; deadline: string; targets: { weekly_clicks: number; top10_keywords: number; strategy_completion: number; seo_score: number } }> = goalsRow?.value ? JSON.parse(goalsRow.value) : [];
  const projectGoals: UnifiedDashboardSummary['projectGoals'] = {};
  for (const g of goalsArr) {
    projectGoals[g.project_id] = { start_date: g.start_date, deadline: g.deadline, targets: g.targets };
  }

  const [traffic, keywords, content, taskKpi, backlinksKpi, seoStrength, strategy, projectRows, recentActivityRows] = await Promise.all([
    getTrafficKpi(projectId),
    getKeywordsKpi(projectId),
    getContentKpi(projectId),
    getTasksKpi(projectId),
    getBacklinksKpi(projectId),
    getSeoStrengthKpi(projectId),
    getStrategyKpi(projectId),
    getProjectRows(projectId),
    getRecentActivity(projectId),
  ]);

  return {
    traffic,
    keywords,
    content,
    tasks: taskKpi,
    backlinks: backlinksKpi,
    seoStrength,
    strategy,
    projects: projectRows,
    recentActivity: recentActivityRows,
    projectGoals,
    meta: {
      generatedAt: new Date().toISOString(),
      projectFilter: projectId ?? null,
    },
  };
}
