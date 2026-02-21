import { NextResponse } from 'next/server';
import { syncAllProjects, getSyncLogs } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET() {
  try {
    const logs = getSyncLogs(10);
    return NextResponse.json({ logs });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST() {
  try {
    const result = await syncAllProjects();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
