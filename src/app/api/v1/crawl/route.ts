import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import {
  importCrawlData,
  listCrawlSessions,
  getLatestSession,
  deleteCrawlSession,
  deleteAllProjectSessions,
  getGraphData,
  getLinksForUrl,
} from '@/lib/services/crawled-links-import-and-graph-query.service';
import { db } from '@/lib/db';
import { crawledPages, crawlSessions } from '@/lib/db/schema/crawled-links';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const projectId = sp.get('projectId');
    const sessionId = sp.get('sessionId');

    // GET ?projectId=xxx&graph=true → graph data for D3.js (latest session)
    if (projectId && sp.get('graph') === 'true') {
      const session = sessionId
        ? { id: sessionId }
        : getLatestSession(projectId);
      if (!session) return NextResponse.json({ error: 'No crawl data found' }, { status: 404 });

      const linkType = (sp.get('linkType') as 'internal' | 'external' | 'all') || 'internal';
      const excludePositions = sp.get('excludePositions')?.split(',').filter(Boolean) || [];

      const graph = getGraphData(session.id, { linkType, excludePositions });
      return NextResponse.json(graph);
    }

    // GET ?sessionId=xxx&url=xxx → links for a specific URL
    if (sessionId && sp.get('url')) {
      const links = getLinksForUrl(sessionId, sp.get('url')!);
      return NextResponse.json(links);
    }

    // GET ?projectId=xxx&topicalClusters=true → auto-group pages into topical clusters
    if (projectId && sp.get('topicalClusters') === 'true') {
      const session = getLatestSession(projectId);
      if (!session) return NextResponse.json({ error: 'No crawl data' }, { status: 404 });

      const pages = db.select().from(crawledPages).where(eq(crawledPages.session_id, session.id)).all();

      // Destination keywords for clustering
      const destinations: [string, string[]][] = [
        ['Cần Thơ', ['cần thơ', 'can-tho', 'cai-rang', 'ninh-kieu']],
        ['Phú Quốc', ['phú quốc', 'phu-quoc', 'hon-thom']],
        ['Cà Mau', ['cà mau', 'ca-mau', 'dat-mui', 'u-minh']],
        ['Châu Đốc', ['châu đốc', 'chau-doc', 'tra-su', 'nui-cam', 'mieu-ba']],
        ['Đà Lạt', ['đà lạt', 'da-lat', 'dalat']],
        ['Nha Trang', ['nha trang', 'nha-trang', 'vinpearl']],
        ['Mũi Né / Phan Thiết', ['mũi né', 'phan thiết', 'mui-ne', 'phan-thiet', 'ho-tram']],
        ['Đà Nẵng / Hội An / Huế', ['đà nẵng', 'hội an', 'huế', 'da-nang', 'hoi-an', 'hue', 'ba-na', 'phong-nha']],
        ['Hà Nội / Sapa / Hạ Long', ['hà nội', 'sapa', 'hạ long', 'ha-noi', 'ha-long', 'tam-coc']],
        ['Tây Ninh', ['tây ninh', 'tay-ninh', 'nui-ba-den']],
        ['Vũng Tàu', ['vũng tàu', 'vung-tau', 'ho-tram', 'ho-coc']],
        ['Đồng Tháp', ['đồng tháp', 'dong-thap', 'sa-dec', 'tram-chim', 'gao-giong']],
        ['Sóc Trăng', ['sóc trăng', 'soc-trang', 'khmer']],
        ['Bạc Liêu', ['bạc liêu', 'bac-lieu', 'cong-tu']],
        ['Bến Tre', ['bến tre', 'ben-tre']],
        ['Mỹ Tho', ['mỹ tho', 'my-tho', 'tien-giang']],
        ['An Giang', ['an giang', 'an-giang']],
        ['Vĩnh Long', ['vĩnh long', 'vinh-long']],
        ['Kiên Giang', ['kiên giang', 'kien-giang', 'nam-du', 'ha-tien']],
        ['Côn Đảo', ['côn đảo', 'con-dao']],
        ['Củ Chi', ['củ chi', 'cu-chi', 'dia-dao']],
        ['Tây Nguyên', ['tây nguyên', 'tay-nguyen', 'buon-ma', 'ta-dung', 'cat-tien']],
        ['Tour Cano Sài Gòn', ['cano', 'sông sài gòn']],
        ['Campuchia', ['campuchia', 'siem-riep', 'phnompenh', 'koh-rong']],
        ['Tour Nước Ngoài', ['singapore', 'malaysia', 'thai', 'indonesia', 'bali', 'bangkok']],
      ];

      // Duration clusters
      const durations: [string, string[]][] = [
        ['Tour 1 Ngày', ['1 ngày', '1n', '1-ngay']],
        ['Tour 2 Ngày', ['2 ngày', '2n', '2-ngay']],
        ['Tour 3 Ngày', ['3 ngày', '3n', '3-ngay']],
        ['Tour 4 Ngày', ['4 ngày', '4n', '4-ngay']],
        ['Tour 5+ Ngày', ['5 ngày', '6 ngày', '5n', '6n', '5-ngay', '6-ngay', 'xuyên việt']],
      ];

      const classify = (title: string, slug: string) => {
        const t = title.toLowerCase();
        const isTour = slug.includes('tour') || slug.startsWith('dlbm') || slug.startsWith('tp-hcm') || slug.startsWith('tphcm');
        const isFood = t.includes('ăn gì') || t.includes('đặc sản') || t.includes('món ');
        const isGuide = t.includes('kinh nghiệm') || t.includes('cẩm nang') || t.includes('hướng dẫn') || t.includes('top ') || t.includes('check-in') || t.includes('khám phá') || t.includes('địa điểm');
        return isTour ? 'tour' : isFood ? 'food' : isGuide ? 'guide' : 'content';
      };

      type ClusterResult = { name: string; pages: Array<{ url: string; title: string; type: string }>; tourCount: number; contentCount: number; foodCount: number; guideCount: number };
      const clusters: ClusterResult[] = [];
      const assigned = new Set<string>();

      for (const [name, keywords] of destinations) {
        const matched = pages.filter(p => {
          if (assigned.has(p.url)) return false;
          const t = p.title.toLowerCase();
          const slug = new URL(p.url).pathname.toLowerCase();
          return keywords.some(kw => t.includes(kw) || slug.includes(kw));
        });
        if (matched.length === 0) continue;
        matched.forEach(p => assigned.add(p.url));
        const items = matched.map(p => ({ url: p.url, title: p.title, type: classify(p.title, new URL(p.url).pathname) }));
        clusters.push({
          name, pages: items,
          tourCount: items.filter(i => i.type === 'tour').length,
          contentCount: items.filter(i => i.type === 'content').length,
          foodCount: items.filter(i => i.type === 'food').length,
          guideCount: items.filter(i => i.type === 'guide').length,
        });
      }

      // Sort by total pages desc
      clusters.sort((a, b) => b.pages.length - a.pages.length);

      return NextResponse.json({ clusters, totalPages: pages.length, assignedPages: assigned.size });
    }

    // GET ?projectId=xxx → list crawl sessions
    if (projectId) {
      return NextResponse.json({ sessions: listCrawlSessions(projectId) });
    }

    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, data, action, url, maxPages } = body;

    // POST { action: 'crawl', projectId, url, maxPages? } → run Python crawler + auto-import
    if (action === 'crawl' && projectId && url) {
      const { execFile } = require('child_process');
      const { promisify } = require('util');
      const execFileAsync = promisify(execFile);
      const path = require('path');
      const fs = require('fs');
      const limit = maxPages || 6000;
      const outFile = path.join(process.cwd(), 'data', `crawl-temp-${projectId}.json`);

      // Run crawler asynchronously (non-blocking)
      try {
        await execFileAsync(
          'python3',
          ['scripts/crawl-internal-links.py', url, '--max-pages', String(limit), '--concurrency', '10', '-o', outFile],
          { cwd: process.cwd(), timeout: 1800000, maxBuffer: 50 * 1024 * 1024 } // 30min, 50MB buffer
        );
      } catch (crawlErr: unknown) {
        const msg = crawlErr instanceof Error ? crawlErr.message : String(crawlErr);
        return NextResponse.json({ error: `Crawler failed: ${msg.slice(0, 500)}` }, { status: 500 });
      }

      // Read + import
      if (!fs.existsSync(outFile)) {
        return NextResponse.json({ error: 'Crawler output not found' }, { status: 500 });
      }
      const crawlData = JSON.parse(fs.readFileSync(outFile, 'utf8'));

      // Normalize URLs (http→https, www→non-www)
      const norm = (u: string) => u.replace(/^http:\/\//, 'https://').replace(/^https:\/\/www\./, 'https://');
      crawlData.nodes = crawlData.nodes.map((n: any) => ({ ...n, url: norm(n.url) }));
      crawlData.edges = crawlData.edges.map((e: any) => ({
        ...e,
        source_url: norm(e.source_url),
        target_url: norm(e.target_url),
      }));

      // Delete old sessions for this project, then import
      deleteAllProjectSessions(projectId);
      const sessionId = importCrawlData(projectId, crawlData);

      // Cleanup temp file
      try { fs.unlinkSync(outFile); } catch { /* ignore */ }

      return NextResponse.json({
        sessionId,
        message: 'Crawl + import successful',
        summary: crawlData.summary,
      });
    }

    // POST { projectId, data } → import JSON directly
    if (!projectId || !data) {
      return NextResponse.json({ error: 'projectId and data (or action=crawl) required' }, { status: 400 });
    }

    const sessionId = importCrawlData(projectId, data);
    return NextResponse.json({ sessionId, message: 'Import successful' });
  } catch (e) {
    return handleApiError(e);
  }
}

export function DELETE(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const sessionId = sp.get('sessionId');
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    deleteCrawlSession(sessionId);
    return NextResponse.json({ message: 'Deleted' });
  } catch (e) {
    return handleApiError(e);
  }
}
