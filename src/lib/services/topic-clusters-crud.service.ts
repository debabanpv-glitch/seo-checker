import { db } from '@/lib/db';
import { topicClusters, topicClusterPages } from '@/lib/db/schema/topic-clusters';
import { keywordRankings } from '@/lib/db/schema/seo';
import { gscSnapshots } from '@/lib/db/schema/gsc';
import { eq, and, sql, inArray, isNull } from 'drizzle-orm';

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
