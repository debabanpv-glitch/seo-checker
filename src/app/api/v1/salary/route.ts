import { NextRequest, NextResponse } from 'next/server';
import { getSalaryData } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const month = parseInt(sp.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(sp.get('year') || String(new Date().getFullYear()));
    const projectId = sp.get('project') || undefined;
    return NextResponse.json(getSalaryData(month, year, projectId));
  } catch (error) {
    return handleApiError(error);
  }
}
