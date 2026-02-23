import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

// --- seo_results table ---
export const seoResults = sqliteTable('seo_results', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  url: text('url').notNull().unique(),
  score: integer('score').notNull().default(0),
  max_score: integer('max_score').notNull().default(100),
  content_score: integer('content_score').notNull().default(0),
  content_max: integer('content_max').notNull().default(0),
  images_score: integer('images_score').notNull().default(0),
  images_max: integer('images_max').notNull().default(0),
  technical_score: integer('technical_score').notNull().default(0),
  technical_max: integer('technical_max').notNull().default(0),
  details: text('details', { mode: 'json' }).$type<unknown[]>().notNull().default(sql`'[]'`),
  links: text('links', { mode: 'json' }).$type<{ internal: unknown[]; external: unknown[] }>().notNull().default(sql`'{"internal":[],"external":[]}'`),
  keywords: text('keywords', { mode: 'json' }).$type<{ primary: string; sub: string[] }>().notNull().default(sql`'{"primary":"","sub":[]}'`),
  checked_at: text('checked_at').notNull().default(sql`(datetime('now'))`),
});

// --- keyword_rankings table ---
export const keywordRankings = sqliteTable('keyword_rankings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  keyword: text('keyword').notNull(),
  url: text('url').notNull().default(''),
  position: real('position').notNull(),
  date: text('date').notNull(),
  project_id: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  source: text('source').notNull().default('sheets'), // sheets | claude-code | gsc
  ranking_tier: text('ranking_tier'), // Top 1-3, Top 4-5, Top 6-10, Out Top 10
  keyword_type: text('keyword_type'), // KW Cam kết, KW Blog, etc.
  is_tracked: integer('is_tracked', { mode: 'boolean' }).notNull().default(false),
});
