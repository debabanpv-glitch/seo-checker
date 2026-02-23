import { NextRequest, NextResponse } from 'next/server';
import {
  getBacklinks,
  getBacklinkStats,
  importBacklinksFromBuffer,
  importBacklinksFromPath,
  deleteBacklinksByProject,
  deleteAllBacklinks,
} from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const projectId = sp.get('project_id') ?? undefined;
    const mode = sp.get('mode'); // 'stats' | undefined

    if (mode === 'stats') {
      return NextResponse.json(getBacklinkStats(projectId));
    }

    return NextResponse.json({ backlinks: getBacklinks(projectId) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? '';

    // File upload via FormData
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const projectId = formData.get('project_id') as string | null;

      if (!file) {
        return NextResponse.json({ error: 'File is required' }, { status: 400 });
      }
      if (!projectId) {
        return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = importBacklinksFromBuffer(buffer, file.name, projectId);
      return NextResponse.json(result);
    }

    // Import from file path (JSON body)
    const body = await request.json();
    if (body.file_path && body.project_id) {
      const result = importBacklinksFromPath(body.file_path, body.project_id);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'file_path + project_id required, or upload via FormData' }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const projectId = sp.get('project_id');

    if (projectId) {
      deleteBacklinksByProject(projectId);
    } else {
      deleteAllBacklinks();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
