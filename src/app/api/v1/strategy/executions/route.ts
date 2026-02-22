import { NextRequest, NextResponse } from 'next/server';
import {
  createExecutionLog,
  getExecutionLogsByAction,
  getExecutionLogsByProject,
} from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// GET /api/v1/strategy/executions?action_id=X
// GET /api/v1/strategy/executions?project_id=X
export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const actionId = sp.get('action_id');
    const projectId = sp.get('project_id');

    if (actionId) {
      return NextResponse.json({ logs: getExecutionLogsByAction(actionId) });
    }
    if (projectId) {
      return NextResponse.json({ logs: getExecutionLogsByProject(projectId) });
    }
    return NextResponse.json({ error: 'action_id or project_id is required' }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/v1/strategy/executions
// Body: { action_id, project_id?, executor, prompt_used?, result_text?, status? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.action_id || !body.executor) {
      return NextResponse.json({ error: 'action_id and executor are required' }, { status: 400 });
    }
    const log = createExecutionLog({
      action_id: body.action_id,
      project_id: body.project_id,
      executor: body.executor,
      prompt_used: body.prompt_used,
      result_text: body.result_text,
      status: body.status,
    });
    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
