# System Architecture — SEO Manager

**Last Updated:** 2026-02-21

---

## 1. High-Level Overview

```
Browser (Client Components)
  │  cookie: auth_token
  ▼
Next.js Middleware (Edge)
  │  - Session lookup in Supabase
  │  - RBAC route guards
  │  - Sets x-user-* headers
  ▼
Next.js API Routes (Node.js)
  │  - getSessionUser() → second DB lookup
  │  - Business logic
  ▼
Supabase (PostgreSQL)

External:
  Google Sheets ←→ API Routes (sync endpoints)
  Public URLs ←→ /api/seo-check (audit)
```

---

## 2. Request Lifecycle

### Page Navigation
```
1. Browser → Next.js middleware
2. Middleware reads cookie auth_token
3. DB query: sessions JOIN users WHERE token = ? AND expires_at > now()
4. If invalid → redirect /login
5. If role forbidden → redirect /
6. Set response headers: x-user-id, x-user-role, x-user-name, x-user-pic, x-user-projects
7. Serve page (Client Component shell, no SSR data)
8. Client component mounts → fetch() calls to API routes
9. API route calls getSessionUser() → second DB query
10. API processes request → returns JSON
```

**Note:** Steps 3 and 9 are duplicate DB calls — known tech debt.

### Auth Flow Detail
```
POST /api/auth/login
  → bcrypt.compare(password, hash)
  → INSERT sessions (token = uuid, expires_at = now() + 7 days)
  → Set-Cookie: auth_token=<token>; HttpOnly; SameSite=Lax

GET /api/auth/me
  → Read cookie → DB session lookup → return AuthUser JSON

POST /api/auth/logout
  → DELETE sessions WHERE token = ?
  → Clear cookie
```

---

## 3. Directory Structure

```
/
├── src/
│   ├── app/
│   │   ├── (dashboard)/          # Route group — all authenticated pages
│   │   │   ├── layout.tsx         # Sidebar + content wrapper
│   │   │   ├── page.tsx           # Dashboard (KPIs, bottleneck, alerts)
│   │   │   ├── docs/page.tsx
│   │   │   ├── keyword-ranking/page.tsx
│   │   │   ├── members/page.tsx
│   │   │   ├── projects/page.tsx
│   │   │   ├── salary/page.tsx
│   │   │   ├── seo-audit/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   ├── tasks/page.tsx
│   │   │   └── users/page.tsx
│   │   ├── api/                   # API route handlers
│   │   │   ├── auth/              # login, logout, me
│   │   │   ├── dashboard/overview/
│   │   │   ├── keyword-rankings/  # CRUD + sync + analysis + growth + details
│   │   │   ├── members/
│   │   │   ├── projects/          # CRUD + report
│   │   │   ├── salary/            # calc + analytics
│   │   │   ├── salary-payments/
│   │   │   ├── seo-check/
│   │   │   ├── seo-results/       # CRUD + batch
│   │   │   ├── stats/
│   │   │   ├── sync/              # Google Sheets task sync + logs
│   │   │   ├── targets/
│   │   │   ├── tasks/
│   │   │   └── users/
│   │   ├── login/page.tsx
│   │   ├── layout.tsx             # Root: AuthProvider wrapper
│   │   └── globals.css
│   ├── components/                # Shared UI primitives
│   │   ├── EmptyState.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatsCard.tsx
│   │   └── StatusBadge.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx         # Auth state, user data, permissions
│   ├── lib/
│   │   ├── auth.ts                 # getSessionUser(), hashPassword(), etc.
│   │   ├── supabase.ts             # Singleton Supabase client
│   │   ├── task-helpers.ts         # isPublished(), isOverdue() helpers
│   │   └── utils.ts                # Formatters, salary calc, date parsing
│   ├── types/
│   │   ├── auth.ts                 # User, Session, AuthUser, PERMISSIONS
│   │   └── index.ts                # Domain types: Project, Task, Stats, etc.
│   └── middleware.ts               # Edge middleware: auth + RBAC
├── sql/
│   ├── create_auth_tables.sql      # users, sessions, activity_logs
│   └── keyword_rankings_schema.sql # keyword_rankings table
├── supabase-schema.sql             # projects, tasks, monthly_targets
├── next.config.ts
├── tailwind.config.ts
└── vercel.json
```

---

## 4. Database Schema

### Core Tables

```sql
-- Auth
users (
  id UUID PK,
  username TEXT UNIQUE,
  display_name TEXT,
  password_hash TEXT,
  role TEXT CHECK(role IN ('admin','seo','member')),
  pic_name TEXT,
  project_ids UUID[],
  is_active BOOLEAN DEFAULT true,
  created_at, updated_at, last_login
)

sessions (
  id UUID PK,
  user_id UUID FK → users CASCADE,
  token TEXT UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ,
  created_at
)

activity_logs (
  id SERIAL PK,
  user_id UUID FK → users SET NULL,
  username TEXT,
  action TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at
)

-- Core domain
projects (
  id UUID PK,
  name TEXT,
  sheet_id TEXT,
  sheet_name TEXT,
  monthly_target INT,
  ranking_sheet_url TEXT,
  created_at
)

tasks (
  id UUID PK,
  project_id UUID FK → projects CASCADE,
  stt INT, year INT, month INT,
  parent_keyword TEXT,
  keyword_sub TEXT,
  keyword_count INT,
  keywords_list TEXT[],
  search_volume INT,
  title TEXT,
  outline TEXT,
  timeline_outline TEXT,
  status_outline TEXT,
  pic TEXT,
  content_file TEXT,
  deadline DATE,
  status_content TEXT,
  link_publish TEXT,
  publish_date DATE,
  note TEXT,
  month_year TEXT,
  created_at, updated_at
)

monthly_targets (
  id UUID PK,
  project_id UUID FK → projects CASCADE,
  month INT,
  year INT,
  target INT,
  UNIQUE(project_id, month, year)
)

keyword_rankings (
  id UUID PK,
  keyword TEXT,
  url TEXT,
  position DECIMAL(5,1),
  date DATE,
  project_id UUID FK → projects SET NULL
)

seo_results (
  id UUID PK,
  url TEXT,
  score INT,
  -- category scores: title, meta, headings, content, links, performance
  details JSONB,
  links JSONB,
  keywords JSONB,
  created_at
)

members (standalone — schema not in repo)
salary_payments (member_name, month, year, amount — schema not in repo)
sync_logs (standalone — schema not in repo)
```

**Schema gap:** `members`, `salary_payments`, `sync_logs` tables exist in production but SQL migration files are missing.

---

## 5. RBAC Model

```
Protected routes (middleware.ts):
  /settings → ['admin']
  /salary   → ['admin', 'member']
  /users    → ['admin']

Permission matrix (types/auth.ts):
  Permission          admin  seo   member
  viewSettings          ✓     ✗     ✗
  viewSalary            ✓     ✗     ✓*
  viewAllProjects       ✓     ✓     ✗
  viewAllTasks          ✓     ✓     ✗
  checkSeoAll           ✓     ✓     ✗
  manageUsers           ✓     ✗     ✗
  sync                  ✓     ✗     ✗

* member: own salary only, filtered by username in API
```

Sidebar navigation filtered client-side by `AuthContext` + `hasPermission()`.

---

## 6. Google Sheets Integration

### Task Sync (`/api/sync`)
```
1. Fetch gviz JSONP: https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?...
2. Parse JSONP → extract table rows
3. Map columns → Task fields (parseSheetDate for date normalization)
4. Upsert into tasks table (match on stt + month + year + project_id)
5. Log result to sync_logs
```

### Keyword Ranking Sync (`/api/keyword-rankings/sync`)
```
1. Fetch CSV export URL from project.ranking_sheet_url
2. Parse CSV rows
3. Upsert into keyword_rankings (keyword + date + project_id)
```

---

## 7. SEO Audit Flow (`/api/seo-check`)

```
1. Receive URL from client
2. server-side fetch(url, { timeout: 15000 })
3. Parse HTML: extract title, meta description, h1-h6, body text, links
4. Score each category (0-100)
5. Store result in seo_results table
6. Return structured audit JSON
```

---

## 8. State Management

- **No Redux / Zustand** — deliberate decision for simplicity
- **AuthContext** (React Context): stores `AuthUser`, exposes `hasPermission()`
- **Page-level state**: each page component manages its own `useState` for data, loading, filters
- **No caching layer**: every page mount → fresh fetch

---

## 9. Deployment

| Setting | Value |
|---|---|
| Platform | Vercel |
| Runtime | Node.js (Next.js API routes) |
| Edge | Middleware runs at Vercel Edge |
| Env vars | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Build cmd | `next build` |
| Output | `.next/` |

`vercel.json` is present but empty — no custom configuration.

---

## 10. Security Considerations

| Risk | Current State | Recommendation |
|---|---|---|
| Middleware fail-open | On DB error, request passes through unauthenticated | Fail closed (return 401/redirect) |
| RLS allow-all | Supabase RLS permits any anon key request | Implement proper RLS policies |
| Double DB lookup | Wasteful but not a security issue | Consolidate via header trust |
| ANON key exposure | Client-side bundle includes anon key | Acceptable if RLS is locked down |
| Legacy auth route | `api/auth/route.ts` still active | Remove or guard |
