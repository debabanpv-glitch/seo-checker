import { NextRequest, NextResponse } from 'next/server';
import { updateAction, deleteAction } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const action = updateAction(params.id, body);
    return NextResponse.json({ action });
  } catch (error) {
    return handleApiError(error);
  }
}

export function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    deleteAction(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
