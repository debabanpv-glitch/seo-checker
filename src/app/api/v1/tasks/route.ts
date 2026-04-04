import { NextRequest, NextResponse } from 'next/server';
import { getTasks, updateTask, deleteTask, createTask } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const project = sp.get('project') || sp.get('project_id') || undefined;
    const month = sp.get('month') ? parseInt(sp.get('month')!) : undefined;
    const year = sp.get('year') ? parseInt(sp.get('year')!) : undefined;
    const published = sp.get('published') === 'true';

    const tasks = getTasks({ project_id: project, month, year, published });
    return NextResponse.json({ tasks });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.project_id || !body.title) {
      return NextResponse.json({ error: 'project_id and title are required' }, { status: 400 });
    }
    const task = createTask(body);
    return NextResponse.json({ task });
  } catch (error) {
    return handleApiError(error);
  }
}

export function PUT(request: NextRequest) {
  return request.json().then((body) => {
    try {
      const { id, ...data } = body;
      if (!id) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
      const task = updateTask(id, data);
      return NextResponse.json({ task });
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    deleteTask(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
