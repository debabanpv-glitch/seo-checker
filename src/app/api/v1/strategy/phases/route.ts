import { NextRequest, NextResponse } from 'next/server';
import { getPhases, createPhase } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const projectId = sp.get('project_id') ?? undefined;
    return NextResponse.json({ phases: getPhases(projectId) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.project_id || !body.name) {
      return NextResponse.json({ error: 'project_id and name are required' }, { status: 400 });
    }
    const phase = createPhase(body);
    return NextResponse.json({ phase });
  } catch (error) {
    return handleApiError(error);
  }
}
