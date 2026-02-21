# Debug Report: Strategy Page Blank

**Date:** 2026-02-21
**Severity:** Medium (page non-functional)
**Status:** RESOLVED

---

## Root Cause

Stale `.next` build cache — webpack chunk `1682.js` referenced by old compiled output no longer existed after component rewrite.

Error from `/tmp/nextdev.log`:
```
Error: Cannot find module './1682.js'
requireStack: .next/server/app/(dashboard)/strategy/page.js
```

The component rewrite changed chunk boundaries; old `.next/server/` artifacts pointed to non-existent chunk IDs.

---

## Investigation Summary

1. `page.tsx` — simple re-export of `seo-strategy-phases-and-actions-manager.tsx`. No issue.
2. `seo-strategy-phases-and-actions-manager.tsx` — all imports valid:
   - `@/components/EmptyState` ✓ (exists, correct props)
   - `@/components/LoadingSpinner` → `PageLoading` ✓
   - `@/types` → `Project` ✓
   - `@/lib/utils` → `cn` ✓
3. API routes `GET /api/v1/strategy/phases` + `GET /api/v1/strategy/actions` ✓
4. Service functions `getPhases`, `createPhase`, `getActions`, `createAction`, `updateAction` ✓ exported from `src/lib/services/index.ts`
5. DB schema `strategy_phases` + `strategy_actions` ✓ (SQLite/Drizzle)

**Minor note:** `StrategyPhase` interface declares `order_index: number` but DB schema has no such column (uses `priority: integer`). Non-breaking at runtime since field is unused in render logic.

---

## Fix Applied

```bash
rm -rf .next
npx next build
```

Build result: success, `/strategy` compiles to 8.88 kB, zero TS/lint errors.

---

## Prevention

- After any significant component rewrite, run `rm -rf .next` before restarting dev server to avoid stale chunk references.
- CI build should always start clean (no `.next` cache between jobs).

---

## Unresolved Questions

- `order_index` in `StrategyPhase` TypeScript interface doesn't match DB schema (`priority` integer). Low priority but could cause confusion. Recommend aligning interface with schema.
