# Dashboard V2 Files Inventory

## Summary
Found 42 Dashboard V2 related files across UI components, services, schema, and API routes.

## Dashboard V2 UI Components (19 files)
Located in: `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/`

### Overview Tab
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-overview-tab.tsx`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-project-progress-bars.tsx`

### Growth Tab (6 files)
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-growth-tab.tsx`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-growth-tab-container-with-project-filter.tsx`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-growth-report-table.tsx`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-growth-trend-charts.tsx`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-growth-month-over-month-metrics-comparison-cards.tsx`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-growth-top-keyword-movers-surging-dropping.tsx`

### Execution Tab (3 files)
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-execution-tab-main-container.tsx`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-execution-task-summary.tsx`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-execution-content-tracker-table.tsx`

### SEO Strength Tab (5 files)
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-seo-strength-tab.tsx`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-seo-strength-tab-container.tsx`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-seo-strength-onpage-audit-scores-bars.tsx`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-seo-strength-internal-link-health-stats.tsx`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-seo-strength-backlink-profile.tsx`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-seo-strength-topical-authority-clusters.tsx`

### Utility Components (2 files)
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-activity-feed.tsx`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/dashboard-v2-client-report-export-modal.tsx`

## Main Page
- `/Users/puchinpham/Developer/seo-manager-local/src/app/(dashboard)/page.tsx`

## Services (5 files)
Located in: `/Users/puchinpham/Developer/seo-manager-local/src/lib/services/`

- `/Users/puchinpham/Developer/seo-manager-local/src/lib/services/unified-dashboard-aggregator.service.ts`
- `/Users/puchinpham/Developer/seo-manager-local/src/lib/services/activity-log-crud-and-query.service.ts`
- `/Users/puchinpham/Developer/seo-manager-local/src/lib/services/notion-data-import.service.ts`
- `/Users/puchinpham/Developer/seo-manager-local/src/lib/services/client-report-generator.service.ts`
- `/Users/puchinpham/Developer/seo-manager-local/src/lib/services/sheet-content-import-and-query.service.ts`

## Database Schema (3 files)
Located in: `/Users/puchinpham/Developer/seo-manager-local/src/lib/db/schema/`

- `/Users/puchinpham/Developer/seo-manager-local/src/lib/db/schema/notion.ts`
- `/Users/puchinpham/Developer/seo-manager-local/src/lib/db/schema/activity-log.ts`
- `/Users/puchinpham/Developer/seo-manager-local/src/lib/db/schema/sheet-content.ts`

## API Routes (7 files)
Located in: `/Users/puchinpham/Developer/seo-manager-local/src/app/api/v1/`

### Dashboard Routes (6 files)
- `/Users/puchinpham/Developer/seo-manager-local/src/app/api/v1/dashboard/overview/route.ts`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/api/v1/dashboard/seo-overview/route.ts`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/api/v1/dashboard/unified-summary/route.ts`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/api/v1/dashboard/growth-report/route.ts`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/api/v1/dashboard/seo-summary/route.ts`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/api/v1/dashboard/wp-content-stats/route.ts`

### Supporting Routes (1 file)
- `/Users/puchinpham/Developer/seo-manager-local/src/app/api/v1/notion-sync/route.ts`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/api/v1/activity-log/route.ts`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/api/v1/reports/client/route.ts`
- `/Users/puchinpham/Developer/seo-manager-local/src/app/api/v1/sheet-content/route.ts`

## File Tree Structure
```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx
│   │   ├── dashboard-v2-overview-tab.tsx
│   │   ├── dashboard-v2-project-progress-bars.tsx
│   │   ├── dashboard-v2-growth-*.tsx (5 files)
│   │   ├── dashboard-v2-execution-*.tsx (3 files)
│   │   ├── dashboard-v2-seo-strength-*.tsx (6 files)
│   │   ├── dashboard-v2-activity-feed.tsx
│   │   └── dashboard-v2-client-report-export-modal.tsx
│   └── api/
│       └── v1/
│           ├── dashboard/
│           │   ├── overview/route.ts
│           │   ├── unified-summary/route.ts
│           │   ├── growth-report/route.ts
│           │   ├── seo-summary/route.ts
│           │   ├── seo-overview/route.ts
│           │   └── wp-content-stats/route.ts
│           ├── notion-sync/route.ts
│           ├── activity-log/route.ts
│           ├── reports/client/route.ts
│           └── sheet-content/route.ts
└── lib/
    ├── db/schema/
    │   ├── notion.ts
    │   ├── activity-log.ts
    │   └── sheet-content.ts
    └── services/
        ├── unified-dashboard-aggregator.service.ts
        ├── activity-log-crud-and-query.service.ts
        ├── notion-data-import.service.ts
        ├── client-report-generator.service.ts
        └── sheet-content-import-and-query.service.ts
```

## Count Summary
- **Dashboard V2 UI Components**: 19 files
- **Main Page**: 1 file
- **Services**: 5 files
- **Schema Files**: 3 files
- **API Routes**: 10 files
- **Total**: 38 files

## Unresolved Questions
None - all requested files located successfully.
