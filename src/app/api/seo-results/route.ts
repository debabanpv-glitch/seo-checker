import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Lấy kết quả SEO đã lưu
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const url = searchParams.get('url');
    const urlsParam = searchParams.get('urls'); // JSON array of URLs
    const minimal = searchParams.get('minimal') === 'true'; // Only fetch essential fields

    // Select only essential fields for listing if minimal mode
    const selectFields = minimal
      ? 'id,url,score,max_score,content_score,content_max,images_score,images_max,technical_score,technical_max,checked_at'
      : '*';

    let query = supabase
      .from('seo_results')
      .select(selectFields)
      .order('checked_at', { ascending: false });

    if (taskId) {
      query = query.eq('task_id', taskId);
    }

    if (url) {
      query = query.eq('url', url);
    }

    // Filter by multiple URLs (optimized for SEO audit page)
    if (urlsParam) {
      try {
        const urls = JSON.parse(urlsParam);
        if (Array.isArray(urls) && urls.length > 0) {
          query = query.in('url', urls);
        }
      } catch {
        // Invalid JSON, ignore
      }
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: data });
  } catch (error) {
    console.error('Error fetching SEO results:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Lưu kết quả SEO check
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, result } = body;

    if (!url || !result) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const seoData = {
      url,
      score: result.score || 0,
      max_score: result.maxScore || 100,
      content_score: result.categories?.content?.score || 0,
      content_max: result.categories?.content?.maxScore || 0,
      images_score: result.categories?.images?.score || 0,
      images_max: result.categories?.images?.maxScore || 0,
      technical_score: result.categories?.technical?.score || 0,
      technical_max: result.categories?.technical?.maxScore || 0,
      details: result.details || [],
      links: result.links || { internal: [], external: [] },
      keywords: result.keywords || { primary: '', sub: [] },
      checked_at: new Date().toISOString(),
    };

    // Upsert by URL: Update nếu đã có, insert nếu chưa có
    // This ensures SEO results persist across syncs (task_id changes, but URL stays the same)
    const { data: existing } = await supabase
      .from('seo_results')
      .select('id')
      .eq('url', url)
      .single();

    let data, error;

    if (existing) {
      // Update existing record by URL
      const updateResult = await supabase
        .from('seo_results')
        .update(seoData)
        .eq('url', url)
        .select()
        .single();
      data = updateResult.data;
      error = updateResult.error;
    } else {
      // Insert new record
      const insertResult = await supabase
        .from('seo_results')
        .insert(seoData)
        .select()
        .single();
      data = insertResult.data;
      error = insertResult.error;
    }

    if (error) {
      console.error('Error saving SEO result:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('Error saving SEO result:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
