import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

// --- topic_clusters: nhóm chủ đề SEO (pillar + supporting pages) ---
export const topicClusters = sqliteTable('topic_clusters', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  pillar_url: text('pillar_url').notNull().default(''),
  project_id: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  description: text('description').notNull().default(''),
  target_keyword_count: integer('target_keyword_count').notNull().default(0), // mục tiêu số KW
  target_page_count: integer('target_page_count').notNull().default(0), // mục tiêu số bài
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// --- topic_cluster_pages: bài viết trong cluster + trạng thái internal link ---
export const topicClusterPages = sqliteTable('topic_cluster_pages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  cluster_id: text('cluster_id').notNull().references(() => topicClusters.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  title: text('title').notNull().default(''),
  role: text('role').notNull().default('supporting'), // pillar | supporting | related
  has_link_to_pillar: integer('has_link_to_pillar', { mode: 'boolean' }).notNull().default(false),
  has_link_from_pillar: integer('has_link_from_pillar', { mode: 'boolean' }).notNull().default(false),
  anchor_to_pillar: text('anchor_to_pillar').notNull().default(''), // anchor text dùng khi link về pillar
  anchor_from_pillar: text('anchor_from_pillar').notNull().default(''), // anchor text pillar dùng khi link tới bài
  notes: text('notes').notNull().default(''),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// --- cross_cluster_links: link giữa các clusters khác nhau (Semantic Bridge) ---
export const crossClusterLinks = sqliteTable('cross_cluster_links', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  source_cluster_id: text('source_cluster_id').notNull().references(() => topicClusters.id, { onDelete: 'cascade' }),
  target_cluster_id: text('target_cluster_id').notNull().references(() => topicClusters.id, { onDelete: 'cascade' }),
  source_url: text('source_url').notNull().default(''),
  target_url: text('target_url').notNull().default(''),
  anchor_text: text('anchor_text').notNull().default(''),
  relationship: text('relationship').notNull().default('related'), // prerequisite | consequence | alternative | component | example | related
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});
