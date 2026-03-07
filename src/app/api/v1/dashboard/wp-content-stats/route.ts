import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema/projects';
import { eq } from 'drizzle-orm';
import { handleApiError } from '@/lib/api-response';
import { getWPContentStats } from '@/lib/services/wordpress-content-stats.service';
import { getAppConfig } from '@/lib/services/app-config-crud.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allProjects = db.select().from(projects)
      .where(eq(projects.status, 'active'))
      .all();

    const targetsJson = getAppConfig('wp_monthly_content_targets')?.value;
    const targets: Record<string, number> = targetsJson ? JSON.parse(targetsJson) : {};

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const timePct = Math.round((daysPassed / daysInMonth) * 100);

    const results = await Promise.all(
      allProjects.map(async (proj) => {
        const stats = await getWPContentStats(proj.id);
        const target = targets[proj.id] ?? 0;
        const pct = target > 0 ? Math.round((stats.postsThisMonth / target) * 100) : 0;
        const onTrack = target > 0 ? pct >= timePct : true;

        return {
          projectId: proj.id,
          projectName: proj.name,
          domain: proj.domain,
          ...stats,
          monthlyTarget: target,
          progressPct: pct,
          onTrack,
        };
      })
    );

    return NextResponse.json({
      projects: results.filter((r) => r.configured),
      month: {
        daysPassed,
        daysInMonth,
        timePct,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
