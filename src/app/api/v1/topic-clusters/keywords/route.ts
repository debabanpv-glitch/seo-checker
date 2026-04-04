import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import {
  assignKeywordsToCluster,
  unassignKeywords,
  getUnassignedKeywords,
  getKeywordsForCluster,
} from '@/lib/services/topic-clusters-crud.service';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const projectId = sp.get('projectId');
    const clusterId = sp.get('clusterId');
    const unassigned = sp.get('unassigned') === 'true';

    if (unassigned && projectId) {
      return NextResponse.json(getUnassignedKeywords(projectId));
    }

    if (clusterId) {
      return NextResponse.json(getKeywordsForCluster(clusterId));
    }

    return NextResponse.json({ error: 'projectId hoặc clusterId là bắt buộc' }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clusterId, keywords } = body;

    if (!clusterId || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'clusterId và keywords[] là bắt buộc' },
        { status: 400 },
      );
    }

    const result = assignKeywordsToCluster(clusterId, keywords as string[]);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { keywords, projectId } = body;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: 'keywords[] là bắt buộc' }, { status: 400 });
    }

    const result = unassignKeywords(keywords as string[], projectId as string | undefined);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
