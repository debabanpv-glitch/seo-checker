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
  group: string; // content type group for coloring
  clickDepth: number; // BFS distance from homepage (0 = homepage, -1 = unreachable)
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

/** Delete all crawl sessions for a project (before re-crawl) */
export function deleteAllProjectSessions(projectId: string) {
  db.delete(crawlSessions).where(eq(crawlSessions.project_id, projectId)).run();
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

  // Count in/out links from FILTERED links (respects position filter)
  const inCount = new Map<string, number>();
  const outCount = new Map<string, number>();
  const extOutCount = new Map<string, number>();

  // Count external links from all data
  const allLinksUnfiltered = db.select().from(crawledLinks)
    .where(eq(crawledLinks.session_id, sessionId))
    .all();

  for (const l of allLinksUnfiltered) {
    if (l.link_type === 'external') {
      extOutCount.set(l.source_url, (extOutCount.get(l.source_url) || 0) + 1);
    }
  }

  // Count internal links from filtered set (after position exclusion)
  for (const l of allLinks) {
    if (l.link_type === 'internal') {
      inCount.set(l.target_url, (inCount.get(l.target_url) || 0) + 1);
      outCount.set(l.source_url, (outCount.get(l.source_url) || 0) + 1);
    }
  }

  // Auto-detect content group from URL structure + title
  // Works across different site types: tour, e-commerce, blog
  const getContentGroup = (url: string, title: string): string => {
    try {
      const path = new URL(url).pathname.toLowerCase();
      const slug = path.replace(/^\/|\/$/g, '');
      const t = title.toLowerCase();
      const segments = slug.split('/');

      if (path === '/' || path === '') return 'Trang chủ';

      // --- Category / listing pages (usually have sub-pages) ---
      // WP/WC category patterns
      if (slug.startsWith('danh-muc') || slug.startsWith('product-category')
        || slug.startsWith('category/') || slug.startsWith('chuyen-muc')
        || slug.startsWith('san-pham/') && segments.length === 2  // /san-pham/category-name/
        || t.includes('danh mục') || t.includes('chuyên mục')) {
        // Sub-categorize: product category vs blog category
        if (slug.includes('san-pham') || slug.includes('product')
          || t.includes('sản phẩm') || t.includes('máy in') || t.includes('máy quét')
          || t.includes('mực in') || t.includes('nhãn') || t.includes('ribbon')) return 'DM Sản phẩm';
        return 'DM Blog';
      }

      // Archive / tag pages
      if (slug.startsWith('tag/') || slug.startsWith('author/') || slug.startsWith('page/')) return 'Hỗ trợ';

      // --- Product pages ---
      if (slug.startsWith('san-pham/') || slug.startsWith('product/')
        || slug.startsWith('shop/') || slug.startsWith('woocommerce')
        || t.includes('mua ngay') || t.includes('giá:')
        || t.includes('máy in ') || t.includes('máy quét ') || t.includes('mực in ')
        || t.includes('đầu in ') || t.includes('ribbon ')
        || t.includes('nhãn in ') || t.includes('tem nhãn')) return 'Sản phẩm';

      // --- Blog / content pages ---
      if (slug.startsWith('blog') || slug.startsWith('tin-tuc') || slug.startsWith('bai-viet')
        || slug.startsWith('cam-nang') || slug.startsWith('kinh-nghiem')
        || slug.startsWith('huong-dan') || slug.startsWith('meo-')
        || t.includes('hướng dẫn') || t.includes('cách ') || t.includes('kinh nghiệm')
        || t.includes('cẩm nang') || t.includes('mẹo ') || t.includes('bí quyết')
        || t.includes('top ') || t.includes('so sánh')) return 'Blog';

      // --- Tour-specific (DLBM) ---
      if (slug.startsWith('tour') || slug.startsWith('dlbm')
        || slug.startsWith('tp-hcm') || slug.startsWith('tphcm')
        || t.includes('tour ') || t.includes(' tour')
        || slug.includes('-ngay-') || slug.includes('-dem-')) return 'Tour';

      // --- Food/destination (DLBM) ---
      if (slug.startsWith('an-gi') || slug.startsWith('an-toi')
        || t.includes('ăn gì') || t.includes('ẩm thực')
        || t.includes('đặc sản')) return 'Ẩm thực';

      // --- Schedule / listing ---
      if (slug.startsWith('lich-') || t.includes('lịch khởi hành')) return 'Danh mục';

      // --- Support pages ---
      if (slug.startsWith('chinh-sach') || slug.startsWith('dieu-kien')
        || slug.startsWith('cart') || slug.startsWith('checkout') || slug.startsWith('thanh-toan')
        || slug.startsWith('gioi-thieu') || slug.startsWith('about')
        || slug.startsWith('lien-he') || slug.startsWith('contact')
        || slug.startsWith('album') || slug.startsWith('my-account')
        || slug.startsWith('gio-hang') || slug.startsWith('dat-hang')
        || t.includes('chính sách') || t.includes('điều khoản')
        || t.includes('giỏ hàng') || t.includes('giới thiệu') || t.includes('liên hệ')) return 'Hỗ trợ';

      // Fallback
      return 'Khác';
    } catch { return 'Khác'; }
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

  // Build edges (only between known pages for internal, cap at 3000 for performance)
  const MAX_EDGES = 3000;
  const pageUrls = new Set(pages.map(p => p.url));
  // Only include edges where BOTH source AND target are known pages
  // External links are tracked via externalOutLinks count, not as graph edges
  const allEdges: GraphEdge[] = dedupedLinks
    .filter(l => pageUrls.has(l.source_url) && pageUrls.has(l.target_url))
    .map(l => ({
      source: l.source_url,
      target: l.target_url,
      anchor_text: l.anchor_text,
      position: l.position,
      nofollow: l.nofollow as boolean,
    }));

  // Cap edges for browser performance
  const edges = allEdges.length > MAX_EDGES ? allEdges.slice(0, MAX_EDGES) : allEdges;

  // --- Compute click depth via BFS from homepage ---
  // Build adjacency list from deduped internal edges
  const adjList = new Map<string, string[]>();
  for (const e of edges) {
    if (!pageUrls.has(e.target)) continue; // internal only
    if (!adjList.has(e.source)) adjList.set(e.source, []);
    adjList.get(e.source)!.push(e.target);
  }

  // Find homepage (path = "/" or empty)
  const depthMap = new Map<string, number>();
  const homepage = nodes.find(n => {
    try { return new URL(n.id).pathname.replace(/\/+$/, '') === ''; } catch { return false; }
  });

  if (homepage) {
    // BFS
    const queue: [string, number][] = [[homepage.id, 0]];
    depthMap.set(homepage.id, 0);
    while (queue.length > 0) {
      const [url, depth] = queue.shift()!;
      for (const neighbor of (adjList.get(url) || [])) {
        if (!depthMap.has(neighbor)) {
          depthMap.set(neighbor, depth + 1);
          queue.push([neighbor, depth + 1]);
        }
      }
    }
  }

  // Assign click depth to nodes
  for (const node of nodes) {
    node.clickDepth = depthMap.get(node.id) ?? -1; // -1 = unreachable from homepage
  }

  // Summary stats
  const orphanPages = nodes.filter(n => n.internalInLinks === 0).length;
  const totalIn = Array.from(inCount.values()).reduce((a, b) => a + b, 0);

  return {
    nodes,
    edges,
    summary: {
      totalPages: nodes.length,
      totalInternalLinks: allEdges.filter(e => pageUrls.has(e.target)).length,
      totalExternalLinks: allLinksUnfiltered.filter(l => l.link_type === 'external').length,
      avgInLinksPerPage: nodes.length > 0 ? Math.round(totalIn / nodes.length * 10) / 10 : 0,
      orphanPages,
      clickDepthDistribution: {
        depth0: nodes.filter(n => n.clickDepth === 0).length,
        depth1: nodes.filter(n => n.clickDepth === 1).length,
        depth2: nodes.filter(n => n.clickDepth === 2).length,
        depth3: nodes.filter(n => n.clickDepth === 3).length,
        depth4plus: nodes.filter(n => n.clickDepth >= 4).length,
        unreachable: nodes.filter(n => n.clickDepth === -1).length,
      },
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
