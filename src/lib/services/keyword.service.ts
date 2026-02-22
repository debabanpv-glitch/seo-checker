import { db } from '@/lib/db';
import { keywordRankings, tasks, seoResults } from '@/lib/db/schema';
import { eq, and, like, gte, lte, lt, desc, asc, inArray } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Rankings CRUD (GET /api/keyword-rankings)
// ---------------------------------------------------------------------------

export function getRankings(filters: {
  project_id?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const conditions = [];
  if (filters.project_id) conditions.push(eq(keywordRankings.project_id, filters.project_id));
  if (filters.keyword) conditions.push(like(keywordRankings.keyword, `%${filters.keyword}%`));
  if (filters.startDate) conditions.push(gte(keywordRankings.date, filters.startDate));
  if (filters.endDate) conditions.push(lte(keywordRankings.date, filters.endDate));

  return db.select().from(keywordRankings)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(keywordRankings.date), asc(keywordRankings.keyword))
    .limit(filters.limit ?? 1000)
    .all();
}

// ---------------------------------------------------------------------------
// Delete rankings
// ---------------------------------------------------------------------------

export function deleteRankings(params: {
  id?: string;
  project_id?: string;
  keyword?: string;
  deleteAll?: boolean;
}) {
  if (params.deleteAll) {
    db.delete(keywordRankings).run();
    return;
  }
  if (params.id) {
    db.delete(keywordRankings).where(eq(keywordRankings.id, params.id)).run();
    return;
  }
  if (params.project_id && !params.keyword) {
    db.delete(keywordRankings).where(eq(keywordRankings.project_id, params.project_id)).run();
    return;
  }
  if (params.project_id && params.keyword) {
    db.delete(keywordRankings)
      .where(and(
        eq(keywordRankings.project_id, params.project_id),
        eq(keywordRankings.keyword, params.keyword),
      ))
      .run();
  }
}

// ---------------------------------------------------------------------------
// Batch upsert rankings (POST /api/keyword-rankings/sync)
// ---------------------------------------------------------------------------

export function upsertRankingsBatch(rows: Array<{
  keyword: string;
  url: string;
  position: number;
  date: string;
  project_id?: string | null;
  ranking_tier?: string | null;
  keyword_type?: string | null;
}>) {
  db.transaction((tx) => {
    for (const row of rows) {
      // Delete existing then insert (SQLite doesn't have a unique constraint on keyword+date+project_id)
      const conditions = [
        eq(keywordRankings.keyword, row.keyword),
        eq(keywordRankings.date, row.date),
      ];
      if (row.project_id) {
        conditions.push(eq(keywordRankings.project_id, row.project_id));
      }
      tx.delete(keywordRankings).where(and(...conditions)).run();

      tx.insert(keywordRankings).values({
        keyword: row.keyword,
        url: row.url,
        position: row.position,
        date: row.date,
        project_id: row.project_id ?? null,
        ranking_tier: row.ranking_tier ?? null,
        keyword_type: row.keyword_type ?? null,
      }).run();
    }
  });
}

// ---------------------------------------------------------------------------
// Growth data (GET /api/keyword-rankings/growth)
// ---------------------------------------------------------------------------

interface DailySnapshot {
  date: string;
  top3: number;
  top10: number;
  top20: number;
  top30: number;
  total: number;
  uniqueUrls: number;
}

export function getRankingGrowth(projectId?: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];

  const conditions = [gte(keywordRankings.date, startStr)];
  if (projectId) conditions.push(eq(keywordRankings.project_id, projectId));

  const data = db.select({
    keyword: keywordRankings.keyword,
    position: keywordRankings.position,
    date: keywordRankings.date,
    url: keywordRankings.url,
  }).from(keywordRankings)
    .where(and(...conditions))
    .orderBy(asc(keywordRankings.date))
    .all();

  // Group by date
  const dateMap = new Map<string, { keywords: Map<string, number>; urls: Set<string> }>();

  data.forEach((record) => {
    if (!dateMap.has(record.date)) {
      dateMap.set(record.date, { keywords: new Map(), urls: new Set() });
    }
    const dateData = dateMap.get(record.date)!;
    const existing = dateData.keywords.get(record.keyword);
    if (!existing || record.position < existing) {
      dateData.keywords.set(record.keyword, record.position);
    }
    if (record.url && record.url.trim()) {
      dateData.urls.add(record.url.trim());
    }
  });

  const snapshots: DailySnapshot[] = [];
  const sortedDates = Array.from(dateMap.keys()).sort();

  sortedDates.forEach((date) => {
    const dateData = dateMap.get(date)!;
    let top3 = 0, top10 = 0, top20 = 0, top30 = 0;
    dateData.keywords.forEach((position) => {
      if (position <= 3) top3++;
      if (position <= 10) top10++;
      if (position <= 20) top20++;
      if (position <= 30) top30++;
    });
    snapshots.push({ date, top3, top10, top20, top30, total: dateData.keywords.size, uniqueUrls: dateData.urls.size });
  });

  let summary = null;
  if (snapshots.length >= 2) {
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    summary = {
      firstDate: first.date, lastDate: last.date,
      top3Change: last.top3 - first.top3, top10Change: last.top10 - first.top10,
      top20Change: last.top20 - first.top20, top30Change: last.top30 - first.top30,
      totalChange: last.total - first.total,
      top3First: first.top3, top3Last: last.top3,
      top10First: first.top10, top10Last: last.top10,
      top20First: first.top20, top20Last: last.top20,
      top30First: first.top30, top30Last: last.top30,
    };
  }

  return { snapshots, summary };
}

// ---------------------------------------------------------------------------
// Ranking analysis (GET /api/keyword-rankings/analysis)
// ---------------------------------------------------------------------------

export function getRankingAnalysis(projectId: string) {
  // 1. Published tasks
  const publishedTasks = db.select({
    id: tasks.id, link_publish: tasks.link_publish,
    publish_date: tasks.publish_date, month: tasks.month, year: tasks.year,
    parent_keyword: tasks.parent_keyword,
  }).from(tasks)
    .where(and(
      eq(tasks.project_id, projectId),
      eq(tasks.status_content, '4. Publish'),
    ))
    .all()
    .filter((t) => t.link_publish);

  const publishedUrls = new Set<string>();
  const tasksByMonth: Record<string, { published: number; urls: string[] }> = {};

  publishedTasks.forEach((task) => {
    if (task.link_publish) {
      publishedUrls.add(task.link_publish.trim());
      const key = `${task.year}-${String(task.month).padStart(2, '0')}`;
      if (!tasksByMonth[key]) tasksByMonth[key] = { published: 0, urls: [] };
      tasksByMonth[key].published++;
      tasksByMonth[key].urls.push(task.link_publish.trim());
    }
  });

  // 2. Latest ranking date
  const latestDateRow = db.select({ date: keywordRankings.date })
    .from(keywordRankings)
    .where(eq(keywordRankings.project_id, projectId))
    .orderBy(desc(keywordRankings.date))
    .limit(1)
    .get();
  const latestDate = latestDateRow?.date || null;

  // 3. Rankings for latest date
  const rankings = latestDate
    ? db.select({ keyword: keywordRankings.keyword, url: keywordRankings.url, position: keywordRankings.position })
      .from(keywordRankings)
      .where(and(eq(keywordRankings.project_id, projectId), eq(keywordRankings.date, latestDate)))
      .all()
    : [];

  // 4. Previous date rankings
  const prevDateRow = latestDate
    ? db.select({ date: keywordRankings.date })
      .from(keywordRankings)
      .where(and(eq(keywordRankings.project_id, projectId), lt(keywordRankings.date, latestDate)))
      .orderBy(desc(keywordRankings.date))
      .limit(1)
      .get()
    : null;

  const prevRankings = prevDateRow
    ? db.select({ keyword: keywordRankings.keyword, position: keywordRankings.position })
      .from(keywordRankings)
      .where(and(eq(keywordRankings.project_id, projectId), eq(keywordRankings.date, prevDateRow.date)))
      .all()
    : [];

  const prevPositionMap = new Map<string, number>();
  prevRankings.forEach((r) => prevPositionMap.set(r.keyword, r.position));

  // 5. SEO results for published URLs
  const urlsToCheck = Array.from(publishedUrls);
  const seoData = urlsToCheck.length > 0
    ? db.select({ url: seoResults.url, score: seoResults.score, max_score: seoResults.max_score })
      .from(seoResults)
      .where(inArray(seoResults.url, urlsToCheck))
      .all()
    : [];

  const seoScoreMap = new Map<string, { score: number; maxScore: number }>();
  seoData.forEach((r) => seoScoreMap.set(r.url, { score: r.score, maxScore: r.max_score }));

  // 6. Build URL -> keywords map
  const urlKeywordsMap = new Map<string, { keyword: string; position: number }[]>();
  const rankedUrls = new Set<string>();

  rankings.forEach((r) => {
    if (r.url) {
      rankedUrls.add(r.url.trim());
      const url = r.url.trim();
      if (!urlKeywordsMap.has(url)) urlKeywordsMap.set(url, []);
      urlKeywordsMap.get(url)!.push({ keyword: r.keyword, position: r.position });
    }
  });

  // Content stats
  let hasRankingCount = 0;
  publishedUrls.forEach((url) => { if (rankedUrls.has(url)) hasRankingCount++; });

  const contentStats = {
    total: publishedUrls.size,
    hasRanking: hasRankingCount,
    noRanking: publishedUrls.size - hasRankingCount,
    percentEffective: publishedUrls.size > 0 ? Math.round((hasRankingCount / publishedUrls.size) * 100) : 0,
  };

  // Monthly content
  const monthlyContent = Object.entries(tasksByMonth)
    .map(([key, data]) => {
      const [yr, mo] = key.split('-');
      const hasRanking = data.urls.filter((url) => rankedUrls.has(url)).length;
      return { month: key, year: parseInt(yr), monthNum: parseInt(mo), published: data.published, hasRanking, noRanking: data.published - hasRanking };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  // URL analysis
  const urlAnalysis = Array.from(publishedUrls).map((url) => {
    const keywords = urlKeywordsMap.get(url) || [];
    const bestPosition = keywords.length > 0 ? Math.min(...keywords.map((k) => k.position)) : 999;
    const seo = seoScoreMap.get(url);

    let status: 'top10' | 'top30' | 'low' | 'none' = 'none';
    let action = 'Chưa có dữ liệu ranking';

    if (keywords.length > 0) {
      if (bestPosition <= 10) { status = 'top10'; action = 'Duy trì & mở rộng từ khóa'; }
      else if (bestPosition <= 30) {
        status = 'top30';
        action = seo && seo.score < 70 ? 'Cải thiện SEO onpage trước' : 'Cần thêm backlinks';
      } else { status = 'low'; action = 'Review lại content & SEO'; }
    } else {
      if (seo && seo.score >= 80) action = 'SEO tốt, cần backlinks & thời gian';
      else if (seo) action = 'Cải thiện SEO onpage trước';
    }

    return {
      url, bestPosition: keywords.length > 0 ? bestPosition : -1,
      keywordCount: keywords.length, seoScore: seo?.score || null, seoMaxScore: seo?.maxScore || null,
      status, action, keywords: keywords.sort((a, b) => a.position - b.position).slice(0, 5),
    };
  }).sort((a, b) => {
    if (a.bestPosition === -1 && b.bestPosition === -1) return 0;
    if (a.bestPosition === -1) return 1;
    if (b.bestPosition === -1) return -1;
    return a.bestPosition - b.bestPosition;
  });

  // Opportunity keywords (11-20)
  const opportunityKeywords = rankings
    .filter((r) => r.position >= 11 && r.position <= 20)
    .map((r) => ({
      keyword: r.keyword, url: r.url || '', position: r.position,
      change: prevPositionMap.has(r.keyword) ? prevPositionMap.get(r.keyword)! - r.position : 0,
    }))
    .sort((a, b) => a.position - b.position);

  // Declining keywords (dropped 3+)
  const decliningKeywords = rankings
    .filter((r) => {
      const prevPos = prevPositionMap.get(r.keyword);
      return prevPos !== undefined && r.position > prevPos && r.position - prevPos >= 3;
    })
    .map((r) => ({
      keyword: r.keyword, url: r.url || '', currentPosition: r.position,
      previousPosition: prevPositionMap.get(r.keyword)!, decline: r.position - prevPositionMap.get(r.keyword)!,
    }))
    .sort((a, b) => b.decline - a.decline);

  return { contentStats, monthlyContent, urlAnalysis, opportunityKeywords, decliningKeywords, latestDate };
}

// ---------------------------------------------------------------------------
// Ranking details (GET /api/keyword-rankings/details)
// ---------------------------------------------------------------------------

export function getRankingDetails(projectId: string, view: string = 'keywords') {
  // Latest date
  const latestRow = db.select({ date: keywordRankings.date })
    .from(keywordRankings)
    .where(eq(keywordRankings.project_id, projectId))
    .orderBy(desc(keywordRankings.date))
    .limit(1)
    .get();

  if (!latestRow) return { keywords: [], urls: [], latestDate: null };
  const latestDate = latestRow.date;

  const rankings = db.select({ keyword: keywordRankings.keyword, url: keywordRankings.url, position: keywordRankings.position })
    .from(keywordRankings)
    .where(and(eq(keywordRankings.project_id, projectId), eq(keywordRankings.date, latestDate)))
    .orderBy(asc(keywordRankings.position))
    .all();

  // Previous date
  const prevRow = db.select({ date: keywordRankings.date })
    .from(keywordRankings)
    .where(and(eq(keywordRankings.project_id, projectId), lt(keywordRankings.date, latestDate)))
    .orderBy(desc(keywordRankings.date))
    .limit(1)
    .get();

  const prevRankings = prevRow
    ? db.select({ keyword: keywordRankings.keyword, position: keywordRankings.position })
      .from(keywordRankings)
      .where(and(eq(keywordRankings.project_id, projectId), eq(keywordRankings.date, prevRow.date)))
      .all()
    : [];

  const prevMap = new Map<string, number>();
  prevRankings.forEach((r) => prevMap.set(r.keyword, r.position));

  if (view === 'urls') {
    const urlMap = new Map<string, { url: string; keywords: { keyword: string; position: number; change: number }[] }>();
    rankings.forEach((r) => {
      const url = r.url || 'No URL';
      if (!urlMap.has(url)) urlMap.set(url, { url, keywords: [] });
      const change = prevMap.has(r.keyword) ? prevMap.get(r.keyword)! - r.position : 0;
      urlMap.get(url)!.keywords.push({ keyword: r.keyword, position: r.position, change });
    });
    urlMap.forEach((d) => d.keywords.sort((a, b) => a.position - b.position));
    const urls = Array.from(urlMap.values()).sort((a, b) => {
      const bestA = Math.min(...a.keywords.map((k) => k.position));
      const bestB = Math.min(...b.keywords.map((k) => k.position));
      return bestA - bestB;
    });
    return { urls, latestDate };
  }

  const keywords = rankings.map((r) => {
    const change = prevMap.has(r.keyword) ? prevMap.get(r.keyword)! - r.position : 0;
    return { keyword: r.keyword, url: r.url || '', position: r.position, change };
  });

  return { keywords, latestDate };
}

// ---------------------------------------------------------------------------
// CSV parsing helpers (used by keyword-rankings/sync route)
// ---------------------------------------------------------------------------

export function parseCSV(text: string): string[][] {
  const lines = text.split('\n');
  const result: string[][] = [];

  for (const line of lines) {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) { row.push(current); current = ''; }
      else current += char;
    }
    row.push(current);
    result.push(row);
  }

  return result;
}

export function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const idx = headers.findIndex((h) => h.includes(name));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseRankingDate(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 10);

  const ymdSlashMatch = dateStr.match(/^(\d{4})[/](\d{1,2})[/](\d{1,2})/);
  if (ymdSlashMatch) {
    return `${ymdSlashMatch[1]}-${ymdSlashMatch[2].padStart(2, '0')}-${ymdSlashMatch[3].padStart(2, '0')}`;
  }

  const dmyMatch = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  } catch { /* ignore */ }

  return '';
}
