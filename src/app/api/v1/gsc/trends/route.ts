import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gscSnapshots, projects } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { handleApiError, AppError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const projectId = sp.get('project_id');
    const period = sp.get('period') ?? undefined;

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    // Verify project exists
    const project = db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
    if (!project) throw new AppError('Project not found', 404);

    const rows = db.select().from(gscSnapshots)
      .where(eq(gscSnapshots.project_id, projectId))
      .orderBy(desc(gscSnapshots.date))
      .all()
      .filter((r) => (period ? r.period === period : true));

    return NextResponse.json({ trends: rows });
  } catch (error) {
    return handleApiError(error);
  }
}
