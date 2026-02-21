# Phase 03: API Routes Migration — Versioned `/api/v1/` Endpoints

## Context Links
- Plan overview: `plans/260221-1433-supabase-to-sqlite-migration/plan.md`
- Phase 02 (prerequisite): `phase-02-service-layer-business-logic-drizzle-queries.md`
- Current routes (reference): `src/app/api/*/route.ts`
- Services (to call): `src/lib/services/index.ts`
- Error helper: `src/lib/api-response.ts`

## Overview

Create 20 new route files under `src/app/api/v1/` — thin handlers that parse request params, call services, and return JSON. Delete 4 auth-related route directories. Leave old `src/app/api/` routes in place temporarily (delete in Phase 05).

## Key Insights

- **Route handler = 5–10 lines**: parse params → call service → return `NextResponse.json()`
- **`export const dynamic = 'force-dynamic'`** on every route (prevents Next.js static caching)
- **All services are sync** — no `async` needed on route handlers calling sync services. Exception: `sync.service.ts` has async Google Sheets fetch → route stays async
- **Error pattern**: wrap in `try/catch`, call `handleApiError(error)` on catch
- **URL change**: frontend currently calls `/api/xyz` → must update to `/api/v1/xyz` (Phase 04)
- **`seo-check` route** — does NOT hit DB; it fetches external URL and runs analysis. Copy as-is, just rename path
- **`keyword-rankings/details`** — read existing `details/route.ts` and port as-is

## Route Mapping (Old → New)

| Old path | New path | Service |
|----------|----------|---------|
| `GET /api/projects` | `GET /api/v1/projects` | `getProjectsWithStats()` |
| `POST /api/projects` | `POST /api/v1/projects` | `createProject()` |
| `PUT /api/projects` | `PUT /api/v1/projects` | `updateProject()` |
| `DELETE /api/projects` | `DELETE /api/v1/projects` | `deleteProject()` |
| `GET /api/projects/report` | `GET /api/v1/projects/report` | `getProjectReport()` |
| `GET /api/tasks` | `GET /api/v1/tasks` | `getTasks()` |
| `PUT /api/tasks` | `PUT /api/v1/tasks` | `updateTask()` |
| `DELETE /api/tasks` | `DELETE /api/v1/tasks` | `deleteTask()` |
| `GET /api/targets` | `GET /api/v1/targets` | `getTargets()` |
| `POST /api/targets` | `POST /api/v1/targets` | `upsertTarget()` |
| `DELETE /api/targets` | `DELETE /api/v1/targets` | `deleteTarget()` |
| `GET /api/members` | `GET /api/v1/members` | `getMemberStats()` |
| `POST /api/members` | `POST /api/v1/members` | `createMember()` |
| `PUT /api/members` | `PUT /api/v1/members` | `updateMember()` |
| `DELETE /api/members` | `DELETE /api/v1/members` | `deleteMember()` |
| `GET /api/salary` | `GET /api/v1/salary` | `getSalaryData()` |
| `GET /api/salary/analytics` | `GET /api/v1/salary/analytics` | `getSalaryAnalytics()` |
| `GET /api/salary-payments` | `GET /api/v1/salary-payments` | `getPayments()` |
| `POST /api/salary-payments` | `POST /api/v1/salary-payments` | `upsertPayment()` |
| `DELETE /api/salary-payments` | `DELETE /api/v1/salary-payments` | `deletePayment()` |
| `GET /api/keyword-rankings` | `GET /api/v1/keyword-rankings` | `getRankings()` |
| `DELETE /api/keyword-rankings` | `DELETE /api/v1/keyword-rankings` | `deleteRankings()` |
| `POST /api/keyword-rankings/sync` | `POST /api/v1/keyword-rankings/sync` | `syncRankingsFromSheet()` |
| `GET /api/keyword-rankings/growth` | `GET /api/v1/keyword-rankings/growth` | `getRankingGrowth()` |
| `GET /api/keyword-rankings/analysis` | `GET /api/v1/keyword-rankings/analysis` | `getRankingAnalysis()` |
| `GET /api/keyword-rankings/details` | `GET /api/v1/keyword-rankings/details` | `getRankingDetails()` |
| `GET /api/seo-results` | `GET /api/v1/seo-results` | `getSeoResults()` |
| `POST /api/seo-results` | `POST /api/v1/seo-results` | `upsertSeoResult()` |
| `POST /api/seo-results/batch` | `POST /api/v1/seo-results/batch` | `getSeoResults({ urls })` |
| `POST /api/seo-check` | `POST /api/v1/seo-check` | (copy as-is, no DB) |
| `GET /api/stats` | `GET /api/v1/stats` | `getStats()` |
| `GET /api/dashboard/overview` | `GET /api/v1/dashboard/overview` | `getDashboardOverview()` |
| `POST /api/sync` | `POST /api/v1/sync` | `syncAllProjects()` |
| `GET /api/sync` | `GET /api/v1/sync` | `syncAllProjects()` |
| `GET /api/sync/logs` | `GET /api/v1/sync/logs` | `getSyncLogs()` |

**Routes to DELETE (auth)** — do not create v1 equivalents:
- `src/app/api/auth/` (login, logout, me, route)
- `src/app/api/activity-logs/`
- `src/app/api/users/`

## Implementation Steps

### Step 1 — Create directory structure

```bash
mkdir -p src/app/api/v1/projects/report
mkdir -p src/app/api/v1/tasks
mkdir -p src/app/api/v1/targets
mkdir -p src/app/api/v1/members
mkdir -p src/app/api/v1/salary/analytics
mkdir -p src/app/api/v1/salary-payments
mkdir -p src/app/api/v1/keyword-rankings/sync
mkdir -p src/app/api/v1/keyword-rankings/growth
mkdir -p src/app/api/v1/keyword-rankings/analysis
mkdir -p src/app/api/v1/keyword-rankings/details
mkdir -p src/app/api/v1/seo-results/batch
mkdir -p src/app/api/v1/seo-check
mkdir -p src/app/api/v1/stats
mkdir -p src/app/api/v1/dashboard/overview
mkdir -p src/app/api/v1/sync/logs
```

### Step 2 — Route handler pattern (apply to all)

Every route follows this template:

```ts
// src/app/api/v1/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getProjectsWithStats, createProject, updateProject, deleteProject } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const data = getProjectsWithStats(month, year); // sync — no await
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const project = createProject(body);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const project = updateProject(id, data);
    return NextResponse.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    deleteProject(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Step 3 — `src/app/api/v1/projects/report/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getProjectReport } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    if (!id) return NextResponse.json({ error: 'Missing project id' }, { status: 400 });
    return NextResponse.json(getProjectReport(id, month, year));
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Step 4 — `src/app/api/v1/tasks/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getTasks, updateTask, deleteTask } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      projectId: searchParams.get('projectId') ?? undefined,
      pic: searchParams.get('pic') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      month: searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined,
      year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined,
      search: searchParams.get('search') ?? undefined,
    };
    return NextResponse.json({ tasks: getTasks(filters) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'Missing task id' }, { status: 400 });
    return NextResponse.json({ task: updateTask(id, data) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    deleteTask(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Step 5 — `src/app/api/v1/targets/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getTargets, upsertTarget, deleteTarget } from '@/lib/services';
import { handleApiError, AppError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const projectId = new URL(request.url).searchParams.get('projectId') ?? undefined;
    return NextResponse.json({ targets: getTargets(projectId) });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, month, year, target } = await request.json();
    if (!projectId || !month || !year || target === undefined)
      throw new AppError('Missing required fields: projectId, month, year, target');
    return NextResponse.json({ success: true, target: upsertTarget(projectId, +month, +year, +target) });
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('Missing target id');
    deleteTarget(id);
    return NextResponse.json({ success: true });
  } catch (error) { return handleApiError(error); }
}
```

### Step 6 — `src/app/api/v1/members/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getMemberStats, createMember, updateMember, deleteMember } from '@/lib/services';
import { handleApiError, AppError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const month = parseInt(sp.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(sp.get('year') || String(new Date().getFullYear()));
    const view = (sp.get('view') || 'month') as 'month' | 'week' | 'day';
    return NextResponse.json(getMemberStats(month, year, view));
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ member: createMember(body) }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...data } = await request.json();
    if (!id) throw new AppError('Member ID required');
    return NextResponse.json({ member: updateMember(id, data) });
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('Member ID required');
    deleteMember(id);
    return NextResponse.json({ success: true });
  } catch (error) { return handleApiError(error); }
}
```

### Step 7 — Salary routes

**`src/app/api/v1/salary/route.ts`**:
```ts
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const month = parseInt(sp.get('month') || String(new Date().getMonth() + 1));
  const year = parseInt(sp.get('year') || String(new Date().getFullYear()));
  const projectId = sp.get('project') ?? undefined;
  return NextResponse.json(getSalaryData(month, year, projectId));
}
```

**`src/app/api/v1/salary/analytics/route.ts`**:
```ts
export async function GET(request: NextRequest) {
  const months = parseInt(new URL(request.url).searchParams.get('months') || '6');
  return NextResponse.json(getSalaryAnalytics(months));
}
```

**`src/app/api/v1/salary-payments/route.ts`** — GET/POST/DELETE calling `getPayments()`, `upsertPayment()`, `deletePayment()`.

### Step 8 — Keyword rankings routes

**`src/app/api/v1/keyword-rankings/route.ts`** — GET + DELETE calling `getRankings()`, `deleteRankings()`.

**`src/app/api/v1/keyword-rankings/sync/route.ts`** — POST only, async (external fetch):
```ts
export async function POST(request: NextRequest) {
  try {
    const { sheetUrl, projectId, columnMapping } = await request.json();
    if (!sheetUrl) throw new AppError('Sheet URL is required');
    const result = await syncRankingsFromSheet(sheetUrl, projectId, columnMapping);
    return NextResponse.json(result);
  } catch (error) { return handleApiError(error); }
}
```

**`src/app/api/v1/keyword-rankings/growth/route.ts`** — GET calling `getRankingGrowth()`.

**`src/app/api/v1/keyword-rankings/analysis/route.ts`** — GET with required `projectId`:
```ts
export async function GET(request: NextRequest) {
  try {
    const projectId = new URL(request.url).searchParams.get('projectId');
    if (!projectId) throw new AppError('projectId is required');
    return NextResponse.json(getRankingAnalysis(projectId));
  } catch (error) { return handleApiError(error); }
}
```

**`src/app/api/v1/keyword-rankings/details/route.ts`** — port from existing `details/route.ts` (read that file and translate Supabase → service call).

### Step 9 — SEO results routes

**`src/app/api/v1/seo-results/route.ts`**:
```ts
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const url = sp.get('url') ?? undefined;
  const urlsParam = sp.get('urls');
  const urls = urlsParam ? JSON.parse(urlsParam) : undefined;
  return NextResponse.json({ results: getSeoResults({ url, urls }) });
}

export async function POST(request: NextRequest) {
  const { url, result } = await request.json();
  if (!url || !result) throw new AppError('Missing url or result');
  return NextResponse.json({ success: true, result: upsertSeoResult(url, result) });
}
```

**`src/app/api/v1/seo-results/batch/route.ts`**:
```ts
export async function POST(request: NextRequest) {
  const { urls } = await request.json();
  if (!urls?.length) return NextResponse.json({ results: [] });
  return NextResponse.json({ results: getSeoResults({ urls }) });
}
```

### Step 10 — `src/app/api/v1/seo-check/route.ts`

Copy entire `src/app/api/seo-check/route.ts` to `src/app/api/v1/seo-check/route.ts` unchanged — this route has no DB calls, only external URL fetch + HTML analysis.

### Step 11 — Stats + Dashboard + Sync routes

**`src/app/api/v1/stats/route.ts`** — GET calling `getStats(month, year)`.

**`src/app/api/v1/dashboard/overview/route.ts`** — GET calling `getDashboardOverview(month, year)`.

**`src/app/api/v1/sync/route.ts`** — async POST + GET both calling `syncAllProjects()`:
```ts
export async function POST() {
  try {
    const result = await syncAllProjects();
    return NextResponse.json(result);
  } catch (error) { return handleApiError(error); }
}
export const GET = POST;
```

**`src/app/api/v1/sync/logs/route.ts`**:
```ts
export async function GET(request: NextRequest) {
  const limit = parseInt(new URL(request.url).searchParams.get('limit') || '20');
  return NextResponse.json({ logs: getSyncLogs(limit) });
}
```

## Todo List

- [ ] Create all 15 `mkdir -p` directories
- [ ] `src/app/api/v1/projects/route.ts` (GET/POST/PUT/DELETE)
- [ ] `src/app/api/v1/projects/report/route.ts` (GET)
- [ ] `src/app/api/v1/tasks/route.ts` (GET/PUT/DELETE)
- [ ] `src/app/api/v1/targets/route.ts` (GET/POST/DELETE)
- [ ] `src/app/api/v1/members/route.ts` (GET/POST/PUT/DELETE)
- [ ] `src/app/api/v1/salary/route.ts` (GET)
- [ ] `src/app/api/v1/salary/analytics/route.ts` (GET)
- [ ] `src/app/api/v1/salary-payments/route.ts` (GET/POST/DELETE)
- [ ] `src/app/api/v1/keyword-rankings/route.ts` (GET/DELETE)
- [ ] `src/app/api/v1/keyword-rankings/sync/route.ts` (POST — async)
- [ ] `src/app/api/v1/keyword-rankings/growth/route.ts` (GET)
- [ ] `src/app/api/v1/keyword-rankings/analysis/route.ts` (GET)
- [ ] `src/app/api/v1/keyword-rankings/details/route.ts` (GET — port from existing)
- [ ] `src/app/api/v1/seo-results/route.ts` (GET/POST)
- [ ] `src/app/api/v1/seo-results/batch/route.ts` (POST)
- [ ] `src/app/api/v1/seo-check/route.ts` (copy as-is)
- [ ] `src/app/api/v1/stats/route.ts` (GET)
- [ ] `src/app/api/v1/dashboard/overview/route.ts` (GET)
- [ ] `src/app/api/v1/sync/route.ts` (GET/POST — async)
- [ ] `src/app/api/v1/sync/logs/route.ts` (GET)

## Success Criteria

- `curl http://localhost:3000/api/v1/projects` returns JSON array
- `curl http://localhost:3000/api/v1/stats?month=2&year=2026` returns stats object
- `curl http://localhost:3000/api/v1/sync/logs` returns `{ logs: [] }` (empty initially)
- No `import { supabase }` in any `/api/v1/` file
- `curl http://localhost:3000/api/v1/sync -X POST` triggers Google Sheets sync

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| `keyword-rankings/details` route not yet read | Read `src/app/api/keyword-rankings/details/route.ts` before porting |
| Sync service `mapRowToTask()` uses old snake_case keys | Fix keys in Phase 02 Step 8 |
| Missing `export const dynamic` causes stale cache | Add to every route file |
| `seo-check` copies fine but may import something from supabase | Check imports before copying |

## Next Steps → Phase 04

Once all `/api/v1/` routes respond correctly, proceed to `phase-04-frontend-auth-removal-api-url-updates.md`.
