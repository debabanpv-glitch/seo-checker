import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import {
  importCrawlData,
  listCrawlSessions,
  getLatestSession,
  deleteCrawlSession,
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
    const { projectId, data } = body;

    if (!projectId || !data) {
      return NextResponse.json({ error: 'projectId and data required' }, { status: 400 });
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
