# Codebase Summary — SEO Manager

**Last Updated:** 2026-02-21
**Generated from:** repomix-output.xml (30,446 lines, 52 source files)

---

## 1. Project Stats

| Metric | Value |
|---|---|
| Total source files | 52 |
| Pages (dashboard) | 10 |
| API routes | 28 |
| Shared components | 6 |
| Lib modules | 4 |
| Type files | 2 |
| SQL schema files | 3 (1 root + 2 in sql/) |
| Package name | content-tracker |
| Framework | Next.js 14 App Router |

---

## 2. Source File Inventory

### Pages (`src/app/(dashboard)/`)

| File | LOC | Responsibility |
|---|---|---|
| `page.tsx` | 1679 | Dashboard: KPI cards, bottleneck pipeline, alerts, member stats |
| `projects/page.tsx` | 1427 | Project list, analytics charts, monthly targets |
| `salary/page.tsx` | 1139 | Salary calc per member, payment records, analytics tab |
| `seo-audit/page.tsx` | 1298 | SEO audit UI: URL input, score display, history |
| `settings/page.tsx` | 943 | Google Sheets sync config, sync trigger, logs |
| `keyword-ranking/page.tsx` | 787 | Keyword tracking, sparklines, sync, analysis |
| `members/page.tsx` | 628 | Member CRUD, per-member stats |
| `users/page.tsx` | 530 | User account management, role/project assignment |
| `tasks/page.tsx` | 511 | Filtered task list (read-only, synced from Sheets) |
| `docs/page.tsx` | 293 | Static in-app help/onboarding page |
| `layout.tsx` | 22 | Sidebar + `<main>` wrapper |

### API Routes (`src/app/api/`)

| Route | Methods | Purpose |
|---|---|---|
| `auth/login` | POST | bcrypt verify, create session, set cookie |
| `auth/logout` | POST | Delete session, clear cookie |
| `auth/me` | GET | Return current user from session |
| `auth/route` | — | **DEPRECATED** — legacy auth, remove |
| `activity-logs` | GET | Admin-only activity log listing |
| `dashboard/overview` | GET | Aggregated KPI data for dashboard |
| `keyword-rankings` | GET, POST, PUT, DELETE | Keyword CRUD |
| `keyword-rankings/sync` | POST | Import from Google Sheets CSV |
| `keyword-rankings/analysis` | GET | Top gainers/drops, averages |
| `keyword-rankings/growth` | GET | Position change over time |
| `keyword-rankings/details` | GET | Single keyword history |
| `members` | GET, POST, PUT, DELETE | Member CRUD |
| `projects` | GET, POST, PUT, DELETE | Project CRUD |
| `projects/report` | GET | Per-project analytics (actual vs target) |
| `salary` | GET | Calculate salary from published count |
| `salary/analytics` | GET | Cross-member salary analytics |
| `salary-payments` | GET, POST, PUT, DELETE | Payment record CRUD |
| `seo-check` | POST | Live on-page SEO audit |
| `seo-results` | GET, POST | SEO audit result history |
| `seo-results/batch` | GET | Bulk SEO result fetch |
| `stats` | GET | Dashboard aggregated stats |
| `sync` | POST | Google Sheets → tasks sync |
| `sync/logs` | GET | Sync operation logs |
| `targets` | GET, POST, PUT, DELETE | Monthly target CRUD |
| `tasks` | GET | Filtered task listing |
| `users` | GET, POST, PUT, DELETE | User management |

### Components (`src/components/`)

| File | LOC | Purpose |
|---|---|---|
| `Sidebar.tsx` | 203 | Navigation sidebar, role-based menu filtering |
| `StatsCard.tsx` | 57 | KPI metric card with icon, value, trend |
| `ProgressBar.tsx` | 56 | Progress bar, auto-colors at 50/80/100% thresholds |
| `LoadingSpinner.tsx` | 26 | Inline spinner + `PageLoading` full-page variant |
| `EmptyState.tsx` | 28 | Empty list placeholder with message |
| `StatusBadge.tsx` | 20 | Status label with color-coded background |

### Lib (`src/lib/`)

| File | LOC | Exports |
|---|---|---|
| `utils.ts` | 199 | `formatCurrency`, `formatDate`, `formatShortDate`, `isOverdue`, `isDueSoon`, `calculateSalary`, `getMonthOptions`, `getStatusColor`, `parseSheetDate`, `cn` |
| `auth.ts` | 122 | `getSessionUser`, `hashPassword`, `verifyPassword`, `createSession` |
| `task-helpers.ts` | 41 | `isPublished`, `isDoneQC` |
| `supabase.ts` | 24 | Singleton `supabase` client |

### Types (`src/types/`)

| File | Key Exports |
|---|---|
| `index.ts` | `Project`, `Task`, `MonthlyTarget`, `Stats`, `ProjectStats`, `BottleneckData`, `MemberStats`, `SalaryData`, `TaskFilter`, `OUTLINE_STATUSES`, `CONTENT_STATUSES` |
| `auth.ts` | `UserRole`, `User`, `Session`, `ActivityLog`, `AuthUser`, `PERMISSIONS`, `hasPermission()` |

---

## 3. Critical Code Paths

### Login Flow
```
POST /api/auth/login
  → bcrypt.compare(password, user.password_hash)
  → supabase.from('sessions').insert({ token: uuid, expires_at: +7days })
  → Set-Cookie: auth_token (HttpOnly, SameSite=Lax)
  → return { user: AuthUser }
```

### Per-Request Auth
```
middleware.ts
  → read cookie auth_token
  → supabase sessions JOIN users WHERE token=? AND expires_at > now()
  → set x-user-id, x-user-role, x-user-name, x-user-pic, x-user-projects headers

API route
  → getSessionUser(request) in lib/auth.ts
  → reads x-user-* headers (or re-queries DB if headers absent)
  → returns AuthUser | null
```

### Task Publish Detection
```ts
// src/lib/task-helpers.ts — canonical implementation
isPublished(task):
  if task.publish_date → true
  if status_content includes 'publish' | '4.' | 'done' | 'hoàn thành' → true
  else → false
```

### Salary Calculation
```ts
// src/lib/utils.ts — calculateSalary(publishedCount)
< 20 articles  → 125,000 VND × count
>= 20 articles → 2,500,000 + 500,000 + 120,000 × (count - 20)
```

### Google Sheets Task Sync
```
POST /api/sync
  → fetch gviz JSONP for each project's sheet_id/sheet_name
  → parse JSONP table → map to Task fields
  → supabase.from('tasks').upsert(tasks, { onConflict: 'stt,month,year,project_id' })
  → insert sync_logs record
```

### SEO Audit
```
POST /api/seo-check { url }
  → fetch(url, { signal: AbortSignal.timeout(15000) })
  → parse HTML: title, meta[description], h1-h6, body text, a[href]
  → score per category
  → supabase.from('seo_results').upsert(result)
  → return structured scores
```

---

## 4. Data Flow Diagram

```
Google Sheets
  │ gviz JSONP
  ▼
POST /api/sync ──────────────► tasks table
  │
  │ CSV export
  ▼
POST /api/keyword-rankings/sync ► keyword_rankings table

External URL
  ▼
POST /api/seo-check ──────────► seo_results table

Client (browser)
  ├── GET /api/dashboard/overview ◄── projects + tasks + targets
  ├── GET /api/stats              ◄── aggregated counts
  ├── GET /api/salary             ◄── tasks (published filter)
  ├── GET /api/projects/report    ◄── projects + tasks + targets
  └── GET /api/keyword-rankings/analysis ◄── keyword_rankings
```

---

## 5. Largest Files (Complexity Hotspots)

| File | LOC | Notes |
|---|---|---|
| `app/(dashboard)/page.tsx` | 1679 | Monolithic dashboard — refactor candidate |
| `app/(dashboard)/projects/page.tsx` | 1427 | Multiple chart types, complex state |
| `app/(dashboard)/seo-audit/page.tsx` | 1298 | Audit form + result display + history |
| `app/api/seo-check/route.ts` | 583 | HTML parsing + scoring logic inline |
| `app/api/projects/report/route.ts` | 409 | Complex aggregation query |
| `app/api/sync/route.ts` | 301 | JSONP parsing + upsert logic |
| `app/api/dashboard/overview/route.ts` | 303 | Multi-table aggregation |

---

## 6. Configuration Files

| File | Purpose |
|---|---|
| `next.config.mjs` | Next.js config (minimal) |
| `tailwind.config.ts` | Tailwind + CSS variable tokens |
| `tsconfig.json` | TypeScript strict, `@/*` path alias |
| `eslint.config.mjs` | ESLint next/core-web-vitals |
| `vercel.json` | Vercel config (empty) |
| `supabase-schema.sql` | projects, tasks, monthly_targets DDL |
| `sql/create_auth_tables.sql` | users, sessions, activity_logs DDL |
| `sql/keyword_rankings_schema.sql` | keyword_rankings DDL |

---

## 7. Missing / Incomplete Parts

| Gap | Impact |
|---|---|
| No SQL for `members` table | Manual Supabase setup required |
| No SQL for `salary_payments` table | Manual Supabase setup required |
| No SQL for `sync_logs` table | Manual Supabase setup required |
| `.env.example` missing Supabase keys | New devs cannot set up without asking |
| `api/auth/route.ts` (legacy) | Dead code, confusing |
| `vercel.json` empty | No custom headers, redirects, or edge config |
| No test files | Zero automated test coverage |
| No error boundary components | Unhandled fetch errors crash page sections |
