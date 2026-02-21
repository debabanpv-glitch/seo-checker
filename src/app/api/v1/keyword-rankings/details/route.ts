import { NextRequest, NextResponse } from 'next/server';
import { getRankingDetails } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const projectId = sp.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    const view = sp.get('view') || 'keywords';
    return NextResponse.json(getRankingDetails(projectId, view));
  } catch (error) {
    return handleApiError(error);
  }
}
