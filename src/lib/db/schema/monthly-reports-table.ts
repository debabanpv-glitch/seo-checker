import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const monthlyReports = sqliteTable('monthly_reports', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  project_id: text('project_id'),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  status: text('status').default('draft'), // draft | generated | sent
  content: text('content', { mode: 'json' }),
  file_path: text('file_path'),
  gsc_data: text('gsc_data', { mode: 'json' }),
  ranking_data: text('ranking_data', { mode: 'json' }),
  content_data: text('content_data', { mode: 'json' }),
  technical_data: text('technical_data', { mode: 'json' }),
  highlights: text('highlights'),
  next_month_plan: text('next_month_plan'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => ({
  unq: unique().on(table.project_id, table.month, table.year),
}));
