import { NextRequest, NextResponse } from 'next/server';
import { getReport, updateReport, deleteReport } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const report = getReport(params.id);
    return NextResponse.json({ report });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const report = updateReport(params.id, body);
    return NextResponse.json({ report });
  } catch (error) {
    return handleApiError(error);
  }
}

export function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    deleteReport(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
