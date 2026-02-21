import { NextRequest, NextResponse } from 'next/server';
import { getSalaryAnalytics } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const months = parseInt(sp.get('months') || '6');
    return NextResponse.json(getSalaryAnalytics(months));
  } catch (error) {
    return handleApiError(error);
  }
}
