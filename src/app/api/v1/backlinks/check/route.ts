import { NextRequest, NextResponse } from 'next/server';
import { checkBacklinksBatch, getBacklinkCheckSummary } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// GET — return check summary (alive/dead/error counts)
export function GET(request: NextRequest) {
  try {
    const projectId = new URL(request.url).searchParams.get('project_id') ?? undefined;
    return NextResponse.json(getBacklinkCheckSummary(projectId));
  } catch (error) {
    return handleApiError(error);
  }
}

// POST — trigger batch check for all backlinks (or by project)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const projectId = body.project_id ?? undefined;
    const concurrency = body.concurrency ?? 3;

    const result = await checkBacklinksBatch(projectId, concurrency, 500);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
