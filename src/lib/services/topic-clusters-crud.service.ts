import { db } from '@/lib/db';
import { topicClusters, topicClusterPages, crossClusterLinks } from '@/lib/db/schema/topic-clusters';
import { keywordRankings } from '@/lib/db/schema/seo';
import { gscSnapshots } from '@/lib/db/schema/gsc';
import { eq, and, sql, inArray, or } from 'drizzle-orm';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GscTopQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface ClusterWithCounts {
  id: string;
  name: string;
  pillar_url: string;
  project_id: string | null;
  description: string;
  created_at: string;
  updated_at: string;
  keywordCount: number;
  pageCount: number;
}

export interface ClusterPage {
  id: string;
  cluster_id: string;
  url: string;
  title: string;
  role: string;
  has_link_to_pillar: boolean;
  has_link_from_pillar: boolean;
  anchor_to_pillar: string;
  anchor_from_pillar: string;
  notes: string;
  created_at: string;
}

export interface ClusterKeyword {
  id: string;
  keyword: string;
  url: string;
  position: number;
  date: string;
  project_id: string | null;
  cluster_id: string | null;
  is_tracked: boolean;
  gsc_clicks?: number;
  gsc_impressions?: number;
  gsc_ctr?: number;
  gsc_position?: number;
}

export interface ClusterDetail {
  cluster: typeof topicClusters.$inferSelect;
  pages: ClusterPage[];
  keywords: ClusterKeyword[];
}

export interface ClusterStats {
  clusterId: string;
  keywordCount: number;
  avgPosition: number | null;
  totalClicks: number;
  totalImpressions: number;
  top10Count: number;
  top30Count: number;
  pageCount: number;
  pagesWithLinkToPillar: number;
  linkHealthPct: number;
  completenessScore: number; // 0-100
  targetKeywordCount: number;
  targetPageCount: number;
}

export interface CrossClusterLink {
  id: string;
  source_cluster_id: string;
  source_cluster_name: string;
  target_cluster_id: string;
  target_cluster_name: string;
  source_url: string;
  target_url: string;
  anchor_text: string;
  relationship: string;
  verified: boolean;
}

export interface ClusterCompleteness {
  score: number;
  breakdown: {
    keywordCoverage: number | null;
    pageCoverage: number | null;
    linkHealth: number;
    anchorDiversity: number;
    overlapPenalty: number;
  };
}

export interface CannibalizationWarning {
  keyword: string;
  urls: string[];
  urlCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Get latest GSC top_queries for a project, indexed by query string */
function getGscQueryMap(projectId: string): Map<string, GscTopQuery> {
  const snapshots = db.select({
    snapshot_date: gscSnapshots.date,
    top_queries: gscSnapshots.top_queries,
  })
    .from(gscSnapshots)
    .where(eq(gscSnapshots.project_id, projectId))
    .orderBy(sql`${gscSnapshots.date} DESC`)
    .all();

  const map = new Map<string, GscTopQuery>();
  if (snapshots.length === 0) return map;

  const latestSnapshot = snapshots[0];
  const queries = latestSnapshot.top_queries as GscTopQuery[] | null;
  if (!queries || !Array.isArray(queries)) return map;

  for (const q of queries) {
    if (q.query) map.set(q.query.toLowerCase(), q);
  }
  return map;
}

/** Deduplicate keywords by keeping latest date entry */
function dedupeByLatestDate(rows: typeof keywordRankings.$inferSelect[]): typeof keywordRankings.$inferSelect[] {
  const map = new Map<string, typeof keywordRankings.$inferSelect>();
  for (const row of rows) {
    const existing = map.get(row.keyword);
    if (!existing || row.date > existing.date) {
      map.set(row.keyword, row);
    }
  }
  return Array.from(map.values());
}

// ── 1. listClusters ───────────────────────────────────────────────────────────

export function listClusters(projectId?: string): { clusters: ClusterWithCounts[] } {
  const allClusters = projectId
    ? db.select().from(topicClusters).where(eq(topicClusters.project_id, projectId)).all()
    : db.select().from(topicClusters).all();

  const clusters: ClusterWithCounts[] = allClusters.map((cluster) => {
    // Count unique keywords (distinct keyword strings, latest date)
    const allKw = db.select({
      keyword: keywordRankings.keyword,
      date: keywordRankings.date,
    }).from(keywordRankings).where(eq(keywordRankings.cluster_id, cluster.id)).all();
    const uniqueKwCount = new Set(allKw.map((k) => k.keyword)).size;

    // Count pages
    const pages = db.select({ id: topicClusterPages.id })
      .from(topicClusterPages)
      .where(eq(topicClusterPages.cluster_id, cluster.id))
      .all();

    return {
      ...cluster,
      keywordCount: uniqueKwCount,
      pageCount: pages.length,
    };
  });

  return { clusters };
}

// ── 2. createCluster ──────────────────────────────────────────────────────────

export function createCluster(data: {
  name: string;
  pillar_url?: string;
  project_id: string;
  description?: string;
}): typeof topicClusters.$inferSelect {
  const id = crypto.randomUUID();
  db.insert(topicClusters).values({
    id,
    name: data.name,
    pillar_url: data.pillar_url ?? '',
    project_id: data.project_id,
    description: data.description ?? '',
  }).run();

  return db.select().from(topicClusters).where(eq(topicClusters.id, id)).get()!;
}

// ── 3. updateCluster ──────────────────────────────────────────────────────────

export function updateCluster(
  id: string,
  data: Partial<{ name: string; pillar_url: string; description: string }>,
): typeof topicClusters.$inferSelect | undefined {
  db.update(topicClusters)
    .set({ ...data, updated_at: sql`(datetime('now'))` })
    .where(eq(topicClusters.id, id))
    .run();

  return db.select().from(topicClusters).where(eq(topicClusters.id, id)).get();
}

// ── 4. deleteCluster ──────────────────────────────────────────────────────────

export function deleteCluster(id: string): { deleted: boolean } {
  // Unset cluster_id on keyword_rankings first
  db.update(keywordRankings)
    .set({ cluster_id: null })
    .where(eq(keywordRankings.cluster_id, id))
    .run();

  // Delete cluster (topic_cluster_pages cascade via FK)
  db.delete(topicClusters).where(eq(topicClusters.id, id)).run();

  return { deleted: true };
}

// ── 5. getClusterDetail ───────────────────────────────────────────────────────

export function getClusterDetail(id: string): ClusterDetail | null {
  const cluster = db.select().from(topicClusters).where(eq(topicClusters.id, id)).get();
  if (!cluster) return null;

  const pages = db.select().from(topicClusterPages)
    .where(eq(topicClusterPages.cluster_id, id))
    .all() as ClusterPage[];

  // Get all keyword rows for this cluster, then dedupe by latest date
  const allKwRows = db.select().from(keywordRankings)
    .where(eq(keywordRankings.cluster_id, id))
    .all();
  const latestKwRows = dedupeByLatestDate(allKwRows);

  // Build GSC map if we have a project_id
  const gscMap = cluster.project_id
    ? getGscQueryMap(cluster.project_id)
    : new Map<string, GscTopQuery>();

  const keywords: ClusterKeyword[] = latestKwRows.map((kw) => {
    const gscData = gscMap.get(kw.keyword.toLowerCase());
    return {
      id: kw.id,
      keyword: kw.keyword,
      url: kw.url,
      position: kw.position,
      date: kw.date,
      project_id: kw.project_id ?? null,
      cluster_id: kw.cluster_id ?? null,
      is_tracked: kw.is_tracked,
      gsc_clicks: gscData?.clicks,
      gsc_impressions: gscData?.impressions,
      gsc_ctr: gscData?.ctr,
      gsc_position: gscData?.position,
    };
  });

  return { cluster, pages, keywords };
}

// ── 6. addPageToCluster ───────────────────────────────────────────────────────

export function addPageToCluster(data: {
  cluster_id: string;
  url: string;
  title?: string;
  role?: string;
  notes?: string;
}): ClusterPage {
  const id = crypto.randomUUID();
  db.insert(topicClusterPages).values({
    id,
    cluster_id: data.cluster_id,
    url: data.url,
    title: data.title ?? '',
    role: data.role ?? 'supporting',
    notes: data.notes ?? '',
  }).run();

  return db.select().from(topicClusterPages).where(eq(topicClusterPages.id, id)).get()! as ClusterPage;
}

// ── 7. updatePage ─────────────────────────────────────────────────────────────

export function updatePage(
  id: string,
  data: Partial<{
    url: string;
    title: string;
    role: string;
    has_link_to_pillar: boolean;
    has_link_from_pillar: boolean;
    notes: string;
  }>,
): ClusterPage | undefined {
  db.update(topicClusterPages)
    .set(data)
    .where(eq(topicClusterPages.id, id))
    .run();

  return db.select().from(topicClusterPages).where(eq(topicClusterPages.id, id)).get() as ClusterPage | undefined;
}

// ── 8. removePage ─────────────────────────────────────────────────────────────

export function removePage(id: string): { deleted: boolean } {
  db.delete(topicClusterPages).where(eq(topicClusterPages.id, id)).run();
  return { deleted: true };
}

// ── 9. assignKeywordsToCluster ────────────────────────────────────────────────

export function assignKeywordsToCluster(
  clusterId: string,
  keywordPatterns: string[],
): { updated: number } {
  if (keywordPatterns.length === 0) return { updated: 0 };

  let updated = 0;
  // Update in batches of 100 to avoid SQLite limits
  const BATCH = 100;
  for (let i = 0; i < keywordPatterns.length; i += BATCH) {
    const batch = keywordPatterns.slice(i, i + BATCH);
    db.update(keywordRankings)
      .set({ cluster_id: clusterId })
      .where(inArray(keywordRankings.keyword, batch))
      .run();
    updated += batch.length;
  }

  return { updated };
}

// ── 10. unassignKeywords ──────────────────────────────────────────────────────

export function unassignKeywords(
  keywordPatterns: string[],
  projectId?: string,
): { updated: number } {
  if (keywordPatterns.length === 0) return { updated: 0 };

  const BATCH = 100;
  for (let i = 0; i < keywordPatterns.length; i += BATCH) {
    const batch = keywordPatterns.slice(i, i + BATCH);
    if (projectId) {
      db.update(keywordRankings)
        .set({ cluster_id: null })
        .where(and(
          inArray(keywordRankings.keyword, batch),
          eq(keywordRankings.project_id, projectId),
        ))
        .run();
    } else {
      db.update(keywordRankings)
        .set({ cluster_id: null })
        .where(inArray(keywordRankings.keyword, batch))
        .run();
    }
  }

  return { updated: keywordPatterns.length };
}

// ── 11. getClusterStats ───────────────────────────────────────────────────────

export function getClusterStats(id: string): ClusterStats | null {
  const cluster = db.select().from(topicClusters).where(eq(topicClusters.id, id)).get();
  if (!cluster) return null;

  // Get all keyword rows for cluster (dedupe by latest date)
  const allKwRows = db.select().from(keywordRankings)
    .where(eq(keywordRankings.cluster_id, id))
    .all();
  const latestKwRows = dedupeByLatestDate(allKwRows);

  const keywordCount = latestKwRows.length;
  const positions = latestKwRows.map((k) => k.position).filter((p) => p > 0);
  const avgPosition = positions.length > 0
    ? positions.reduce((a, b) => a + b, 0) / positions.length
    : null;
  const top10Count = positions.filter((p) => p <= 10).length;
  const top30Count = positions.filter((p) => p <= 30).length;

  // GSC aggregates from snapshots top_queries
  let totalClicks = 0;
  let totalImpressions = 0;

  if (cluster.project_id) {
    const gscMap = getGscQueryMap(cluster.project_id);
    const kwSet = new Set(latestKwRows.map((k) => k.keyword.toLowerCase()));
    for (const [query, data] of gscMap.entries()) {
      if (kwSet.has(query)) {
        totalClicks += data.clicks ?? 0;
        totalImpressions += data.impressions ?? 0;
      }
    }
  }

  // Pages stats
  const pages = db.select().from(topicClusterPages)
    .where(eq(topicClusterPages.cluster_id, id))
    .all();
  const pageCount = pages.length;
  const pagesWithLinkToPillar = pages.filter((p) => p.has_link_to_pillar).length;
  const linkHealthPct = pageCount > 0
    ? Math.round((pagesWithLinkToPillar / pageCount) * 100)
    : 0;

  const completeness = getClusterCompleteness(id);

  return {
    clusterId: id,
    keywordCount,
    avgPosition: avgPosition ? Math.round(avgPosition * 10) / 10 : null,
    totalClicks,
    totalImpressions,
    top10Count,
    top30Count,
    pageCount,
    pagesWithLinkToPillar,
    linkHealthPct,
    completenessScore: completeness.score,
    targetKeywordCount: cluster.target_keyword_count ?? 0,
    targetPageCount: cluster.target_page_count ?? 0,
  };
}

// ── 12. detectOverlap ─────────────────────────────────────────────────────────

export function detectOverlap(clusterId: string): CannibalizationWarning[] {
  // Get all rows for this cluster (all dates, not deduped)
  const allRows = db.select({
    keyword: keywordRankings.keyword,
    url: keywordRankings.url,
  }).from(keywordRankings)
    .where(eq(keywordRankings.cluster_id, clusterId))
    .all();

  // Group by keyword → set of URLs
  const kwUrlMap = new Map<string, Set<string>>();
  for (const row of allRows) {
    if (!kwUrlMap.has(row.keyword)) kwUrlMap.set(row.keyword, new Set());
    if (row.url) kwUrlMap.get(row.keyword)!.add(row.url);
  }

  // Filter keywords ranking for 2+ distinct URLs
  const warnings: CannibalizationWarning[] = [];
  for (const [keyword, urlSet] of kwUrlMap.entries()) {
    if (urlSet.size >= 2) {
      warnings.push({
        keyword,
        urls: Array.from(urlSet),
        urlCount: urlSet.size,
      });
    }
  }

  return warnings.sort((a, b) => b.urlCount - a.urlCount);
}

// ── 13. getCrossClusterLinks ───────────────────────────────────────────────────

export function getCrossClusterLinks(clusterId: string): { outgoing: CrossClusterLink[]; incoming: CrossClusterLink[] } {
  const allLinks = db.select().from(crossClusterLinks)
    .where(
      or(
        eq(crossClusterLinks.source_cluster_id, clusterId),
        eq(crossClusterLinks.target_cluster_id, clusterId),
      ),
    )
    .all();

  // Get all cluster names needed
  const clusterIds = new Set<string>();
  for (const link of allLinks) {
    clusterIds.add(link.source_cluster_id);
    clusterIds.add(link.target_cluster_id);
  }

  const clusterNameMap = new Map<string, string>();
  if (clusterIds.size > 0) {
    const clusters = db.select({ id: topicClusters.id, name: topicClusters.name })
      .from(topicClusters)
      .all();
    for (const c of clusters) {
      if (clusterIds.has(c.id)) clusterNameMap.set(c.id, c.name);
    }
  }

  const toLink = (raw: typeof crossClusterLinks.$inferSelect): CrossClusterLink => ({
    id: raw.id,
    source_cluster_id: raw.source_cluster_id,
    source_cluster_name: clusterNameMap.get(raw.source_cluster_id) ?? raw.source_cluster_id,
    target_cluster_id: raw.target_cluster_id,
    target_cluster_name: clusterNameMap.get(raw.target_cluster_id) ?? raw.target_cluster_id,
    source_url: raw.source_url,
    target_url: raw.target_url,
    anchor_text: raw.anchor_text,
    relationship: raw.relationship,
    verified: raw.verified,
  });

  const outgoing = allLinks.filter((l) => l.source_cluster_id === clusterId).map(toLink);
  const incoming = allLinks.filter((l) => l.target_cluster_id === clusterId).map(toLink);

  return { outgoing, incoming };
}

// ── 14. addCrossClusterLink ───────────────────────────────────────────────────

export function addCrossClusterLink(data: {
  source_cluster_id: string;
  target_cluster_id: string;
  source_url?: string;
  target_url?: string;
  anchor_text?: string;
  relationship?: string;
}): typeof crossClusterLinks.$inferSelect {
  const id = crypto.randomUUID();
  db.insert(crossClusterLinks).values({
    id,
    source_cluster_id: data.source_cluster_id,
    target_cluster_id: data.target_cluster_id,
    source_url: data.source_url ?? '',
    target_url: data.target_url ?? '',
    anchor_text: data.anchor_text ?? '',
    relationship: data.relationship ?? 'related',
    verified: false,
  }).run();

  return db.select().from(crossClusterLinks).where(eq(crossClusterLinks.id, id)).get()!;
}

// ── 15. removeCrossClusterLink ────────────────────────────────────────────────

export function removeCrossClusterLink(id: string): { deleted: boolean } {
  db.delete(crossClusterLinks).where(eq(crossClusterLinks.id, id)).run();
  return { deleted: true };
}

// ── 16. getClusterCompleteness ────────────────────────────────────────────────

export function getClusterCompleteness(id: string): ClusterCompleteness {
  const cluster = db.select().from(topicClusters).where(eq(topicClusters.id, id)).get();
  if (!cluster) return { score: 0, breakdown: { keywordCoverage: null, pageCoverage: null, linkHealth: 0, anchorDiversity: 0, overlapPenalty: 0 } };

  // Keyword count (deduplicated)
  const allKwRows = db.select({ keyword: keywordRankings.keyword, date: keywordRankings.date })
    .from(keywordRankings)
    .where(eq(keywordRankings.cluster_id, id))
    .all();
  const uniqueKwCount = new Set(allKwRows.map((k) => k.keyword)).size;

  // Pages
  const pages = db.select().from(topicClusterPages)
    .where(eq(topicClusterPages.cluster_id, id))
    .all();
  const pageCount = pages.length;

  // Keyword coverage
  const targetKw = cluster.target_keyword_count ?? 0;
  const keywordCoverage = targetKw > 0
    ? Math.min(100, Math.round((uniqueKwCount / targetKw) * 100))
    : null;

  // Page coverage
  const targetPage = cluster.target_page_count ?? 0;
  const pageCoverage = targetPage > 0
    ? Math.min(100, Math.round((pageCount / targetPage) * 100))
    : null;

  // Link health: % pages with bidirectional links
  const nonPillarPages = pages.filter((p) => p.role !== 'pillar');
  const bidirectional = nonPillarPages.filter((p) => p.has_link_to_pillar && p.has_link_from_pillar).length;
  const linkHealth = nonPillarPages.length > 0
    ? Math.round((bidirectional / nonPillarPages.length) * 100)
    : 100;

  // Anchor diversity: % pages with non-empty anchor_to_pillar
  const withAnchor = pages.filter((p) => p.anchor_to_pillar && p.anchor_to_pillar.trim() !== '').length;
  const anchorDiversity = pageCount > 0 ? Math.round((withAnchor / pageCount) * 100) : 0;

  // Overlap penalty: capped at 30 to avoid crushing score for large clusters
  const overlapWarnings = detectOverlap(id);
  const overlapPenalty = Math.min(30, overlapWarnings.length * 3);

  // Weighted score calculation
  const metrics: { value: number; weight: number }[] = [];
  if (keywordCoverage !== null) metrics.push({ value: keywordCoverage, weight: 25 });
  if (pageCoverage !== null) metrics.push({ value: pageCoverage, weight: 25 });
  metrics.push({ value: linkHealth, weight: 30 });
  metrics.push({ value: anchorDiversity, weight: 20 });

  let score = 0;
  if (metrics.length > 0) {
    const totalWeight = metrics.reduce((s, m) => s + m.weight, 0);
    const weightedSum = metrics.reduce((s, m) => s + m.value * m.weight, 0);
    score = Math.round(weightedSum / totalWeight);
  }

  score = Math.max(0, Math.min(100, score - overlapPenalty));

  return {
    score,
    breakdown: {
      keywordCoverage,
      pageCoverage,
      linkHealth,
      anchorDiversity,
      overlapPenalty,
    },
  };
}

// ── 17. updateClusterTargets ──────────────────────────────────────────────────

export function updateClusterTargets(
  id: string,
  data: { target_keyword_count?: number; target_page_count?: number },
): typeof topicClusters.$inferSelect | undefined {
  db.update(topicClusters)
    .set({ ...data, updated_at: sql`(datetime('now'))` })
    .where(eq(topicClusters.id, id))
    .run();

  return db.select().from(topicClusters).where(eq(topicClusters.id, id)).get();
}

// ── 18. getUnassignedKeywords ─────────────────────────────────────────────────
export function getUnassignedKeywords(projectId: string): {
  keywords: { id: string; keyword: string; url: string; current_position: number | null }[];
} {
  const { isNull } = require('drizzle-orm');
  const allRows = db.select({
    id: keywordRankings.id,
    keyword: keywordRankings.keyword,
    url: keywordRankings.url,
    position: keywordRankings.position,
    date: keywordRankings.date,
    cluster_id: keywordRankings.cluster_id,
  })
    .from(keywordRankings)
    .where(and(eq(keywordRankings.project_id, projectId), isNull(keywordRankings.cluster_id)))
    .all();

  const map = new Map<string, typeof allRows[0]>();
  for (const row of allRows) {
    const ex = map.get(row.keyword);
    if (!ex || row.date > ex.date) map.set(row.keyword, row);
  }
  return {
    keywords: Array.from(map.values())
      .map((r) => ({ id: r.id, keyword: r.keyword, url: r.url ?? '', current_position: r.position ?? null }))
      .sort((a, b) => (a.current_position ?? 999) - (b.current_position ?? 999)),
  };
}

// ── 19. getKeywordsForCluster ─────────────────────────────────────────────────
export function getKeywordsForCluster(clusterId: string): {
  keywords: { id: string; keyword: string; url: string | null; current_position: number | null; previous_position: number | null; clicks: number | null; impressions: number | null }[];
} {
  const allRows = db.select().from(keywordRankings).where(eq(keywordRankings.cluster_id, clusterId)).all();
  const byKeyword = new Map<string, typeof allRows>();
  for (const row of allRows) {
    if (!byKeyword.has(row.keyword)) byKeyword.set(row.keyword, []);
    byKeyword.get(row.keyword)!.push(row);
  }
  const keywords = Array.from(byKeyword.entries()).map(([, rows]) => {
    const sorted = rows.sort((a, b) => b.date.localeCompare(a.date));
    const cur = sorted[0]; const prev = sorted[1] ?? null;
    return { id: cur.id, keyword: cur.keyword, url: cur.url ?? null, current_position: cur.position ?? null, previous_position: prev?.position ?? null, clicks: null, impressions: null };
  }).sort((a, b) => (a.current_position ?? 999) - (b.current_position ?? 999));
  return { keywords };
}
