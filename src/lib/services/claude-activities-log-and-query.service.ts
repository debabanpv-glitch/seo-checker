import { db } from '@/lib/db';
import { claudeActivities, projects } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Helper: resolve project_id from project_slug
// ---------------------------------------------------------------------------

function resolveProjectId(project_slug: string): string | null {
  const project = db.select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, project_slug))
    .get();
  return project?.id ?? null;
}

// ---------------------------------------------------------------------------
// Claude Activities
// ---------------------------------------------------------------------------

export function getActivities(filters?: {
  project_slug?: string;
  activity_type?: string;
  limit?: number;
}) {
  const query = db.select().from(claudeActivities).orderBy(desc(claudeActivities.created_at));

  // Drizzle sqlite doesn't support chained dynamic where easily, so build result then filter
  const all = query.all();

  let result = all;

  if (filters?.project_slug) {
    result = result.filter((a) => a.project_slug === filters.project_slug);
  }
  if (filters?.activity_type) {
    result = result.filter((a) => a.activity_type === filters.activity_type);
  }
  if (filters?.limit && filters.limit > 0) {
    result = result.slice(0, filters.limit);
  }

  return result;
}

export function logActivity(data: {
  project_slug?: string;
  activity_type: string;
  title: string;
  description?: string;
  input_data?: unknown;
  output_data?: unknown;
  worker?: string;
  status?: string;
}) {
  const project_id = data.project_slug ? resolveProjectId(data.project_slug) : null;

  return db.insert(claudeActivities).values({
    project_id: project_id ?? undefined,
    project_slug: data.project_slug ?? null,
    activity_type: data.activity_type,
    title: data.title,
    description: data.description ?? null,
    input_data: data.input_data ?? null,
    output_data: data.output_data ?? null,
    status: data.status ?? 'completed',
    worker: data.worker ?? 'claude-code',
  }).returning().get();
}
