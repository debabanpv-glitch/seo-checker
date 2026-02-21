import { NextRequest, NextResponse } from 'next/server';
import { getRankingGrowth } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const projectId = sp.get('projectId') || undefined;
    const days = parseInt(sp.get('days') || '30');
    return NextResponse.json(getRankingGrowth(projectId, days));
  } catch (error) {
    return handleApiError(error);
  }
}
