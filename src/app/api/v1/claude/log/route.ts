import { NextRequest, NextResponse } from 'next/server';
import { getActivities, logActivity } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const project_slug = sp.get('project_slug') ?? undefined;
    const activity_type = sp.get('activity_type') ?? undefined;
    const limitParam = sp.get('limit');
    const limit = limitParam ? parseInt(limitParam) : undefined;
    return NextResponse.json({ logs: getActivities({ project_slug, activity_type, limit }) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.activity_type || !body.title) {
      return NextResponse.json({ error: 'activity_type and title are required' }, { status: 400 });
    }
    const activity = logActivity(body);
    return NextResponse.json({ activity });
  } catch (error) {
    return handleApiError(error);
  }
}
