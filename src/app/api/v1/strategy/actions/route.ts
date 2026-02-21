import { NextRequest, NextResponse } from 'next/server';
import { getActions, createAction } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const phaseId = sp.get('phase_id') ?? undefined;
    const projectId = sp.get('project_id') ?? undefined;
    return NextResponse.json({ actions: getActions(phaseId, projectId) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.phase_id || !body.title) {
      return NextResponse.json({ error: 'phase_id and title are required' }, { status: 400 });
    }
    const action = createAction(body);
    return NextResponse.json({ action });
  } catch (error) {
    return handleApiError(error);
  }
}
