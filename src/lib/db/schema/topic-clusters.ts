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
  notes: text('notes').notNull().default(''),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});
