import { NextRequest, NextResponse } from 'next/server';
import {
  getRecentActivities,
  getActivitiesByDateRange,
  createActivity,
} from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const limit = parseInt(sp.get('limit') ?? '50');
    const projectId = sp.get('project_id') ?? undefined;
    const from = sp.get('from');
    const to = sp.get('to');

    if (from && to) {
      const activities = await getActivitiesByDateRange(from, to, projectId);
      return NextResponse.json({ activities });
    }

    const activities = await getRecentActivities(limit, projectId);
    return NextResponse.json({ activities });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, action, description, project_id, entity_type, entity_id } = body;

    if (!source || !action || !description) {
      return NextResponse.json(
        { error: 'source, action, and description are required' },
        { status: 400 }
      );
    }

    const activity = await createActivity({
      source,
      action,
      description,
      project_id,
      entity_type,
      entity_id,
    });

    return NextResponse.json({ success: true, activity });
  } catch (error) {
    return handleApiError(error);
  }
}
