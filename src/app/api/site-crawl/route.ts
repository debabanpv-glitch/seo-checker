import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

      // Get pages for this crawl
      const { data: pages, error: pagesError } = await supabase
        .from('crawl_pages')
        .select('*')
        .eq('crawl_id', crawlId)
        .order('has_critical_issue', { ascending: false })
        .order('has_warning', { ascending: false });

      if (pagesError) {
        return NextResponse.json({ error: pagesError.message }, { status: 500 });
      }

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

    if (!project_id) {
      return NextResponse.json({ error: 'Missing project_id' }, { status: 400 });
    }

    let crawlData: Record<string, string | number>[] = [];

    // If sheet_url is provided, fetch data from Google Sheets
    if (sheet_url) {
      const sheetResult = await fetchGoogleSheetData(sheet_url);
      if (sheetResult.error) {
        return NextResponse.json({ error: sheetResult.error }, { status: 400 });
      }
      crawlData = sheetResult.data || [];
    } else if (data && Array.isArray(data)) {
      crawlData = data;
    } else {
      return NextResponse.json({ error: 'Missing sheet_url or data' }, { status: 400 });
    }

    if (crawlData.length === 0) {
      return NextResponse.json({ error: 'No data found in sheet' }, { status: 400 });
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
      return NextResponse.json({ error: crawlError.message }, { status: 500 });
    }

    // Map and insert pages
    const pages = crawlData.map((row: Record<string, string | number>) => mapCrawlRow(row, crawl.id));

    // Insert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('crawl_pages')
        .insert(batch);

      if (insertError) {
        console.error('Insert error:', insertError);
        // Continue with other batches
      }
    }

    // Analyze and calculate scores
    await analyzeAndScoreCrawl(supabase, crawl.id);

    // Get updated crawl
    const { data: updatedCrawl } = await supabase
      .from('site_crawls')
      .select('*')
      .eq('id', crawl.id)
      .single();

    return NextResponse.json({ crawl: updatedCrawl, imported: pages.length });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
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

// Analyze crawl and calculate scores
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function analyzeAndScoreCrawl(supabase: any, crawlId: string) {
  // Get all pages - fetch in batches to handle very large sites
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPages: any[] = [];
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: batch } = await supabase
      .from('crawl_pages')
      .select('*')
      .eq('crawl_id', crawlId)
      .range(offset, offset + batchSize - 1);

    if (batch && batch.length > 0) {
      allPages.push(...batch);
      offset += batchSize;
      hasMore = batch.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  const pages = allPages;
  if (pages.length === 0) return;

  // Status code breakdown
  let status2xx = 0, status3xx = 0, status4xx = 0, status5xx = 0;
  let indexableCount = 0, nonIndexableCount = 0;

  // Issue counts
  let criticalCount = 0;
  let warningCount = 0;
  let opportunityCount = 0;

  // Pages with issues
  let pagesWithCritical = 0;
  let pagesWithWarning = 0;

  // Analyze each page with built-in rules
  for (const page of pages) {
    const issues: Array<{ severity: string; name: string; suggestion: string }> = [];
    let hasCritical = false;
    let hasWarning = false;

    // Count status codes
    const statusCode = page.status_code || 0;
    if (statusCode >= 200 && statusCode < 300) status2xx++;
    else if (statusCode >= 300 && statusCode < 400) status3xx++;
    else if (statusCode >= 400 && statusCode < 500) status4xx++;
    else if (statusCode >= 500) status5xx++;

    // Count indexability
    if (page.indexability === 'Indexable') indexableCount++;
    else nonIndexableCount++;

    // === CRITICAL ISSUES ===
    // 4xx/5xx errors
    if (statusCode >= 400) {
      issues.push({ severity: 'critical', name: `Lỗi HTTP ${statusCode}`, suggestion: 'Kiểm tra và sửa lỗi server hoặc URL' });
      hasCritical = true;
      criticalCount++;
    }

    // Non-indexable pages (except intentional ones)
    if (page.indexability === 'Non-Indexable' && !page.meta_robots?.includes('noindex')) {
      issues.push({ severity: 'critical', name: 'Không thể index', suggestion: 'Kiểm tra robots.txt, meta robots, canonical' });
      hasCritical = true;
      criticalCount++;
    }

    // === WARNINGS ===
    // Missing title
    if (!page.title || page.title.trim() === '') {
      issues.push({ severity: 'warning', name: 'Thiếu Title', suggestion: 'Thêm title tag mô tả nội dung trang' });
      hasWarning = true;
      warningCount++;
    }
    // Title too long (> 60 chars)
    else if (page.title_length && page.title_length > 60) {
      issues.push({ severity: 'warning', name: 'Title quá dài', suggestion: `Title ${page.title_length} ký tự, nên dưới 60` });
      hasWarning = true;
      warningCount++;
    }
    // Title too short (< 30 chars)
    else if (page.title_length && page.title_length < 30) {
      issues.push({ severity: 'warning', name: 'Title quá ngắn', suggestion: `Title ${page.title_length} ký tự, nên 30-60` });
      hasWarning = true;
      warningCount++;
    }

    // Missing meta description
    if (!page.meta_description || page.meta_description.trim() === '') {
      issues.push({ severity: 'warning', name: 'Thiếu Meta Description', suggestion: 'Thêm meta description hấp dẫn' });
      hasWarning = true;
      warningCount++;
    }
    // Meta description too long (> 160)
    else if (page.meta_description_length && page.meta_description_length > 160) {
      issues.push({ severity: 'warning', name: 'Meta Description quá dài', suggestion: `${page.meta_description_length} ký tự, nên dưới 160` });
      hasWarning = true;
      warningCount++;
    }

    // Missing H1
    if (!page.h1_1 || page.h1_1.trim() === '') {
      issues.push({ severity: 'warning', name: 'Thiếu H1', suggestion: 'Thêm thẻ H1 chính cho trang' });
      hasWarning = true;
      warningCount++;
    }
    // Multiple H1s
    else if (page.h1_2 && page.h1_2.trim() !== '') {
      issues.push({ severity: 'warning', name: 'Nhiều H1', suggestion: 'Chỉ nên có 1 thẻ H1 mỗi trang' });
      hasWarning = true;
      warningCount++;
    }

    // Missing canonical
    if (!page.canonical_link || page.canonical_link.trim() === '') {
      issues.push({ severity: 'warning', name: 'Thiếu Canonical', suggestion: 'Thêm canonical tag cho trang' });
      hasWarning = true;
      warningCount++;
    }

    // Low word count (< 300)
    if (page.word_count !== null && page.word_count < 300 && page.content_type?.includes('text/html')) {
      issues.push({ severity: 'warning', name: 'Nội dung mỏng', suggestion: `Chỉ ${page.word_count} từ, nên trên 300` });
      hasWarning = true;
      warningCount++;
    }

    // === OPPORTUNITIES ===
    // Slow response time (> 1s)
    if (page.response_time && page.response_time > 1000) {
      issues.push({ severity: 'opportunity', name: 'Tải chậm', suggestion: `${(page.response_time/1000).toFixed(1)}s, nên dưới 1s` });
      opportunityCount++;
    }

    // Deep crawl depth (> 3)
    if (page.crawl_depth && page.crawl_depth > 3) {
      issues.push({ severity: 'opportunity', name: 'URL quá sâu', suggestion: `Độ sâu ${page.crawl_depth}, nên dưới 4` });
      opportunityCount++;
    }

    // Track pages with issues
    if (hasCritical) pagesWithCritical++;
    if (hasWarning) pagesWithWarning++;

    // Update page with issues (batch later for performance)
    await supabase
      .from('crawl_pages')
      .update({
        has_critical_issue: hasCritical,
        has_warning: hasWarning,
        issues: issues,
      })
      .eq('id', page.id);
  }

  // Calculate health score based on percentage of clean pages
  // 100 = all pages clean, 0 = all pages have critical issues
  const cleanPages = pages.length - pagesWithCritical - pagesWithWarning;
  const healthScore = Math.round((cleanPages / pages.length) * 100);

  // Update crawl summary
  await supabase
    .from('site_crawls')
    .update({
      total_urls: pages.length,
      indexable_urls: indexableCount,
      non_indexable_urls: nonIndexableCount,
      status_2xx: status2xx,
      status_3xx: status3xx,
      status_4xx: status4xx,
      status_5xx: status5xx,
      health_score: Math.max(0, Math.min(100, healthScore)),
      critical_issues: criticalCount,
      warnings: warningCount,
      opportunities: opportunityCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', crawlId);
}
