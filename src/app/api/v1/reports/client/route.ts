import { NextRequest, NextResponse } from 'next/server';
import { generateClientReport } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const projectId = sp.get('project_id') ?? undefined;
    const period = (sp.get('period') ?? 'weekly') as 'weekly' | 'monthly';
    const format = (sp.get('format') ?? 'text') as 'text' | 'html';
    const sectionsParam = sp.get('sections') ?? 'overview,traffic,keywords,content,backlinks,seo,actions';
    const sections = sectionsParam.split(',').filter(Boolean) as any[];

    const report = generateClientReport(projectId, { period, sections, format });
    return NextResponse.json(report);
  } catch (error) {
    return handleApiError(error);
  }
}
