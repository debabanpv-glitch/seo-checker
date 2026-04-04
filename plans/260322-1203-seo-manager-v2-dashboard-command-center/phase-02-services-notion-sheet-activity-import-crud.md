# Phase 2: Services — Notion Import, Sheet Content Import, Activity Log CRUD

**Effort:** 3h | **Depends on:** P1 | **Blocks:** P4

## Goal
Create 3 sync services: Notion JSON upsert, Sheet CSV import, and activity log CRUD. All sync functions, no async.

## New Files

### 1. `src/lib/services/notion-data-import.service.ts`

**Design:** Accept JSON arrays for any of the 5 Notion tables. Upsert by `notion_page_id`. Log to `activity_log`.

```typescript
// Exported functions:
upsertNotionTasks(data: NotionTaskInput[]): { inserted: number; updated: number }
upsertNotionContent(data: NotionContentInput[]): { inserted: number; updated: number }
upsertNotionBacklinks(data: NotionBacklinkInput[]): { inserted: number; updated: number }
upsertNotionKeywords(data: NotionKeywordInput[]): { inserted: number; updated: number }
upsertNotionCompetitors(data: NotionCompetitorInput[]): { inserted: number; updated: number }

// Helper (private):
resolveProjectId(projectSlug: string): string | null
  // Maps notion project name/slug to projects.id via projects.slug or projects.name

// Each upsert function:
// 1. Validate array is non-empty
// 2. Use db.transaction() for batch
// 3. For each item: INSERT OR REPLACE INTO notion_*
// 4. Log to activity_log: source='notion', action='synced', description='{N} records'
// 5. Return count summary
```

**Input types** defined at top of file (not separate types file — KISS):
```typescript
interface NotionTaskInput {
  notion_page_id: string;
  task_name: string;
  project?: string;
  category?: string;
  status?: string;
  priority?: string;
  deadline?: string;
  assignee?: string;
  notes?: string;
}
// ... similar for other 4 types
```

### 2. `src/lib/services/sheet-content-import.service.ts`

**Design:** Parse CSV text or accept structured JSON. Upsert by `project_id + stt + month + year`.

```typescript
// Exported functions:
upsertSheetContent(projectId: string, data: SheetContentInput[]): { inserted: number; updated: number }
getSheetContent(filters: { projectId?: string; month?: number; year?: number; status?: string }): SheetContentRow[]
getSheetContentStats(projectId: string): { total: number; published: number; inProgress: number; byMonth: {...}[] }

// Upsert logic:
// 1. For each item, check if row with same project_id+stt+month+year exists
// 2. If exists: UPDATE set all fields + updated_at
// 3. If not: INSERT with new UUID
// 4. Log to activity_log
```

### 3. `src/lib/services/activity-log-crud.service.ts`

```typescript
// Exported functions:
createActivity(data: { source: string; action: string; description: string; project_id?: string; entity_type?: string; entity_id?: string }): ActivityLogRow
getRecentActivities(limit?: number, projectId?: string): ActivityLogRow[]
getActivitiesBySource(source: string, limit?: number): ActivityLogRow[]
getActivitiesByDateRange(from: string, to: string, projectId?: string): ActivityLogRow[]
```

### 4. `src/lib/services/index.ts` — MODIFY
Add 3 exports:
```typescript
export * from './notion-data-import.service';
export * from './sheet-content-import.service';
export * from './activity-log-crud.service';
```

## Acceptance Criteria
- [ ] Notion upsert handles all 5 table types
- [ ] Duplicate notion_page_id → update (not error)
- [ ] Sheet content upsert dedupes by project_id+stt+month+year
- [ ] Activity log entries created on every sync operation
- [ ] All functions are sync (no async/await)
- [ ] TypeScript compiles with 0 errors

## Notes
- Notion MCP only works in Claude session → service accepts pre-extracted JSON (not API calls)
- `resolveProjectId` maps by fuzzy match: `projects.slug LIKE '%samco%'` or exact `projects.name`
- Transaction wrapper prevents partial writes on batch upsert
