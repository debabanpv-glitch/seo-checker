import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const auditResults = sqliteTable('audit_results', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  project_id: text('project_id'),
  audit_type: text('audit_type').notNull(), // 'screaming_frog' | 'custom' | 'gsc'
  audit_date: text('audit_date').notNull(),
  summary: text('summary', { mode: 'json' }), // JSON: {total_urls, errors, warnings...}
  details: text('details', { mode: 'json' }), // JSON: per-URL details
  raw_file: text('raw_file'), // path to original CSV
  source: text('source').default('manual'), // 'manual' | 'claude-code'
  created_at: text('created_at').default(sql`(datetime('now'))`),
});
