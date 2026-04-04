import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import {
  getClusterDetail,
  addPageToCluster,
  updatePage,
  removePage,
} from '@/lib/services/topic-clusters-crud.service';
import { checkClusterInternalLinks } from '@/lib/services/topic-cluster-link-checker.service';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const clusterId = sp.get('clusterId');
    if (!clusterId) {
      return NextResponse.json({ error: 'clusterId là bắt buộc' }, { status: 400 });
    }

    // GET ?clusterId=xxx&action=check-links → crawl and check internal links
    if (sp.get('action') === 'check-links') {
      return checkClusterInternalLinks(clusterId).then(result =>
        NextResponse.json(result)
      );
    }

    const detail = getClusterDetail(clusterId);
    if (!detail) return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    return NextResponse.json({ pages: detail.pages });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cluster_id, url, title, role, notes } = body;

    if (!cluster_id || !url) {
      return NextResponse.json({ error: 'cluster_id và url là bắt buộc' }, { status: 400 });
    }

    const page = addPageToCluster({ cluster_id, url, title, role, notes });
    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: 'id là bắt buộc' }, { status: 400 });

    const page = updatePage(id, updates);
    if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    return NextResponse.json(page);
  } catch (error) {
    return handleApiError(error);
  }
}

export function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id là bắt buộc' }, { status: 400 });

    return NextResponse.json(removePage(id));
  } catch (error) {
    return handleApiError(error);
  }
}
