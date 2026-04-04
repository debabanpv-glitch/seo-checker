import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import {
  listClusters,
  getClusterDetail,
  getClusterStats,
  detectOverlap,
  createCluster,
  updateCluster,
  deleteCluster,
  updateClusterTargets,
  getClusterCompleteness,
  getClusterOverviewWithTraffic,
} from '@/lib/services/topic-clusters-crud.service';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const id = sp.get('id');
    const projectId = sp.get('projectId') ?? undefined;

    // GET ?projectId=xxx&overview=true → enriched overview with GSC traffic
    if (projectId && sp.get('overview') === 'true') {
      return NextResponse.json({ clusters: getClusterOverviewWithTraffic(projectId) });
    }

    // GET ?id=xxx&stats=true → cluster stats (includes completeness)
    if (id && sp.get('stats') === 'true') {
      const stats = getClusterStats(id);
      if (!stats) return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
      const completeness = getClusterCompleteness(id);
      return NextResponse.json({ ...stats, completeness });
    }

    // GET ?id=xxx&overlap=true → cannibalization warnings
    if (id && sp.get('overlap') === 'true') {
      const warnings = detectOverlap(id);
      return NextResponse.json({ warnings });
    }

    // GET ?id=xxx → cluster detail (pages + keywords)
    if (id) {
      const detail = getClusterDetail(id);
      if (!detail) return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
      return NextResponse.json(detail);
    }

    // GET ?projectId=xxx → list clusters
    return NextResponse.json(listClusters(projectId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, pillar_url, project_id, description } = body;

    if (!name || !project_id) {
      return NextResponse.json({ error: 'name và project_id là bắt buộc' }, { status: 400 });
    }

    const cluster = createCluster({ name, pillar_url, project_id, description });
    return NextResponse.json(cluster, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, target_keyword_count, target_page_count, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id là bắt buộc' }, { status: 400 });
    }

    // Update targets if provided
    if (target_keyword_count !== undefined || target_page_count !== undefined) {
      updateClusterTargets(id, { target_keyword_count, target_page_count });
    }

    // Update other fields if any
    const cluster = updateCluster(id, Object.keys(updates).length > 0 ? updates : {});
    if (!cluster) return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    return NextResponse.json(cluster);
  } catch (error) {
    return handleApiError(error);
  }
}

export function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id là bắt buộc' }, { status: 400 });

    return NextResponse.json(deleteCluster(id));
  } catch (error) {
    return handleApiError(error);
  }
}
