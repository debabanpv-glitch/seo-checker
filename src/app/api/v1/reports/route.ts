import { NextRequest, NextResponse } from 'next/server';
import { getReports, createReport } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const projectId = sp.get('project_id') ?? undefined;
    const year = sp.get('year') ? Number(sp.get('year')) : undefined;
    return NextResponse.json({ reports: getReports(projectId, year) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.month || !body.year) {
      return NextResponse.json({ error: 'month and year are required' }, { status: 400 });
    }
    const report = createReport(body);
    return NextResponse.json({ report });
  } catch (error) {
    return handleApiError(error);
  }
}
