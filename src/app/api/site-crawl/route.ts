import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Increase timeout to 60 seconds (requires Vercel Pro or higher)

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(supabaseUrl, supabaseKey);
}

// GET - Lấy danh sách crawls của project
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const crawlId = searchParams.get('crawl_id');

    // Get single crawl with pages
    if (crawlId) {
      const { data: crawl, error: crawlError } = await supabase
        .from('site_crawls')
        .select('*, project:projects(name)')
        .eq('id', crawlId)
        .single();

      if (crawlError) {
        return NextResponse.json({ error: crawlError.message }, { status: 500 });
      }

      // Get pages for this crawl - fetch in batches to handle large sites
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allPages: any[] = [];
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error: pagesError } = await supabase
          .from('crawl_pages')
          .select('*')
          .eq('crawl_id', crawlId)
          .order('has_critical_issue', { ascending: false })
          .order('has_warning', { ascending: false })
          .range(offset, offset + batchSize - 1);

        if (pagesError) {
          return NextResponse.json({ error: pagesError.message }, { status: 500 });
        }

        if (batch && batch.length > 0) {
          allPages.push(...batch);
          offset += batchSize;
          hasMore = batch.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      const pages = allPages;

      // Get issue definitions
      const { data: issueDefinitions } = await supabase
        .from('crawl_issue_definitions')
        .select('*')
        .eq('is_active', true);

      return NextResponse.json({ crawl, pages, issueDefinitions });
    }

    // Get list of crawls for project
    let query = supabase
      .from('site_crawls')
      .select('*, project:projects(name)')
      .order('crawl_date', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: crawls, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ crawls });
  } catch (error) {
    console.error('Site crawl API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Import crawl data from Google Sheets URL or direct data
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { project_id, crawl_date, source_url, data, sheet_url } = body;

    console.log('[CRAWL] Starting import for project:', project_id);

    if (!project_id) {
      return NextResponse.json({ error: 'Missing project_id' }, { status: 400 });
    }

    let crawlData: Record<string, string | number>[] = [];

    // If sheet_url is provided, fetch data from Google Sheets
    if (sheet_url) {
      console.log('[CRAWL] Fetching from sheet URL:', sheet_url);
      const sheetResult = await fetchGoogleSheetData(sheet_url);
      if (sheetResult.error) {
        console.error('[CRAWL] Sheet fetch error:', sheetResult.error);
        return NextResponse.json({ error: sheetResult.error }, { status: 400 });
      }
      crawlData = sheetResult.data || [];
      console.log('[CRAWL] Fetched', crawlData.length, 'rows from sheet');
    } else if (data && Array.isArray(data)) {
      crawlData = data;
    } else {
      return NextResponse.json({ error: 'Missing sheet_url or data' }, { status: 400 });
    }

    if (crawlData.length === 0) {
      return NextResponse.json({ error: 'No data found in sheet' }, { status: 400 });
    }

    // Delete existing crawls for this project (keep only latest)
    const { data: existingCrawls } = await supabase
      .from('site_crawls')
      .select('id')
      .eq('project_id', project_id);

    if (existingCrawls && existingCrawls.length > 0) {
      console.log('[CRAWL] Deleting', existingCrawls.length, 'existing crawls');
      for (const ec of existingCrawls) {
        await supabase.from('crawl_pages').delete().eq('crawl_id', ec.id);
        await supabase.from('site_crawls').delete().eq('id', ec.id);
      }
    }

    // Create crawl record
    const { data: crawl, error: crawlError } = await supabase
      .from('site_crawls')
      .insert({
        project_id,
        crawl_date: crawl_date || new Date().toISOString().split('T')[0],
        source_url: source_url || sheet_url,
        total_urls: crawlData.length,
      })
      .select()
      .single();

    if (crawlError) {
      console.error('[CRAWL] Create crawl error:', crawlError);
      return NextResponse.json({ error: crawlError.message }, { status: 500 });
    }

    console.log('[CRAWL] Created crawl record:', crawl.id);

    // Map and insert pages
    const pages = crawlData.map((row: Record<string, string | number>) => mapCrawlRow(row, crawl.id));

    // Log sample mapped data
    if (pages.length > 0) {
      console.log('[CRAWL] Sample mapped page:', JSON.stringify(pages[0], null, 2));
    }

    // Insert in batches of 500 for better performance
    const batchSize = 500;
    let insertedCount = 0;
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('crawl_pages')
        .insert(batch);

      if (insertError) {
        console.error('[CRAWL] Insert error at batch', i, ':', insertError);
      } else {
        insertedCount += batch.length;
      }
    }

    console.log('[CRAWL] Inserted', insertedCount, 'pages');

    // Return crawl ID for separate analysis call
    // Analysis is done separately via /api/site-crawl/analyze to avoid timeout
    return NextResponse.json({
      crawl: crawl,
      imported: insertedCount,
      message: 'Import complete. Call /api/site-crawl/analyze to analyze issues.'
    });
  } catch (error) {
    console.error('[CRAWL] Import error:', error);
    return NextResponse.json({ error: 'Import failed: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 });
  }
}

// DELETE - Xóa crawl
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const crawlId = searchParams.get('crawl_id');

    if (!crawlId) {
      return NextResponse.json({ error: 'Missing crawl_id' }, { status: 400 });
    }

    // Delete pages first (cascade should handle this but be explicit)
    await supabase.from('crawl_pages').delete().eq('crawl_id', crawlId);

    // Delete crawl
    const { error } = await supabase
      .from('site_crawls')
      .delete()
      .eq('id', crawlId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

// Fetch data from Google Sheets URL
async function fetchGoogleSheetData(sheetUrl: string): Promise<{ data?: Record<string, string | number>[]; error?: string }> {
  try {
    // Extract sheet ID from URL
    const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      return { error: 'Invalid Google Sheets URL' };
    }

    const sheetId = sheetIdMatch[1];

    // Extract gid (sheet tab ID) from URL if present
    const gidMatch = sheetUrl.match(/[?&#]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    // Fetch data from Google Sheets as CSV
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(csvUrl);

    if (!response.ok) {
      return { error: 'Failed to fetch sheet data. Make sure the sheet is public.' };
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return { error: 'Sheet is empty or has no data rows' };
    }

    // First row is headers
    const headers = rows[0].map((h) =>
      h.trim().replace(/^\uFEFF/, '') // Remove BOM
    );

    // Convert rows to objects with header keys
    const data: Record<string, string | number>[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || row.every((cell) => !cell.trim())) continue;

      const obj: Record<string, string | number> = {};
      for (let j = 0; j < headers.length; j++) {
        const value = row[j]?.trim() || '';
        // Try to convert to number if possible
        const num = parseFloat(value);
        obj[headers[j]] = !isNaN(num) && value !== '' ? num : value;
      }
      data.push(obj);
    }

    return { data };
  } catch (error) {
    console.error('Google Sheet fetch error:', error);
    return { error: 'Failed to fetch Google Sheet data' };
  }
}

// Parse CSV helper
function parseCSV(text: string): string[][] {
  const lines = text.split('\n');
  const result: string[][] = [];

  for (const line of lines) {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current);
    result.push(row);
  }

  return result;
}

// Map Screaming Frog CSV row to database schema
function mapCrawlRow(row: Record<string, string | number>, crawlId: string) {
  const getNum = (val: string | number | undefined) => {
    if (val === undefined || val === '') return null;
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) ? null : num;
  };

  const getStr = (val: string | number | undefined) => {
    if (val === undefined || val === '') return null;
    return String(val);
  };

  return {
    crawl_id: crawlId,
    // Core
    address: getStr(row['Address']) || getStr(row['address']) || '',
    content_type: getStr(row['Content Type']) || getStr(row['Content']) || getStr(row['content_type']),
    status_code: getNum(row['Status Code']) || getNum(row['Status']) || getNum(row['status_code']),
    status: getStr(row['Status']),
    // Indexability
    indexability: getStr(row['Indexability']) || getStr(row['indexability']),
    indexability_status: getStr(row['Indexability Status']) || getStr(row['indexability_status']),
    // Title
    title: getStr(row['Title 1']) || getStr(row['Title']) || getStr(row['title']),
    title_length: getNum(row['Title 1 Length']) || getNum(row['Title Length']) || getNum(row['title_length']),
    title_pixel_width: getNum(row['Title 1 Pixel Width']) || getNum(row['title_pixel_width']),
    // Meta Description
    meta_description: getStr(row['Meta Description 1']) || getStr(row['Meta Description']) || getStr(row['meta_description']),
    meta_description_length: getNum(row['Meta Description 1 Length']) || getNum(row['Meta Description Length']) || getNum(row['meta_description_length']),
    meta_description_pixel_width: getNum(row['Meta Description 1 Pixel Width']),
    // Meta Keywords
    meta_keywords: getStr(row['Meta Keywords 1']) || getStr(row['Meta Keywords']),
    // Headings
    h1_1: getStr(row['H1-1']) || getStr(row['H1']),
    h1_1_length: getNum(row['H1-1 Length']) || getNum(row['H1 Length']),
    h1_2: getStr(row['H1-2']),
    h1_2_length: getNum(row['H1-2 Length']),
    h2_1: getStr(row['H2-1']) || getStr(row['H2']),
    h2_1_length: getNum(row['H2-1 Length']),
    h2_2: getStr(row['H2-2']),
    h2_2_length: getNum(row['H2-2 Length']),
    // Directives
    meta_robots: getStr(row['Meta Robots 1']) || getStr(row['Meta Robots']),
    x_robots_tag: getStr(row['X-Robots-Tag 1']) || getStr(row['X-Robots-Tag']),
    canonical_link: getStr(row['Canonical Link Element 1']) || getStr(row['Canonical Link']),
    // Content
    size_bytes: getNum(row['Size (bytes)']) || getNum(row['Size']),
    word_count: getNum(row['Word Count']) || getNum(row['word_count']),
    sentence_count: getNum(row['Sentence Count']),
    avg_words_per_sentence: getNum(row['Average Words Per Sentence']) || getNum(row['Avg Words Per Sentence']),
    flesch_reading_ease: getNum(row['Flesch Reading Ease Score']) || getNum(row['Flesch Reading Ease']),
    readability: getStr(row['Readability']),
    text_ratio: getNum(row['Text Ratio']),
    // Crawl
    crawl_depth: getNum(row['Crawl Depth']),
    folder_depth: getNum(row['Folder Depth']),
    link_score: getNum(row['Link Score']),
    // Links
    inlinks: getNum(row['Inlinks']),
    unique_inlinks: getNum(row['Unique Inlinks']),
    outlinks: getNum(row['Outlinks']),
    unique_outlinks: getNum(row['Unique Outlinks']),
    external_outlinks: getNum(row['External Outlinks']),
    unique_external_outlinks: getNum(row['Unique External Outlinks']),
    // Performance
    response_time: getNum(row['Response Time']),
    // Errors
    spelling_errors: getNum(row['Spelling Errors']),
    grammar_errors: getNum(row['Grammar Errors']),
    // Redirect
    redirect_url: getStr(row['Redirect URL']),
    redirect_type: getStr(row['Redirect Type']),
    // Hash
    hash: getStr(row['Hash']),
    // Timestamps
    last_modified: row['Last Modified'] ? new Date(row['Last Modified'] as string).toISOString() : null,
    crawl_timestamp: row['Crawl Timestamp'] ? new Date(row['Crawl Timestamp'] as string).toISOString() : null,
  };
}

// Note: Analysis is now done via separate API at /api/site-crawl/analyze
