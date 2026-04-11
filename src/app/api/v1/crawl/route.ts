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
      const { execSync } = require('child_process');
      const path = require('path');
      const fs = require('fs');
      const limit = maxPages || 6000;
      const outFile = path.join(process.cwd(), 'data', `crawl-temp-${projectId}.json`);

      // Run crawler synchronously (blocking but simple)
      try {
        execSync(
          `python3 scripts/crawl-internal-links.py "${url}" --max-pages ${limit} --concurrency 10 -o "${outFile}"`,
          { cwd: process.cwd(), timeout: 1800000, stdio: 'pipe' } // 30min timeout
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
