import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface ContentStats {
  total: number;
  hasRanking: number;
  noRanking: number;
  percentEffective: number;
}

interface MonthlyContent {
  month: string;
  year: number;
  monthNum: number;
  published: number;
  hasRanking: number;
  noRanking: number;
}

interface URLAnalysis {
  url: string;
  bestPosition: number;
  keywordCount: number;
  seoScore: number | null;
  seoMaxScore: number | null;
  status: 'top10' | 'top30' | 'low' | 'none';
  action: string;
  keywords: { keyword: string; position: number }[];
}

interface OpportunityKeyword {
  keyword: string;
  url: string;
  position: number;
  change: number;
}

interface DecliningKeyword {
  keyword: string;
  url: string;
  currentPosition: number;
  previousPosition: number;
  decline: number;
}

// GET: Fetch comprehensive ranking analysis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // 1. Get all published tasks for this project
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, link_publish, publish_date, month, year, parent_keyword')
      .eq('project_id', projectId)
      .eq('status_content', '4. Publish')
      .not('link_publish', 'is', null);

    const publishedUrls = new Set<string>();
    const tasksByMonth: Record<string, { published: number; urls: string[] }> = {};

    (tasks || []).forEach((task) => {
      if (task.link_publish) {
        publishedUrls.add(task.link_publish.trim());

        // Group by month-year
        const key = `${task.year}-${String(task.month).padStart(2, '0')}`;
        if (!tasksByMonth[key]) {
          tasksByMonth[key] = { published: 0, urls: [] };
        }
        tasksByMonth[key].published++;
        tasksByMonth[key].urls.push(task.link_publish.trim());
      }
    });

    // 2. Get latest ranking data
    const { data: latestDateData } = await supabase
      .from('keyword_rankings')
      .select('date')
      .eq('project_id', projectId)
      .order('date', { ascending: false })
      .limit(1);

    const latestDate = latestDateData?.[0]?.date;

    // 3. Get all rankings for latest date
    const { data: rankings } = await supabase
      .from('keyword_rankings')
      .select('keyword, url, position')
      .eq('project_id', projectId)
      .eq('date', latestDate || '');

    // 4. Get previous date for comparison (for declining keywords)
    const { data: prevDateData } = await supabase
      .from('keyword_rankings')
      .select('date')
      .eq('project_id', projectId)
      .lt('date', latestDate || '')
      .order('date', { ascending: false })
      .limit(1);

    const prevDate = prevDateData?.[0]?.date;

    const { data: prevRankings } = await supabase
      .from('keyword_rankings')
      .select('keyword, position')
      .eq('project_id', projectId)
      .eq('date', prevDate || '');

    const prevPositionMap = new Map<string, number>();
    (prevRankings || []).forEach((r) => {
      prevPositionMap.set(r.keyword, r.position);
    });

    // 5. Get SEO results for URLs
    const urlsToCheck = Array.from(publishedUrls);
    const { data: seoResults } = await supabase
      .from('seo_results')
      .select('url, score, max_score')
      .in('url', urlsToCheck.length > 0 ? urlsToCheck : ['']);

    const seoScoreMap = new Map<string, { score: number; maxScore: number }>();
    (seoResults || []).forEach((r) => {
      seoScoreMap.set(r.url, { score: r.score, maxScore: r.max_score });
    });

    // 6. Build URL -> keywords map
    const urlKeywordsMap = new Map<string, { keyword: string; position: number }[]>();
    const rankedUrls = new Set<string>();

    (rankings || []).forEach((r) => {
      if (r.url) {
        rankedUrls.add(r.url.trim());
        const url = r.url.trim();
        if (!urlKeywordsMap.has(url)) {
          urlKeywordsMap.set(url, []);
        }
        urlKeywordsMap.get(url)!.push({ keyword: r.keyword, position: r.position });
      }
    });

    // === CALCULATE RESULTS ===

    // Content Performance
    let hasRankingCount = 0;
    publishedUrls.forEach((url) => {
      if (rankedUrls.has(url)) {
        hasRankingCount++;
      }
    });

    const contentStats: ContentStats = {
      total: publishedUrls.size,
      hasRanking: hasRankingCount,
      noRanking: publishedUrls.size - hasRankingCount,
      percentEffective: publishedUrls.size > 0 ? Math.round((hasRankingCount / publishedUrls.size) * 100) : 0,
    };

    // Monthly Content
    const monthlyContent: MonthlyContent[] = Object.entries(tasksByMonth)
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        const hasRanking = data.urls.filter((url) => rankedUrls.has(url)).length;
        return {
          month: key,
          year: parseInt(year),
          monthNum: parseInt(month),
          published: data.published,
          hasRanking,
          noRanking: data.published - hasRanking,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    // URL Analysis
    const urlAnalysis: URLAnalysis[] = Array.from(publishedUrls).map((url) => {
      const keywords = urlKeywordsMap.get(url) || [];
      const bestPosition = keywords.length > 0 ? Math.min(...keywords.map((k) => k.position)) : 999;
      const seo = seoScoreMap.get(url);

      let status: URLAnalysis['status'] = 'none';
      let action = 'Chưa có dữ liệu ranking';

      if (keywords.length > 0) {
        if (bestPosition <= 10) {
          status = 'top10';
          action = 'Duy trì & mở rộng từ khóa';
        } else if (bestPosition <= 30) {
          status = 'top30';
          if (seo && seo.score < 70) {
            action = 'Cải thiện SEO onpage trước';
          } else {
            action = 'Cần thêm backlinks';
          }
        } else {
          status = 'low';
          action = 'Review lại content & SEO';
        }
      } else {
        if (seo && seo.score >= 80) {
          action = 'SEO tốt, cần backlinks & thời gian';
        } else if (seo) {
          action = 'Cải thiện SEO onpage trước';
        }
      }

      return {
        url,
        bestPosition: keywords.length > 0 ? bestPosition : -1,
        keywordCount: keywords.length,
        seoScore: seo?.score || null,
        seoMaxScore: seo?.maxScore || null,
        status,
        action,
        keywords: keywords.sort((a, b) => a.position - b.position).slice(0, 5),
      };
    });

    // Sort by best position (top performers first), then by no ranking
    urlAnalysis.sort((a, b) => {
      if (a.bestPosition === -1 && b.bestPosition === -1) return 0;
      if (a.bestPosition === -1) return 1;
      if (b.bestPosition === -1) return -1;
      return a.bestPosition - b.bestPosition;
    });

    // Opportunity Keywords (position 11-20)
    const opportunityKeywords: OpportunityKeyword[] = (rankings || [])
      .filter((r) => r.position >= 11 && r.position <= 20)
      .map((r) => ({
        keyword: r.keyword,
        url: r.url || '',
        position: r.position,
        change: prevPositionMap.has(r.keyword) ? prevPositionMap.get(r.keyword)! - r.position : 0,
      }))
      .sort((a, b) => a.position - b.position);

    // Declining Keywords (dropped 3+ positions)
    const decliningKeywords: DecliningKeyword[] = (rankings || [])
      .filter((r) => {
        const prevPos = prevPositionMap.get(r.keyword);
        return prevPos !== undefined && r.position > prevPos && r.position - prevPos >= 3;
      })
      .map((r) => ({
        keyword: r.keyword,
        url: r.url || '',
        currentPosition: r.position,
        previousPosition: prevPositionMap.get(r.keyword)!,
        decline: r.position - prevPositionMap.get(r.keyword)!,
      }))
      .sort((a, b) => b.decline - a.decline);

    return NextResponse.json({
      contentStats,
      monthlyContent,
      urlAnalysis,
      opportunityKeywords,
      decliningKeywords,
      latestDate,
    });
  } catch (error) {
    console.error('Ranking analysis API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
