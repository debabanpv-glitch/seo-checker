import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface DailySnapshot {
  date: string;
  top3: number;
  top10: number;
  top20: number;
  top30: number;
  total: number;
  uniqueUrls: number;
}

interface GrowthData {
  snapshots: DailySnapshot[];
  summary: {
    firstDate: string;
    lastDate: string;
    top3Change: number;
    top10Change: number;
    top20Change: number;
    top30Change: number;
    totalChange: number;
    top3First: number;
    top3Last: number;
    top10First: number;
    top10Last: number;
    top20First: number;
    top20Last: number;
    top30First: number;
    top30Last: number;
  } | null;
}

// GET: Fetch ranking growth data by date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const days = parseInt(searchParams.get('days') || '30');

    // Build query - include url for unique URL counting
    let query = supabase
      .from('keyword_rankings')
      .select('keyword, position, date, url')
      .order('date', { ascending: true });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    // Get data from last N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    query = query.gte('date', startDate.toISOString().split('T')[0]);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching ranking growth:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by date and calculate stats
    const dateMap = new Map<string, { keywords: Map<string, number>; urls: Set<string> }>();

    (data || []).forEach((record) => {
      const date = record.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { keywords: new Map(), urls: new Set() });
      }
      const dateData = dateMap.get(date)!;

      // Store best position for each keyword on this date
      const existing = dateData.keywords.get(record.keyword);
      if (!existing || record.position < existing) {
        dateData.keywords.set(record.keyword, record.position);
      }

      // Track unique URLs
      if (record.url && record.url.trim()) {
        dateData.urls.add(record.url.trim());
      }
    });

    // Convert to snapshots
    const snapshots: DailySnapshot[] = [];
    const sortedDates = Array.from(dateMap.keys()).sort();

    sortedDates.forEach((date) => {
      const dateData = dateMap.get(date)!;
      let top3 = 0;
      let top10 = 0;
      let top20 = 0;
      let top30 = 0;

      dateData.keywords.forEach((position) => {
        if (position <= 3) top3++;
        if (position <= 10) top10++;
        if (position <= 20) top20++;
        if (position <= 30) top30++;
      });

      snapshots.push({
        date,
        top3,
        top10,
        top20,
        top30,
        total: dateData.keywords.size,
        uniqueUrls: dateData.urls.size,
      });
    });

    // Calculate summary
    let summary: GrowthData['summary'] = null;

    if (snapshots.length >= 2) {
      const first = snapshots[0];
      const last = snapshots[snapshots.length - 1];

      summary = {
        firstDate: first.date,
        lastDate: last.date,
        top3Change: last.top3 - first.top3,
        top10Change: last.top10 - first.top10,
        top20Change: last.top20 - first.top20,
        top30Change: last.top30 - first.top30,
        totalChange: last.total - first.total,
        top3First: first.top3,
        top3Last: last.top3,
        top10First: first.top10,
        top10Last: last.top10,
        top20First: first.top20,
        top20Last: last.top20,
        top30First: first.top30,
        top30Last: last.top30,
      };
    }

    const result: GrowthData = { snapshots, summary };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Ranking growth API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
