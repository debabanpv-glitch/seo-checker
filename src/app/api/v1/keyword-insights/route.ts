import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { getKeywordInsights } from '@/lib/services/keyword-insights-aggregator.service';
import { toggleTracked } from '@/lib/services/keyword.service';

export const dynamic = 'force-dynamic';

// GET /api/v1/keyword-insights?projectId=xxx
export function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    const data = getKeywordInsights(projectId);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/v1/keyword-insights — toggle tracked
export async function PATCH(request: NextRequest) {
  try {
    const { keyword, project_id, is_tracked } = await request.json();
    if (!keyword || !project_id) {
      return NextResponse.json({ error: 'keyword and project_id required' }, { status: 400 });
    }
    toggleTracked(keyword, project_id, !!is_tracked);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
