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

// POST - Import crawl data
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { project_id, crawl_date, source_url, data } = body;

    if (!project_id || !data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create crawl record
    const { data: crawl, error: crawlError } = await supabase
      .from('site_crawls')
      .insert({
        project_id,
        crawl_date: crawl_date || new Date().toISOString().split('T')[0],
        source_url,
        total_urls: data.length,
      })
      .select()
      .single();

    if (crawlError) {
      return NextResponse.json({ error: crawlError.message }, { status: 500 });
    }

    // Map and insert pages
    const pages = data.map((row: Record<string, string | number>) => mapCrawlRow(row, crawl.id));

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
  // Get all pages
  const { data: pages } = await supabase
    .from('crawl_pages')
    .select('*')
    .eq('crawl_id', crawlId);

  if (!pages || pages.length === 0) return;

  // Get issue definitions
  const { data: definitions } = await supabase
    .from('crawl_issue_definitions')
    .select('*')
    .eq('is_active', true);

  if (!definitions) return;

  let totalScore = 100;
  let criticalCount = 0;
  let warningCount = 0;
  let opportunityCount = 0;

  // Status code breakdown
  let status2xx = 0, status3xx = 0, status4xx = 0, status5xx = 0;
  let indexableCount = 0, nonIndexableCount = 0;

  // Analyze each page
  for (const page of pages) {
    const issues: Array<{ id: string; severity: string; name: string; suggestion: string }> = [];
    let hasCritical = false;
    let hasWarning = false;

    // Check each issue definition
    for (const def of definitions) {
      const fieldValue = page[def.check_field];
      let isIssue = false;

      switch (def.check_type) {
        case 'empty':
          isIssue = !fieldValue || fieldValue === '' || fieldValue === null;
          break;
        case 'not_empty':
          isIssue = fieldValue && fieldValue !== '' && fieldValue !== null;
          break;
        case 'equals':
          isIssue = String(fieldValue) === def.check_value;
          break;
        case 'greater_than':
          isIssue = fieldValue !== null && Number(fieldValue) > Number(def.check_value);
          break;
        case 'less_than':
          isIssue = fieldValue !== null && Number(fieldValue) < Number(def.check_value);
          break;
        case 'contains':
          isIssue = fieldValue && String(fieldValue).toLowerCase().includes(def.check_value.toLowerCase());
          break;
      }

      if (isIssue) {
        issues.push({
          id: def.id,
          severity: def.severity,
          name: def.name,
          suggestion: def.suggestion,
        });

        totalScore -= def.weight;

        if (def.severity === 'critical') {
          hasCritical = true;
          criticalCount++;
        } else if (def.severity === 'warning') {
          hasWarning = true;
          warningCount++;
        } else {
          opportunityCount++;
        }
      }
    }

    // Count status codes
    const statusCode = page.status_code || 0;
    if (statusCode >= 200 && statusCode < 300) status2xx++;
    else if (statusCode >= 300 && statusCode < 400) status3xx++;
    else if (statusCode >= 400 && statusCode < 500) status4xx++;
    else if (statusCode >= 500) status5xx++;

    // Count indexability
    if (page.indexability === 'Indexable') indexableCount++;
    else nonIndexableCount++;

    // Update page with issues
    await supabase
      .from('crawl_pages')
      .update({
        has_critical_issue: hasCritical,
        has_warning: hasWarning,
        issues: issues,
      })
      .eq('id', page.id);
  }

  // Calculate final health score (minimum 0)
  const healthScore = Math.max(0, Math.min(100, Math.round(totalScore / pages.length * 10)));

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
      health_score: healthScore,
      critical_issues: criticalCount,
      warnings: warningCount,
      opportunities: opportunityCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', crawlId);
}
