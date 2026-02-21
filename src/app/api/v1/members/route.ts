import { NextRequest, NextResponse } from 'next/server';
import { getMemberStats, createMember, updateMember, deleteMember } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const month = parseInt(sp.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(sp.get('year') || String(new Date().getFullYear()));
    const viewType = sp.get('view') || 'month';
    return NextResponse.json(getMemberStats(month, year, viewType));
  } catch (error) {
    return handleApiError(error);
  }
}

export function POST(request: NextRequest) {
  return request.json().then((body) => {
    try {
      const member = createMember(body);
      return NextResponse.json({ member });
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export function PUT(request: NextRequest) {
  return request.json().then((body) => {
    try {
      const { id, ...data } = body;
      if (!id) return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
      const member = updateMember(id, data);
      return NextResponse.json({ member });
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    deleteMember(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
