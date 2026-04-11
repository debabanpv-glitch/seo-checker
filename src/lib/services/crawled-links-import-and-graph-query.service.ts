// ---------------------------------------------------------------------------
// Crawled Links Service — Import crawler JSON + query graph data for D3.js
// Tables: crawl_sessions, crawled_pages, crawled_links
// ---------------------------------------------------------------------------

import { db } from '@/lib/db';
import { crawlSessions, crawledPages, crawledLinks } from '@/lib/db/schema/crawled-links';
import { eq, desc, and } from 'drizzle-orm';

// --- Types ---

interface CrawlImportData {
  summary: {
    domain: string;
    start_url: string;
    total_pages: number;
    total_links: number;
    internal_links: number;
    external_links: number;
    pages_200: number;
    pages_error: number;
    crawl_duration_sec: number;
    crawled_at: string;
  };
  nodes: Array<{ url: string; title: string; status: number; error?: string | null }>;
  edges: Array<{
    source_url: string;
    target_url: string;
    anchor_text: string;
    position: string;
    link_type: string;
    nofollow: boolean;
  }>;
}

export interface GraphNode {
  id: string; // url
  title: string;
  status: number;
  internalInLinks: number;  // incoming internal links
  internalOutLinks: number; // outgoing internal links
  externalOutLinks: number;
  group: string; // URL directory prefix for coloring
}

export interface GraphEdge {
  source: string; // source url
  target: string; // target url
  anchor_text: string;
  position: string;
  nofollow: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    totalPages: number;
    totalInternalLinks: number;
    totalExternalLinks: number;
    avgInLinksPerPage: number;
    orphanPages: number; // no incoming internal links
  };
}

// --- Import ---

/** Import crawler JSON output into DB, returns session ID */
export function importCrawlData(projectId: string, data: CrawlImportData): string {
  const s = data.summary;

  // Create session
  const sessionId = crypto.randomUUID();
  db.insert(crawlSessions).values({
    id: sessionId,
    project_id: projectId,
    domain: s.domain,
    start_url: s.start_url,
    total_pages: s.total_pages,
    total_links: s.total_links,
    internal_links: s.internal_links,
    external_links: s.external_links,
    pages_200: s.pages_200,
    pages_error: s.pages_error,
    crawl_duration_sec: Math.round(s.crawl_duration_sec),
    crawled_at: s.crawled_at,
  }).run();

  // Batch insert pages (100 per batch)
  const pageBatch = 100;
  for (let i = 0; i < data.nodes.length; i += pageBatch) {
    const batch = data.nodes.slice(i, i + pageBatch);
    db.insert(crawledPages).values(
      batch.map(n => ({
        id: crypto.randomUUID(),
        session_id: sessionId,
        url: n.url,
        title: n.title || '',
        http_status: n.status,
        error: n.error || null,
      }))
    ).run();
  }

  // Batch insert links (500 per batch for performance)
  const linkBatch = 500;
  for (let i = 0; i < data.edges.length; i += linkBatch) {
    const batch = data.edges.slice(i, i + linkBatch);
    db.insert(crawledLinks).values(
      batch.map(e => ({
        id: crypto.randomUUID(),
        session_id: sessionId,
        source_url: e.source_url,
        target_url: e.target_url,
        anchor_text: e.anchor_text || '',
        position: e.position || 'content',
        link_type: e.link_type || 'internal',
        nofollow: e.nofollow || false,
      }))
    ).run();
  }

  return sessionId;
}

// --- Query ---

/** List crawl sessions for a project, newest first */
export function listCrawlSessions(projectId: string) {
  return db.select().from(crawlSessions)
    .where(eq(crawlSessions.project_id, projectId))
    .orderBy(desc(crawlSessions.crawled_at))
    .all();
}

/** Get latest crawl session for a project */
export function getLatestSession(projectId: string) {
  return db.select().from(crawlSessions)
    .where(eq(crawlSessions.project_id, projectId))
    .orderBy(desc(crawlSessions.crawled_at))
    .limit(1)
    .get();
}

/** Delete a crawl session (cascade deletes pages + links) */
export function deleteCrawlSession(sessionId: string) {
  db.delete(crawlSessions).where(eq(crawlSessions.id, sessionId)).run();
}

/** Build graph data (nodes + edges) for D3.js force graph */
export function getGraphData(sessionId: string, options?: {
  linkType?: 'internal' | 'external' | 'all';
  excludePositions?: string[]; // e.g. ['navigation', 'footer'] to show content links only
}): GraphData {
  const linkType = options?.linkType ?? 'internal';
  const excludePositions = options?.excludePositions ?? [];

  // Get all pages for this session
  const pages = db.select().from(crawledPages)
    .where(eq(crawledPages.session_id, sessionId))
    .all();

  // Get links with optional filters
  let allLinks = db.select().from(crawledLinks)
    .where(eq(crawledLinks.session_id, sessionId))
    .all();

  // Filter by link type
  if (linkType !== 'all') {
    allLinks = allLinks.filter(l => l.link_type === linkType);
  }

  // Filter out excluded positions
  if (excludePositions.length > 0) {
    allLinks = allLinks.filter(l => !excludePositions.includes(l.position));
  }

  // Dedupe edges (same source→target, keep first occurrence)
  const edgeKey = (e: typeof allLinks[0]) => `${e.source_url}→${e.target_url}`;
  const seen = new Set<string>();
  const dedupedLinks = allLinks.filter(l => {
    const k = edgeKey(l);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Count in/out links per URL
  const inCount = new Map<string, number>();
  const outCount = new Map<string, number>();
  const extOutCount = new Map<string, number>();

  // Count from ALL links (not deduped) for accurate metrics
  const allLinksUnfiltered = db.select().from(crawledLinks)
    .where(eq(crawledLinks.session_id, sessionId))
    .all();

  for (const l of allLinksUnfiltered) {
    if (l.link_type === 'internal') {
      inCount.set(l.target_url, (inCount.get(l.target_url) || 0) + 1);
      outCount.set(l.source_url, (outCount.get(l.source_url) || 0) + 1);
    } else {
      extOutCount.set(l.source_url, (extOutCount.get(l.source_url) || 0) + 1);
    }
  }

  // Group pages into 4 clear categories:
  // - Trang chủ: homepage
  // - Tour: tour product pages (main content)
  // - Nội dung: blog, ẩm thực, điểm đến, cẩm nang, tin tức — all content/editorial
  // - Hỗ trợ: chính sách, giới thiệu, liên hệ, cart, checkout, album
  const getContentGroup = (url: string, title: string): string => {
    try {
      const path = new URL(url).pathname.toLowerCase();
      const slug = path.replace(/^\/|\/$/g, '');
      const t = title.toLowerCase();

      if (path === '/' || path === '') return 'Trang chủ';

      // Tour product pages
      if (slug.startsWith('tour') || slug.startsWith('dlbm')
        || slug.startsWith('tp-hcm') || slug.startsWith('tphcm')
        || t.includes('tour ') || t.includes(' tour')
        || slug.includes('-ngay-') || slug.includes('-dem-')) return 'Tour';

      // Schedule / listing
      if (slug.startsWith('lich-') || slug.startsWith('tour-trong') || slug.startsWith('tour-ban-chay')
        || t.includes('lịch khởi hành')) return 'Danh mục';

      // Support / utility pages
      if (slug.startsWith('chinh-sach') || slug.startsWith('dieu-kien') || slug.startsWith('dieu-khoan')
        || slug.startsWith('cart') || slug.startsWith('checkout') || slug.startsWith('thanh-toan')
        || slug.startsWith('gioi-thieu') || slug.startsWith('about')
        || slug.startsWith('lien-he') || slug.startsWith('contact')
        || slug.startsWith('album')
        || t.includes('chính sách') || t.includes('điều khoản')
        || t.includes('giỏ hàng') || t.includes('giới thiệu') || t.includes('liên hệ')) return 'Hỗ trợ';

      // Everything else = content (blog, food, destinations, guides)
      return 'Nội dung';
    } catch { return 'Nội dung'; }
  };

  const nodes: GraphNode[] = pages.map(p => ({
    id: p.url,
    title: p.title,
    status: p.http_status,
    internalInLinks: inCount.get(p.url) || 0,
    internalOutLinks: outCount.get(p.url) || 0,
    externalOutLinks: extOutCount.get(p.url) || 0,
    group: getContentGroup(p.url, p.title),
  }));

  // Build edges (only between known pages for internal)
  const pageUrls = new Set(pages.map(p => p.url));
  const edges: GraphEdge[] = dedupedLinks
    .filter(l => {
      if (l.link_type === 'internal') {
        return pageUrls.has(l.source_url) && pageUrls.has(l.target_url);
      }
      return pageUrls.has(l.source_url); // external: source must be known
    })
    .map(l => ({
      source: l.source_url,
      target: l.target_url,
      anchor_text: l.anchor_text,
      position: l.position,
      nofollow: l.nofollow as boolean,
    }));

  // Summary stats
  const orphanPages = nodes.filter(n => n.internalInLinks === 0).length;
  const totalIn = Array.from(inCount.values()).reduce((a, b) => a + b, 0);

  return {
    nodes,
    edges,
    summary: {
      totalPages: nodes.length,
      totalInternalLinks: edges.filter(e => pageUrls.has(e.target)).length,
      totalExternalLinks: allLinksUnfiltered.filter(l => l.link_type === 'external').length,
      avgInLinksPerPage: nodes.length > 0 ? Math.round(totalIn / nodes.length * 10) / 10 : 0,
      orphanPages,
    },
  };
}

/** Get link details between two URLs */
export function getLinksBetweenUrls(sessionId: string, sourceUrl: string, targetUrl: string) {
  return db.select().from(crawledLinks)
    .where(and(
      eq(crawledLinks.session_id, sessionId),
      eq(crawledLinks.source_url, sourceUrl),
      eq(crawledLinks.target_url, targetUrl),
    ))
    .all();
}

/** Get all links from/to a specific URL */
export function getLinksForUrl(sessionId: string, url: string) {
  const outgoing = db.select().from(crawledLinks)
    .where(and(eq(crawledLinks.session_id, sessionId), eq(crawledLinks.source_url, url)))
    .all();
  const incoming = db.select().from(crawledLinks)
    .where(and(eq(crawledLinks.session_id, sessionId), eq(crawledLinks.target_url, url)))
    .all();
  return { outgoing, incoming };
}
