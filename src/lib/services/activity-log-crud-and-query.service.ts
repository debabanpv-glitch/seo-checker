// ---------------------------------------------------------------------------
// Activity Log CRUD & Query — unified event stream across all sources
// Sources: notion, sheet, gsc, wp, audit, manual
// ---------------------------------------------------------------------------

import { db } from '@/lib/db';
import { activityLog } from '@/lib/db/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ActivityLogRow {
  id: string;
  source: string;
  action: string;
  description: string;
  project_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

// ── Create ─────────────────────────────────────────────────────────────────

export function createActivity(data: {
  source: string;
  action: string;
  description: string;
  project_id?: string;
  entity_type?: string;
  entity_id?: string;
}): ActivityLogRow {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.insert(activityLog).values({
    id,
    source: data.source,
    action: data.action,
    description: data.description,
    project_id: data.project_id ?? null,
    entity_type: data.entity_type ?? null,
    entity_id: data.entity_id ?? null,
    created_at,
  }).run();

  return {
    id,
    source: data.source,
    action: data.action,
    description: data.description,
    project_id: data.project_id ?? null,
    entity_type: data.entity_type ?? null,
    entity_id: data.entity_id ?? null,
    created_at,
  };
}

// ── Read ───────────────────────────────────────────────────────────────────

export function getRecentActivities(limit = 30, projectId?: string): ActivityLogRow[] {
  const conditions = [];
  if (projectId) conditions.push(eq(activityLog.project_id, projectId));

  const where = conditions.length ? and(...conditions) : undefined;
  return db.select().from(activityLog)
    .where(where)
    .orderBy(desc(activityLog.created_at))
    .limit(limit)
    .all() as ActivityLogRow[];
}

export function getActivitiesBySource(source: string, limit = 20): ActivityLogRow[] {
  return db.select().from(activityLog)
    .where(eq(activityLog.source, source))
    .orderBy(desc(activityLog.created_at))
    .limit(limit)
    .all() as ActivityLogRow[];
}

export function getActivitiesByDateRange(
  from: string,
  to: string,
  projectId?: string
): ActivityLogRow[] {
  const conditions = [
    gte(activityLog.created_at, from),
    lte(activityLog.created_at, to),
  ];
  if (projectId) conditions.push(eq(activityLog.project_id, projectId));

  return db.select().from(activityLog)
    .where(and(...conditions))
    .orderBy(desc(activityLog.created_at))
    .all() as ActivityLogRow[];
}
