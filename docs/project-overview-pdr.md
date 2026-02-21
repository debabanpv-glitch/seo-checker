# Project Overview & PDR — SEO Manager

**Last Updated:** 2026-02-21
**Version:** 1.0.0
**Package name:** content-tracker

---

## 1. Product Summary

SEO Manager is an internal Next.js 14 web application for managing SEO content operations. It serves a Vietnamese SEO team tracking content pipelines, keyword rankings, member productivity, and salary calculations.

**Not a public SaaS** — single-tenant internal tool, deployed to Vercel.

---

## 2. Problem Statement

Manual tracking of SEO content workflows in Google Sheets lacks visibility into bottlenecks, member performance, and keyword ranking trends. The team needs a single dashboard that aggregates all signals.

---

## 3. Target Users

| Role | Description | Access |
|---|---|---|
| admin | Team lead / manager | Full access: all projects, salary, settings, users |
| seo | SEO specialist | All projects/tasks, keyword audit; no salary/settings |
| member | Content writer | Own tasks/projects, own salary view only |

---

## 4. Core Features

### 4.1 Dashboard (/)
- KPI summary: published vs target, in-progress, overdue counts
- Workflow bottleneck visualizer (pipeline stage counts)
- Alerts panel: overdue tasks, near-deadline tasks
- Member performance cards

### 4.2 Projects (/projects)
- CRUD for SEO projects linked to Google Sheets
- Per-project analytics: actual vs target charts (Recharts)
- Monthly target management
- Project-level keyword ranking overview

### 4.3 Tasks (/tasks)
- Read-only filtered task list (synced from Google Sheets)
- Filters: project, pic, status, month/year, keyword search
- Status pipeline display

### 4.4 Keyword Ranking (/keyword-ranking)
- Keyword position tracking over time
- Sparkline trend charts per keyword
- Google Sheets CSV import sync
- Analysis: top gainers, biggest drops, average position

### 4.5 Salary (/salary)
- Auto-calculate monthly salary from published article count
- Salary tiers (see business rules §6)
- Payment records per member/month
- Salary analytics tab

### 4.6 SEO Audit (/seo-audit)
- Live on-page audit via URL fetch
- Scores: title, meta, headings, content, links, performance
- Batch result history stored in `seo_results` table

### 4.7 Members (/members)
- Member CRUD (name, role, contact)
- Per-member stats: published count, on-time rate

### 4.8 Users (/users) — admin only
- User account management, role assignment
- Project access control via `project_ids[]`
- Activity log viewer

### 4.9 Settings (/settings) — admin only
- Google Sheets sync configuration per project
- Sync trigger + sync log viewer

### 4.10 Documentation (/docs)
- Static in-app help page for team onboarding

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Auth | Session-based, 7-day TTL, cookie `auth_token` |
| Security | Middleware RBAC on all routes; API re-validates session |
| Performance | Client-side data fetch; no SSR data dependencies |
| Data | Supabase PostgreSQL; RLS currently allow-all (internal only) |
| Availability | Vercel deployment; no SLA defined |
| Localization | Vietnamese currency/date formatting (vi-VN locale) |
| Browser | Modern Chrome/Firefox; no IE support |

---

## 6. Business Rules

### Salary Calculation
```
Published articles < 20 → 125,000 VND × count
Published articles >= 20:
  Base:     2,500,000 VND
  KPI:        500,000 VND
  Extra:      120,000 VND × (count − 20)
  Total = 2,500,000 + 500,000 + extra
```

### isPublished Logic
A task is "published" when:
1. `publish_date` is set (takes priority), OR
2. `status_content` equals `'4. Publish'`

**Known inconsistency:** `task-helpers.ts` and salary routes implement this independently. See Tech Debt §8.

### Task Workflow Pipeline
```
1. Doing Outline → 1.1 Fixing Outline → 1.2 Đã fix →
2. QC Outline → 3. Done QC Outline →
1. Doing (content) → 1.1 Fixing → 1.2 Đã fix →
2. QC Content → 3. Done QC → 4. Publish
```

### Overdue Detection
Deadline < today (midnight boundary). "Due soon" = deadline within 3 days.

---

## 7. External Integrations

| Integration | Purpose | Method |
|---|---|---|
| Supabase | Primary database | JS SDK, anon key + service role key |
| Google Sheets (gviz) | Task sync | JSONP endpoint, parsed client-side |
| Google Sheets (CSV) | Keyword ranking sync | CSV export URL, server-side fetch |
| External URLs | SEO audit | server-side fetch, 15s timeout |

---

## 8. Known Tech Debt (Prioritized)

| Priority | Issue | Impact |
|---|---|---|
| HIGH | Middleware fail-open on DB error (line 103 in middleware.ts) | Security: unauthenticated access possible |
| HIGH | Double DB lookup per request (middleware + `getSessionUser()`) | Performance: 2× DB queries every API call |
| HIGH | Inconsistent `isPublished` logic across routes | Salary miscalculation risk |
| MED | N+1 queries in `projects/route.ts` | Performance on large datasets |
| MED | Legacy `api/auth/route.ts` still active | Dead code, confusion |
| MED | Missing SQL schemas for `salary_payments`, `seo_results`, `members`, `sync_logs` | Onboarding friction |
| MED | `.env.example` missing Supabase keys | Dev setup friction |
| LOW | Monolithic page components (dashboard 1679 LOC) | Maintainability |
| LOW | RLS allow-all on Supabase | If anon key exposed, data breach risk |

---

## 9. Acceptance Criteria

- [ ] Admin can view all projects, tasks, salary, users, settings
- [ ] SEO role cannot access /salary or /settings
- [ ] Member sees only own project tasks and own salary
- [ ] Google Sheets sync imports tasks correctly
- [ ] Salary calculation matches business rules in §6
- [ ] SEO audit returns structured scores for any public URL
- [ ] Keyword ranking sync from CSV updates `keyword_rankings` table
- [ ] Session expires after 7 days; expired sessions redirect to login

---

## 10. Out of Scope

- Email notifications
- Public API / webhooks
- Multi-tenant / multi-organization support
- Mobile app
- AI-generated content suggestions
