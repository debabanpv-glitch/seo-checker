import { db } from '@/lib/db';
import { keywordRankings } from '@/lib/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { getSnapshots } from './gsc-snapshots-save-and-query.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TopQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface KeywordInsight {
  keyword: string;
  url: string;
  currentPosition: number;
  previousPosition: number | null;
  change: number | null; // positive = improved
  history: { date: string; position: number }[];
  ranking_tier: string | null;
  keyword_type: string | null;
  is_tracked: boolean;
  gscClicks: number;
  gscImpressions: number;
  gscCtr: number;
  gscPosition: number;
}

export interface ExpertInsight {
  type: 'opportunity' | 'risk' | 'success' | 'action';
  title: string;
  detail: string;
  keywords: string[];
}

export interface KeywordInsightsResponse {
  meta: {
    projectId: string;
    latestDate: string | null;
    previousDate: string | null;
    checkDates: string[];
  };
  summary: {
    total: number;
    improved: number;
    declined: number;
    stable: number;
    newToTop10: number;
    exitTop10: number;
    trackedTotal: number;
    trackedInTop10: number;
    totalClicks: number;
    totalImpressions: number;
  };
  tiers: {
    top5: KeywordInsight[];
    top10: KeywordInsight[];
    top15: KeywordInsight[];
    top30: KeywordInsight[];
    beyond30: KeywordInsight[];
  };
  movers: {
    surging: KeywordInsight[];
    dropping: KeywordInsight[];
  };
  boundary: KeywordInsight[];
  tracked: KeywordInsight[];
  expertInsights: ExpertInsight[];
}

// ---------------------------------------------------------------------------
// Main aggregator
// ---------------------------------------------------------------------------

export function getKeywordInsights(projectId: string): KeywordInsightsResponse {
  // 1. Fetch all rankings for this project
  const allRankings = db.select().from(keywordRankings)
    .where(eq(keywordRankings.project_id, projectId))
    .orderBy(desc(keywordRankings.date), asc(keywordRankings.keyword))
    .all();

  // 2. Get unique dates sorted desc
  const dates = [...new Set(allRankings.map((r) => r.date))].sort().reverse();
  const latestDate = dates[0] ?? null;
  const previousDate = dates[1] ?? null;

  // 3. Build GSC query map from latest snapshot
  const gscMap = buildGscQueryMap(projectId);

  // 4. Group rankings by keyword → build KeywordInsight[]
  const kwMap = new Map<string, KeywordInsight>();

  for (const r of allRankings) {
    const key = r.keyword.toLowerCase().trim();
    if (!kwMap.has(key)) {
      const gsc = gscMap.get(key);
      kwMap.set(key, {
        keyword: r.keyword,
        url: r.url || '',
        currentPosition: 0,
        previousPosition: null,
        change: null,
        history: [],
        ranking_tier: r.ranking_tier ?? null,
        keyword_type: r.keyword_type ?? null,
        is_tracked: !!r.is_tracked,
        gscClicks: gsc?.clicks ?? 0,
        gscImpressions: gsc?.impressions ?? 0,
        gscCtr: gsc?.ctr ?? 0,
        gscPosition: gsc?.position ?? 0,
      });
    }

    const kw = kwMap.get(key)!;

    // Collect history (all dates)
    if (!kw.history.find((h) => h.date === r.date)) {
      kw.history.push({ date: r.date, position: r.position });
    }

    // Set current/previous positions
    if (r.date === latestDate && kw.currentPosition === 0) {
      kw.currentPosition = r.position;
      kw.url = r.url || kw.url;
      kw.ranking_tier = r.ranking_tier ?? kw.ranking_tier;
      kw.keyword_type = r.keyword_type ?? kw.keyword_type;
    }
    // OR is_tracked across ALL dates (not just latest)
    kw.is_tracked = kw.is_tracked || !!r.is_tracked;
    if (r.date === previousDate && kw.previousPosition === null) {
      kw.previousPosition = r.position;
    }
  }

  // Sort history chronologically for each keyword
  const allKeywords: KeywordInsight[] = [];
  kwMap.forEach((kw) => {
    kw.history.sort((a, b) => a.date.localeCompare(b.date));
    if (kw.previousPosition !== null) {
      kw.change = kw.previousPosition - kw.currentPosition; // positive = improved
    }
    // Include keywords that have data in latest date, or are tracked (even if position=0)
    if (kw.currentPosition > 0 || kw.is_tracked) allKeywords.push(kw);
  });

  // 5. Classify
  const tiers = {
    top5: allKeywords.filter((k) => k.currentPosition >= 1 && k.currentPosition <= 5)
      .sort((a, b) => a.currentPosition - b.currentPosition),
    top10: allKeywords.filter((k) => k.currentPosition >= 6 && k.currentPosition <= 10)
      .sort((a, b) => a.currentPosition - b.currentPosition),
    top15: allKeywords.filter((k) => k.currentPosition >= 11 && k.currentPosition <= 15)
      .sort((a, b) => a.currentPosition - b.currentPosition),
    top30: allKeywords.filter((k) => k.currentPosition >= 16 && k.currentPosition <= 30)
      .sort((a, b) => a.currentPosition - b.currentPosition),
    beyond30: allKeywords.filter((k) => k.currentPosition > 30)
      .sort((a, b) => a.currentPosition - b.currentPosition),
  };

  const movers = {
    surging: allKeywords
      .filter((k) => k.change !== null && k.change >= 5)
      .sort((a, b) => (b.change ?? 0) - (a.change ?? 0)),
    dropping: allKeywords
      .filter((k) => k.change !== null && k.change <= -5)
      .sort((a, b) => (a.change ?? 0) - (b.change ?? 0)),
  };

  const boundary = allKeywords
    .filter((k) => k.currentPosition >= 8 && k.currentPosition <= 12)
    .sort((a, b) => a.currentPosition - b.currentPosition);

  const tracked = allKeywords
    .filter((k) => k.is_tracked)
    .sort((a, b) => {
      // KW with position=0 (no data) go to bottom
      if (a.currentPosition === 0 && b.currentPosition > 0) return 1;
      if (b.currentPosition === 0 && a.currentPosition > 0) return -1;
      return a.currentPosition - b.currentPosition;
    });

  // 6. Summary
  const improved = allKeywords.filter((k) => k.change !== null && k.change > 0).length;
  const declined = allKeywords.filter((k) => k.change !== null && k.change < 0).length;
  const stable = allKeywords.filter((k) => k.change === 0 || k.change === null).length;

  const newToTop10 = allKeywords.filter((k) =>
    k.currentPosition <= 10 && k.previousPosition !== null && k.previousPosition > 10,
  ).length;
  const exitTop10 = allKeywords.filter((k) =>
    k.currentPosition > 10 && k.previousPosition !== null && k.previousPosition <= 10,
  ).length;

  const trackedKws = allKeywords.filter((k) => k.is_tracked);
  const totalClicks = allKeywords.reduce((s, k) => s + k.gscClicks, 0);
  const totalImpressions = allKeywords.reduce((s, k) => s + k.gscImpressions, 0);

  const summary = {
    total: allKeywords.length,
    improved,
    declined,
    stable,
    newToTop10,
    exitTop10,
    trackedTotal: trackedKws.length,
    trackedInTop10: trackedKws.filter((k) => k.currentPosition > 0 && k.currentPosition <= 10).length,
    totalClicks,
    totalImpressions,
  };

  // 7. Expert insights
  const expertInsights = generateExpertInsights(allKeywords, tiers, movers, boundary, tracked, summary, dates);

  return {
    meta: { projectId, latestDate, previousDate, checkDates: dates.reverse() },
    summary,
    tiers,
    movers,
    boundary,
    tracked,
    expertInsights,
  };
}

// ---------------------------------------------------------------------------
// GSC query map builder
// ---------------------------------------------------------------------------

function buildGscQueryMap(projectId: string): Map<string, TopQuery> {
  const map = new Map<string, TopQuery>();
  const snapshots = getSnapshots(projectId, 1);
  if (snapshots.length === 0) return map;

  const latest = snapshots[0];
  try {
    const raw = latest.top_queries;
    if (!raw) return map;
    const queries: TopQuery[] = typeof raw === 'string' ? JSON.parse(raw) : (raw as TopQuery[]);
    if (!Array.isArray(queries)) return map;
    for (const q of queries) {
      map.set(q.query.toLowerCase().trim(), q);
    }
  } catch { /* ignore */ }
  return map;
}

// ---------------------------------------------------------------------------
// Expert insights generator
// ---------------------------------------------------------------------------

function generateExpertInsights(
  all: KeywordInsight[],
  tiers: KeywordInsightsResponse['tiers'],
  movers: KeywordInsightsResponse['movers'],
  boundary: KeywordInsight[],
  tracked: KeywordInsight[],
  summary: KeywordInsightsResponse['summary'],
  dates: string[],
): ExpertInsight[] {
  const insights: ExpertInsight[] = [];

  // Rule 1: Boundary opportunity
  if (boundary.length >= 2) {
    const withClicks = boundary.filter((k) => k.gscClicks > 0).sort((a, b) => b.gscClicks - a.gscClicks);
    insights.push({
      type: 'opportunity',
      title: `${boundary.length} từ khóa ở ngưỡng trang 1 (vị trí 8-12)`,
      detail: `Đây là cơ hội cao nhất để tăng traffic. Tập trung cải thiện content và backlinks cho các từ khóa này.`,
      keywords: (withClicks.length > 0 ? withClicks : boundary).slice(0, 3).map((k) => k.keyword),
    });
  }

  // Rule 2: Dropping risk
  if (movers.dropping.length >= 2) {
    insights.push({
      type: 'risk',
      title: `${movers.dropping.length} từ khóa giảm hạng mạnh`,
      detail: `Cần kiểm tra content, backlinks và đối thủ cạnh tranh. Ưu tiên xử lý từ khóa có traffic cao.`,
      keywords: movers.dropping.slice(0, 3).map((k) => k.keyword),
    });
  }

  // Rule 3: Surging success
  if (movers.surging.length >= 2) {
    insights.push({
      type: 'success',
      title: `${movers.surging.length} từ khóa tăng hạng tốt`,
      detail: `Chiến lược hiện tại đang phát huy hiệu quả. Tiếp tục duy trì và mở rộng.`,
      keywords: movers.surging.slice(0, 3).map((k) => k.keyword),
    });
  }

  // Rule 4: Tracked progress
  if (tracked.length > 0) {
    const inTop10 = tracked.filter((k) => k.currentPosition <= 10).length;
    const pct = Math.round((inTop10 / tracked.length) * 100);
    if (pct < 50) {
      insights.push({
        type: 'action',
        title: `${inTop10}/${tracked.length} từ khóa cam kết trong Top 10 (${pct}%)`,
        detail: `Cần đẩy mạnh để đạt mục tiêu. Ưu tiên từ khóa gần Top 10 nhất.`,
        keywords: tracked.filter((k) => k.currentPosition > 10).sort((a, b) => a.currentPosition - b.currentPosition).slice(0, 3).map((k) => k.keyword),
      });
    } else {
      insights.push({
        type: 'success',
        title: `${inTop10}/${tracked.length} từ khóa cam kết trong Top 10 (${pct}%)`,
        detail: `Tỷ lệ tốt. Tiếp tục giữ vị trí và push các từ khóa còn lại.`,
        keywords: tracked.filter((k) => k.currentPosition > 10).slice(0, 3).map((k) => k.keyword),
      });
    }
  }

  // Rule 5: Data depth warning
  if (dates.length < 3) {
    insights.push({
      type: 'action',
      title: `Dữ liệu lịch sử còn ít (${dates.length} lần check)`,
      detail: `Sync định kỳ để có biểu đồ xu hướng chính xác hơn. Cần ít nhất 4-5 lần check.`,
      keywords: [],
    });
  }

  // Rule 6: Top 5 ratio
  const top5Pct = summary.total > 0 ? Math.round((tiers.top5.length / summary.total) * 100) : 0;
  if (top5Pct < 10 && tiers.top10.length > 0) {
    insights.push({
      type: 'opportunity',
      title: `Chỉ ${top5Pct}% từ khóa ở Top 5`,
      detail: `Có ${tiers.top10.length} từ khóa ở Top 6-10 có thể push lên Top 5. Tăng nội dung và backlinks.`,
      keywords: tiers.top10.slice(0, 3).map((k) => k.keyword),
    });
  }

  return insights;
}
