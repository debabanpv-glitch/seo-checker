import { NextRequest, NextResponse } from 'next/server';
import { getRankings, deleteRankings } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const rankings = getRankings({
      project_id: sp.get('projectId') || undefined,
      keyword: sp.get('keyword') || undefined,
      startDate: sp.get('startDate') || undefined,
      endDate: sp.get('endDate') || undefined,
      limit: sp.get('limit') ? parseInt(sp.get('limit')!) : undefined,
    });
    return NextResponse.json({ rankings });
  } catch (error) {
    return handleApiError(error);
  }
}

export function DELETE(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const id = sp.get('id') || undefined;
    const projectId = sp.get('projectId') || undefined;
    const keyword = sp.get('keyword') || undefined;
    const deleteAll = sp.get('deleteAll') === 'true';

    if (!deleteAll && !id && !projectId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    deleteRankings({ id, project_id: projectId, keyword, deleteAll });

    if (deleteAll) return NextResponse.json({ success: true, message: 'Đã xóa tất cả dữ liệu keyword ranking!' });
    if (projectId && !keyword) return NextResponse.json({ success: true, message: 'Đã xóa dữ liệu keyword ranking của dự án!' });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
