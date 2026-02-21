# Phase 05: Cleanup — Delete Files, Remove Deps, Seed Script, Final Verification

## Context Links
- Plan overview: `plans/260221-1433-supabase-to-sqlite-migration/plan.md`
- Phase 04 (prerequisite): `phase-04-frontend-auth-removal-api-url-updates.md`
- All previous phases must be complete and verified before this phase

## Overview

Final cleanup phase: delete all Supabase/auth-related files, remove unused npm dependencies, create a seed script for testing, update `.gitignore`, and run full verification. No new features added.

## Files & Directories to DELETE

### Source files
```
src/app/login/page.tsx
src/app/(dashboard)/users/page.tsx
src/contexts/AuthContext.tsx
src/lib/auth.ts
src/lib/supabase.ts
src/types/auth.ts
src/middleware.ts
```

### API route directories (entire tree)
```
src/app/api/auth/           ← login/, logout/, me/, route.ts
src/app/api/activity-logs/  ← route.ts
src/app/api/users/          ← route.ts
```

### Old flat API routes (replaced by /api/v1/)
```
src/app/api/projects/
src/app/api/projects/report/
src/app/api/tasks/
src/app/api/targets/
src/app/api/members/
src/app/api/salary/
src/app/api/salary/analytics/
src/app/api/salary-payments/
src/app/api/keyword-rankings/
src/app/api/keyword-rankings/sync/
src/app/api/keyword-rankings/growth/
src/app/api/keyword-rankings/analysis/
src/app/api/keyword-rankings/details/
src/app/api/seo-results/
src/app/api/seo-results/batch/
src/app/api/seo-check/
src/app/api/stats/
src/app/api/dashboard/
src/app/api/sync/
```

### Legacy SQL files
```
sql/                         ← entire directory (create_auth_tables.sql, keyword_rankings_schema.sql)
supabase-schema.sql
```

### Environment variables to REMOVE from `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## Dependencies to REMOVE

```bash
npm uninstall @supabase/supabase-js bcryptjs @types/bcryptjs
```

Package counts: removes 3 packages. `better-sqlite3`, `drizzle-orm`, `drizzle-kit` already installed — no new installs needed except `tsx` (added in Phase 01).

## Seed Script

Create `src/lib/db/seed.ts` — populates realistic test data for local development.

### Seed data design
- 2 projects
- 3 members
- ~15 tasks spread across 2 months
- 5 keyword_rankings records
- 2 seo_results records
- 1 salary_payment record
- 1 monthly_target per project

```ts
import { db } from './index';
import * as schema from './schema';

async function seed() {
  console.log('🌱 Seeding database...');

  // Clear existing data (order matters for FK constraints)
  db.delete(schema.syncLogs).run();
  db.delete(schema.salaryPayments).run();
  db.delete(schema.keywordRankings).run();
  db.delete(schema.seoResults).run();
  db.delete(schema.monthlyTargets).run();
  db.delete(schema.tasks).run();
  db.delete(schema.members).run();
  db.delete(schema.projects).run();

  // --- Projects ---
  const project1 = db.insert(schema.projects).values({
    name: 'Banpham.com',
    sheetId: 'demo-sheet-id-1',
    sheetName: 'Content',
    monthlyTarget: 20,
    rankingSheetUrl: null,
  }).returning().get();

  const project2 = db.insert(schema.projects).values({
    name: 'Techblog.vn',
    sheetId: 'demo-sheet-id-2',
    sheetName: 'Tasks',
    monthlyTarget: 15,
    rankingSheetUrl: null,
  }).returning().get();

  console.log(`✓ Created 2 projects`);

  // --- Members ---
  const member1 = db.insert(schema.members).values({
    name: 'Nguyễn Văn An',
    nickname: 'An',
    role: 'Content Writer',
    projects: [project1.id, project2.id],
    startDate: '2024-01-15',
    email: 'an@example.com',
  }).returning().get();

  const member2 = db.insert(schema.members).values({
    name: 'Trần Thị Bình',
    nickname: 'Bình',
    role: 'Content Writer',
    projects: [project1.id],
    startDate: '2024-03-01',
    email: 'binh@example.com',
  }).returning().get();

  const member3 = db.insert(schema.members).values({
    name: 'Lê Minh Châu',
    nickname: 'Châu',
    role: 'SEO',
    projects: [project1.id, project2.id],
    startDate: '2023-10-01',
    email: 'chau@example.com',
  }).returning().get();

  console.log(`✓ Created 3 members`);

  // --- Monthly Targets ---
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  db.insert(schema.monthlyTargets).values([
    { projectId: project1.id, month: currentMonth, year: currentYear, target: 20 },
    { projectId: project2.id, month: currentMonth, year: currentYear, target: 15 },
  ]).run();

  console.log(`✓ Created monthly targets`);

  // --- Tasks ---
  const taskBase = {
    year: currentYear,
    month: currentMonth,
    monthYear: `${currentMonth}/${currentYear}`,
    searchVolume: 1000,
    keywordCount: 3,
  };

  // Project 1 tasks — mix of statuses
  const tasksP1 = [
    {
      projectId: project1.id,
      stt: 1,
      parentKeyword: 'thiết kế web',
      keywordSub: 'thiết kế web đẹp',
      keywordsList: ['thiết kế web đẹp', 'mẫu web đẹp', 'website chuyên nghiệp'],
      title: 'Top 10 mẫu thiết kế web đẹp nhất 2026',
      pic: member1.name,
      statusContent: '4. Publish',
      linkPublish: 'https://banpham.com/thiet-ke-web-dep',
      publishDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-05`,
      deadline: `${currentYear}-${String(currentMonth).padStart(2, '0')}-05`,
      statusOutline: '3. Done QC Outline',
    },
    {
      projectId: project1.id,
      stt: 2,
      parentKeyword: 'seo onpage',
      keywordSub: 'seo onpage là gì',
      keywordsList: ['seo onpage là gì', 'hướng dẫn seo onpage'],
      title: 'SEO Onpage là gì? Hướng dẫn tối ưu chi tiết',
      pic: member2.name,
      statusContent: '4. Publish',
      linkPublish: 'https://banpham.com/seo-onpage',
      publishDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-10`,
      deadline: `${currentYear}-${String(currentMonth).padStart(2, '0')}-10`,
      statusOutline: '3. Done QC Outline',
    },
    {
      projectId: project1.id,
      stt: 3,
      parentKeyword: 'content marketing',
      keywordSub: 'content marketing là gì',
      keywordsList: ['content marketing'],
      title: 'Content Marketing: Chiến lược hiệu quả cho SMB',
      pic: member1.name,
      statusContent: '2. QC Content',
      deadline: `${currentYear}-${String(currentMonth).padStart(2, '0')}-20`,
      statusOutline: '3. Done QC Outline',
    },
    {
      projectId: project1.id,
      stt: 4,
      parentKeyword: 'email marketing',
      keywordSub: 'email marketing tool',
      keywordsList: ['email marketing tool', 'công cụ email marketing'],
      title: 'Top 5 công cụ Email Marketing tốt nhất 2026',
      pic: member2.name,
      statusContent: '1. Doing',
      deadline: `${currentYear}-${String(currentMonth).padStart(2, '0')}-25`,
      statusOutline: '2. QC Outline',
    },
  ];

  // Project 2 tasks
  const tasksP2 = [
    {
      projectId: project2.id,
      stt: 1,
      parentKeyword: 'react tutorial',
      keywordSub: 'react tutorial tiếng việt',
      keywordsList: ['react tutorial', 'học react'],
      title: 'Học React từ cơ bản đến nâng cao 2026',
      pic: member3.name,
      statusContent: '4. Publish',
      linkPublish: 'https://techblog.vn/hoc-react',
      publishDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-08`,
      deadline: `${currentYear}-${String(currentMonth).padStart(2, '0')}-08`,
      statusOutline: '3. Done QC Outline',
    },
    {
      projectId: project2.id,
      stt: 2,
      parentKeyword: 'nextjs',
      keywordSub: 'nextjs 14 tutorial',
      keywordsList: ['nextjs 14', 'next.js tutorial'],
      title: 'Next.js 14 App Router: Hướng dẫn đầy đủ',
      pic: member1.name,
      statusContent: '1.1 Fixing',
      deadline: `${currentYear}-${String(currentMonth).padStart(2, '0')}-28`,
      statusOutline: '3. Done QC Outline',
    },
  ];

  const allTasks = [...tasksP1, ...tasksP2];
  db.insert(schema.tasks).values(
    allTasks.map(t => ({ ...taskBase, ...t }))
  ).run();

  console.log(`✓ Created ${allTasks.length} tasks`);

  // --- Keyword Rankings ---
  const today = new Date().toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  db.insert(schema.keywordRankings).values([
    { keyword: 'thiết kế web đẹp', url: 'https://banpham.com/thiet-ke-web-dep', position: 5.0, date: today, projectId: project1.id },
    { keyword: 'seo onpage là gì', url: 'https://banpham.com/seo-onpage', position: 12.0, date: today, projectId: project1.id },
    { keyword: 'content marketing là gì', url: 'https://banpham.com/content-marketing', position: 28.5, date: today, projectId: project1.id },
    { keyword: 'thiết kế web đẹp', url: 'https://banpham.com/thiet-ke-web-dep', position: 7.0, date: lastWeek, projectId: project1.id },
    { keyword: 'seo onpage là gì', url: 'https://banpham.com/seo-onpage', position: 15.0, date: lastWeek, projectId: project1.id },
  ]).run();

  console.log(`✓ Created 5 keyword rankings`);

  // --- SEO Results ---
  db.insert(schema.seoResults).values([
    {
      url: 'https://banpham.com/thiet-ke-web-dep',
      score: 82,
      maxScore: 100,
      contentScore: 35,
      contentMax: 40,
      imagesScore: 22,
      imagesMax: 30,
      technicalScore: 25,
      technicalMax: 30,
      details: [],
      links: { internal: [], external: [] },
      keywords: { primary: 'thiết kế web đẹp', sub: ['mẫu web đẹp'] },
    },
    {
      url: 'https://banpham.com/seo-onpage',
      score: 65,
      maxScore: 100,
      contentScore: 28,
      contentMax: 40,
      imagesScore: 18,
      imagesMax: 30,
      technicalScore: 19,
      technicalMax: 30,
      details: [],
      links: { internal: [], external: [] },
      keywords: { primary: 'seo onpage là gì', sub: [] },
    },
  ]).run();

  console.log(`✓ Created 2 SEO results`);

  // --- Salary Payments ---
  db.insert(schema.salaryPayments).values({
    memberName: member1.name,
    month: currentMonth,
    year: currentYear,
    amount: 2750000,
  }).run();

  console.log(`✓ Created 1 salary payment`);

  console.log('\n✅ Seed complete!');
  console.log(`   Projects: 2`);
  console.log(`   Members: 3`);
  console.log(`   Tasks: ${allTasks.length}`);
  console.log(`   Keyword rankings: 5`);
  console.log(`   SEO results: 2`);
  console.log(`   Salary payments: 1`);
}

seed().catch(console.error);
```

## `.gitignore` Updates

Add to `.gitignore`:
```
# SQLite database files
data/*.db
data/*.db-shm
data/*.db-wal
```

## Implementation Steps

### Step 1 — Remove npm dependencies

```bash
cd /Users/puchinpham/Developer/seo-manager-local
npm uninstall @supabase/supabase-js bcryptjs @types/bcryptjs
```

Verify `package.json` no longer contains these three packages.

### Step 2 — Delete source files

```bash
# Auth files
rm src/app/login/page.tsx
rm src/app/\(dashboard\)/users/page.tsx
rm src/contexts/AuthContext.tsx
rm src/lib/auth.ts
rm src/lib/supabase.ts
rm src/types/auth.ts
rm src/middleware.ts

# Auth + removed API route directories
rm -rf src/app/api/auth/
rm -rf src/app/api/activity-logs/
rm -rf src/app/api/users/

# Old flat API routes (all replaced by /api/v1/)
rm -rf src/app/api/projects/
rm -rf src/app/api/tasks/
rm -rf src/app/api/targets/
rm -rf src/app/api/members/
rm -rf src/app/api/salary/
rm -rf src/app/api/salary-payments/
rm -rf src/app/api/keyword-rankings/
rm -rf src/app/api/seo-results/
rm -rf src/app/api/seo-check/
rm -rf src/app/api/stats/
rm -rf src/app/api/dashboard/
rm -rf src/app/api/sync/

# Legacy SQL files
rm -rf sql/
rm supabase-schema.sql
```

Verify `src/app/api/` now contains only `v1/` directory:
```bash
ls src/app/api/
# Expected output: v1
```

### Step 3 — Update `.gitignore`

Add SQLite entries (see above).

### Step 4 — Create seed script

Create `src/lib/db/seed.ts` with content from Seed Script section above.

### Step 5 — Run seed

```bash
npm run db:seed
```

Expected output:
```
🌱 Seeding database...
✓ Created 2 projects
✓ Created 3 members
✓ Created monthly targets
✓ Created 6 tasks
✓ Created 5 keyword rankings
✓ Created 2 SEO results
✓ Created 1 salary payment

✅ Seed complete!
```

### Step 6 — Full verification

```bash
# 1. TypeScript check
npx tsc --noEmit

# 2. No supabase imports anywhere in src/
grep -rn "supabase\|@supabase\|bcryptjs" src/
# Expected: 0 results

# 3. No auth imports
grep -rn "AuthContext\|useAuth\|from '@/types/auth'\|from '@/lib/auth'" src/
# Expected: 0 results

# 4. No old /api/ fetch URLs (non-v1)
grep -rn "fetch('/api/" src/app/\(dashboard\)/
grep -rn "fetch(\`/api/" src/app/\(dashboard\)/
# Expected: 0 results (all should be /api/v1/)

# 5. Dev server starts without Supabase env vars
npm run dev
# Expected: starts on localhost:3000 with no errors in terminal
```

### Step 7 — Manual smoke test

Open browser and verify these pages load correctly:

| Page | URL | Check |
|------|-----|-------|
| Dashboard | `http://localhost:3000/` | Shows stats + overview |
| Projects | `http://localhost:3000/projects` | Lists 2 seeded projects |
| Tasks | `http://localhost:3000/tasks` | Lists seeded tasks |
| Members | `http://localhost:3000/members` | Lists 3 seeded members |
| Salary | `http://localhost:3000/salary` | Shows salary calculations |
| Settings | `http://localhost:3000/settings` | Shows Projects + Sync + System tabs (no Activity tab) |
| SEO Audit | `http://localhost:3000/seo-audit` | Loads without errors |
| Keyword Ranking | `http://localhost:3000/keyword-ranking` | Shows 5 seeded rankings |

**Should NOT exist:**
- `http://localhost:3000/login` → 404
- `http://localhost:3000/users` → 404

### Step 8 — API smoke test

```bash
# Test key v1 routes
curl -s http://localhost:3000/api/v1/projects | jq '.length'
# Expected: 2

curl -s http://localhost:3000/api/v1/stats | jq '.total'
# Expected: number > 0

curl -s http://localhost:3000/api/v1/members | jq '.memberInfos | length'
# Expected: 3

curl -s http://localhost:3000/api/v1/keyword-rankings | jq '.rankings | length'
# Expected: 5

curl -s http://localhost:3000/api/v1/sync/logs | jq '.logs'
# Expected: []

# Ensure old routes return 404
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/projects
# Expected: 404
```

## Todo List

- [ ] `npm uninstall @supabase/supabase-js bcryptjs @types/bcryptjs`
- [ ] Delete `src/app/login/page.tsx`
- [ ] Delete `src/app/(dashboard)/users/page.tsx`
- [ ] Delete `src/contexts/AuthContext.tsx`
- [ ] Delete `src/lib/auth.ts`
- [ ] Delete `src/lib/supabase.ts`
- [ ] Delete `src/types/auth.ts`
- [ ] Delete `src/middleware.ts`
- [ ] Delete `src/app/api/auth/` (entire dir)
- [ ] Delete `src/app/api/activity-logs/` (entire dir)
- [ ] Delete `src/app/api/users/` (entire dir)
- [ ] Delete all old flat `src/app/api/*/` route dirs (14 dirs)
- [ ] Delete `sql/` directory
- [ ] Delete `supabase-schema.sql`
- [ ] Remove Supabase env vars from `.env.local`
- [ ] Update `.gitignore` with SQLite entries
- [ ] Create `src/lib/db/seed.ts`
- [ ] Run `npm run db:seed` successfully
- [ ] Run `npx tsc --noEmit` — 0 errors
- [ ] Run grep verifications — 0 supabase/auth references
- [ ] Manual smoke test all 8 dashboard pages
- [ ] API curl smoke tests pass

## Success Criteria

- `npx tsc --noEmit` exits 0
- `npm run dev` starts without requiring any Supabase env vars
- `grep -rn "supabase\|@supabase\|bcryptjs" src/` → 0 results
- `ls src/app/api/` → only `v1/`
- All 8 dashboard pages load and display seeded data
- Login page returns 404
- `package.json` devDependencies/dependencies contain no Supabase or bcrypt packages

## Unresolved Questions

1. **`seo-check` route** — does it import anything from `@/lib/supabase` or `@/lib/auth`? Verify before deleting supabase.ts to avoid cascading errors. (Likely clean — it's a pure external fetch route.)
2. **`src/app/api/keyword-rankings/details/route.ts`** — not yet read in full during planning. Must read before Phase 03 Step 11 to confirm it has no unusual auth dependencies.
3. **`data/` directory** — should it be committed with `.gitkeep`? Yes, add to git so `data/` path exists on clone. Add `data/*.db*` to `.gitignore` but commit `data/.gitkeep`.
4. **`NEXT_PUBLIC_SUPABASE_URL` in existing `.env.local`** — confirm file exists locally (it wasn't committed per `.gitignore`). Warn developer to manually remove vars.
