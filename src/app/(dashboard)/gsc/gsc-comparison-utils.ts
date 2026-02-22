// ---------------------------------------------------------------------------
// GSC Comparison & Analysis Utilities
// Compares top_queries / top_pages between 2 snapshots (latest vs previous)
// ---------------------------------------------------------------------------

export interface GscQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface ComparedQuery extends GscQuery {
  prev_clicks: number;
  prev_impressions: number;
  prev_ctr: number;
  prev_position: number;
  clicks_delta: number;
  impressions_delta: number;
  position_delta: number; // negative = improved (lower position = better)
  ctr_delta: number;
  status: 'winner' | 'loser' | 'new' | 'stable';
}

export interface ComparedPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  prev_clicks: number;
  prev_impressions: number;
  prev_ctr: number;
  prev_position: number;
  clicks_delta: number;
  impressions_delta: number;
  position_delta: number;
  ctr_delta: number;
  status: 'winner' | 'loser' | 'new' | 'stable';
}

// Compare queries between 2 snapshots
export function compareQueries(
  current: GscQuery[],
  previous: GscQuery[],
): ComparedQuery[] {
  const prevMap = new Map(previous.map((q) => [q.query, q]));
  const result: ComparedQuery[] = [];

  for (const q of current) {
    const prev = prevMap.get(q.query);
    if (prev) {
      const clicks_delta = q.clicks - prev.clicks;
      const position_delta = q.position - prev.position; // negative = improved
      const status: ComparedQuery['status'] =
        clicks_delta > 0 || position_delta < -0.5
          ? 'winner'
          : clicks_delta < 0 || position_delta > 0.5
            ? 'loser'
            : 'stable';

      result.push({
        ...q,
        prev_clicks: prev.clicks,
        prev_impressions: prev.impressions,
        prev_ctr: prev.ctr,
        prev_position: prev.position,
        clicks_delta,
        impressions_delta: q.impressions - prev.impressions,
        position_delta,
        ctr_delta: q.ctr - prev.ctr,
        status,
      });
    } else {
      result.push({
        ...q,
        prev_clicks: 0,
        prev_impressions: 0,
        prev_ctr: 0,
        prev_position: 0,
        clicks_delta: q.clicks,
        impressions_delta: q.impressions,
        position_delta: 0,
        ctr_delta: 0,
        status: 'new',
      });
    }
  }

  return result;
}

// Compare pages between 2 snapshots
export function comparePages(
  current: GscPage[],
  previous: GscPage[],
): ComparedPage[] {
  const prevMap = new Map(previous.map((p) => [p.page, p]));
  const result: ComparedPage[] = [];

  for (const p of current) {
    const prev = prevMap.get(p.page);
    if (prev) {
      const clicks_delta = p.clicks - prev.clicks;
      const position_delta = p.position - prev.position;
      const status: ComparedPage['status'] =
        clicks_delta > 0 || position_delta < -0.5
          ? 'winner'
          : clicks_delta < 0 || position_delta > 0.5
            ? 'loser'
            : 'stable';

      result.push({
        ...p,
        prev_clicks: prev.clicks,
        prev_impressions: prev.impressions,
        prev_ctr: prev.ctr,
        prev_position: prev.position,
        clicks_delta,
        impressions_delta: p.impressions - prev.impressions,
        position_delta,
        ctr_delta: p.ctr - prev.ctr,
        status,
      });
    } else {
      result.push({
        ...p,
        prev_clicks: 0,
        prev_impressions: 0,
        prev_ctr: 0,
        prev_position: 0,
        clicks_delta: p.clicks,
        impressions_delta: p.impressions,
        position_delta: 0,
        ctr_delta: 0,
        status: 'new',
      });
    }
  }

  return result;
}

// Find opportunity keywords: position 4-20, impressions > threshold
export function findOpportunities(queries: ComparedQuery[], impressionThreshold = 50): ComparedQuery[] {
  return queries
    .filter((q) => q.position >= 4 && q.position <= 20 && q.impressions >= impressionThreshold)
    .sort((a, b) => a.position - b.position);
}

// Find keywords about to lose page 1 (position 8-12)
export function findAtRisk(queries: ComparedQuery[]): ComparedQuery[] {
  return queries
    .filter((q) => q.position >= 8 && q.position <= 12 && q.position_delta > 0)
    .sort((a, b) => b.position_delta - a.position_delta);
}

// Generate SEO expert insights from comparison data
export function generateInsights(
  queries: ComparedQuery[],
  pages: ComparedPage[],
  snapshot: { clicks: number; impressions: number; ctr: number; position: number },
  prevSnapshot?: { clicks: number; impressions: number; ctr: number; position: number } | null,
): string[] {
  const insights: string[] = [];

  // Overall trend
  if (prevSnapshot) {
    const clicksChange = snapshot.clicks - prevSnapshot.clicks;
    const clicksPct = prevSnapshot.clicks > 0 ? ((clicksChange / prevSnapshot.clicks) * 100).toFixed(1) : '0';
    if (clicksChange > 0) {
      insights.push(`Traffic tăng ${clicksPct}% (+${clicksChange} clicks). Xu hướng tích cực.`);
    } else if (clicksChange < 0) {
      insights.push(`Traffic giảm ${Math.abs(Number(clicksPct))}% (${clicksChange} clicks). Cần phân tích nguyên nhân.`);
    } else {
      insights.push('Traffic ổn định so với kỳ trước.');
    }

    const posChange = snapshot.position - prevSnapshot.position;
    if (posChange < -0.5) {
      insights.push(`Vị trí TB cải thiện ${Math.abs(posChange).toFixed(1)} bậc (${prevSnapshot.position.toFixed(1)} → ${snapshot.position.toFixed(1)}).`);
    } else if (posChange > 0.5) {
      insights.push(`Vị trí TB giảm ${posChange.toFixed(1)} bậc (${prevSnapshot.position.toFixed(1)} → ${snapshot.position.toFixed(1)}). Cần kiểm tra content + backlinks.`);
    }
  }

  // Winners & Losers
  const winners = queries.filter((q) => q.status === 'winner');
  const losers = queries.filter((q) => q.status === 'loser');
  const newQ = queries.filter((q) => q.status === 'new');

  if (winners.length > 0) {
    const topWinner = winners.sort((a, b) => b.clicks_delta - a.clicks_delta)[0];
    insights.push(`${winners.length} từ khóa cải thiện. Top: "${topWinner.query}" (+${topWinner.clicks_delta} clicks).`);
  }
  if (losers.length > 0) {
    const topLoser = losers.sort((a, b) => a.clicks_delta - b.clicks_delta)[0];
    insights.push(`${losers.length} từ khóa giảm. Đáng chú ý: "${topLoser.query}" (${topLoser.clicks_delta} clicks).`);
  }
  if (newQ.length > 0) {
    insights.push(`${newQ.length} từ khóa mới xuất hiện trong kỳ này.`);
  }

  // Opportunities
  const opps = findOpportunities(queries);
  if (opps.length > 0) {
    const topOpp = opps[0];
    insights.push(`${opps.length} cơ hội tối ưu: "${topOpp.query}" ở vị trí ${topOpp.position.toFixed(1)} với ${topOpp.impressions} impressions — cải thiện content để lên top 3.`);
  }

  // At risk
  const atRisk = findAtRisk(queries);
  if (atRisk.length > 0) {
    insights.push(`${atRisk.length} từ khóa có nguy cơ rớt khỏi trang 1. Ưu tiên giữ vị trí.`);
  }

  // Pages analysis
  const pageWinners = pages.filter((p) => p.status === 'winner');
  const pageLosers = pages.filter((p) => p.status === 'loser');
  if (pageWinners.length > 0) {
    insights.push(`${pageWinners.length} trang tăng traffic. Phân tích pattern để nhân rộng.`);
  }
  if (pageLosers.length > 0) {
    insights.push(`${pageLosers.length} trang giảm traffic. Kiểm tra nội dung + technical SEO.`);
  }

  // CTR analysis
  if (snapshot.ctr < 0.02) {
    insights.push('CTR dưới 2% — cần cải thiện title + meta description để tăng click-through.');
  }

  return insights;
}
