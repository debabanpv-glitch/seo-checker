import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// --- app_config table (key-value settings store) ---
export const appConfig = sqliteTable('app_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text('key').notNull(),
  value: text('value').notNull().default(''),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  uniqueKey: uniqueIndex('app_config_key_idx').on(t.key),
}));
