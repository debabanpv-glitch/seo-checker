import { NextRequest, NextResponse } from 'next/server';
import { getRankingAnalysis } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const projectId = new URL(request.url).searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    return NextResponse.json(getRankingAnalysis(projectId));
  } catch (error) {
    return handleApiError(error);
  }
}
