# Research: Existing DB Schema & Services

**Date:** 2026-03-22 | **Project:** SEO Manager v2 (Dashboard & Command Center)

---

## Database Setup

- **DB Object:** `db` (exported from `src/lib/db/index.ts`)
- **Connection:** `better-sqlite3` + Drizzle ORM
- **Path:** `./data/seo-manager.db` (SQLite, sync API — no await)
- **Pragmas:** WAL mode, foreign_keys ON
- **Schema Import:** `import * as schema from './schema'` in drizzle factory

---

## All Tables (22 total)

### Core Domain
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `projects` | id, name, slug, domain, sheet_id, sheet_name, monthly_target | Project master |
| `tasks` | id, project_id, title, status, type, assigned_to | Task management |
| `members` | id, name, email, role | Team members |

### SEO & Keywords
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `keyword_rankings` | id, keyword, url, position, date, project_id, source, ranking_tier, is_tracked, cluster_id | Keyword positions (sheets/GSC/Claude) |
| `seo_results` | id, url, score, content_score, technical_score, details, links, keywords | Page-level audit results |
| `gsc_snapshots` | id, project_id, query, clicks, impressions, position, page, snapshot_date | Google Search Console snapshots |

### Content & Links
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `backlinks` | id, source_url, target_url, anchor_text, dr, ur, status, first_seen, last_seen | Backlink inventory |
| `backlink_tracking` | id, backlink_id, check_date, status, http_status, anchor_found | Historical status checks |

### Topic Clustering
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `topic_clusters` | id, project_id, name, keyword_count, page_count, completeness_score | Keyword clusters |
| `topic_cluster_pages` | id, cluster_id, page_url, internal_links, keywords | Pages assigned to clusters |
| `cross_cluster_links` | id, source_cluster_id, target_cluster_id, link_count, anchor_texts | Inter-cluster link tracking |

### Strategy & Execution
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `strategy_phases` | id, project_id, phase_name, status, start_date, end_date | Campaign phases |
| `strategy_actions` | id, phase_id, action_name, status, priority, assigned_to | Tactical action items |
| `strategy_execution_logs` | id, action_id, result, executed_at | Execution tracking |

### Reporting & Config
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `audit_results` | id, project_id, url, category, score, max_score, details | Master audit data (6 categories) |
| `monthly_reports` | id, project_id, month, report_data | Monthly summaries |
| `monthly_targets` | id, project_id, month, target_clicks, target_keywords | Performance targets |
| `app_config` | key, value | Global config (JSON strings) |
| `notes` | id, project_id, title, content, created_at | Notes & docs |
| `claude_activities` | id, project_id, query, result, created_at | Claude query logs |
| `sync_logs` | id, source, status, detail, synced_at | External sync logs |
| `salary_payments` | id, member_id, amount, month, status | Payroll tracking |

---

## Migration Pattern

**No Drizzle migrations file.** Instead:

1. **Direct SQL via `better-sqlite3`** in migration scripts (e.g., `scripts/migrations/`)
2. **Schema files** (`.ts`) define table structure for Drizzle ORM
3. **Applied manually** when schema diverges from DB

**Key files:**
- `src/lib/db/schema/*.ts` — table definitions
- `.drizzle/` folder not found — no migration history tracked

---

## Service Pattern

**Sync-first design** (no async/await for DB ops):

```typescript
// CRUD Pattern (from project.service.ts)
export function getProjects() {
  return db.select().from(projects).orderBy(asc(projects.created_at)).all();
}
export function getProjectById(id: string) {
  const project = db.select().from(projects).where(...).get();
  if (!project) throw new AppError('Project not found', 404);
  return project;
}
export function createProject(data: {...}) {
  return db.insert(projects).values({...}).returning().get();
}
export function updateProject(id: string, data: Partial<...>) {
  const updated = db.update(projects).set(data).where(...).returning().get();
  if (!updated) throw new AppError('Project not found', 404);
  return updated;
}
export function deleteProject(id: string) {
  db.delete(projects).where(eq(projects.id, id)).run();
}
```

**Key methods:**
- `.all()` — returns `T[]`
- `.get()` — returns `T | undefined`
- `.run()` — void, side-effect only
- `.returning()` — fetch after insert/update

---

## 23 Services (All Sync)

Core: `project.service`, `task.service`, `keyword.service`, `seo.service`, `member.service`, `salary.service`

Data flows: `sync.service` (external APIs), `dashboard.service` (aggregation)

SEO pipelines: `gsc-snapshots-save-and-query`, `audit-results-crud`, `keyword-insights-aggregator`, `health-check-assessment-engine`, `backlink-import-and-crud`, `backlink-status-checker`

Strategy: `strategy-phases-and-actions-crud`, `strategy-execution-log-crud`

External: `wordpress-rest-api-v2-client`, `wordpress-content-stats`

Config: `app-config-crud` (JSON in single table)

Logging: `claude-activities-log-and-query`, `sync-logs`, `monthly-reports-crud`

Clustering: `topic-clusters-crud`

---

## Key Patterns

1. **Error handling:** `throw new AppError(msg, statusCode)` for validation/not-found
2. **Timestamps:** text ISO format (`checked_at`, `created_at`, `updated_at`)
3. **Foreign keys:** `references()` with `onDelete: 'set null'`
4. **Defaults:** UUID via `crypto.randomUUID()`, dates via SQL `datetime('now')`
5. **JSON storage:** `.mode('json')` with type assertions
6. **Composition:** Import from `src/lib/db/schema`, use in services, export from `src/lib/services/index.ts`

---

## Unresolved Questions

- Are there active migrations that haven't been applied to dev/prod DBs?
- Does `app_config` use standardized JSON schema for all keys, or ad-hoc?
- Which tables have Row-Level Security (RLS) policies (if any)?
