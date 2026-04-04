# Phase 9: Growth Report Table with Period Filter and Trend Indicators

**Effort:** 2h | **Depends on:** P6 | **Blocks:** P10 (soft)

## Goal
Big scrollable growth report table showing per-period metrics with delta percentages. New API endpoint for structured data.

## New Files

### 1. `src/app/api/v1/dashboard/growth-report/route.ts`

```typescript
export const dynamic = 'force-dynamic';

// GET /api/v1/dashboard/growth-report?project_id=X&period=weekly
// period: 'weekly' | 'monthly'
// project_id: optional (all projects if omitted)
//
// Returns:
// {
//   project: { id, name },
//   period: 'weekly',
//   rows: [
//     {
//       period_label: 'T11 03/2026',        // or 'Tháng 3/2026'
//       clicks: 120, clicks_delta: 15.2,
//       impressions: 3500, impressions_delta: -2.1,
//       kw_top10: 38, kw_top10_delta: 3,
//       content_published: 5, content_published_delta: 2,
//       backlinks_new: 12, backlinks_new_delta: -1,
//       audit_score: 72, audit_score_delta: 1.5,
//     },
//     ...
//   ]
// }
```

**Service logic (inline in route, or add to unified-dashboard-aggregator):**
1. Query gsc_snapshots grouped by week/month
2. Query keyword_rankings by snapshot dates
3. Query sheet_content + notion_content publish dates
4. Query backlinks by first_seen date ranges
5. Query latest audit_results per project
6. Compute deltas: `(current - previous) / previous * 100`

### 2. `src/app/(dashboard)/dashboard-v2-growth-report-table.tsx`

**Placement:** Rendered inside Growth tab (P6) as expandable section, OR as standalone sub-view.

**Props:**
```typescript
{
  projectId?: string;
  period: 'weekly' | 'monthly';
}
```

**Internal state:** fetches from `/api/v1/dashboard/growth-report` on mount and when filters change.

**UI:**
- Filter bar: project dropdown + period toggle (Tuần/Tháng)
- Scrollable table:
  | Kỳ | Clicks | Δ% | Impressions | Δ% | KW Top10 | Δ | Nội dung | Δ | Backlinks | Δ | Audit |
  - Delta cells: green text + ↑ for positive, red text + ↓ for negative, gray for 0
  - Sticky first column (period label)
- Max 12 rows (12 weeks or 12 months)

## Acceptance Criteria
- [ ] API returns correct weekly/monthly rollups
- [ ] Delta calculations handle division by zero (previous=0 → show "mới")
- [ ] Table renders with horizontal scroll on mobile
- [ ] Period toggle switches between weekly/monthly view
- [ ] Project filter works
- [ ] Green/red indicators visually clear

## Notes
- Weekly grouping: ISO week number, label "T{week} {month}/{year}"
- Monthly grouping: label "Tháng {month}/{year}"
- If fewer than 2 periods of data: hide delta column, show "Chưa đủ dữ liệu so sánh"
- Growth report table is embedded in the Growth tab, not a separate page
