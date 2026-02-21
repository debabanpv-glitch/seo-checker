# Phase 02: Service Layer — Business Logic + Drizzle Queries

## Context Links
- Plan overview: `plans/260221-1433-supabase-to-sqlite-migration/plan.md`
- Phase 01 (prerequisite): `phase-01-database-layer-drizzle-schema-connection-migrations.md`
- Current API routes (reference logic): `src/app/api/*/route.ts`
- Existing utils (keep): `src/lib/utils.ts`, `src/lib/task-helpers.ts`

## Overview

Create 8 service files + 1 utility file (`api-response.ts`) + 1 barrel index. Services contain all business logic extracted from current route handlers. Route handlers in Phase 03 will be thin wrappers calling these services.

## Key Insights

- **No `async/await` on DB calls** — `better-sqlite3` is sync; Drizzle `.all()/.get()/.run()` are sync
- **Services throw `AppError`** — routes catch with `handleApiError()`
- **No repository pattern** — Drizzle queries live directly in services (YAGNI)
- **JSON columns** — Drizzle `{ mode: 'json' }` auto-parses on read; no manual `JSON.parse` needed
- **camelCase ↔ snake_case** — Drizzle maps `projectId` ↔ `project_id` automatically via schema column names
- **Upsert in SQLite** — use `db.insert(table).values(...).onConflictDoUpdate({ target, set })` not Supabase-style `.upsert()`
- **`like` not `ilike`** — SQLite has no `ilike`; use `like` with `%lower(keyword)%` or just `like` (SQLite LIKE is case-insensitive for ASCII)
- **DELETE all workaround** — Supabase `.neq('id', '0000...')` trick → Drizzle: `db.delete(table).run()` (no WHERE = delete all)

## Requirements

1. `src/lib/api-response.ts` — `AppError` class + `handleApiError()` helper
2. `src/lib/services/project.service.ts` — projects + monthly_targets CRUD + stats
3. `src/lib/services/task.service.ts` — tasks CRUD + filtering
4. `src/lib/services/keyword.service.ts` — keyword_rankings CRUD + growth + analysis
5. `src/lib/services/seo.service.ts` — seo_results GET/POST (upsert by URL) + batch
6. `src/lib/services/salary.service.ts` — salary calculation + analytics (multi-month)
7. `src/lib/services/member.service.ts` — members CRUD + member stats
8. `src/lib/services/sync.service.ts` — Google Sheets fetch + task sync + sync_logs
9. `src/lib/services/dashboard.service.ts` — overview aggregation
10. `src/lib/services/index.ts` — barrel export

## Architecture

```
src/lib/
├── api-response.ts          ← AppError + handleApiError
├── services/
│   ├── index.ts             ← re-export all services
│   ├── project.service.ts   ← projects, monthly_targets
│   ├── task.service.ts      ← tasks
│   ├── keyword.service.ts   ← keyword_rankings
│   ├── seo.service.ts       ← seo_results
│   ├── salary.service.ts    ← salary calc + analytics
│   ├── member.service.ts    ← members stats
│   ├── sync.service.ts      ← sheets sync + sync_logs
│   └── dashboard.service.ts ← overview aggregation
```

## Implementation Steps

### Step 1 — Create `src/lib/api-response.ts`

```ts
import { NextResponse } from 'next/server';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  console.error('Unhandled error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

### Step 2 — Create `src/lib/services/project.service.ts`

Key operations (translate from `src/app/api/projects/route.ts` + `src/app/api/targets/route.ts`):

```ts
import { db } from '@/lib/db';
import { projects, tasks, monthlyTargets } from '@/lib/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { AppError } from '@/lib/api-response';
import { isPublished, isDoneQC } from '@/lib/task-helpers';

// GET all projects with stats for a given month/year
export function getProjectsWithStats(month: number, year: number) {
  const allProjects = db.select().from(projects).orderBy(asc(projects.createdAt)).all();

  const targets = db.select().from(monthlyTargets)
    .where(and(eq(monthlyTargets.month, month), eq(monthlyTargets.year, year)))
    .all();

  return allProjects.map((project) => {
    const projectTasks = db.select().from(tasks)
      .where(and(eq(tasks.projectId, project.id), eq(tasks.month, month), eq(tasks.year, year)))
      .all();

    const published = projectTasks.filter((t) => isPublished(t)).length;
    const inProgress = projectTasks.filter((t) =>
      t.statusContent && !isPublished(t) && !isDoneQC(t.statusContent)
    ).length;
    const doneQC = projectTasks.filter((t) =>
      isDoneQC(t.statusContent ?? '') && !isPublished(t)
    ).length;
    const overdue = projectTasks.filter((t) => {
      if (!t.deadline || isPublished(t)) return false;
      return new Date(t.deadline) < new Date();
    }).length;

    const monthlyTarget = targets.find((mt) => mt.projectId === project.id);
    const target = monthlyTarget?.target ?? project.monthlyTarget;

    return { ...project, published, inProgress, doneQC, overdue, target, total: projectTasks.length };
  });
}

// GET single project report
export function getProjectReport(id: string, month: number, year: number) {
  const project = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) throw new AppError('Project not found', 404);
  // ... (similar logic from src/app/api/projects/report/route.ts)
  return project;
}

// POST create project
export function createProject(data: { name: string; sheetId: string; sheetName: string; monthlyTarget?: number; rankingSheetUrl?: string }) {
  return db.insert(projects).values({
    name: data.name,
    sheetId: data.sheetId,
    sheetName: data.sheetName,
    monthlyTarget: data.monthlyTarget ?? 20,
    rankingSheetUrl: data.rankingSheetUrl ?? null,
  }).returning().get();
}

// PUT update project
export function updateProject(id: string, data: Partial<typeof projects.$inferInsert>) {
  const updated = db.update(projects).set(data).where(eq(projects.id, id)).returning().get();
  if (!updated) throw new AppError('Project not found', 404);
  return updated;
}

// DELETE project
export function deleteProject(id: string) {
  db.delete(projects).where(eq(projects.id, id)).run();
}

// --- Monthly Targets ---

export function getTargets(projectId?: string) {
  const query = db.select().from(monthlyTargets)
    .orderBy(desc(monthlyTargets.year), desc(monthlyTargets.month));
  if (projectId) {
    return db.select().from(monthlyTargets)
      .where(eq(monthlyTargets.projectId, projectId))
      .orderBy(desc(monthlyTargets.year), desc(monthlyTargets.month))
      .all();
  }
  return query.all();
}

export function upsertTarget(projectId: string, month: number, year: number, target: number) {
  return db.insert(monthlyTargets)
    .values({ projectId, month, year, target })
    .onConflictDoUpdate({
      target: [monthlyTargets.projectId, monthlyTargets.month, monthlyTargets.year],
      set: { target },
    })
    .returning().get();
}

export function deleteTarget(id: string) {
  db.delete(monthlyTargets).where(eq(monthlyTargets.id, id)).run();
}
```

> **Note on project report**: Read `src/app/api/projects/report/route.ts` in full and port query logic to `getProjectReport()` the same way.

### Step 3 — Create `src/lib/services/task.service.ts`

Translate from `src/app/api/tasks/route.ts`:

```ts
import { db } from '@/lib/db';
import { tasks, projects } from '@/lib/db/schema';
import { eq, and, like, desc, asc } from 'drizzle-orm';
import { AppError } from '@/lib/api-response';

export function getTasks(filters: {
  projectId?: string; pic?: string; status?: string;
  month?: number; year?: number; search?: string;
}) {
  // Build where conditions array
  const conditions = [];
  if (filters.projectId) conditions.push(eq(tasks.projectId, filters.projectId));
  if (filters.month) conditions.push(eq(tasks.month, filters.month));
  if (filters.year) conditions.push(eq(tasks.year, filters.year));
  if (filters.pic) conditions.push(eq(tasks.pic, filters.pic));
  if (filters.status) conditions.push(eq(tasks.statusContent, filters.status));
  if (filters.search) conditions.push(like(tasks.title, `%${filters.search}%`));

  return db.select().from(tasks)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(tasks.createdAt))
    .all();
}

export function getTask(id: string) {
  const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) throw new AppError('Task not found', 404);
  return task;
}

export function updateTask(id: string, data: Partial<typeof tasks.$inferInsert>) {
  data.updatedAt = new Date().toISOString();
  const updated = db.update(tasks).set(data).where(eq(tasks.id, id)).returning().get();
  if (!updated) throw new AppError('Task not found', 404);
  return updated;
}

export function deleteTask(id: string) {
  db.delete(tasks).where(eq(tasks.id, id)).run();
}
```

### Step 4 — Create `src/lib/services/keyword.service.ts`

Translate from `src/app/api/keyword-rankings/route.ts`, `growth/route.ts`, `analysis/route.ts`, `sync/route.ts`:

```ts
import { db } from '@/lib/db';
import { keywordRankings, tasks, seoResults } from '@/lib/db/schema';
import { eq, and, like, gte, lte, desc, asc, lt } from 'drizzle-orm';

// GET rankings with filters
export function getRankings(filters: {
  projectId?: string; keyword?: string;
  startDate?: string; endDate?: string; limit?: number;
}) {
  const conditions = [];
  if (filters.projectId) conditions.push(eq(keywordRankings.projectId, filters.projectId));
  if (filters.keyword) conditions.push(like(keywordRankings.keyword, `%${filters.keyword}%`));
  if (filters.startDate) conditions.push(gte(keywordRankings.date, filters.startDate));
  if (filters.endDate) conditions.push(lte(keywordRankings.date, filters.endDate));

  return db.select().from(keywordRankings)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(keywordRankings.date), asc(keywordRankings.keyword))
    .limit(filters.limit ?? 1000)
    .all();
}

// Upsert rankings batch (replaces Supabase batch upsert)
export function upsertRankingsBatch(rows: Array<{
  keyword: string; url: string; position: number; date: string; projectId?: string | null;
}>) {
  // SQLite: insert in transaction for performance
  db.transaction((tx) => {
    for (const row of rows) {
      tx.insert(keywordRankings).values({
        keyword: row.keyword,
        url: row.url,
        position: row.position,
        date: row.date,
        projectId: row.projectId ?? null,
      })
      // If unique constraint (keyword, date, project_id) exists, update
      .onConflictDoUpdate({
        target: [keywordRankings.keyword, keywordRankings.date, keywordRankings.projectId],
        set: { url: row.url, position: row.position },
      })
      .run();
    }
  });
}

// DELETE ranking(s)
export function deleteRankings(params: {
  id?: string; projectId?: string; keyword?: string; deleteAll?: boolean;
}) {
  if (params.deleteAll) {
    db.delete(keywordRankings).run(); // no WHERE = delete all
    return;
  }
  if (params.id) {
    db.delete(keywordRankings).where(eq(keywordRankings.id, params.id)).run();
    return;
  }
  if (params.projectId && !params.keyword) {
    db.delete(keywordRankings).where(eq(keywordRankings.projectId, params.projectId)).run();
    return;
  }
  if (params.projectId && params.keyword) {
    db.delete(keywordRankings)
      .where(and(eq(keywordRankings.projectId, params.projectId), eq(keywordRankings.keyword, params.keyword)))
      .run();
  }
}

// GET growth data (ported from growth/route.ts — pure JS logic, same as before)
export function getRankingGrowth(projectId?: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];

  const conditions = [gte(keywordRankings.date, startStr)];
  if (projectId) conditions.push(eq(keywordRankings.projectId, projectId));

  const data = db.select().from(keywordRankings)
    .where(and(...conditions))
    .orderBy(asc(keywordRankings.date))
    .all();

  // Pure JS grouping/stats logic — identical to existing growth/route.ts lines 66–143
  // (copy that logic here, replacing supabase data with `data` array)
  return buildGrowthSnapshots(data);
}

// GET analysis (ported from analysis/route.ts — pure JS logic)
export function getRankingAnalysis(projectId: string) {
  // All DB queries sync, then pure JS computation identical to existing analysis/route.ts
  // ...
}

// Helper: CSV parse + position parse (move from keyword-rankings/sync/route.ts)
export { parseCSVText, parseRankingDate } from './keyword-csv-helpers';
```

> **Note**: The growth and analysis logic is pure JavaScript computation (no DB calls in the middle). Copy the JS grouping logic from the existing route files verbatim — only replace the Supabase fetch at the top with synchronous Drizzle queries.

### Step 5 — Create `src/lib/services/seo.service.ts`

Translate from `src/app/api/seo-results/route.ts` + `batch/route.ts`:

```ts
import { db } from '@/lib/db';
import { seoResults } from '@/lib/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';

export function getSeoResults(filters: { url?: string; urls?: string[]; minimal?: boolean }) {
  if (filters.urls?.length) {
    return db.select().from(seoResults)
      .where(inArray(seoResults.url, filters.urls))
      .orderBy(desc(seoResults.checkedAt))
      .all();
  }
  if (filters.url) {
    return db.select().from(seoResults)
      .where(eq(seoResults.url, filters.url))
      .orderBy(desc(seoResults.checkedAt))
      .all();
  }
  return db.select().from(seoResults).orderBy(desc(seoResults.checkedAt)).all();
}

export function upsertSeoResult(url: string, result: {
  score: number; maxScore: number;
  categories?: { content?: { score: number; maxScore: number }; images?: { score: number; maxScore: number }; technical?: { score: number; maxScore: number } };
  details?: unknown[]; links?: unknown; keywords?: unknown;
}) {
  const data = {
    url,
    score: result.score ?? 0,
    maxScore: result.maxScore ?? 100,
    contentScore: result.categories?.content?.score ?? 0,
    contentMax: result.categories?.content?.maxScore ?? 0,
    imagesScore: result.categories?.images?.score ?? 0,
    imagesMax: result.categories?.images?.maxScore ?? 0,
    technicalScore: result.categories?.technical?.score ?? 0,
    technicalMax: result.categories?.technical?.maxScore ?? 0,
    details: result.details ?? [],
    links: result.links ?? { internal: [], external: [] },
    keywords: result.keywords ?? { primary: '', sub: [] },
    checkedAt: new Date().toISOString(),
  };

  return db.insert(seoResults)
    .values(data)
    .onConflictDoUpdate({ target: seoResults.url, set: data })
    .returning().get();
}
```

### Step 6 — Create `src/lib/services/member.service.ts`

Translate from `src/app/api/members/route.ts`:

```ts
import { db } from '@/lib/db';
import { members, tasks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { AppError } from '@/lib/api-response';

export function getMemberStats(month: number, year: number, viewType: 'month' | 'week' | 'day' = 'month') {
  const allTasks = db.select().from(tasks)
    .where(and(eq(tasks.month, month), eq(tasks.year, year)))
    .all();
  const memberInfos = db.select().from(members).all();

  // Pure JS grouping logic — identical to existing members/route.ts lines 31–121
  // (filter tasks by viewType, build memberMap, compute onTimeRate)
  return { members: buildMemberStats(allTasks, viewType), memberInfos };
}

export function createMember(data: typeof members.$inferInsert) {
  return db.insert(members).values(data).returning().get();
}

export function updateMember(id: string, data: Partial<typeof members.$inferInsert>) {
  const updated = db.update(members).set(data).where(eq(members.id, id)).returning().get();
  if (!updated) throw new AppError('Member not found', 404);
  return updated;
}

export function deleteMember(id: string) {
  db.delete(members).where(eq(members.id, id)).run();
}
```

### Step 7 — Create `src/lib/services/salary.service.ts`

Translate from `src/app/api/salary/route.ts` + `analytics/route.ts`:

```ts
import { db } from '@/lib/db';
import { tasks, projects, salaryPayments, members } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { calculateSalary } from '@/lib/utils';

export function getSalaryData(month: number, year: number, projectId?: string) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const conditions = [gte(tasks.publishDate, startDate), lte(tasks.publishDate, endDate)];
  if (projectId) conditions.push(eq(tasks.projectId, projectId));

  const taskList = db.select().from(tasks).where(and(...conditions)).all();
  const projectList = db.select().from(projects).all();

  // Pure JS salary computation — identical to existing salary/route.ts lines 44–106
  // Attach project name by joining projectList by project_id
  return buildSalaryData(taskList, projectList);
}

export function getSalaryAnalytics(months: number = 6) {
  // Loop months, fetch tasks + payments per month — same logic as analytics/route.ts
  // All DB calls sync, pure JS aggregation
  return buildAnalytics(months);
}

// salary_payments CRUD
export function getPayments(month: number, year: number) {
  return db.select().from(salaryPayments)
    .where(and(eq(salaryPayments.month, month), eq(salaryPayments.year, year)))
    .all();
}

export function upsertPayment(memberName: string, month: number, year: number, amount: number) {
  return db.insert(salaryPayments)
    .values({ memberName, month, year, amount })
    .onConflictDoUpdate({
      target: [salaryPayments.memberName, salaryPayments.month, salaryPayments.year],
      set: { amount },
    })
    .returning().get();
}

export function deletePayment(memberName: string, month: number, year: number) {
  db.delete(salaryPayments)
    .where(and(
      eq(salaryPayments.memberName, memberName),
      eq(salaryPayments.month, month),
      eq(salaryPayments.year, year),
    ))
    .run();
}
```

### Step 8 — Create `src/lib/services/sync.service.ts`

Translate from `src/app/api/sync/route.ts` (keep Google Sheets fetch logic unchanged):

```ts
import { db } from '@/lib/db';
import { projects, tasks, syncLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Sync log helpers (sync, not async — DB calls only)
export function createSyncLog() {
  return db.insert(syncLogs).values({ status: 'running', startedAt: new Date().toISOString() })
    .returning().get();
}

export function updateSyncLog(id: string, status: 'success' | 'failed', tasksSynced: number, projectsSynced: number, error?: string, durationMs?: number) {
  db.update(syncLogs).set({
    status, tasksSynced, projectsSynced,
    error: error ?? null,
    durationMs: durationMs ?? null,
    completedAt: new Date().toISOString(),
  }).where(eq(syncLogs.id, id)).run();
}

// Main sync — async because Google Sheets fetch is async
export async function syncAllProjects() {
  const startTime = Date.now();
  const log = createSyncLog();

  try {
    const allProjects = db.select().from(projects).all();
    let totalSynced = 0;
    let projectsSynced = 0;

    for (const project of allProjects) {
      // fetchGoogleSheet() is async (external HTTP) — keep await here
      const sheetData = await fetchGoogleSheet(project.sheetId, project.sheetName);
      if (!sheetData?.rows?.length) continue;

      const taskRows = sheetData.rows
        .filter(isValidRow)
        .map((row) => mapRowToTask(row, project.id));

      // Sync delete + batch insert in transaction
      db.transaction((tx) => {
        tx.delete(tasks).where(eq(tasks.projectId, project.id)).run();
        for (let i = 0; i < taskRows.length; i += 100) {
          tx.insert(tasks).values(taskRows.slice(i, i + 100)).run();
        }
      });

      totalSynced += taskRows.length;
      projectsSynced++;
    }

    updateSyncLog(log!.id, 'success', totalSynced, projectsSynced, undefined, Date.now() - startTime);
    return { success: true, totalSynced, projectsSynced, duration: Date.now() - startTime };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    updateSyncLog(log!.id, 'failed', 0, 0, msg, Date.now() - startTime);
    throw err;
  }
}

// Keep fetchGoogleSheet(), isValidRow(), mapRowToTask() from existing sync/route.ts unchanged
// (They are pure logic not tied to Supabase)
// mapRowToTask() output uses camelCase now matching Drizzle schema field names
```

> **Important**: In `mapRowToTask()`, change output keys from `project_id`, `status_content` etc. → `projectId`, `statusContent` etc. to match Drizzle camelCase schema.

### Step 9 — Create `src/lib/services/dashboard.service.ts`

Translate from `src/app/api/dashboard/overview/route.ts` + `src/app/api/stats/route.ts`:

```ts
import { db } from '@/lib/db';
import { tasks, members, projects, salaryPayments, keywordRankings, seoResults } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { calculateSalary } from '@/lib/utils';

export function getDashboardOverview(month: number, year: number) {
  const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const endStr = new Date(year, month, 0).toISOString().split('T')[0];

  // All sync DB calls in parallel-ish (but sync means sequential; still fast for SQLite)
  const allTasks = db.select().from(tasks)
    .where(and(gte(tasks.publishDate, startStr), lte(tasks.publishDate, endStr)))
    .all();
  const allMembers = db.select().from(members).all();
  const allProjects = db.select().from(projects).all();
  const payments = db.select().from(salaryPayments)
    .where(and(eq(salaryPayments.month, month), eq(salaryPayments.year, year)))
    .all();
  const rankings = db.select().from(keywordRankings)
    .orderBy(/* desc date */).limit(1000).all();
  const seoData = db.select({ score: seoResults.score, maxScore: seoResults.maxScore, url: seoResults.url })
    .from(seoResults).limit(500).all();

  // Pure JS aggregation — identical logic to existing dashboard/overview/route.ts lines 60–295
  return buildOverview({ allTasks, allMembers, allProjects, payments, rankings, seoData, month, year });
}

export function getStats(month: number, year: number) {
  // Translate from stats/route.ts — sync DB calls + same JS computation
}
```

### Step 10 — Create `src/lib/services/sync/route.ts` logs getter

Add to `sync.service.ts`:

```ts
export function getSyncLogs(limit: number = 20) {
  return db.select().from(syncLogs)
    .orderBy(desc(syncLogs.startedAt))
    .limit(limit)
    .all();
}
```

### Step 11 — Create `src/lib/services/index.ts`

```ts
export * from './project.service';
export * from './task.service';
export * from './keyword.service';
export * from './seo.service';
export * from './salary.service';
export * from './member.service';
export * from './sync.service';
export * from './dashboard.service';
```

## Todo List

- [ ] Create `src/lib/api-response.ts`
- [ ] Create `src/lib/services/project.service.ts` (projects + targets)
- [ ] Create `src/lib/services/task.service.ts`
- [ ] Create `src/lib/services/keyword.service.ts` (rankings + growth + analysis + sync CSV helpers)
- [ ] Create `src/lib/services/seo.service.ts`
- [ ] Create `src/lib/services/member.service.ts`
- [ ] Create `src/lib/services/salary.service.ts` (salary + payments + analytics)
- [ ] Create `src/lib/services/sync.service.ts` (port Google Sheets helpers from sync/route.ts)
- [ ] Create `src/lib/services/dashboard.service.ts`
- [ ] Create `src/lib/services/index.ts`
- [ ] Verify `mapRowToTask()` outputs camelCase field names matching Drizzle schema

## Success Criteria

- All service files compile with `tsc --noEmit`
- `import { getProjectsWithStats } from '@/lib/services'` resolves
- `getProjectsWithStats(1, 2026)` returns array without error (requires Phase 01 migrations done)
- No `import { supabase }` in any service file
- No `await` on `.all()/.get()/.run()` calls

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| `mapRowToTask()` output keys still snake_case | Rename all keys to camelCase matching schema |
| `onConflictDoUpdate` requires unique index on those columns | Ensure unique indexes defined in schema (Phase 01) |
| `db.transaction()` callback must be sync | No `await` inside `db.transaction()` callback |
| `inArray()` with empty array breaks SQLite | Guard: `if (!urls.length) return []` |

## Next Steps → Phase 03

Once services compile, proceed to `phase-03-api-routes-migration-versioned-v1-endpoints.md`.
