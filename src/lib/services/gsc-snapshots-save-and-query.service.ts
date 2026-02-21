import { db } from '@/lib/db';
import { gscSnapshots, projects } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { AppError } from '@/lib/api-response';

// ---------------------------------------------------------------------------
// Helper: resolve project_id from project_slug
// ---------------------------------------------------------------------------

function resolveProjectId(project_slug: string): string {
  const project = db.select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, project_slug))
    .get();
  if (!project) throw new AppError(`Project not found for slug: ${project_slug}`, 404);
  return project.id;
}

// ---------------------------------------------------------------------------
// GSC Snapshots
// ---------------------------------------------------------------------------

export function saveSnapshot(data: {
  project_slug: string;
  date: string;
  period?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  top_queries?: unknown;
  top_pages?: unknown;
}) {
  const project_id = resolveProjectId(data.project_slug);
  const period = data.period ?? 'weekly';

  return db.insert(gscSnapshots).values({
    project_id,
    date: data.date,
    period,
    clicks: data.clicks,
    impressions: data.impressions,
    ctr: data.ctr,
    position: data.position,
    top_queries: data.top_queries ?? null,
    top_pages: data.top_pages ?? null,
  }).onConflictDoUpdate({
    target: [gscSnapshots.project_id, gscSnapshots.date, gscSnapshots.period],
    set: {
      clicks: data.clicks,
      impressions: data.impressions,
      ctr: data.ctr,
      position: data.position,
      top_queries: data.top_queries ?? null,
      top_pages: data.top_pages ?? null,
    },
  }).returning().get();
}

export function getSnapshots(projectId: string, limit?: number) {
  const rows = db.select().from(gscSnapshots)
    .where(eq(gscSnapshots.project_id, projectId))
    .orderBy(desc(gscSnapshots.date))
    .all();

  if (limit && limit > 0) return rows.slice(0, limit);
  return rows;
}
