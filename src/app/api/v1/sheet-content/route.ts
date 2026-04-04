import { NextRequest, NextResponse } from 'next/server';
import {
  upsertSheetContent,
  getSheetContent,
  getSheetContentStats,
} from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const projectId = sp.get('project_id') ?? undefined;
    const month = sp.get('month') ? parseInt(sp.get('month')!) : undefined;
    const year = sp.get('year') ? parseInt(sp.get('year')!) : undefined;
    const status = sp.get('status') ?? undefined;
    const mode = sp.get('mode');

    if (mode === 'stats' && projectId) {
      return NextResponse.json(getSheetContentStats(projectId));
    }

    const rows = getSheetContent({ projectId, month, year, status });
    return NextResponse.json({ items: rows, total: rows.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, data } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'data must be a non-empty array' }, { status: 400 });
    }

    const result = upsertSheetContent(project_id, data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
