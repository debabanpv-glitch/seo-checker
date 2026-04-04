import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

// --- sheet_content table ---
export const sheetContent = sqliteTable('sheet_content', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  project_id: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  stt: integer('stt'),
  year: integer('year'),
  month: integer('month'),
  parent_keyword: text('parent_keyword'),
  sub_keywords: text('sub_keywords'),
  search_volume: integer('search_volume'),
  title: text('title'),
  outline_status: text('outline_status'),
  pic: text('pic'),
  doc_file: text('doc_file'),
  deadline: text('deadline'),
  content_status: text('content_status'),
  publish_url: text('publish_url'),
  publish_date: text('publish_date'),
  notes: text('notes'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
