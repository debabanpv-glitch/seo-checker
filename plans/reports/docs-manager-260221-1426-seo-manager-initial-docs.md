# docs-manager report — SEO Manager Initial Documentation

**Date:** 2026-02-21
**Slug:** seo-manager-initial-docs

---

## Current State Assessment

Project had zero documentation (empty `docs/` directory, boilerplate `README.md`). Codebase fully functional: 52 source files, 28 API routes, 10 dashboard pages.

---

## Changes Made

| File | Lines | Action |
|---|---|---|
| `docs/project-overview-pdr.md` | 179 | Created — product summary, features, RBAC, business rules, tech debt, acceptance criteria |
| `docs/system-architecture.md` | 333 | Created — request lifecycle, directory tree, DB schema, RBAC matrix, Google Sheets integration, security |
| `docs/code-standards.md` | 270 | Created — TypeScript rules, component/API patterns, utility reference, styling conventions |
| `docs/codebase-summary.md` | 229 | Created — file inventory with LOC, critical code paths, data flow, hotspot list |
| `README.md` | 161 | Replaced boilerplate — quick start, env vars, DB setup, structure, stack table, feature list, doc index |

All files within limits (docs ≤ 800 lines, README ≤ 300 lines).

---

## Gaps Identified

1. **Missing SQL schemas** — `members`, `salary_payments`, `sync_logs` tables have no migration files in repo. Onboarding is blocked without them.
2. **No `.env.example` with app keys** — file exists but only has ClaudeKit/Discord vars; Supabase keys absent.
3. **No test documentation** — zero test files exist; no testing strategy documented.
4. **Legacy `api/auth/route.ts`** — undocumented, deprecated, still active.
5. **`vercel.json` empty** — no deployment config documented.

---

## Recommendations (prioritized)

1. Add missing SQL DDL for `members`, `salary_payments`, `sync_logs` to `sql/` directory.
2. Update `.env.example` at repo root with all required Supabase env vars.
3. Remove or clearly deprecate `src/app/api/auth/route.ts`.
4. Fix middleware fail-open (line 103 in `middleware.ts`) — highest security risk.
5. Unify `isPublished` logic: single source of truth in `task-helpers.ts`, import everywhere.
6. Break up `app/(dashboard)/page.tsx` (1679 LOC) into sub-components.

---

## Unresolved Questions

- What columns/types does the `members` table have? (needed to complete SQL schema)
- What columns/types does `salary_payments` have? (`member_name` string or FK to `members`?)
- Is `sync_logs` just `{ id, project_id, status, message, created_at }`?
- Is service role key required in production, or can anon key + proper RLS suffice?
- Any plans for RLS policies on Supabase, or is allow-all intentional (internal-only)?
