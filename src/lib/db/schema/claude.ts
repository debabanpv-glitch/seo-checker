import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

// --- claude_activities table ---
export const claudeActivities = sqliteTable('claude_activities', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  project_id: text('project_id').references(() => projects.id),
  project_slug: text('project_slug'),
  activity_type: text('activity_type').notNull(), // content_draft | seo_audit | report | analysis | technical_fix | api_call | general
  title: text('title').notNull(),
  description: text('description'),
  input_data: text('input_data', { mode: 'json' }).$type<unknown>(),
  output_data: text('output_data', { mode: 'json' }).$type<unknown>(),
  status: text('status').notNull().default('completed'),
  worker: text('worker').notNull().default('claude-code'), // claude-code | claude-chat | web-ui
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});
