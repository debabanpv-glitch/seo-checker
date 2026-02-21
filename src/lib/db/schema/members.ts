import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// --- members table ---
export const members = sqliteTable('members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  nickname: text('nickname'),
  role: text('role').notNull().default('Content Writer'),
  projects: text('projects', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  start_date: text('start_date'),
  email: text('email'),
  phone: text('phone'),
  bank_name: text('bank_name'),
  bank_account: text('bank_account'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// --- salary_payments table ---
export const salaryPayments = sqliteTable('salary_payments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  member_name: text('member_name').notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  amount: real('amount').notNull().default(0),
}, (t) => ({
  uniqueMemberMonthYear: uniqueIndex('salary_payments_member_month_year_idx')
    .on(t.member_name, t.month, t.year),
}));
