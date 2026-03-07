import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import {
  getCrossClusterLinks,
  addCrossClusterLink,
  removeCrossClusterLink,
} from '@/lib/services/topic-clusters-crud.service';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  try {
    const clusterId = new URL(req.url).searchParams.get('clusterId');
    if (!clusterId) {
      return NextResponse.json({ error: 'clusterId là bắt buộc' }, { status: 400 });
    }

    const result = getCrossClusterLinks(clusterId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { source_cluster_id, target_cluster_id, source_url, target_url, anchor_text, relationship } = body;

    if (!source_cluster_id || !target_cluster_id) {
      return NextResponse.json({ error: 'source_cluster_id và target_cluster_id là bắt buộc' }, { status: 400 });
    }

    const link = addCrossClusterLink({ source_cluster_id, target_cluster_id, source_url, target_url, anchor_text, relationship });
    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id là bắt buộc' }, { status: 400 });

    return NextResponse.json(removeCrossClusterLink(id));
  } catch (error) {
    return handleApiError(error);
  }
}
