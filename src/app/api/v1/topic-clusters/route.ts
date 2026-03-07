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
} from '@/lib/services/topic-clusters-crud.service';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const id = sp.get('id');
    const projectId = sp.get('projectId') ?? undefined;

    // GET ?id=xxx&stats=true → cluster stats
    if (id && sp.get('stats') === 'true') {
      const stats = getClusterStats(id);
      if (!stats) return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
      return NextResponse.json(stats);
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id là bắt buộc' }, { status: 400 });
    }

    const cluster = updateCluster(id, updates);
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
