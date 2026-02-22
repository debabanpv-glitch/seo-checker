import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

// --- strategy_phases table ---
export const strategyPhases = sqliteTable('strategy_phases', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  project_id: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  phase_type: text('phase_type').notNull().default('short_term'), // 'short_term' | 'long_term'
  priority: integer('priority').notNull().default(0),
  start_date: text('start_date'),
  end_date: text('end_date'),
  status: text('status').notNull().default('planned'), // planned | in_progress | completed | blocked
  progress: integer('progress').notNull().default(0),
  dependencies: text('dependencies', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// --- strategy_actions table ---
export const strategyActions = sqliteTable('strategy_actions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  phase_id: text('phase_id').notNull().references(() => strategyPhases.id, { onDelete: 'cascade' }),
  project_id: text('project_id').references(() => projects.id),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category'), // 'technical' | 'content' | 'links' | 'authority'
  priority: text('priority').notNull().default('medium'), // critical | high | medium | low
  assigned_to: text('assigned_to'),
  status: text('status').notNull().default('todo'), // todo | doing | done | blocked
  due_date: text('due_date'),
  completed_date: text('completed_date'),
  result: text('result'),
  executor_type: text('executor_type').notNull().default('human'), // human | ai
  ai_prompt: text('ai_prompt'), // prompt for AI to execute this action
  platform_type: text('platform_type'), // wordpress | nextjs | custom | other
  implementation_notes: text('implementation_notes'), // step-by-step instructions
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// --- strategy_execution_logs table ---
export const strategyExecutionLogs = sqliteTable('strategy_execution_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  action_id: text('action_id').notNull().references(() => strategyActions.id, { onDelete: 'cascade' }),
  project_id: text('project_id').references(() => projects.id),
  executor: text('executor').notNull().default('human'), // human | ai_chat | wp_api
  started_at: text('started_at').notNull().default(sql`(datetime('now'))`),
  completed_at: text('completed_at'),
  status: text('status').notNull().default('running'), // running | success | failed
  prompt_used: text('prompt_used'),
  result_text: text('result_text'),
  error: text('error'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});
