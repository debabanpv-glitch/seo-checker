import { NextRequest, NextResponse } from 'next/server';
import { getTargets, upsertTarget, deleteTarget } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const projectId = sp.get('projectId') || undefined;
    return NextResponse.json({ targets: getTargets(projectId) });
  } catch (error) {
    return handleApiError(error);
  }
}

export function POST(request: NextRequest) {
  return request.json().then((body) => {
    try {
      const { project_id, month, year, target } = body;
      if (!project_id || !month || !year || target === undefined) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      const result = upsertTarget(project_id, month, year, target);
      return NextResponse.json({ target: result });
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Target ID is required' }, { status: 400 });
    deleteTarget(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
