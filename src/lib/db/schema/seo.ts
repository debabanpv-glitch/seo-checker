import { pgTable, text, integer, real, boolean, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';
import { topicClusters } from './topic-clusters';

// --- seo_results table ---
export const seoResults = pgTable('seo_results', {
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
  details: jsonb('details').$type<unknown[]>().notNull().default(sql`'[]'::jsonb`),
  links: jsonb('links').$type<{ internal: unknown[]; external: unknown[] }>().notNull().default(sql`'{"internal":[],"external":[]}'::jsonb`),
  keywords: jsonb('keywords').$type<{ primary: string; sub: string[] }>().notNull().default(sql`'{"primary":"","sub":[]}'::jsonb`),
  checked_at: text('checked_at').notNull().default(sql`now()`),
});

// --- keyword_rankings table ---
// --- keywords master table (1 dòng / từ khóa / dự án) ---
export const keywords = pgTable('keywords', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  keyword: text('keyword').notNull(),
  project_id: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  keyword_type: text('keyword_type'), // 'cam_ket' | 'blog' | 'topic'
  search_intent: text('search_intent'), // informational | commercial | transactional | navigational
  search_volume: integer('search_volume'),
  difficulty: integer('difficulty'), // 0-100
  is_committed: boolean('is_committed').notNull().default(false),
  cluster_id: text('cluster_id').references(() => topicClusters.id, { onDelete: 'set null' }),
  created_at: text('created_at').notNull().default(sql`now()`),
  updated_at: text('updated_at').notNull().default(sql`now()`),
});

export const keywordRankings = pgTable('keyword_rankings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  keyword: text('keyword').notNull(),
  url: text('url').notNull().default(''),
  position: real('position').notNull(),
  date: text('date').notNull(),
  project_id: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  source: text('source').notNull().default('sheets'), // sheets | claude-code | gsc
  ranking_tier: text('ranking_tier'), // Top 1-3, Top 4-5, Top 6-10, Out Top 10
  keyword_type: text('keyword_type'), // KW Cam ket, KW Blog, etc.
  is_tracked: boolean('is_tracked').notNull().default(false),
  keyword_batch: text('keyword_batch').notNull().default('legacy'), // 'legacy' | 'new'
  cluster_id: text('cluster_id').references(() => topicClusters.id, { onDelete: 'set null' }),
  keyword_id: text('keyword_id').references(() => keywords.id, { onDelete: 'set null' }),
});
