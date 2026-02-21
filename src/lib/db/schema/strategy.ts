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
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
