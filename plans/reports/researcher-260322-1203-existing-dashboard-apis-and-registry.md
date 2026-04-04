# SEO Manager: Existing Dashboard APIs & Registry — Research Report

## Dashboard Structure

### Current Tabs (page.tsx)
- **Nội dung** (Content) — Month/year-filtered content management stats
- **Tổng quan SEO** (SEO Overview) — Multi-project health check + traffic/KW/strategy aggregation

Tab toggle + state management fully client-side, uses React hooks (useState).

---

## API Endpoints Inventory

19 endpoints across v1 namespace:

**Core Resources:**
- `/api/v1/projects/route.ts` — Project CRUD
- `/api/v1/keyword-rankings/route.ts` — KW data
- `/api/v1/keyword-insights/route.ts` — Aggregated KW insights + toggles
- `/api/v1/health-check/route.ts` — All-projects health assessment
- `/api/v1/topic-clusters/route.ts` — Cluster CRUD + KW assignment
- `/api/v1/backlinks/route.ts` — Backlink import + check

**Supporting:**
- `/api/v1/tasks/route.ts`, `/api/v1/notes/route.ts`, `/api/v1/members/route.ts`
- `/api/v1/salary/route.ts`, `/api/v1/salary-payments/route.ts`
- `/api/v1/seo-audit/route.ts`, `/api/v1/seo-check/route.ts`, `/api/v1/seo-results/route.ts`
- `/api/v1/stats/route.ts`, `/api/v1/sync/route.ts`, `/api/v1/reports/route.ts`
- `/api/v1/audit-import/route.ts`, `/api/v1/wordpress/route.ts`, `/api/v1/targets/route.ts`

---

## API Patterns

### Error Handling
All routes import `handleApiError` from `@/lib/api-response`:
```typescript
catch (error) {
  return handleApiError(error);
}
```
Centralized error serialization + HTTP status codes.

### Dynamic Mode
All routes declare `export const dynamic = 'force-dynamic'` — disables static generation.

### Response Format
- Success: `NextResponse.json(data)` — object/array
- Error: `NextResponse.json({ error: 'msg' }, { status: 400|500 })`
- Query params: `request.nextUrl.searchParams.get('key')`
- Body parsing: `await request.json()`

### Example: Health Check
```typescript
GET() → getAllProjectsHealthCheck() → {
  overall_score, trends, warnings, trafficData, keywordData, strategyData...
}
```

### Example: Keyword Insights
```typescript
GET ?projectId=xxx → getKeywordInsights(projectId) → {
  topKeywords, movers, boundary, tiers...
}
PATCH { keyword, project_id, is_tracked } → toggleTracked()
```

Flexible param naming: accepts both `projectId` + `project_id`.

---

## Registry Structure (registry.ts)

48 modules organized in 3 groups + total 16 pages:

| Group | Count | Purpose |
|-------|-------|---------|
| **core** | 11 | Dashboard, projects, tasks, SEO audit, keywords, health, insights, backlinks, topical-map |
| **extension** | 5 | Strategy, Claude log, notes, GSC, reports |
| **settings** | 1 | Settings |

### Module Config Interface
```typescript
interface ModuleConfig {
  id: string;           // Kebab-case
  name: string;         // Vietnamese display name
  icon: string;         // Lucide icon name (e.g., 'LayoutDashboard')
  path: string;         // Route path (e.g., '/topical-map')
  order: number;        // 0-15 (core), 11-15 (extension), 90 (settings)
  group: 'core' | 'extension' | 'settings';
  enabled: boolean;     // Feature flag
}
```

### Adding New Dashboard Page
1. Create component: `src/app/(dashboard)/[slug]/[slug]-[concern].tsx`
2. Create page: `src/app/(dashboard)/[slug]/page.tsx` re-exporting component
3. Register in `modules` array with appropriate `order` (increment within group)
4. If needs API, create `src/app/api/v1/[resource]/route.ts`

---

## Key Implementation Notes

- **No shadcn/ui** — custom CSS variable-based design (--text-primary, bg-card, etc.)
- **Icons**: Lucide React string names in registry (auto-imported by sidebar)
- **Services**: Sync functions (no async), use `.all()` / `.get()` / `.run()` patterns
- **DB**: SQLite via better-sqlite3 (sync API)
- **State**: Client-side tab toggle; query params for filtering

---

## Unresolved Questions

None identified. Registry + API patterns are clear; ready for implementation.
