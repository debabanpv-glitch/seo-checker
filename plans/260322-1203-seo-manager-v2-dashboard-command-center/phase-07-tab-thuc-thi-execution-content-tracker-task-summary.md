# Phase 7: Tab Thực thi — Execution Content Tracker, Task Summary

**Effort:** 3h | **Depends on:** P4 | **Blocks:** P10 (soft)

## Goal
Build the Execution tab that merges the old Content management tab with Notion task/content data. Unified view of all work items from all sources.

## New Files (all in `src/app/(dashboard)/`)

### 1. `dashboard-v2-execution-tab.tsx`
Main container with sub-tabs or sections.

```
Layout:
┌─────────────────────────────────────────────────┐
│  Filter Bar: Project | Month/Year | Source       │
├─────────────────────────────────────────────────┤
│  Task Summary Cards (4 status cards)             │
├─────────────────────────────────────────────────┤
│  Content Tracker Table (unified list)            │
└─────────────────────────────────────────────────┘
```

**Data sources:**
- `GET /api/v1/dashboard/unified-summary` — task + content KPIs
- `GET /api/v1/sheet-content?project_id=X&month=M&year=Y` — sheet content rows
- `GET /api/v1/stats?month=M&year=Y` — existing task stats (old Content tab data)
- Existing `dashboard-content-management-tab.tsx` — reuse data fetching pattern, not the component itself

**State:** month, year, projectId, sourceFilter (all/notion/sheet/wp)

### 2. `dashboard-v2-execution-content-tracker.tsx`
Unified content list table.

**Props:**
```typescript
{
  items: Array<{
    id: string;
    title: string;
    source: 'notion' | 'sheet' | 'wp';
    status: string;
    assignee?: string;
    deadline?: string;
    publishUrl?: string;
    publishDate?: string;
    project?: string;
  }>;
  loading: boolean;
}
```

**UI:**
- Table with columns: STT, Tiêu đề, Nguồn, Trạng thái, PIC, Deadline, Link
- Source badge: colored tag (Notion purple, Sheet green, WP orange)
- Status badge: colored (published=green, in-progress=yellow, draft=gray, overdue=red)
- Sortable by deadline, status
- Merge logic in parent:
  1. Fetch sheet_content → map to unified format
  2. Fetch notion_content (from unified-summary or separate call) → map
  3. Fetch tasks (old) → map
  4. Dedupe by title similarity (optional, can be v2)
  5. Sort by deadline desc

### 3. `dashboard-v2-execution-task-summary.tsx`
Task status breakdown cards.

**Props:**
```typescript
{
  tasks: {
    total: number;
    done: number;
    inProgress: number;
    overdue: number;
    byCategory: Record<string, { total: number; done: number }>;
  };
}
```

**UI:**
- 4 summary cards in row: Tổng, Hoàn thành, Đang làm, Trễ hạn
- Each card: number + icon + progress ring
- Below cards: category breakdown (collapsible)
  - Technical SEO: 5/12 done
  - Content: 8/15 done
  - etc.

## Acceptance Criteria
- [ ] Tab shows merged content from sheet_content + notion_content + legacy tasks
- [ ] Source badges correctly identify origin of each item
- [ ] Month/year filter works (reuses old selector)
- [ ] Project filter works
- [ ] Task summary cards show accurate counts
- [ ] Category breakdown renders from notion_tasks data
- [ ] Backward compatible: old Content tab data still visible

## Notes
- Old `dashboard-content-management-tab.tsx` NOT deleted — kept as reference. New tab replaces it in the tab bar.
- The execution tab inherits the month/year picker from page.tsx (passed as props)
- For initial release: simple merge without deduplication. Add dedup later if content appears in both Notion and Sheet.
