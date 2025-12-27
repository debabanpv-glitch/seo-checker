import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Fetch detailed keyword rankings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const view = searchParams.get('view') || 'keywords'; // 'keywords' or 'urls'

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Get latest date for this project
    const { data: latestData } = await supabase
      .from('keyword_rankings')
      .select('date')
      .eq('project_id', projectId)
      .order('date', { ascending: false })
      .limit(1);

    if (!latestData || latestData.length === 0) {
      return NextResponse.json({ keywords: [], urls: [], latestDate: null });
    }

    const latestDate = latestData[0].date;

    // Get all rankings for latest date
    const { data: rankings, error } = await supabase
      .from('keyword_rankings')
      .select('keyword, url, position')
      .eq('project_id', projectId)
      .eq('date', latestDate)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching rankings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get previous date data for comparison
    const { data: prevDateData } = await supabase
      .from('keyword_rankings')
      .select('date')
      .eq('project_id', projectId)
      .lt('date', latestDate)
      .order('date', { ascending: false })
      .limit(1);

    let prevRankings: { keyword: string; position: number }[] = [];
    if (prevDateData && prevDateData.length > 0) {
      const { data: prev } = await supabase
        .from('keyword_rankings')
        .select('keyword, position')
        .eq('project_id', projectId)
        .eq('date', prevDateData[0].date);
      prevRankings = prev || [];
    }

    // Create lookup map for previous positions
    const prevPositionMap = new Map<string, number>();
    prevRankings.forEach((r) => {
      prevPositionMap.set(r.keyword, r.position);
    });

    if (view === 'urls') {
      // Group by URL
      const urlMap = new Map<string, { url: string; keywords: { keyword: string; position: number; change: number }[] }>();

      (rankings || []).forEach((r) => {
        const url = r.url || 'No URL';
        if (!urlMap.has(url)) {
          urlMap.set(url, { url, keywords: [] });
        }
        const prevPos = prevPositionMap.get(r.keyword);
        const change = prevPos ? prevPos - r.position : 0; // Positive = improved
        urlMap.get(url)!.keywords.push({
          keyword: r.keyword,
          position: r.position,
          change,
        });
      });

      // Sort keywords within each URL by position
      urlMap.forEach((urlData) => {
        urlData.keywords.sort((a, b) => a.position - b.position);
      });

      // Convert to array and sort by best position
      const urls = Array.from(urlMap.values()).sort((a, b) => {
        const bestA = Math.min(...a.keywords.map((k) => k.position));
        const bestB = Math.min(...b.keywords.map((k) => k.position));
        return bestA - bestB;
      });

      return NextResponse.json({ urls, latestDate });
    }

    // Default: keywords view
    const keywords = (rankings || []).map((r) => {
      const prevPos = prevPositionMap.get(r.keyword);
      const change = prevPos ? prevPos - r.position : 0;
      return {
        keyword: r.keyword,
        url: r.url || '',
        position: r.position,
        change,
      };
    });

    return NextResponse.json({ keywords, latestDate });
  } catch (error) {
    console.error('Ranking details API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
