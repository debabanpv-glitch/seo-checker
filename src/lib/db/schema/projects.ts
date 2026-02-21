import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// --- projects table ---
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug'),
  domain: text('project_domain'),
  website: text('website'),
  industry: text('industry'),
  sheet_id: text('sheet_id').notNull().default(''),
  sheet_name: text('sheet_name').notNull().default(''),
  monthly_target: integer('monthly_target').notNull().default(20),
  ranking_sheet_url: text('ranking_sheet_url'),
  gsc_property: text('gsc_property'),
  status: text('status').notNull().default('active'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

// --- tasks table ---
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  project_id: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  stt: integer('stt').notNull().default(0),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  parent_keyword: text('parent_keyword').notNull().default(''),
  keyword_sub: text('keyword_sub').notNull().default(''),
  keyword_count: integer('keyword_count').notNull().default(0),
  keywords_list: text('keywords_list', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  search_volume: integer('search_volume').notNull().default(0),
  title: text('title').notNull().default(''),
  outline: text('outline').notNull().default(''),
  timeline_outline: text('timeline_outline').notNull().default(''),
  status_outline: text('status_outline').notNull().default(''),
  pic: text('pic').notNull().default(''),
  content_file: text('content_file').notNull().default(''),
  deadline: text('deadline'),
  status_content: text('status_content').notNull().default(''),
  link_publish: text('link_publish').notNull().default(''),
  publish_date: text('publish_date'),
  note: text('note').notNull().default(''),
  month_year: text('month_year').notNull().default(''),
  category: text('category').notNull().default('content'), // content | technical | linkbuilding | onpage | audit
  priority: text('priority').notNull().default('medium'), // critical | high | medium | low
  estimated_hours: integer('estimated_hours').notNull().default(0),
  actual_result: text('actual_result').notNull().default(''),
  source: text('source').notNull().default('sheets'), // sheets | claude-code | manual
  assigned_to: text('assigned_to').notNull().default('human'), // human | claude
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// --- monthly_targets table ---
export const monthlyTargets = sqliteTable('monthly_targets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  project_id: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  target: integer('target').notNull().default(20),
}, (t) => ({
  uniqueProjectMonthYear: uniqueIndex('monthly_targets_project_month_year_idx')
    .on(t.project_id, t.month, t.year),
}));
