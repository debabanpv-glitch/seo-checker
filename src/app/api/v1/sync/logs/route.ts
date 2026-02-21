import { NextRequest, NextResponse } from 'next/server';
import { getSyncLogs } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const limit = parseInt(new URL(request.url).searchParams.get('limit') || '10');
    return NextResponse.json({ logs: getSyncLogs(limit) });
  } catch (error) {
    return handleApiError(error);
  }
}
