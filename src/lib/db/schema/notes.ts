import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

// --- notes table ---
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  project_id: text('project_id').references(() => projects.id),
  title: text('title').notNull(),
  content: text('content'),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
  source: text('source').notNull().default('manual'), // manual | claude-code
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});
