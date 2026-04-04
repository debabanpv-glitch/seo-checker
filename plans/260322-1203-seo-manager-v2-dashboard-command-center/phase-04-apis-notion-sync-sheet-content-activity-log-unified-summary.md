# Phase 4: APIs — Notion Sync, Sheet Content, Activity Log, Unified Summary

**Effort:** 2h | **Depends on:** P2, P3 | **Blocks:** P5, P6, P7, P8

## Goal
Expose 4 new API routes that wrap the services from P2/P3. Standard Next.js API pattern with `handleApiError`, `force-dynamic`.

## New Files

### 1. `src/app/api/v1/notion-sync/route.ts`

```typescript
export const dynamic = 'force-dynamic';

// POST /api/v1/notion-sync
// Body: { table: 'tasks'|'content'|'backlinks'|'keywords'|'competitors', data: any[] }
// → calls appropriate upsertNotion*() from notion-data-import.service
// → returns { success: true, table, inserted, updated }

// GET /api/v1/notion-sync/status  — NOT a sub-route, use query param
// GET /api/v1/notion-sync?action=status
// → returns recent activity_log entries where source='notion', last 20
```

**Validation:**
- `table` must be one of 5 valid values
- `data` must be non-empty array
- Each item must have `notion_page_id`

### 2. `src/app/api/v1/sheet-content/route.ts`

```typescript
export const dynamic = 'force-dynamic';

// POST /api/v1/sheet-content
// Body: { project_id: string, data: SheetContentInput[] }
// → calls upsertSheetContent()
// → returns { success: true, inserted, updated }

// GET /api/v1/sheet-content?project_id=X&month=3&year=2026&status=published
// → calls getSheetContent(filters)
// → returns array of sheet_content rows
```

### 3. `src/app/api/v1/activity-log/route.ts`

```typescript
export const dynamic = 'force-dynamic';

// GET /api/v1/activity-log?limit=50&project_id=X&source=notion&from=2026-03-01&to=2026-03-22
// → calls getRecentActivities() or getActivitiesByDateRange()
// → returns array of activity_log rows

// POST /api/v1/activity-log
// Body: { source, action, description, project_id?, entity_type?, entity_id? }
// → calls createActivity()
// → manual activity logging (e.g., from UI actions)
```

### 4. `src/app/api/v1/dashboard/unified-summary/route.ts`

```typescript
export const dynamic = 'force-dynamic';

// GET /api/v1/dashboard/unified-summary?project_id=X
// → calls getUnifiedDashboardSummary(projectId)
// → returns full UnifiedDashboardSummary JSON
```

## Acceptance Criteria
- [ ] All 4 routes return correct JSON
- [ ] POST notion-sync validates table name and data array
- [ ] GET unified-summary works with and without project_id filter
- [ ] All routes use `handleApiError` catch wrapper
- [ ] All routes have `export const dynamic = 'force-dynamic'`
- [ ] HTTP status codes: 200 success, 400 validation, 500 server error

## Notes
- No new sub-folders for routes — each is a single `route.ts`
- `notion-sync` uses query param `?action=status` instead of nested route (KISS)
- `unified-summary` is under `/dashboard/` namespace since it's dashboard-specific
- Existing `/api/v1/dashboard/overview` untouched — old tab still works
