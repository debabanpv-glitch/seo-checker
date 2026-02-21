---
title: "Migrate SEO Manager: Supabase → SQLite+Drizzle, Remove Auth"
description: "Full migration from Supabase to SQLite+Drizzle ORM with versioned API, service layer, and auth removal"
status: pending
priority: P1
effort: 12h
branch: main
tags: [sqlite, drizzle, migration, api-versioning, auth-removal]
created: 2026-02-21
---

# Migration Plan: Supabase → SQLite + Drizzle ORM

## Context

- Current: 52 source files, 11 Supabase tables, 26 API routes, full auth/RBAC system
- Target: SQLite local DB, Drizzle ORM, `/api/v1/` versioned routes, no auth
- Deps already installed: `better-sqlite3`, `drizzle-orm`, `drizzle-kit`
- Auth deps to remove: `@supabase/supabase-js`, `bcryptjs`, `@types/bcryptjs`

## Phases Overview

| Phase | File | Effort | Scope |
|-------|------|--------|-------|
| 1 | phase-01-database-layer.md | 2.5h | Drizzle schema, DB client, config, migrations |
| 2 | phase-02-service-layer.md | 3h | 8 service files + error handling utilities |
| 3 | phase-03-api-migration.md | 3.5h | 20 API routes rewritten to `/api/v1/` |
| 4 | phase-04-frontend-cleanup.md | 2h | Remove auth from 10 pages + Sidebar |
| 5 | phase-05-cleanup-and-seed.md | 1h | Delete files, remove deps, seed script |

**Total: ~12h**

## Dependency Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
(schema)  (services) (routes) (frontend) (cleanup)
```

## Key Design Decisions

1. **SQLite WAL mode** - concurrency for Next.js server (multiple requests)
2. **Synchronous Drizzle queries** - `better-sqlite3` is sync; no `await` on DB calls
3. **`globalThis._db` singleton** - avoid multiple DB connections in dev hot-reload
4. **Service layer** - route handlers thin; business logic in services
5. **`AppError` class** - typed errors, consistent JSON error responses
6. **API URL change** - ALL frontend fetches must update `/api/xyz` → `/api/v1/xyz`
7. **JSON for arrays/objects** - PostgreSQL arrays/JSONB → SQLite TEXT + JSON.parse/stringify
8. **UUID via `crypto.randomUUID()`** - no PostgreSQL `gen_random_uuid()`

## Files to DELETE (before or during Phase 5)

```
src/app/login/page.tsx
src/app/(dashboard)/users/page.tsx
src/contexts/AuthContext.tsx
src/lib/auth.ts
src/lib/supabase.ts
src/types/auth.ts
src/middleware.ts
src/app/api/auth/          (entire dir)
src/app/api/activity-logs/ (entire dir)
src/app/api/users/         (entire dir)
sql/                       (replaced by drizzle migrations)
supabase-schema.sql
```

## New Files to CREATE

```
src/lib/db/index.ts
src/lib/db/schema/projects.ts
src/lib/db/schema/seo.ts
src/lib/db/schema/members.ts
src/lib/db/schema/sync-logs.ts
src/lib/db/schema/index.ts
src/lib/db/seed.ts
src/lib/services/project.service.ts
src/lib/services/task.service.ts
src/lib/services/keyword.service.ts
src/lib/services/seo.service.ts
src/lib/services/salary.service.ts
src/lib/services/member.service.ts
src/lib/services/sync.service.ts
src/lib/services/dashboard.service.ts
src/lib/services/index.ts
src/lib/api-response.ts
drizzle.config.ts
```

## Success Criteria

- [ ] `npm run dev` starts without Supabase env vars
- [ ] All 20 `/api/v1/` routes return correct data
- [ ] No `useAuth()` import anywhere in codebase
- [ ] Dashboard pages load without login redirect
- [ ] Seed script populates test data
- [ ] `drizzle-kit generate` + `drizzle-kit migrate` creates schema

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| JSON array parsing bugs | Medium | Test keywords_list, projects JSON columns explicitly |
| DECIMAL position in SQLite | Low | Use `real` type for keyword position |
| Frontend fetch URLs missed | High | Grep all `/api/` occurrences before Phase 4 |
| Drizzle sync API misuse | Medium | No `await` on `.all()/.get()/.run()` |

---

## Validation Summary

**Validated:** 2026-02-21
**Questions asked:** 7

### Confirmed Decisions
1. **Field naming: Schema uses snake_case natively** — Drizzle schema fields defined as `sheet_id: text('sheet_id')` instead of camelCase. Zero mapping layer needed. Frontend stays untouched.
2. **API compat: No backward compat** — Old `/api/xyz` routes deleted entirely. Only `/api/v1/` exists. Internal app, no external consumers.
3. **Data source: Seed data only** — Fresh start with sample data. No Supabase export/import needed.
4. **Users page: Delete** — No users table, no auth system. Page removed completely.
5. **Env config: Only DATABASE_PATH** — `.env.example` contains `DATABASE_PATH=./data/seo-manager.db` (optional, has default).
6. **Settings tabs: Keep 3** — Projects + Sync + System. Only Activity tab removed.

### Action Items (Plan Revisions Needed)
- [ ] **Phase 01**: Update ALL schema files to use snake_case field names (e.g., `sheetId` → `sheet_id` as JS property names). This means: `sheet_id: text('sheet_id')` not `sheetId: text('sheet_id')`.
- [ ] **Phase 02**: Service functions use snake_case fields matching schema. No camelCase-to-snake mapper needed.
- [ ] **Phase 04**: Remove "Option A mapper" section entirely — not needed with snake_case schema.
- [ ] **Phase 05**: Update `.env.example` content to just `DATABASE_PATH=./data/seo-manager.db`.
