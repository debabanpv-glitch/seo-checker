# Phase 04: Frontend Cleanup — Auth Removal + API URL Updates

## Context Links
- Plan overview: `plans/260221-1433-supabase-to-sqlite-migration/plan.md`
- Phase 03 (prerequisite): `phase-03-api-routes-migration-versioned-v1-endpoints.md`
- Files to touch: all 9 dashboard pages + Sidebar + layout + types

## Overview

Remove all auth-related code from frontend components and update every `/api/xyz` fetch call to `/api/v1/xyz`. No new logic is added — only removal and URL prefixing.

## Complete API URL Change Map

Every `fetch('/api/...')` in dashboard pages must become `fetch('/api/v1/...')`:

| Old URL | New URL | File(s) |
|---------|---------|---------|
| `/api/stats` | `/api/v1/stats` | `page.tsx` (dashboard home) |
| `/api/dashboard/overview` | `/api/v1/dashboard/overview` | `page.tsx` |
| `/api/keyword-rankings` | `/api/v1/keyword-rankings` | `keyword-ranking/page.tsx` |
| `/api/keyword-rankings/growth` | `/api/v1/keyword-rankings/growth` | `projects/page.tsx` |
| `/api/keyword-rankings/details` | `/api/v1/keyword-rankings/details` | `projects/page.tsx` |
| `/api/keyword-rankings/analysis` | `/api/v1/keyword-rankings/analysis` | `projects/page.tsx` |
| `/api/keyword-rankings/sync` | `/api/v1/keyword-rankings/sync` | `settings/page.tsx` |
| `/api/projects` | `/api/v1/projects` | `keyword-ranking/page.tsx`, `projects/page.tsx`, `settings/page.tsx` |
| `/api/members` | `/api/v1/members` | `members/page.tsx`, `salary/page.tsx` |
| `/api/salary` | `/api/v1/salary` | `salary/page.tsx` |
| `/api/salary/analytics` | `/api/v1/salary/analytics` | `salary/page.tsx` |
| `/api/salary-payments` | `/api/v1/salary-payments` | `members/page.tsx`, `salary/page.tsx` |
| `/api/tasks` | `/api/v1/tasks` | `tasks/page.tsx`, `seo-audit/page.tsx` |
| `/api/seo-check` | `/api/v1/seo-check` | `seo-audit/page.tsx` |
| `/api/seo-results` | `/api/v1/seo-results` | `seo-audit/page.tsx` |
| `/api/seo-results/batch` | `/api/v1/seo-results/batch` | `seo-audit/page.tsx` |
| `/api/targets` | `/api/v1/targets` | `settings/page.tsx` |
| `/api/sync` | `/api/v1/sync` | `settings/page.tsx` |
| `/api/sync/logs` | `/api/v1/sync/logs` | `settings/page.tsx` |
| `/api/activity-logs` | **REMOVE** (no replacement) | `settings/page.tsx` |
| `/api/users` | **REMOVE** (no replacement) | `users/page.tsx` → DELETE PAGE |

## Auth Code to Remove Per File

### `src/app/layout.tsx`
- Remove: `import { AuthProvider } from '@/contexts/AuthContext'`
- Remove: `<AuthProvider>` wrapper, keep `{children}` bare

**Before:**
```tsx
import { AuthProvider } from '@/contexts/AuthContext';
<body ...>
  <AuthProvider>{children}</AuthProvider>
</body>
```
**After:**
```tsx
<body ...>
  {children}
</body>
```

### `src/components/Sidebar.tsx`
Remove all auth/RBAC code; keep navigation structure intact.

**Remove these imports:**
```tsx
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';
import { Shield, LogOut } from 'lucide-react'; // LogOut used only for logout button
```

**Remove these items from `navigation` array** (role-restricted or auth-only):
```tsx
{ name: 'Quản lý users', href: '/users', icon: UserCog, roles: ['admin'] },
```
Also remove `roles?: UserRole[]` from `NavItem` interface.

**Remove these from `SidebarContent`:**
- The entire `{user && (...)}` user info block (lines 94–113)
- The logout `<button>` at bottom

**Remove state/hooks:**
- `const { user, logout } = useAuth()`
- `const handleLogout = async () => {...}`

**Remove filtered navigation:**
- `const filteredNavigation = navigation.filter(...)` → replace with just `navigation`
- `{filteredNavigation.map(...)}` → `{navigation.map(...)}`

**Remove role badge constants** (no longer needed):
```tsx
const roleBadgeColors: Record<UserRole, string> = {...}
const roleLabels: Record<UserRole, string> = {...}
```

**Keep intact:** Logo section, nav links, Docs secondary nav, mobile toggle logic.

**Final simplified Sidebar** — only uses `usePathname()` and `useState(false)` for mobile toggle.

**Remove unused lucide imports:** `LogOut`, `UserCog`, `Shield` (check if others become unused too).

### `src/app/(dashboard)/settings/page.tsx`

**Remove:**
- `import { ActivityLog } from '@/types/auth'`
- `const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])`
- `fetch('/api/activity-logs?limit=20')` from the `Promise.all()` array
- The destructured `activityRes` / `activityData` / `setActivityLogs` calls
- The entire `activity` tab: remove `'activity'` from `TabType`, remove tab button, remove tab panel `{activeTab === 'activity' && (...)}` block (lines 716–750 approx)
- `actionLabels` constant (login/logout labels, no longer needed)

**Keep:** projects tab, sync tab, system tab — all functional.

**Type change:** The local `SyncLog` interface uses snake_case fields (`tasks_synced`, `started_at`, etc.) matching old Supabase response. Since the new `/api/v1/sync/logs` returns data from Drizzle (camelCase), update the interface:
```tsx
// OLD
interface SyncLog {
  id: number;
  started_at: string;
  tasks_synced: number;
  ...
}
// NEW
interface SyncLog {
  id: string;
  startedAt: string;
  tasksSynced: number;
  projectsSynced: number;
  durationMs: number | null;
  error: string | null;
  status: 'running' | 'success' | 'failed';
  completedAt: string | null;
}
```
Update all references in JSX (e.g. `log.started_at` → `log.startedAt`, `log.tasks_synced` → `log.tasksSynced`).

### `src/app/(dashboard)/page.tsx` (dashboard home)

- Update: `/api/stats` → `/api/v1/stats`
- Update: `/api/dashboard/overview` → `/api/v1/dashboard/overview`
- No auth imports to remove (grep confirms none)

### `src/app/(dashboard)/tasks/page.tsx`

- Update: `/api/tasks` → `/api/v1/tasks`
- Update: `/api/projects` → `/api/v1/projects`
- No auth imports (grep confirms `isLoading` is local state, not from auth)

### `src/app/(dashboard)/projects/page.tsx`

- Update: `/api/projects` → `/api/v1/projects`
- Update: `/api/keyword-rankings/growth` → `/api/v1/keyword-rankings/growth`
- Update: `/api/keyword-rankings/details` → `/api/v1/keyword-rankings/details`
- Update: `/api/keyword-rankings/analysis` → `/api/v1/keyword-rankings/analysis`
- No auth imports

### `src/app/(dashboard)/keyword-ranking/page.tsx`

- Update: `/api/keyword-rankings` → `/api/v1/keyword-rankings`
- Update: `/api/projects` → `/api/v1/projects`
- No auth imports

### `src/app/(dashboard)/members/page.tsx`

- Update: `/api/members` → `/api/v1/members`
- Update: `/api/projects` → `/api/v1/projects`
- Update: `/api/salary-payments` → `/api/v1/salary-payments`
- No auth imports

### `src/app/(dashboard)/salary/page.tsx`

- Update: `/api/salary/analytics` → `/api/v1/salary/analytics`
- Update: `/api/salary` → `/api/v1/salary`
- Update: `/api/members` → `/api/v1/members`
- Update: `/api/salary-payments` → `/api/v1/salary-payments`
- No auth imports

### `src/app/(dashboard)/seo-audit/page.tsx`

- Update: `/api/tasks` → `/api/v1/tasks`
- Update: `/api/seo-results/batch` → `/api/v1/seo-results/batch`
- Update: `/api/projects` → `/api/v1/projects`
- Update: `/api/seo-results` → `/api/v1/seo-results`
- Update: `/api/seo-check` → `/api/v1/seo-check`
- No auth imports

### `src/app/(dashboard)/settings/page.tsx` (API URLs)

- Update: `/api/projects` → `/api/v1/projects`
- Update: `/api/targets` → `/api/v1/targets`
- Update: `/api/sync/logs` → `/api/v1/sync/logs`
- Remove: `/api/activity-logs` fetch entirely
- Update: `/api/sync` → `/api/v1/sync`
- Update: `/api/keyword-rankings/sync` → `/api/v1/keyword-rankings/sync`

### `src/types/index.ts`

- No auth types here; file is clean already
- **Update** any interface fields that use snake_case and now receive camelCase from Drizzle:
  - The `Project` interface fields match DB schema (`sheet_id`, `sheet_name`, etc.) — Drizzle returns camelCase (`sheetId`, `sheetName`). Options:
    1. **Option A (simpler)**: Keep types as snake_case and add a response transformer in service layer that maps camelCase back to snake_case for API responses. This avoids touching all 10 pages.
    2. **Option B**: Update all interfaces to camelCase and update JSX references in all pages.
  - **Recommended: Option A** — add a `toSnakeCase()` mapper in each service that transforms Drizzle output before returning from the API. This is minimal code and zero frontend changes for type fields.

> If implementing Option A: each service returns objects with snake_case keys (e.g. `project_id`, `sheet_id`) matching existing frontend expectations. Only the sync log needs updating since its interface is defined locally in `settings/page.tsx`.

## Implementation Steps

### Step 1 — Update `src/app/layout.tsx`

Edit file: remove `AuthProvider` import and wrapper. Keep body class and `{children}`.

### Step 2 — Simplify `src/components/Sidebar.tsx`

1. Remove imports: `useAuth`, `UserRole`, `Shield`, `LogOut`, `UserCog`
2. Remove `NavItem.roles` field + role filter constants
3. Remove `{ name: 'Quản lý users', ... }` nav item
4. Remove `const { user, logout } = useAuth()`
5. Remove `handleLogout` function
6. Remove user info block inside `SidebarContent`
7. Remove logout button
8. Replace `filteredNavigation` with plain `navigation`
9. Verify mobile toggle still works (`useState`, `usePathname` remain)

### Step 3 — Update all dashboard page API URLs

For each file, do a find-replace of `fetch('/api/` → `fetch('/api/v1/`:

```bash
# Safe global replace across all dashboard pages and components
# Run from project root
sed -i '' "s|fetch('/api/|fetch('/api/v1/|g" \
  src/app/\(dashboard\)/page.tsx \
  src/app/\(dashboard\)/tasks/page.tsx \
  src/app/\(dashboard\)/projects/page.tsx \
  src/app/\(dashboard\)/keyword-ranking/page.tsx \
  src/app/\(dashboard\)/members/page.tsx \
  src/app/\(dashboard\)/salary/page.tsx \
  src/app/\(dashboard\)/seo-audit/page.tsx \
  src/app/\(dashboard\)/settings/page.tsx
```

Also handle template literal URLs:
```bash
# Template literal fetch calls: fetch(`/api/...
sed -i '' 's|fetch(`/api/|fetch(`/api/v1/|g' \
  src/app/\(dashboard\)/page.tsx \
  src/app/\(dashboard\)/tasks/page.tsx \
  src/app/\(dashboard\)/projects/page.tsx \
  src/app/\(dashboard\)/keyword-ranking/page.tsx \
  src/app/\(dashboard\)/members/page.tsx \
  src/app/\(dashboard\)/salary/page.tsx \
  src/app/\(dashboard\)/seo-audit/page.tsx \
  src/app/\(dashboard\)/settings/page.tsx
```

> **Verify after**: `grep -rn "fetch('/api/" src/app/\(dashboard\)/` should return 0 results (excluding `/api/v1/`).

### Step 4 — Fix `settings/page.tsx` auth/activity cleanup

1. Remove `import { ActivityLog } from '@/types/auth'`
2. Remove `activityLogs` state
3. Remove `fetch('/api/v1/activity-logs?limit=20')` from `Promise.all()` (it became `/api/v1/activity-logs` after Step 3 — delete it entirely)
4. Remove `activityRes` from destructuring
5. Remove `setActivityLogs(...)` call
6. Remove `'activity'` from `TabType` union
7. Remove Activity tab button from tab list
8. Remove `{activeTab === 'activity' && (...)}` block
9. Remove `actionLabels` constant
10. Update `SyncLog` interface to camelCase (see schema above)
11. Update all `log.started_at` → `log.startedAt`, `log.tasks_synced` → `log.tasksSynced`, `log.projects_synced` → `log.projectsSynced`, `log.duration_ms` → `log.durationMs`, `log.completed_at` → `log.completedAt`

### Step 5 — Add snake_case response mapping in services (Option A)

If choosing Option A for type compatibility, add a mapper to each service return:

```ts
// In project.service.ts — map Drizzle camelCase → snake_case for API consumers
function toApiProject(p: typeof projects.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    sheet_id: p.sheetId,
    sheet_name: p.sheetName,
    monthly_target: p.monthlyTarget,
    ranking_sheet_url: p.rankingSheetUrl,
    created_at: p.createdAt,
  };
}
```

Apply similar mappers in `task.service.ts`, `member.service.ts`, `keyword.service.ts`, `seo.service.ts`. This keeps all 10 pages working without field name changes.

> **YAGNI note**: Only add mappers where frontend uses field names directly (e.g. `project.sheet_id`). If a field is only shown in JSX as `{project.name}`, no mapper needed there.

### Step 6 — Verify no broken auth imports remain

```bash
grep -rn "from '@/contexts/AuthContext'\|from '@/types/auth'\|useAuth()" \
  src/app src/components src/lib
```

Expected output: **zero results**.

## Todo List

- [ ] Edit `src/app/layout.tsx` — remove AuthProvider
- [ ] Edit `src/components/Sidebar.tsx` — remove RBAC, user info, logout button
- [ ] Run `sed` commands to update all `/api/` → `/api/v1/` in 8 pages
- [ ] Verify with grep: zero `/api/` (non-v1) fetch calls remain
- [ ] Edit `settings/page.tsx` — remove activity tab + auth imports + fix SyncLog interface
- [ ] Add snake_case mappers in services (Option A) OR update frontend types (Option B)
- [ ] Verify `npm run build` has no TypeScript errors in dashboard pages
- [ ] Manually test: navigate to `/`, `/projects`, `/tasks`, `/salary`, `/settings` — all load without redirect

## Success Criteria

- App starts with `npm run dev` — no login redirect
- All 8 dashboard pages render without console errors
- `grep -rn "useAuth\|AuthContext\|from '@/types/auth'" src/` → **0 results**
- `grep -rn "fetch('/api/" src/app/\(dashboard\)/` → **0 results** (all updated to v1)
- Settings page shows Projects + Sync + System tabs (no Activity tab)
- Sidebar shows no logout button, no user info block
- Sidebar navigation shows all items without role filtering

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| `sed` replaces too aggressively (e.g. comment strings) | Review git diff after each sed; revert if needed |
| Drizzle camelCase breaks frontend field access | Use Option A mapper — zero frontend type changes |
| `SyncLog` interface mismatch causes runtime errors | Update interface + all JSX references in settings |
| Sidebar still imports unused lucide icons after cleanup | Run TypeScript compiler — unused imports don't break build but clean up anyway |
| Template literal fetch URLs with dynamic segments missed | Check manually: `grep -n "fetch(\`" src/app/\(dashboard\)/**/*.tsx` |

## Next Steps → Phase 05

Once all pages load correctly, proceed to `phase-05-cleanup-delete-files-remove-deps-seed-script.md`.
