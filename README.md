# SEO Manager

Internal tool for SEO content operations management. Tracks content pipelines, keyword rankings, member productivity, and salary calculations for a Vietnamese SEO team.

**Stack:** Next.js 14 App Router · TypeScript · Supabase (PostgreSQL) · Tailwind CSS · Recharts

---

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase project (see [Database Setup](#database-setup))

### Install & Run
```bash
npm install
cp .env.example .env.local   # fill in Supabase keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/login`.

### Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

---

## Database Setup

Run SQL files in order in the Supabase SQL editor:

```bash
1. supabase-schema.sql              # projects, tasks, monthly_targets
2. sql/create_auth_tables.sql       # users, sessions, activity_logs
3. sql/keyword_rankings_schema.sql  # keyword_rankings
```

> **Note:** `members`, `salary_payments`, and `sync_logs` tables have no migration files yet — create them manually or check with the team.

Create the first admin user directly in Supabase:
```sql
INSERT INTO users (username, display_name, password_hash, role, is_active)
VALUES ('admin', 'Admin', '<bcrypt-hash>', 'admin', true);
```

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/        # All authenticated pages (Client Components)
│   │   ├── page.tsx         # Dashboard (KPIs, bottleneck, alerts)
│   │   ├── projects/        # Project analytics
│   │   ├── tasks/           # Task list (read-only, synced from Sheets)
│   │   ├── keyword-ranking/ # Keyword position tracking
│   │   ├── salary/          # Salary calculation
│   │   ├── seo-audit/       # On-page SEO audit
│   │   ├── members/         # Member management
│   │   ├── users/           # User/role management (admin)
│   │   └── settings/        # Sync config (admin)
│   ├── api/                 # API route handlers (28 routes)
│   ├── login/               # Login page
│   └── globals.css          # iOS-inspired dark theme
├── components/              # Shared UI: Sidebar, StatsCard, ProgressBar, etc.
├── contexts/AuthContext.tsx # Auth state + hasPermission()
├── lib/
│   ├── auth.ts              # getSessionUser(), session helpers
│   ├── supabase.ts          # Singleton Supabase client
│   ├── task-helpers.ts      # isPublished(), isDoneQC()
│   └── utils.ts             # formatCurrency, calculateSalary, parseSheetDate, etc.
├── types/
│   ├── auth.ts              # UserRole, User, PERMISSIONS
│   └── index.ts             # Project, Task, SalaryData, etc.
└── middleware.ts            # Session auth + RBAC (Edge)

sql/                         # Database migration files
supabase-schema.sql          # Root schema
```

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14 App Router | Client Components for all dashboard pages |
| Language | TypeScript strict | Path alias `@/*` → `./src/*` |
| Database | Supabase (PostgreSQL) | Anon key + service role key |
| Auth | Session-based (custom) | Cookie `auth_token`, 7-day TTL |
| Styling | Tailwind CSS 3.4 | CSS variables, earthy gold `#d4a853` accent |
| Charts | Recharts | AreaChart, BarChart, LineChart |
| Icons | Lucide React | |
| Deploy | Vercel | Edge middleware for auth |

---

## User Roles

| Role | Access |
|---|---|
| `admin` | Full access: all projects, salary, settings, user management |
| `seo` | All projects/tasks/keywords; no salary, no settings |
| `member` | Own assigned projects/tasks; own salary only |

---

## Key Features

- **Dashboard** — KPI summary, workflow bottleneck pipeline, overdue alerts
- **Projects** — Analytics vs monthly targets, Recharts visualizations
- **Tasks** — Synced from Google Sheets, filterable by project/member/status/month
- **Keyword Ranking** — Position tracking, sparklines, CSV sync from Google Sheets
- **Salary** — Auto-calc from published article count (Vietnamese tier logic)
- **SEO Audit** — Live on-page audit via URL fetch, stored history
- **Members/Users** — CRUD, role assignment, project access control

---

## Development

```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run build     # Production build
npm run lint      # ESLint check
npm run start     # Start production server
```

### Patterns
- All dashboard pages: `'use client'` + `useState` + `useEffect` + `fetch()`
- No Redux/Zustand — local state only; `AuthContext` is the only React Context
- No SWR/React Query — plain `fetch` in `useEffect`
- API routes: always call `getSessionUser(request)` first, then check role

---

## Documentation

| Doc | Description |
|---|---|
| [`docs/project-overview-pdr.md`](docs/project-overview-pdr.md) | Product requirements, business rules, tech debt |
| [`docs/system-architecture.md`](docs/system-architecture.md) | Architecture, DB schema, auth flow, integrations |
| [`docs/code-standards.md`](docs/code-standards.md) | TypeScript rules, component patterns, API conventions |
| [`docs/codebase-summary.md`](docs/codebase-summary.md) | File inventory, LOC counts, critical code paths |

---

## Known Issues

See [`docs/project-overview-pdr.md §8`](docs/project-overview-pdr.md) for full tech debt list. Top issues:

1. **Middleware fail-open** — DB error allows unauthenticated access (security risk)
2. **Double DB lookup** — middleware + `getSessionUser()` both query sessions table
3. **Inconsistent `isPublished`** — `task-helpers.ts` vs salary routes differ
4. **Missing SQL schemas** — `members`, `salary_payments`, `sync_logs` not in repo
