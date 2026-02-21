import { NextRequest, NextResponse } from 'next/server';
import { getProjectsWithStats, createProject, updateProject, deleteProject } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const month = parseInt(sp.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(sp.get('year') || String(new Date().getFullYear()));
    return NextResponse.json({ projects: getProjectsWithStats(month, year) });
  } catch (error) {
    return handleApiError(error);
  }
}

export function POST(request: NextRequest) {
  return request.json().then((body) => {
    try {
      const { name, sheet_id, sheet_name, monthly_target, ranking_sheet_url } = body;
      if (!name || !sheet_id) {
        return NextResponse.json({ error: 'Tên dự án và Sheet ID là bắt buộc' }, { status: 400 });
      }
      const project = createProject({ name, sheet_id, sheet_name, monthly_target, ranking_sheet_url });
      return NextResponse.json({ project });
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export function PUT(request: NextRequest) {
  return request.json().then((body) => {
    try {
      const { id, ...data } = body;
      if (!id) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
      const project = updateProject(id, data);
      return NextResponse.json({ project });
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    deleteProject(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
