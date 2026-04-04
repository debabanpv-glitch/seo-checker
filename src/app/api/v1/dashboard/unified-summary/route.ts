import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedDashboardSummary } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const projectId = sp.get('project_id') ?? undefined;

    const summary = getUnifiedDashboardSummary(projectId);
    return NextResponse.json(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
