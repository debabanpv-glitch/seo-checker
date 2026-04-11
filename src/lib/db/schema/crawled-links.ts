import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

// --- crawl_sessions: mỗi lần chạy crawler tạo 1 session ---
export const crawlSessions = sqliteTable('crawl_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  project_id: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull(),
  start_url: text('start_url').notNull(),
  total_pages: integer('total_pages').notNull().default(0),
  total_links: integer('total_links').notNull().default(0),
  internal_links: integer('internal_links').notNull().default(0),
  external_links: integer('external_links').notNull().default(0),
  pages_200: integer('pages_200').notNull().default(0),
  pages_error: integer('pages_error').notNull().default(0),
  crawl_duration_sec: integer('crawl_duration_sec').notNull().default(0),
  crawled_at: text('crawled_at').notNull().default(sql`(datetime('now'))`),
});

// --- crawled_pages: mỗi URL đã crawl + title + HTTP status + SEO details ---
export const crawledPages = sqliteTable('crawled_pages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  session_id: text('session_id').notNull().references(() => crawlSessions.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  title: text('title').notNull().default(''),
  http_status: integer('http_status').notNull().default(0),
  error: text('error'),
  // SEO details (added for full page audit)
  meta_description: text('meta_description').default(''),
  h1: text('h1').default(''),
  h1_count: integer('h1_count').default(0),
  h2_h6_count: integer('h2_h6_count').default(0),
  word_count: integer('word_count').default(0),
  images_count: integer('images_count').default(0),
  images_without_alt: integer('images_without_alt').default(0),
  meta_keywords: text('meta_keywords').default(''),
  og_title: text('og_title').default(''),
  og_description: text('og_description').default(''),
  og_image: text('og_image').default(''),
  canonical_url: text('canonical_url').default(''),
  schema_types: text('schema_types').default(''),   // comma-separated: "Article,WebPage"
  robots_meta: text('robots_meta').default(''),      // e.g. "index,follow" or "noindex"
});

// --- crawled_links: mỗi link tìm thấy trên page ---
export const crawledLinks = sqliteTable('crawled_links', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  session_id: text('session_id').notNull().references(() => crawlSessions.id, { onDelete: 'cascade' }),
  source_url: text('source_url').notNull(),
  target_url: text('target_url').notNull(),
  anchor_text: text('anchor_text').notNull().default(''),
  position: text('position').notNull().default('content'), // navigation | header | footer | sidebar | content
  link_type: text('link_type').notNull().default('internal'), // internal | external
  nofollow: integer('nofollow', { mode: 'boolean' }).notNull().default(false),
});
