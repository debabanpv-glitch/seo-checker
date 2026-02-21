import { NextRequest, NextResponse } from 'next/server';
import { getStats } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const month = parseInt(sp.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(sp.get('year') || String(new Date().getFullYear()));
    return NextResponse.json(getStats(month, year));
  } catch (error) {
    return handleApiError(error);
  }
}
