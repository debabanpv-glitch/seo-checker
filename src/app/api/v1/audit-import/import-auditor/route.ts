import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { createAudit } from '@/lib/services';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema/projects';
import { or, like } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const AUDITOR_BASE = '/Users/puchinpham/seo-master-auditor/output';

// ---------------------------------------------------------------------------
// CSV parser (reused logic from import route)
// ---------------------------------------------------------------------------

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const headers = splitCSVLine(headerLine);
  return lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

function readCSVFile(folderPath: string, filename: string): Record<string, string>[] {
  const fp = path.join(folderPath, filename);
  if (!fs.existsSync(fp)) return [];
  return parseCSV(fs.readFileSync(fp, 'utf-8'));
}

function num(v: string | undefined): number {
  return parseInt(v || '0', 10) || 0;
}

function float(v: string | undefined): number {
  return parseFloat(v || '0') || 0;
}

// ---------------------------------------------------------------------------
// GET: List available auditor folders
// ---------------------------------------------------------------------------

export function GET() {
  try {
    if (!fs.existsSync(AUDITOR_BASE)) {
      return NextResponse.json({ folders: [], error: `Path not found: ${AUDITOR_BASE}` });
    }
    const folders = fs.readdirSync(AUDITOR_BASE, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => {
        const fp = path.join(AUDITOR_BASE, e.name);
        const files = fs.readdirSync(fp).filter(f => f.endsWith('.csv') || f.endsWith('.json'));
        return { folder: e.name, fileCount: files.length, files };
      });
    return NextResponse.json({ folders, basePath: AUDITOR_BASE });
  } catch (error) {
    return handleApiError(error);
  }
}

// ---------------------------------------------------------------------------
// POST: Import auditor data for a project
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { folder, project_id } = body as { folder: string; project_id?: string };

    if (!folder) {
      return NextResponse.json({ error: 'folder is required' }, { status: 400 });
    }

    const folderPath = path.join(AUDITOR_BASE, folder);
    if (!fs.existsSync(folderPath)) {
      return NextResponse.json({ error: `Folder not found: ${folderPath}` }, { status: 404 });
    }

    // --- Find or resolve project ---
    let resolvedProjectId = project_id || null;
    if (!resolvedProjectId) {
      // Try to match by folder name → project domain/slug
      const domainHint = folder.replace(/_/g, '.');  // samcotech_com_vn → samcotech.com.vn
      const project = db.select().from(projects)
        .where(or(
          like(projects.slug, `%${folder.split('_')[0]}%`),
          like(projects.domain, `%${domainHint}%`),
          like(projects.website, `%${domainHint}%`),
        ))
        .get();
      if (project) resolvedProjectId = project.id;
    }

    // --- Parse all CSVs ---
    const allPages = readCSVFile(folderPath, 'all_pages_audit.csv');
    const brokenLinks = readCSVFile(folderPath, 'broken_links.csv');
    const duplicateContent = readCSVFile(folderPath, 'duplicate_content.csv');
    const eeatAudit = readCSVFile(folderPath, 'eeat_audit.csv');
    const missingSeo = readCSVFile(folderPath, 'missing_seo.csv');
    const redirectChains = readCSVFile(folderPath, 'redirect_chains.csv');
    const thinContent = readCSVFile(folderPath, 'thin_content.csv');
    const aiReadiness = readCSVFile(folderPath, 'ai_search_readiness.csv');

    if (allPages.length === 0) {
      return NextResponse.json({ error: 'all_pages_audit.csv is empty or missing' }, { status: 400 });
    }

    // --- all_pages_audit.csv analysis ---
    const totalUrls = allPages.length;
    const statusCodes: Record<string, number> = {};
    let indexableCount = 0;
    let totalWordCount = 0;
    let totalResponseTime = 0;
    let totalSeoScore = 0;
    let totalInternalLinks = 0;
    let totalExternalLinks = 0;
    let totalImages = 0;
    let totalImgsMissingAlt = 0;
    let hasSchemaCount = 0;
    let hasViewportCount = 0;
    let hasFaqSchemaCount = 0;
    let hasBreadcrumbCount = 0;
    let hasTocCount = 0;
    let hasFeaturedImageCount = 0;
    let titleMissing = 0, titleTooLong = 0, titleTooShort = 0;
    let metaMissing = 0, metaTooLong = 0, metaTooShort = 0;
    let h1Missing = 0, h1Multiple = 0;

    // Score distribution
    const scoreDistribution = { good: 0, average: 0, poor: 0 };

    // Issues aggregation
    const issueMap: Record<string, number> = {};

    for (const row of allPages) {
      // Status codes
      const code = row['Status'] || 'unknown';
      statusCodes[code] = (statusCodes[code] || 0) + 1;

      // Indexable
      if (row['Indexable'] === 'True' || row['Indexable'] === 'true') indexableCount++;

      // Numeric aggregates
      totalWordCount += num(row['Word Count']);
      totalResponseTime += float(row['Response Time (ms)']);
      totalInternalLinks += num(row['Internal Links']);
      totalExternalLinks += num(row['External Links']);
      totalImages += num(row['Images']);
      totalImgsMissingAlt += num(row['Images Missing Alt']);
      const seoScore = float(row['SEO Score']);
      totalSeoScore += seoScore;

      // Score distribution
      if (seoScore >= 80) scoreDistribution.good++;
      else if (seoScore >= 60) scoreDistribution.average++;
      else scoreDistribution.poor++;

      // Schema
      if (row['Schema Types']?.trim()) hasSchemaCount++;
      if (row['Has Viewport'] === 'True' || row['Has Viewport'] === 'true') hasViewportCount++;
      if (row['Has FAQ Schema'] === 'True' || row['Has FAQ Schema'] === 'true') hasFaqSchemaCount++;
      if (row['Has Breadcrumb'] === 'True' || row['Has Breadcrumb'] === 'true') hasBreadcrumbCount++;
      if (row['Has TOC'] === 'True' || row['Has TOC'] === 'true') hasTocCount++;
      if (row['Has Featured Image'] === 'True' || row['Has Featured Image'] === 'true') hasFeaturedImageCount++;

      // Title issues
      const titleLen = num(row['Title Length']);
      if (!row['Title']?.trim()) titleMissing++;
      else if (titleLen > 60) titleTooLong++;
      else if (titleLen > 0 && titleLen < 30) titleTooShort++;

      // Meta desc issues
      const metaLen = num(row['Meta Desc Length']);
      if (!row['Meta Description']?.trim()) metaMissing++;
      else if (metaLen > 155) metaTooLong++;
      else if (metaLen > 0 && metaLen < 70) metaTooShort++;

      // H1 issues
      const h1Count = num(row['H1 Count']);
      if (h1Count === 0) h1Missing++;
      else if (h1Count > 1) h1Multiple++;

      // Issues from Issues column
      const issues = row['Issues'];
      if (issues?.trim()) {
        for (const issue of issues.split(',')) {
          const trimmed = issue.trim();
          if (trimmed) issueMap[trimmed] = (issueMap[trimmed] || 0) + 1;
        }
      }
    }

    const avgSeoScore = Math.round(totalSeoScore / totalUrls);
    const avgWordCount = Math.round(totalWordCount / totalUrls);
    const avgResponseMs = Math.round(totalResponseTime / totalUrls);
    const avgInlinks = Math.round(totalInternalLinks / totalUrls);

    // --- E-E-A-T score ---
    let eeatScore = 0;
    if (eeatAudit.length > 0) {
      let totalEeat = 0;
      let totalEeatMax = 0;
      for (const row of eeatAudit) {
        totalEeat += float(row['eeat_score']);
        totalEeatMax += float(row['eeat_max']);
      }
      eeatScore = totalEeatMax > 0 ? Math.round((totalEeat / totalEeatMax) * 100) : 0;
    }

    // --- Broken links ---
    const brokenLinksCount = brokenLinks.length;
    const brokenByStatus: Record<string, number> = {};
    for (const row of brokenLinks) {
      const st = row['status'] || 'unknown';
      brokenByStatus[st] = (brokenByStatus[st] || 0) + 1;
    }

    // --- Duplicate content ---
    const dupTitles = duplicateContent.filter(r => r['type'] === 'Duplicate Title').length;
    const dupMetas = duplicateContent.filter(r => r['type'] === 'Duplicate Meta Desc').length;
    const dupTotal = duplicateContent.length;

    // --- Missing SEO ---
    const missingByElement: Record<string, number> = {};
    for (const row of missingSeo) {
      const elements = row['missing_elements'];
      if (elements) {
        for (const el of elements.split(',')) {
          const trimmed = el.trim();
          if (trimmed) missingByElement[trimmed] = (missingByElement[trimmed] || 0) + 1;
        }
      }
    }

    // --- Redirect chains ---
    const redirectChainsCount = redirectChains.length;
    const avgChainLength = redirectChains.length > 0
      ? Math.round(redirectChains.reduce((s, r) => s + num(r['chain_length']), 0) / redirectChains.length * 10) / 10
      : 0;

    // --- AI readiness ---
    let aiReadinessScore = 0;
    if (aiReadiness.length > 0) {
      const totalSignals = aiReadiness.reduce((s, r) => s + num(r['signal_count']), 0);
      // Max signals per page assumed ~10, normalize to 0-100
      aiReadinessScore = Math.round((totalSignals / (aiReadiness.length * 10)) * 100);
    }

    // --- Thin content ---
    const thinContentCount = thinContent.length;

    // --- Compute category scores (0-100) ---
    const contentScore = Math.max(0, Math.min(100, Math.round(
      100
      - (titleMissing / totalUrls) * 20          // missing titles penalty
      - (metaMissing / totalUrls) * 15            // missing meta penalty
      - (dupTotal / totalUrls) * 15               // duplicate content penalty
      - (thinContentCount / totalUrls) * 15       // thin content penalty
      - Math.max(0, (300 - avgWordCount) / 300) * 10 // low word count penalty
    )));

    const technicalScore = Math.max(0, Math.min(100, Math.round(
      100
      - ((statusCodes['404'] || 0) / totalUrls) * 25
      - ((statusCodes['500'] || 0) / totalUrls) * 25
      - (redirectChainsCount / totalUrls) * 15
      - Math.max(0, (avgResponseMs - 2000) / 2000) * 20 // slow response penalty
      - ((totalUrls - hasViewportCount) / totalUrls) * 5
    )));

    const imagesScore = totalImages > 0
      ? Math.round(((totalImages - totalImgsMissingAlt) / totalImages) * 100)
      : 100;

    const linksScore = Math.max(0, Math.min(100, Math.round(
      100
      - (brokenLinksCount / Math.max(totalUrls, 1)) * 30
      - Math.max(0, (3 - avgInlinks) / 3) * 20  // low avg inlinks penalty
    )));

    // --- Top issues (combine issueMap + missing_seo) ---
    for (const [el, count] of Object.entries(missingByElement)) {
      issueMap[el] = (issueMap[el] || 0) + count;
    }
    if (brokenLinksCount > 0) issueMap['Broken Links'] = brokenLinksCount;
    if (redirectChainsCount > 0) issueMap['Redirect Chains'] = redirectChainsCount;

    const topIssues = Object.entries(issueMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([type, count]) => ({
        type,
        count,
        severity: count > totalUrls * 0.5 ? 'critical' : count > totalUrls * 0.2 ? 'warning' : 'info',
      }));

    // --- Build comprehensive summary ---
    const summary = {
      // Core metrics
      total_urls: totalUrls,
      seo_score: avgSeoScore,
      status_codes: statusCodes,
      indexable: indexableCount,
      status_200: statusCodes['200'] || 0,
      status_3xx: (statusCodes['301'] || 0) + (statusCodes['302'] || 0),
      status_4xx: statusCodes['404'] || 0,
      errors: (statusCodes['404'] || 0) + (statusCodes['500'] || 0),
      warnings: titleTooLong + metaTooLong + h1Multiple,

      // Category scores
      content_score: contentScore,
      technical_score: technicalScore,
      images_score: imagesScore,
      links_score: linksScore,
      eeat_score: eeatScore,
      ai_readiness_score: aiReadinessScore,

      // Content metrics
      avg_word_count: avgWordCount,
      thin_content: thinContentCount,
      duplicate_content: dupTotal,
      duplicate_titles: dupTitles,
      duplicate_metas: dupMetas,
      title_issues: { total: totalUrls, missing: titleMissing, tooLong: titleTooLong, tooShort: titleTooShort },
      meta_issues: { total: totalUrls, missing: metaMissing, tooLong: metaTooLong, tooShort: metaTooShort },
      h1_issues: { total: totalUrls, missing: h1Missing, multiple: h1Multiple },

      // Technical metrics
      avg_response_ms: avgResponseMs,
      redirect_chains: redirectChainsCount,
      avg_chain_length: avgChainLength,
      schema_coverage: Math.round((hasSchemaCount / totalUrls) * 100),
      has_viewport: hasViewportCount,
      has_faq_schema: hasFaqSchemaCount,
      has_breadcrumb: hasBreadcrumbCount,
      has_toc: hasTocCount,

      // Image metrics
      total_images: totalImages,
      images_missing_alt: totalImgsMissingAlt,

      // Link metrics
      internal_links: totalInternalLinks,
      avg_inlinks: avgInlinks,
      external_links: totalExternalLinks,
      broken_links: brokenLinksCount,
      broken_by_status: brokenByStatus,
      orphan_pages: 0, // computed from crawl_data if needed

      // Missing SEO
      missing_seo: missingByElement,

      // Score distribution
      score_distribution: scoreDistribution,

      // Top issues
      top_issues: topIssues,

      // Feature coverage
      has_featured_image: hasFeaturedImageCount,
    };

    // --- Save audit ---
    const today = new Date().toISOString().split('T')[0];
    const audit = createAudit({
      project_id: resolvedProjectId,
      audit_type: 'seo_master_auditor',
      audit_date: today,
      summary,
      details: allPages.slice(0, 500), // first 500 pages for detail view
      raw_file: folderPath,
      source: 'auditor_import',
    });

    return NextResponse.json({
      audit: {
        id: audit.id,
        project_id: audit.project_id,
        audit_date: audit.audit_date,
        seo_score: avgSeoScore,
        total_urls: totalUrls,
        category_scores: {
          content: contentScore,
          technical: technicalScore,
          images: imagesScore,
          links: linksScore,
          eeat: eeatScore,
          ai_readiness: aiReadinessScore,
        },
      },
      imported: {
        all_pages: allPages.length,
        broken_links: brokenLinksCount,
        duplicate_content: dupTotal,
        eeat: eeatAudit.length,
        missing_seo: missingSeo.length,
        redirect_chains: redirectChainsCount,
        thin_content: thinContentCount,
        ai_readiness: aiReadiness.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
