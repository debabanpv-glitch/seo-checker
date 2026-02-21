# Next.js 14 App Router: Service Architecture Patterns
Date: 2026-02-21 | Context: 26-route monolith, Supabase → SQLite+Drizzle migration

---

## 1. API Versioning

**Verdict: Skip versioning for internal APIs. YAGNI.**

For a private SaaS with no external consumers, `/api/v1/` adds folder nesting with zero benefit. If external API needed later, add versioning then.

**If versioning IS needed:**
```
src/app/api/
  v1/
    projects/route.ts
    tasks/route.ts
  v2/              ← add only when breaking changes needed
```

**Recommended for this project:**
```
src/app/api/
  projects/route.ts        ← keep flat, no versioning
  projects/[id]/route.ts
  tasks/route.ts
```

---

## 2. Service Layer Pattern

**Verdict: Yes, extract services. Current inline logic = unmaintainable.**

```
src/
  lib/
    db/              ← Drizzle client + schema
      index.ts
      schema.ts
    services/        ← Business logic (pure functions, no HTTP)
      project.service.ts
      task.service.ts
      keyword.service.ts
```

**Route handler** = thin orchestration only:
```ts
// src/app/api/projects/route.ts
export async function GET(req: NextRequest) {
  const { month, year } = parseSearchParams(req);
  const projects = await projectService.getProjectsWithStats(month, year);
  return NextResponse.json(projects);
}
```

**Service** = pure business logic:
```ts
// src/lib/services/project.service.ts
export async function getProjectsWithStats(month: number, year: number) {
  const projects = await db.select().from(schema.projects);
  // ... business logic here
  return projectsWithStats;
}
```

**Why `src/lib/services/` not `src/services/`:**
- `src/lib/` is the standard Next.js convention for server-side utilities
- Avoids ambiguity with client-side code
- Consistent with where `db/` lives

---

## 3. Module System

**Verdict: Domain folders inside `lib/`, barrel exports only at service level.**

```
src/lib/
  db/
    index.ts         ← export { db }
    schema/
      projects.ts
      tasks.ts
      index.ts       ← export * from all schemas
  services/
    project.service.ts
    task.service.ts
    index.ts         ← export { projectService, taskService }
  utils/
    date.ts
    task-helpers.ts  ← move from root lib/
```

**Barrel export rule:** One `index.ts` per `services/` folder. No deep barrel exports (causes circular deps, slow TS server).

**Module boundaries:**
- Routes import from `services/` only
- Services import from `db/` only
- No cross-service imports (services call each other = service orchestration, keep in route or create a dedicated orchestration service)

---

## 4. Repository Pattern with Drizzle

**Verdict: Skip repository pattern. Overkill for this project size.**

Repository pattern adds value when:
- Multiple DB backends (Postgres + MongoDB)
- Mocking DB in tests at repo level
- Team of 5+ with clear separation needed

**For 26 routes + 1 dev:** Direct Drizzle queries in service functions is sufficient and simpler:

```ts
// src/lib/services/project.service.ts
import { db } from '@/lib/db';
import { projects, tasks } from '@/lib/db/schema';

export async function getProjects() {
  return db.select().from(projects).orderBy(asc(projects.createdAt));
}
```

If DB swapping ever needed, the service file IS the abstraction boundary. Adding a repo layer is a `git blame` away.

---

## 5. Error Handling

**Verdict: Centralized error types + single `apiResponse` helper.**

```ts
// src/lib/api-response.ts
export class AppError extends Error {
  constructor(public message: string, public status: number = 500) {
    super(message);
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error('[API Error]', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

**Route handler pattern:**
```ts
export async function GET(req: NextRequest) {
  try {
    const data = await projectService.getProjects();
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
```

**Service throws, route catches.** Services throw `AppError` with HTTP semantics (`new AppError('Not found', 404)`). Routes never contain error logic beyond catch.

---

## Recommended Final Structure

```
src/
  app/api/
    projects/route.ts
    projects/[id]/route.ts
    tasks/route.ts
    ... (26 routes, flat)
  lib/
    db/
      index.ts          ← Drizzle client (SQLite)
      schema/
        projects.ts
        tasks.ts
        index.ts
    services/
      project.service.ts
      task.service.ts
      keyword.service.ts
      auth.service.ts
      index.ts
    api-response.ts     ← AppError + handleApiError
    task-helpers.ts     ← move existing helper
```

**Migration order for 26 routes:**
1. Create `db/` layer (Drizzle schema + client)
2. Create `api-response.ts`
3. Extract services domain by domain (projects → tasks → keywords → auth)
4. Update routes to use services
5. Delete Supabase client

---

## Unresolved Questions

1. Are any of the 26 routes consumed by external clients (need true versioning)?
2. Does the project use Server Actions anywhere, or only Route Handlers?
3. Any need for request-scoped context (user session, tenant ID) passed through service calls? If yes, consider a context pattern or pass userId explicitly to service functions.
