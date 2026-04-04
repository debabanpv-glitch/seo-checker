// ---------------------------------------------------------------------------
// Topic Cluster Internal Link Checker
// Crawls pages in a cluster, checks for links to/from pillar page
// Updates has_link_to_pillar, has_link_from_pillar, anchor_to_pillar, anchor_from_pillar
// ---------------------------------------------------------------------------

import { db } from '@/lib/db';
import { topicClusterPages, topicClusters } from '@/lib/db/schema/topic-clusters';
import { eq } from 'drizzle-orm';

interface LinkCheckResult {
  pageId: string;
  url: string;
  hasLinkToPillar: boolean;
  hasLinkFromPillar: boolean;
  anchorToPillar: string;
  anchorFromPillar: string;
  error?: string;
}

/** Fetch a page's HTML and extract ALL <a> hrefs (including breadcrumb, nav, sidebar) */
async function extractLinks(url: string): Promise<{ href: string; anchor: string }[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SEO-Manager-LinkChecker/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Extract ALL <a> tags — breadcrumb, nav, content, sidebar, footer
    const links: { href: string; anchor: string }[] = [];
    const regex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const href = match[1].split('#')[0].split('?')[0];
      const anchor = match[2].replace(/<[^>]+>/g, '').trim();
      if (href) links.push({ href, anchor });
    }
    return links;
  } catch {
    return [];
  }
}

/** Normalize URL for comparison (strip trailing slash, protocol) */
function normalizeUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
}

/** Check all pages in a cluster for internal links to/from pillar */
export async function checkClusterInternalLinks(clusterId: string): Promise<{
  results: LinkCheckResult[];
  summary: { total: number; checked: number; withLinkToPillar: number; withLinkFromPillar: number; bidirectional: number };
}> {
  const cluster = db.select().from(topicClusters).where(eq(topicClusters.id, clusterId)).get();
  if (!cluster) throw new Error('Cluster not found');

  const pages = db.select().from(topicClusterPages).where(eq(topicClusterPages.cluster_id, clusterId)).all();
  const pillarPage = pages.find(p => p.role === 'pillar');
  const pillarUrl = pillarPage?.url || cluster.pillar_url;

  if (!pillarUrl) {
    return { results: [], summary: { total: pages.length, checked: 0, withLinkToPillar: 0, withLinkFromPillar: 0, bidirectional: 0 } };
  }

  const normalizedPillar = normalizeUrl(pillarUrl);
  const results: LinkCheckResult[] = [];

  // Step 1: Crawl pillar page → find which supporting pages it links to
  const pillarLinks = await extractLinks(pillarUrl);
  const pillarLinksTo = new Map<string, string>(); // normalized URL → anchor
  for (const link of pillarLinks) {
    pillarLinksTo.set(normalizeUrl(link.href), link.anchor);
  }

  // Step 2: For each supporting page, check if it links to pillar
  for (const page of pages) {
    if (page.role === 'pillar') continue;

    const pageLinks = await extractLinks(page.url);
    const linkToPillar = pageLinks.find(l => normalizeUrl(l.href) === normalizedPillar);
    const linkFromPillar = pillarLinksTo.get(normalizeUrl(page.url));

    const result: LinkCheckResult = {
      pageId: page.id,
      url: page.url,
      hasLinkToPillar: !!linkToPillar,
      hasLinkFromPillar: linkFromPillar !== undefined,
      anchorToPillar: linkToPillar?.anchor || '',
      anchorFromPillar: linkFromPillar || '',
    };
    results.push(result);

    // Update DB
    db.update(topicClusterPages).set({
      has_link_to_pillar: result.hasLinkToPillar ? 1 : 0,
      has_link_from_pillar: result.hasLinkFromPillar ? 1 : 0,
      anchor_to_pillar: result.anchorToPillar,
      anchor_from_pillar: result.anchorFromPillar,
    }).where(eq(topicClusterPages.id, page.id)).run();
  }

  const summary = {
    total: pages.length,
    checked: results.length,
    withLinkToPillar: results.filter(r => r.hasLinkToPillar).length,
    withLinkFromPillar: results.filter(r => r.hasLinkFromPillar).length,
    bidirectional: results.filter(r => r.hasLinkToPillar && r.hasLinkFromPillar).length,
  };

  return { results, summary };
}
