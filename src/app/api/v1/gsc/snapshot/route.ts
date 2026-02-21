import { NextRequest, NextResponse } from 'next/server';
import { getSnapshots, saveSnapshot } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const projectId = sp.get('project_id');
    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }
    const limitParam = sp.get('limit');
    const limit = limitParam ? parseInt(limitParam) : undefined;
    return NextResponse.json({ snapshots: getSnapshots(projectId, limit) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_slug, date, clicks, impressions, ctr, position } = body;
    if (!project_slug || !date || clicks == null || impressions == null || ctr == null || position == null) {
      return NextResponse.json(
        { error: 'project_slug, date, clicks, impressions, ctr, position are required' },
        { status: 400 },
      );
    }
    const snapshot = saveSnapshot(body);
    return NextResponse.json({ snapshot });
  } catch (error) {
    return handleApiError(error);
  }
}
