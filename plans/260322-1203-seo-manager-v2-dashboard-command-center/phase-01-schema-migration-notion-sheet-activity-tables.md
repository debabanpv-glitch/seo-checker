# Phase 1: Schema & Migration — Notion, Sheet Content, Activity Log Tables

**Effort:** 2h | **Depends on:** nothing | **Blocks:** P2, P3

## Goal
Create 7 new SQLite tables via direct SQL (better-sqlite3 `db.exec()`), plus Drizzle schema files for type-safe queries.

## New Files

### 1. `src/lib/db/schema/notion.ts`
Drizzle schema definitions for 5 Notion tables:

```typescript
// notion_tasks
sqliteTable('notion_tasks', {
  notion_page_id: text('notion_page_id').primaryKey(),
  task_name: text('task_name').notNull(),
  project: text('project'),           // project slug or name (mapped to project_id at query time)
  category: text('category'),         // Technical SEO, Content, On-Page, etc.
  status: text('status'),             // Not started, In progress, Done
  priority: text('priority'),         // High, Medium, Low
  deadline: text('deadline'),
  assignee: text('assignee'),
  notes: text('notes'),
  synced_at: text('synced_at').notNull().default(sql`(datetime('now'))`),
})

// notion_content
sqliteTable('notion_content', {
  notion_page_id: text('notion_page_id').primaryKey(),
  title: text('title').notNull(),
  project: text('project'),
  work_type: text('work_type'),       // New, Rewrite, Update, etc.
  status: text('status'),             // Draft, Writing, Review, Published
  target_keyword: text('target_keyword'),
  page_url: text('page_url'),
  word_count: integer('word_count'),
  onpage_score: integer('onpage_score'),
  publish_date: text('publish_date'),
  assignee: text('assignee'),
  reviewer: text('reviewer'),
  synced_at: text('synced_at').notNull().default(sql`(datetime('now'))`),
})

// notion_backlinks
sqliteTable('notion_backlinks', {
  notion_page_id: text('notion_page_id').primaryKey(),
  source_url: text('source_url').notNull(),
  target_url: text('target_url').notNull(),
  anchor_text: text('anchor_text'),
  dr: integer('dr'),
  da: integer('da'),
  follow_type: text('follow_type'),   // dofollow, nofollow
  link_type: text('link_type'),       // guest-post, directory, forum, etc.
  status: text('status'),             // active, lost, pending
  build_date: text('build_date'),
  project: text('project'),
  synced_at: text('synced_at').notNull().default(sql`(datetime('now'))`),
})

// notion_keywords
sqliteTable('notion_keywords', {
  notion_page_id: text('notion_page_id').primaryKey(),
  keyword: text('keyword').notNull(),
  project: text('project'),
  volume: integer('volume'),
  kd: integer('kd'),
  cpc: real('cpc'),
  intent: text('intent'),             // informational, transactional, navigational
  funnel: text('funnel'),             // TOFU, MOFU, BOFU
  topic_group: text('topic_group'),
  current_position: real('current_position'),
  target_position: integer('target_position'),
  target_url: text('target_url'),
  status: text('status'),             // tracking, target, achieved
  synced_at: text('synced_at').notNull().default(sql`(datetime('now'))`),
})

// notion_competitors
sqliteTable('notion_competitors', {
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
})
```

### 2. `src/lib/db/schema/sheet-content.ts`
```typescript
sqliteTable('sheet_content', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  project_id: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  stt: integer('stt'),
  year: integer('year'),
  month: integer('month'),
  parent_keyword: text('parent_keyword'),
  sub_keywords: text('sub_keywords'),
  search_volume: integer('search_volume'),
  title: text('title'),
  outline_status: text('outline_status'),
  pic: text('pic'),
  doc_file: text('doc_file'),
  deadline: text('deadline'),
  content_status: text('content_status'),
  publish_url: text('publish_url'),
  publish_date: text('publish_date'),
  notes: text('notes'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
})
```

### 3. `src/lib/db/schema/activity-log.ts`
```typescript
sqliteTable('activity_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  source: text('source').notNull(),           // notion, sheet, gsc, wp, audit, manual
  action: text('action').notNull(),           // created, updated, synced, published, etc.
  description: text('description').notNull(),
  project_id: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  entity_type: text('entity_type'),           // task, content, keyword, backlink, etc.
  entity_id: text('entity_id'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
})
```

### 4. `src/lib/db/schema/index.ts` — MODIFY
Add 3 new exports:
```typescript
export * from './notion';
export * from './sheet-content';
export * from './activity-log';
```

### 5. Migration Script: `scripts/migrations/add-v2-dashboard-tables.ts`
Direct SQL via `db.exec()` to CREATE TABLE IF NOT EXISTS for all 7 tables. Run once manually.

## Acceptance Criteria
- [ ] All 7 tables creatable via migration script
- [ ] Drizzle schema matches SQL exactly
- [ ] `schema/index.ts` exports all new tables
- [ ] No existing table modified
- [ ] TypeScript compiles with 0 errors

## Notes
- `notion_*` tables use `text` for flexible fields — avoids migration when Notion DB structure changes
- `project` column in notion_* is a slug/name string, not FK — mapped to project_id at service layer
- Existing `sync_logs` table untouched — `activity_log` is the new unified stream
