import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

// --- backlinks table ---
export const backlinks = sqliteTable('backlinks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  project_id: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  keyword: text('keyword').notNull(),
  anchor_text_before: text('anchor_text_before').notNull().default(''),
  anchor_text_after: text('anchor_text_after').notNull().default(''),
  target_url: text('target_url').notNull(),
  source_url: text('source_url').notNull(),
  source_domain: text('source_domain').notNull().default(''),
  dofollow: integer('dofollow', { mode: 'boolean' }).notNull().default(true),
  order_name: text('order_name').notNull().default(''),
  ads_id: integer('ads_id'),
  start_date: text('start_date'),
  end_date: text('end_date'),
  // Status check fields
  status: text('status').notNull().default('unknown'), // unknown | alive | dead | error
  last_checked_at: text('last_checked_at'),
  http_status: integer('http_status'),
  anchor_found: integer('anchor_found', { mode: 'boolean' }).notNull().default(false),
  link_found: integer('link_found', { mode: 'boolean' }).notNull().default(false),
  check_error: text('check_error'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// --- backlink_tracking table ---
export const backlinkTracking = sqliteTable('backlink_tracking', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  backlink_id: text('backlink_id').notNull().references(() => backlinks.id, { onDelete: 'cascade' }),
  keyword: text('keyword').notNull(),
  position: real('position'),
  clicks: integer('clicks').notNull().default(0),
  impressions: integer('impressions').notNull().default(0),
  checked_at: text('checked_at').notNull().default(sql`(datetime('now'))`),
});
