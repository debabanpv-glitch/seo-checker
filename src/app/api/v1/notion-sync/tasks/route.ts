import { NextRequest, NextResponse } from 'next/server';
import { getNotionTasks, getNotionTasksSummary } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/** GET /api/v1/notion-sync/tasks — list notion tasks with optional filters */
export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const project = sp.get('project') || undefined;
    const status = sp.get('status') || undefined;
    const action = sp.get('action');

    if (action === 'summary') {
      return NextResponse.json(getNotionTasksSummary());
    }

    const tasks = getNotionTasks({ project, status });
    return NextResponse.json({ tasks, total: tasks.length });
  } catch (error) {
    return handleApiError(error);
  }
}
