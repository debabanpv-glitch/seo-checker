import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// --- notion_tasks table ---
export const notionTasks = sqliteTable('notion_tasks', {
  notion_page_id: text('notion_page_id').primaryKey(),
  task_name: text('task_name').notNull(),
  project: text('project'),
  category: text('category'),
  status: text('status'),
  priority: text('priority'),
  deadline: text('deadline'),
  assignee: text('assignee'),
  notes: text('notes'),
  synced_at: text('synced_at').notNull().default(sql`(datetime('now'))`),
});

// --- notion_content table ---
export const notionContent = sqliteTable('notion_content', {
  notion_page_id: text('notion_page_id').primaryKey(),
  title: text('title').notNull(),
  project: text('project'),
  work_type: text('work_type'),
  status: text('status'),
  target_keyword: text('target_keyword'),
  page_url: text('page_url'),
  word_count: integer('word_count'),
  onpage_score: integer('onpage_score'),
  publish_date: text('publish_date'),
  assignee: text('assignee'),
  reviewer: text('reviewer'),
  synced_at: text('synced_at').notNull().default(sql`(datetime('now'))`),
});

// --- notion_backlinks table ---
export const notionBacklinks = sqliteTable('notion_backlinks', {
  notion_page_id: text('notion_page_id').primaryKey(),
  source_url: text('source_url').notNull(),
  target_url: text('target_url').notNull(),
  anchor_text: text('anchor_text'),
  dr: integer('dr'),
  da: integer('da'),
  follow_type: text('follow_type'),
  link_type: text('link_type'),
  status: text('status'),
  build_date: text('build_date'),
  project: text('project'),
  synced_at: text('synced_at').notNull().default(sql`(datetime('now'))`),
});

// --- notion_keywords table ---
export const notionKeywords = sqliteTable('notion_keywords', {
  notion_page_id: text('notion_page_id').primaryKey(),
  keyword: text('keyword').notNull(),
  project: text('project'),
  volume: integer('volume'),
  kd: integer('kd'),
  cpc: real('cpc'),
  intent: text('intent'),
  funnel: text('funnel'),
  topic_group: text('topic_group'),
  current_position: real('current_position'),
  target_position: integer('target_position'),
  target_url: text('target_url'),
  status: text('status'),
  synced_at: text('synced_at').notNull().default(sql`(datetime('now'))`),
});

// --- notion_competitors table ---
export const notionCompetitors = sqliteTable('notion_competitors', {
  notion_page_id: text('notion_page_id').primaryKey(),
  competitor_name: text('competitor_name').notNull(),
  website: text('website'),
  da: integer('da'),
  dr: integer('dr'),
  organic_traffic: integer('organic_traffic'),
  backlink_count: integer('backlink_count'),
  keyword_count: integer('keyword_count'),
  strengths: text('strengths'),
  weaknesses: text('weaknesses'),
  opportunities: text('opportunities'),
  project: text('project'),
  synced_at: text('synced_at').notNull().default(sql`(datetime('now'))`),
});
