import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST: Fetch SEO results for multiple URLs (optimized batch query)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls, minimal = false } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Select only essential fields for listing if minimal mode
    const selectFields = minimal
      ? 'id,url,score,max_score,content_score,content_max,images_score,images_max,technical_score,technical_max,checked_at'
      : '*';

    const { data, error } = await supabase
      .from('seo_results')
      .select(selectFields)
      .in('url', urls);

    if (error) {
      console.error('Batch SEO results error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: data || [] });
  } catch (error) {
    console.error('Batch SEO results error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
