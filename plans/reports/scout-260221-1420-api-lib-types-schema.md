# Scout Report: API Routes, Lib, Types, Middleware, Schema
**Generated:** 2026-02-21 14:20
**Project:** seo-manager-local (Next.js 14 SEO Manager)

---

## FILE-BY-FILE ANALYSIS

### API ROUTES

---

#### `/src/app/api/activity-logs/route.ts`
- **LOC:** 51
- **Purpose:** Lấy danh sách activity logs (chỉ admin)
- **Key exports:** `GET`
- **Dependencies:** `next/server`, `@/lib/supabase`, `@/lib/auth`
- **DB tables:** `activity_logs`
- **Notable patterns:**
  - Role check: `currentUser.role !== 'admin'` -> 403
  - Pagination: limit, offset
  - Filters: action, user_id
  - Token from cookie `auth_token`

---

#### `/src/app/api/auth/login/route.ts`
- **LOC:** 110
- **Purpose:** Đăng nhập, tạo session, ghi activity log
- **Key exports:** `POST`
- **Dependencies:** `next/server`, `@/lib/supabase`, `@/lib/auth`
- **DB tables:** `users`, `sessions`, `activity_logs`
- **Notable patterns:**
  - Validate username lowercase + trim
  - Check user.is_active trước
  - bcrypt verify password
  - Cookie auth_token: httpOnly, secure (prod), sameSite=lax, maxAge=7days
  - Log thất bại (user_not_found, account_disabled, wrong_password) và thành công
  - Trả về user object (không bao gồm password_hash)

---

#### `/src/app/api/auth/logout/route.ts`
- **LOC:** 45
- **Purpose:** Đăng xuất, xóa session, xóa cookie
- **Key exports:** `POST`
- **Dependencies:** `next/server`, `@/lib/auth`
- **DB tables:** `sessions`, `activity_logs`

---

#### `/src/app/api/auth/me/route.ts`
- **LOC:** 43
- **Purpose:** Lấy thông tin user hiện tại từ session
- **Key exports:** `GET`
- **Dependencies:** `next/server`, `@/lib/auth`
- **DB tables:** `sessions`, `users`
- **Notable patterns:**
  - Clear invalid cookie khi session expired

---

#### `/src/app/api/auth/route.ts`
- **LOC:** 55
- **Purpose:** Auth đơn giản legacy (password-based, không dùng DB) -- CŨ, ít dùng
- **Key exports:** `POST`, `GET`
- **Dependencies:** `next/server`
- **DB tables:** Không
- **Notable patterns:**
  - Token = base64(timestamp-password) -- KHÔNG AN TOÀN, đây là auth cũ

---

#### `/src/app/api/dashboard/overview/route.ts`
- **LOC:** 303
- **Purpose:** Dashboard tổng quan: task stats, salary, SEO, alerts, project overview
- **Key exports:** `GET`
- **Dependencies:** `next/server`, `@/lib/supabase`
- **DB tables:** `tasks`, `members`, `projects`, `salary_payments`, `keyword_rankings`, `seo_results`
- **Notable patterns:**
  - Parallel fetch 6 tables với Promise.all
  - BASE_RATE=125k, KPI_THRESHOLD=20 bài, KPI_BONUS=500k
  - Alerts: task trễ (danger), lương chưa trả (warning), keyword giảm (warning), sắp deadline (info)

---

#### `/src/app/api/keyword-rankings/analysis/route.ts`
- **LOC:** 272
- **Purpose:** Phân tích toàn diện keyword rankings của 1 project
- **Key exports:** `GET`
- **Dependencies:** `next/server`, `@/lib/supabase`
- **DB tables:** `tasks`, `keyword_rankings`, `seo_results`
- **Notable patterns:**
  - Lấy published URLs từ tasks, so sánh với rankings
  - Output: contentStats, monthlyContent, urlAnalysis, opportunityKeywords (pos 11-20), decliningKeywords (giảm >=3)
  - URL action recommendations

---

#### `/src/app/api/keyword-rankings/details/route.ts`
- **LOC:** 119
- **Purpose:** Chi tiết rankings theo keyword hoặc URL cho 1 project
- **Key exports:** `GET`
- **Dependencies:** `next/server`, `@/lib/supabase`
- **DB tables:** `keyword_rankings`
- **Notable patterns:**
  - 2 view modes: keywords (default) và urls
  - So sánh với previous date để tính change

---

#### `/src/app/api/keyword-rankings/growth/route.ts`
- **LOC:** 151
- **Purpose:** Ranking growth theo thời gian (daily snapshots)
- **Key exports:** `GET`
- **Dependencies:** `next/server`, `@/lib/supabase`
- **DB tables:** `keyword_rankings`
- **Notable patterns:**
  - Param days (default 30)
  - Group by date, tính top3/10/20/30 counts
  - Summary: first vs last snapshot diff

---

#### `/src/app/api/keyword-rankings/route.ts`
- **LOC:** 121
- **Purpose:** CRUD keyword rankings (GET filter + DELETE)
- **Key exports:** `GET`, `DELETE`
- **Dependencies:** `next/server`, `@/lib/supabase`
- **DB tables:** `keyword_rankings`
- **Notable patterns:**
  - Filters: projectId, keyword (ilike), startDate, endDate, limit
  - DELETE modes: by id, by projectId+keyword, by projectId only, deleteAll

---

#### `/src/app/api/keyword-rankings/sync/route.ts`
- **LOC:** 317
- **Purpose:** Sync keyword rankings từ Google Sheets CSV
- **Key exports:** `POST`
- **Dependencies:** `next/server`, `@/lib/supabase`, Google Sheets API
- **DB tables:** `keyword_rankings`
- **Notable patterns:**
  - Fetch as CSV từ Google Sheets public link
  - Auto-detect columns (Vietnamese + English headers)
  - Manual column mapping support
  - Batch upsert 500/batch với fallback delete+insert
  - Parse nhiều date format

---

#### `/src/app/api/members/route.ts`
- **LOC:** 225
- **Purpose:** CRUD members + stats từ tasks
- **Key exports:** `GET`, `POST`, `PUT`, `DELETE`
- **Dependencies:** `next/server`, `@/lib/supabase`
- **DB tables:** `tasks`, `members`
- **Notable patterns:**
  - GET: view filters: month, week, day (dựa trên publish_date)
  - Fields: name, nickname, role, projects, start_date, email, phone, bank_name, bank_account

---

#### `/src/app/api/projects/report/route.ts`
- **LOC:** 409
- **Purpose:** Report chi tiết từng project: pipeline, bottleneck, weekly breakdown, health
- **Key exports:** `GET`
- **Dependencies:** `next/server`, `@/lib/supabase`, `@/lib/task-helpers`
- **DB tables:** `projects`, `tasks`, `monthly_targets`
- **Notable patterns:**
  - Health: good/warning/danger (progress vs expected)
  - Pipeline: doingOutline -> qcOutline -> doingContent -> qcContent -> waitPublish
  - Active tasks (limit 15), recent published (limit 5)
  - Sort: danger first, then warning, then good

---

#### `/src/app/api/projects/route.ts`
- **LOC:** 189
- **Purpose:** CRUD projects với task stats
- **Key exports:** `GET`, `POST`, `PUT`, `DELETE`
- **Dependencies:** `next/server`, `@/lib/supabase`, `@/lib/task-helpers`
- **DB tables:** `projects`, `tasks`, `monthly_targets`
- **Notable patterns:**
  - GET: N+1 query pattern (có thể optimize)
  - Monthly target: từ monthly_targets table hoặc fallback project.monthly_target

---

#### `/src/app/api/salary-payments/route.ts`
- **LOC:** 102
- **Purpose:** CRUD payment records (đánh dấu đã/chưa trả lương)
- **Key exports:** `GET`, `POST`, `DELETE`
- **Dependencies:** `next/server`, `@/lib/supabase`
- **DB tables:** `salary_payments`
- **Notable patterns:**
  - POST: upsert với conflict member_name,month,year
  - DELETE = đánh dấu chưa thanh toán (xóa record)

---

#### `/src/app/api/salary/analytics/route.ts`
- **LOC:** 250
- **Purpose:** Analytics lương N tháng: member breakdown, project costs, trends
- **Key exports:** `GET`
- **Dependencies:** `next/server`, `@/lib/supabase`, `@/lib/utils`
- **DB tables:** `tasks`, `projects`, `salary_payments`
- **Notable patterns:**
  - months param (default 6), sequential loop per month
  - Tính teamGrowthRate, costGrowthRate, kpiMetCount

---

#### `/src/app/api/salary/route.ts`
- **LOC:** 111
- **Purpose:** Tính lương tháng theo từng PIC
- **Key exports:** `GET`
- **Dependencies:** `next/server`, `@/lib/supabase`, `@/lib/utils`
- **DB tables:** `tasks`, `projects`
- **Notable patterns:**
  - Filter bằng publish_date range (không dùng month/year columns)
  - calculateSalary từ utils

---

#### `/src/app/api/seo-check/route.ts`
- **LOC:** 583
- **Purpose:** Audit SEO 1 URL: phân tích content, images, technical
- **Key exports:** `POST`
- **Dependencies:** `next/server`, external URL fetch
- **DB tables:** Không (fetch URL live, không lưu)
- **Notable patterns:**
  - AbortSignal.timeout(15000)
  - 3 categories: content (title, meta desc, keyword density, word count, H2), images (alt, count), technical (canonical, viewport, links, H1)
  - Scoring 0-100
  - Support primary + sub keywords array
  - Detect dofollow/nofollow links

---

#### `/src/app/api/seo-results/batch/route.ts`
- **LOC:** 34
- **Purpose:** Lấy SEO results cho nhiều URLs cùng lúc (POST)
- **Key exports:** `POST`
- **Dependencies:** `next/server`, `@/lib/supabase`
- **DB tables:** `seo_results`
- **Notable patterns:** minimal mode, .in('url', urls) batch query

---

#### `/src/app/api/seo-results/route.ts`
- **LOC:** 125
- **Purpose:** Lưu và lấy SEO audit results
- **Key exports:** `GET`, `POST`
- **Dependencies:** `next/server`, `@/lib/supabase`
- **DB tables:** `seo_results`
- **Notable patterns:**
  - POST: upsert by URL (update nếu URL đã có)
  - Lưu: score, category scores, details JSON, links JSON, keywords JSON

---

#### `/src/app/api/stats/route.ts`
- **LOC:** 300
- **Purpose:** Thống kê tổng quan tháng: stats, projectStats, bottleneck, alerts
- **Key exports:** `GET`
- **Dependencies:** `next/server`, `@supabase/supabase-js` (fresh client), `@/lib/task-helpers`
- **DB tables:** `tasks`, `projects`, `monthly_targets`
- **Notable patterns:**
  - Fresh Supabase client mỗi request
  - Fetch all tasks -> filter in-memory (không tối ưu)
  - 7 bottleneck stages
  - overdueFromPreviousMonths: tasks từ tháng trước chưa publish

---

#### `/src/app/api/sync/logs/route.ts`
- **LOC:** 33
- **Purpose:** Lấy 10 sync logs gần nhất
- **Key exports:** `GET`
- **Dependencies:** `next/server`, `@/lib/supabase`
- **DB tables:** `sync_logs`
- **Notable patterns:** Handle table-not-exist error (42P01)

---

#### `/src/app/api/sync/route.ts`
- **LOC:** 301
- **Purpose:** Đồng bộ tasks từ Google Sheets cho tất cả projects
- **Key exports:** `POST`, `GET`
- **Dependencies:** `next/server`, `@/lib/supabase`, `@/lib/utils`, Google Sheets gviz API
- **DB tables:** `projects`, `tasks`, `sync_logs`
- **Notable patterns:**
  - Google Sheets gviz JSONP format
  - Column mapping cố định: A=stt, D=parent_keyword, E=keyword_sub, G=title, J=status_outline, K=pic, M=deadline, N=status_content, O=link_publish, P=publish_date
  - Delete + insert strategy per project
  - Batch 100 rows/insert
  - GET = POST (Vercel Cron handler)

---

#### `/src/app/api/targets/route.ts`
- **LOC:** 112
- **Purpose:** CRUD monthly targets cho projects
- **Key exports:** `GET`, `POST`, `DELETE`
- **Dependencies:** `next/server`, `@/lib/supabase`
- **DB tables:** `monthly_targets`
- **Notable patterns:** POST upsert với conflict project_id,month,year

---

#### `/src/app/api/tasks/route.ts`
- **LOC:** 70
- **Purpose:** Lấy tasks với filters
- **Key exports:** `GET`
- **Dependencies:** `next/server`, `@/lib/supabase`
- **DB tables:** `tasks`, `projects`
- **Notable patterns:**
  - published=true: filter bằng publish_date range
  - status filter: OR query trên status_content + status_outline

---

#### `/src/app/api/users/route.ts`
- **LOC:** 227
- **Purpose:** CRUD users (admin only)
- **Key exports:** `GET`, `POST`, `PUT`, `DELETE`
- **Dependencies:** `next/server`, `@/lib/supabase`, `@/lib/auth`
- **DB tables:** `users`, `sessions`, `activity_logs`
- **Notable patterns:**
  - All methods: admin check từ cookie
  - POST: validate role [admin, seo, member], check duplicate username
  - DELETE: cannot delete self, xóa sessions trước
  - Log activity create/update/delete

---

### LIB FILES

---

#### `/src/lib/auth.ts`
- **LOC:** 122
- **Purpose:** Auth utilities: password hashing, session management, activity logging
- **Key exports:** generateToken, hashPassword, verifyPassword, createSession, getSessionUser, deleteSession, cleanExpiredSessions, logActivity, updateLastLogin
- **Dependencies:** `./supabase`, `bcryptjs`, `@/types/auth`
- **DB tables:** `sessions`, `users`, `activity_logs`
- **Notable patterns:**
  - Token: 64 chars random alphanumeric
  - bcrypt rounds: 10
  - Session TTL: 7 ngày
  - logActivity: fire-and-forget (không throw)

---

#### `/src/lib/supabase.ts`
- **LOC:** 24
- **Purpose:** Singleton Supabase client (lazy init via Proxy)
- **Key exports:** `supabase`
- **Dependencies:** `@supabase/supabase-js`
- **Notable patterns:**
  - Lazy singleton + Proxy pattern
  - Env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

---

#### `/src/lib/task-helpers.ts`
- **LOC:** 41
- **Purpose:** Shared task status detection logic
- **Key exports:** isPublished, isDoneQC, TaskStatusFields
- **Notable patterns:**
  - isPublished: ưu tiên publish_date trước, rồi mới check status_content
  - isDoneQC: check "done qc", "3.", "chờ publish"
  - WARNING: salary routes có bản inline khác (không check publish_date)

---

#### `/src/lib/utils.ts`
- **LOC:** 199
- **Purpose:** Utility functions cho formatting, business logic
- **Key exports:** formatCurrency, formatDate, formatShortDate, isOverdue, isDueSoon, calculateSalary, getCurrentMonthYear, getMonthOptions, getStatusColor, parseSheetDate, truncate, cn
- **Notable patterns:**
  - calculateSalary: <20 bài=125k/bài; >=20 bài=2.5M+500k KPI+120k/bài vượt
  - parseSheetDate: ISO, DD/MM/YYYY, Date(y,m,d) Google format

---

### TYPES

---

#### `/src/types/auth.ts`
- **LOC:** 87
- **Purpose:** Auth types, permission system
- **Key exports:** UserRole, User, Session, ActivityLog, AuthUser, PERMISSIONS, Permission, hasPermission
- **Roles:** admin > seo > member
- **PERMISSIONS matrix:**
  - admin: full access
  - seo: no salary/settings/users management
  - member: limited (own data only)

---

#### `/src/types/index.ts`
- **LOC:** 144
- **Purpose:** Domain types
- **Key exports:** Project, Task, MonthlyTarget, OUTLINE_STATUSES, CONTENT_STATUSES, Stats, ProjectStats, BottleneckTask, BottleneckData, MemberStats, SalaryData, TaskFilter
- **Task workflow:** Doing Outline -> QC Outline -> Done QC Outline -> Doing Content -> QC Content -> Done QC -> Publish

---

### MIDDLEWARE

---

#### `/src/middleware.ts`
- **LOC:** 119
- **Purpose:** Auth guard, RBAC cho tất cả routes
- **Key exports:** middleware, config
- **Dependencies:** `next/server`, `@supabase/supabase-js`
- **Notable patterns:**
  - Bypass: /login, /_next/, /api/auth/*, files có extension
  - DB lookup session mỗi request (performance concern)
  - Protected routes: /settings(admin), /salary(admin+member), /users(admin)
  - Inject headers: x-user-id, x-user-role, x-user-name, x-user-pic, x-user-projects
  - Fail-open khi DB error (security risk)

---

### CONFIG & SCHEMA FILES

---

#### `/supabase-schema.sql` - 97 LOC
- **Tables:** projects, tasks, monthly_targets
- **Indexes:** project_id, pic, status_content, month_year, deadline, publish_date
- **RLS:** enabled, policy allow all

---

#### `/sql/create_auth_tables.sql` - 92 LOC
- **Tables:** users, sessions, activity_logs
- **Indexes:** sessions(user_id, token, expires_at), activity_logs(user_id, action, created_at DESC)
- **Sample:** admin + seo accounts (password: admin123)

---

#### `/sql/keyword_rankings_schema.sql` - 43 LOC
- **Tables:** keyword_rankings (keyword, url, position DECIMAL(5,1), date, project_id FK)
- **Unique index:** (keyword, date, COALESCE(project_id, zero-uuid))
- **RLS:** enabled, allow all

---

#### `/next.config.mjs` - 4 LOC - Minimal, no special config
#### `/tailwind.config.ts` - 56 LOC - iOS-inspired design, CSS variables, Inter + SF Pro fonts
#### `/postcss.config.mjs` - 8 LOC - Only tailwindcss plugin
#### `/.env.example` - 2 LOC - Only GEMINI_API_KEY (thiếu hầu hết env vars thực tế)
#### `/vercel.json` - 1 LOC - Empty `{}`
#### `/.eslintrc.json` - 3 LOC - next/core-web-vitals + next/typescript

---

## SUMMARY

### API Architecture Patterns

1. Next.js 14 Route Handlers (App Router), named exports GET/POST/PUT/DELETE
2. Response: `NextResponse.json({data})` hoặc `{error}` với status code
3. Error handling: try/catch toàn bộ, console.error, trả 500 generic
4. `export const dynamic = 'force-dynamic'` trên hầu hết routes
5. Parallel fetch: Promise.all (dashboard, projects)
6. Inconsistency: stats/route.ts dùng fresh client; các routes khác dùng singleton

### Authentication/Authorization Flow

```
Client (cookie: auth_token)
  -> Middleware: DB lookup sessions JOIN users, check expires/active/role
  -> Set headers (x-user-id, x-user-role, ...)
  -> API Route: getSessionUser() [DB lookup LẠI!]
  -> Manual role check
```

Double DB lookup per request (middleware + API route). API routes không dùng middleware headers mà tự query lại.

### Database Schema & Relationships

```
projects (UUID pk)
  +-- tasks (project_id FK CASCADE)
  +-- monthly_targets (project_id FK CASCADE)
  +-- keyword_rankings (project_id FK SET NULL)

users (UUID pk)
  +-- sessions (user_id FK CASCADE)
  +-- activity_logs (user_id FK SET NULL)

seo_results (url-keyed, standalone)
salary_payments (member_name+month+year keyed, standalone)
members (standalone)
sync_logs (standalone)
```

Total: 11 tables

### Data Models

| Table | Key Fields |
|-------|-----------|
| projects | id, name, sheet_id, sheet_name, monthly_target |
| tasks | project_id, year, month, parent_keyword, keyword_sub, keywords_list[], title, status_outline, status_content, pic, deadline, link_publish, publish_date |
| monthly_targets | project_id, month, year, target UNIQUE(project_id,month,year) |
| users | username UNIQUE, password_hash, role, pic_name, project_ids[], is_active |
| sessions | user_id FK, token UNIQUE, expires_at |
| activity_logs | user_id nullable, username, action, details JSONB |
| keyword_rankings | keyword, url, position DECIMAL(5,1), date, project_id UNIQUE(keyword,date,project_id) |
| seo_results | url, score, category scores, details JSONB, links JSONB, keywords JSONB |
| salary_payments | member_name, month, year, amount UNIQUE(member_name,month,year) |

### Middleware Behavior
- Matcher: tất cả routes trừ static
- Auth: DB session lookup per request
- RBAC: /settings(admin), /salary(admin+member), /users(admin)
- Headers injected: x-user-id, x-user-role, x-user-name, x-user-pic, x-user-projects
- Fail-open trên error

### External Services
1. **Supabase** - Primary DB (anon key, RLS allow-all)
2. **Google Sheets** - 2 formats: gviz JSONP (task sync) + CSV export (keyword sync)
3. **External URL fetch** - seo-check: live page fetch, 15s timeout
4. **Gemini API** - env var có nhưng không thấy usage trong files scanned

---

## Unresolved Questions

1. `salary_payments`, `seo_results`, `members`, `sync_logs` table schemas không có trong SQL files được scan — cần tìm migrations
2. `vercel.json` rỗng nhưng sync/route.ts có GET handler cho Vercel Cron — cron chưa config?
3. `.env.example` thiếu SUPABASE_URL, SUPABASE_ANON_KEY, SERVICE_ROLE_KEY, APP_PASSWORD, NODE_ENV
4. `api/auth/route.ts` (legacy) còn được dùng không? Conflict với auth mới?
5. Middleware fail-open intentional?
6. Double DB lookup (middleware + API) — có kế hoạch optimize?
7. `isPublished` logic khác nhau giữa task-helpers.ts và salary routes — intentional?
