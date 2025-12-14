import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(supabaseUrl, supabaseKey);
}

// POST - Analyze crawl data (separate from import for better performance)
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { crawl_id } = body;

    if (!crawl_id) {
      return NextResponse.json({ error: 'Missing crawl_id' }, { status: 400 });
    }

    console.log('[ANALYZE] Starting analysis for crawl:', crawl_id);

    // Get all pages - fetch in batches
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allPages: any[] = [];
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: batch, error: fetchError } = await supabase
        .from('crawl_pages')
        .select('*')
        .eq('crawl_id', crawl_id)
        .range(offset, offset + batchSize - 1);

      if (fetchError) {
        console.error('[ANALYZE] Fetch error:', fetchError);
        hasMore = false;
      } else if (batch && batch.length > 0) {
        allPages.push(...batch);
        offset += batchSize;
        hasMore = batch.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    console.log('[ANALYZE] Total pages:', allPages.length);

    if (allPages.length === 0) {
      return NextResponse.json({ error: 'No pages found for this crawl' }, { status: 404 });
    }

    // Analyze pages
    let status2xx = 0, status3xx = 0, status4xx = 0, status5xx = 0;
    let indexableCount = 0, nonIndexableCount = 0;
    let criticalCount = 0, warningCount = 0, opportunityCount = 0;
    let pagesWithCritical = 0, pagesWithWarning = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageUpdates: Array<{ id: string; has_critical_issue: boolean; has_warning: boolean; issues: any[] }> = [];

    for (const page of allPages) {
      const issues: Array<{ severity: string; name: string; suggestion: string }> = [];
      let hasCritical = false;
      let hasWarning = false;

      // Status codes
      const statusCode = page.status_code || 0;
      if (statusCode >= 200 && statusCode < 300) status2xx++;
      else if (statusCode >= 300 && statusCode < 400) status3xx++;
      else if (statusCode >= 400 && statusCode < 500) status4xx++;
      else if (statusCode >= 500) status5xx++;

      // Indexability
      if (page.indexability === 'Indexable') indexableCount++;
      else nonIndexableCount++;

      // === CRITICAL ===
      if (statusCode >= 400) {
        issues.push({ severity: 'critical', name: `Lỗi HTTP ${statusCode}`, suggestion: 'Kiểm tra và sửa lỗi server hoặc URL' });
        hasCritical = true;
        criticalCount++;
      }

      if (page.indexability === 'Non-Indexable' && !page.meta_robots?.includes('noindex')) {
        issues.push({ severity: 'critical', name: 'Không thể index', suggestion: 'Kiểm tra robots.txt, meta robots, canonical' });
        hasCritical = true;
        criticalCount++;
      }

      // === WARNINGS ===
      if (!page.title || page.title.trim() === '') {
        issues.push({ severity: 'warning', name: 'Thiếu Title', suggestion: 'Thêm title tag mô tả nội dung trang' });
        hasWarning = true;
        warningCount++;
      } else if (page.title_length && page.title_length > 60) {
        issues.push({ severity: 'warning', name: 'Title quá dài', suggestion: `Title ${page.title_length} ký tự, nên dưới 60` });
        hasWarning = true;
        warningCount++;
      } else if (page.title_length && page.title_length < 30) {
        issues.push({ severity: 'warning', name: 'Title quá ngắn', suggestion: `Title ${page.title_length} ký tự, nên 30-60` });
        hasWarning = true;
        warningCount++;
      }

      if (!page.meta_description || page.meta_description.trim() === '') {
        issues.push({ severity: 'warning', name: 'Thiếu Meta Description', suggestion: 'Thêm meta description hấp dẫn' });
        hasWarning = true;
        warningCount++;
      } else if (page.meta_description_length && page.meta_description_length > 160) {
        issues.push({ severity: 'warning', name: 'Meta Description quá dài', suggestion: `${page.meta_description_length} ký tự, nên dưới 160` });
        hasWarning = true;
        warningCount++;
      }

      if (!page.h1_1 || page.h1_1.trim() === '') {
        issues.push({ severity: 'warning', name: 'Thiếu H1', suggestion: 'Thêm thẻ H1 chính cho trang' });
        hasWarning = true;
        warningCount++;
      } else if (page.h1_2 && page.h1_2.trim() !== '') {
        issues.push({ severity: 'warning', name: 'Nhiều H1', suggestion: 'Chỉ nên có 1 thẻ H1 mỗi trang' });
        hasWarning = true;
        warningCount++;
      }

      if (!page.canonical_link || page.canonical_link.trim() === '') {
        issues.push({ severity: 'warning', name: 'Thiếu Canonical', suggestion: 'Thêm canonical tag cho trang' });
        hasWarning = true;
        warningCount++;
      }

      if (page.word_count !== null && page.word_count < 300 && page.content_type?.includes('text/html')) {
        issues.push({ severity: 'warning', name: 'Nội dung mỏng', suggestion: `Chỉ ${page.word_count} từ, nên trên 300` });
        hasWarning = true;
        warningCount++;
      }

      // === OPPORTUNITIES ===
      if (page.response_time && page.response_time > 1000) {
        issues.push({ severity: 'opportunity', name: 'Tải chậm', suggestion: `${(page.response_time/1000).toFixed(1)}s, nên dưới 1s` });
        opportunityCount++;
      }

      if (page.crawl_depth && page.crawl_depth > 3) {
        issues.push({ severity: 'opportunity', name: 'URL quá sâu', suggestion: `Độ sâu ${page.crawl_depth}, nên dưới 4` });
        opportunityCount++;
      }

      if (hasCritical) pagesWithCritical++;
      if (hasWarning) pagesWithWarning++;

      if (issues.length > 0) {
        pageUpdates.push({
          id: page.id,
          has_critical_issue: hasCritical,
          has_warning: hasWarning,
          issues: issues,
        });
      }
    }

    // Batch update pages
    console.log('[ANALYZE] Updating', pageUpdates.length, 'pages with issues');
    const updateBatchSize = 50;
    for (let i = 0; i < pageUpdates.length; i += updateBatchSize) {
      const batch = pageUpdates.slice(i, i + updateBatchSize);
      await Promise.all(batch.map(update =>
        supabase
          .from('crawl_pages')
          .update({
            has_critical_issue: update.has_critical_issue,
            has_warning: update.has_warning,
            issues: update.issues,
          })
          .eq('id', update.id)
      ));
    }

    // Calculate health score
    const cleanPages = allPages.length - pagesWithCritical - pagesWithWarning;
    const healthScore = Math.round((cleanPages / allPages.length) * 100);

    // Update crawl summary
    const { error: updateError } = await supabase
      .from('site_crawls')
      .update({
        total_urls: allPages.length,
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
      .eq('id', crawl_id);

    if (updateError) {
      console.error('[ANALYZE] Update crawl error:', updateError);
    }

    console.log('[ANALYZE] Complete:', { healthScore, criticalCount, warningCount });

    return NextResponse.json({
      success: true,
      pagesAnalyzed: allPages.length,
      criticalCount,
      warningCount,
      opportunityCount,
      healthScore,
    });
  } catch (error) {
    console.error('[ANALYZE] Error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
