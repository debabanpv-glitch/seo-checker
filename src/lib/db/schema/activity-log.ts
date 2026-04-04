import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

// --- activity_log table ---
export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  source: text('source').notNull(),
  action: text('action').notNull(),
  description: text('description').notNull(),
  project_id: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  entity_type: text('entity_type'),
  entity_id: text('entity_id'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});
