import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// --- sync_logs table ---
export const syncLogs = sqliteTable('sync_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  project_id: text('project_id'),
  project_name: text('project_name'),
  status: text('status').notNull().default('running'),
  tasks_synced: integer('tasks_synced').notNull().default(0),
  projects_synced: integer('projects_synced').notNull().default(0),
  duration_ms: integer('duration_ms'),
  error: text('error'),
  started_at: text('started_at').notNull().default(sql`(datetime('now'))`),
  completed_at: text('completed_at'),
});
