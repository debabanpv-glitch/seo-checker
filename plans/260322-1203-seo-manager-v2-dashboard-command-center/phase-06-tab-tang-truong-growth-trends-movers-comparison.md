# Phase 6: Tab Tăng trưởng — Growth Trends, Top Movers, Month Comparison

**Effort:** 3h | **Depends on:** P4 | **Blocks:** P9, P10

## Goal
Build the Growth tab showing weekly traffic trends, keyword movers, and month-over-month comparison. Pure frontend — reads from existing APIs + unified-summary.

## New Files (all in `src/app/(dashboard)/`)

### 1. `dashboard-v2-growth-tab.tsx`
Main container. Fetches data and distributes to child components.

```
Layout:
┌─────────────────────────────────────────────────┐
│  Project Filter Dropdown (all / per-project)    │
├─────────────────────────────────────────────────┤
│  Trend Charts (clicks + impressions line chart) │
├────────────────────────┬────────────────────────┤
│  Top Movers UP (left)  │  Top Movers DOWN       │
│  surging keywords      │  dropping keywords     │
├────────────────────────┴────────────────────────┤
│  Month-over-Month Comparison                    │
└─────────────────────────────────────────────────┘
```

**Data sources:**
- `GET /api/v1/dashboard/unified-summary?project_id=X` — traffic trends, keyword movers
- `GET /api/v1/keyword-insights?projectId=X` — detailed mover data (existing API)
- `GET /api/v1/health-check` — historical data for comparison

### 2. `dashboard-v2-growth-trend-charts.tsx`
Weekly clicks + impressions line charts.

**Props:**
```typescript
{
  gscData: Array<{ date: string; clicks: number; impressions: number }>;
  projectFilter: string | null;
}
```

**UI:**
- SVG-based line chart (reuse pattern from `dashboard-traffic-trend-mini-chart.tsx`)
- Two lines: clicks (blue) + impressions (purple), shared X axis (dates)
- Hover tooltip with exact values
- Responsive: full width, 200px height
- Period label: "7 ngày gần nhất"

### 3. `dashboard-v2-growth-top-movers.tsx`
Surging and dropping keywords tables.

**Props:**
```typescript
{
  surging: Array<{ keyword: string; position: number; change: number; url?: string }>;
  dropping: Array<{ keyword: string; position: number; change: number; url?: string }>;
}
```

**UI:**
- Two side-by-side tables
- Surging: green ↑ indicators, sorted by biggest positive change
- Dropping: red ↓ indicators, sorted by biggest negative change
- Max 10 rows each
- Position badge: colored by tier (Top3 gold, Top10 green, Top30 yellow, rest gray)

### 4. `dashboard-v2-growth-month-comparison.tsx`
This month vs last month metrics.

**Props:**
```typescript
{
  current: { clicks: number; impressions: number; kwTop10: number; contentPublished: number; backlinkNew: number };
  previous: { clicks: number; impressions: number; kwTop10: number; contentPublished: number; backlinkNew: number };
}
```

**UI:**
- Horizontal card row, each metric with:
  - Current value (large)
  - Previous value (small, muted)
  - Delta (green ↑ or red ↓ with %)
- Metrics: Clicks, Impressions, KW Top 10, Nội dung xuất bản, Backlinks mới

## Acceptance Criteria
- [ ] Project filter dropdown works (all / individual)
- [ ] Line chart renders with real GSC data
- [ ] Movers tables populated from keyword insights
- [ ] Month comparison shows correct deltas with color indicators
- [ ] Empty states for projects with no data
- [ ] No TypeScript errors

## Notes
- SVG chart: inline, no chart library (existing pattern in codebase)
- GSC data: query gsc_snapshots directly or via unified-summary — depends on what's more efficient
- If no GSC data for period, show "Chưa có dữ liệu GSC" empty state
- Keyword movers: reuse logic from keyword-insights-aggregator but render differently
