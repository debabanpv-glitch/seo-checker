import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

// --- gsc_snapshots table ---
export const gscSnapshots = sqliteTable('gsc_snapshots', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  project_id: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  period: text('period').notNull().default('weekly'), // daily | weekly | monthly
  clicks: integer('clicks').notNull().default(0),
  impressions: integer('impressions').notNull().default(0),
  ctr: real('ctr').notNull().default(0),
  position: real('position').notNull().default(0),
  top_queries: text('top_queries', { mode: 'json' }).$type<unknown>(),
  top_pages: text('top_pages', { mode: 'json' }).$type<unknown>(),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  uniqueProjectDatePeriod: uniqueIndex('gsc_snapshots_project_date_period_idx')
    .on(t.project_id, t.date, t.period),
}));
