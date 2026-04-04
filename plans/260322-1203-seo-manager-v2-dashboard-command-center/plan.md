---
title: "SEO Manager V2 — Dashboard Command Center"
description: "Unified dashboard with Notion/Sheet sync, 4-tab UI, growth reports, and client report generator"
status: pending
priority: P1
effort: 26h
branch: main
tags: [dashboard, notion-sync, growth, client-report, v2]
created: 2026-03-22
---

# SEO Manager V2 — Dashboard Command Center

## Objective
Transform the 2-tab dashboard into a 4-tab command center with unified data from Notion, Google Sheets, and existing DB. Add growth reporting and client-facing export.

## Architecture Decision
- **Notion sync is manual/API-push** — Notion MCP only works in Claude session, so we accept JSON POST (no polling)
- **Sheet content** — new table for AI-generated content tracking (separate from legacy `tasks`)
- **Activity log** — unified event stream across all sources
- **Existing `sync_logs`** table reused and extended (already has id, status, started_at, completed_at)

## Dependency Graph

```
Phase 1: Schema & Migration (2h)
  ↓
Phase 2: Services — Notion + Sheet + Activity (3h)  ←  [parallel after P1]
Phase 3: Services — Unified Aggregator (3h)          ←  [parallel after P1]
  ↓
Phase 4: APIs — Sync + Activity + Dashboard (2h)     ←  [after P2+P3]
  ↓
Phase 5: Tab — Tổng quan (3h)         ←  [parallel after P4]
Phase 6: Tab — Tăng trưởng (3h)      ←  [parallel after P4]
Phase 7: Tab — Thực thi (3h)          ←  [parallel after P4]
Phase 8: Tab — SEO Strength (3h)      ←  [parallel after P4]
  ↓
Phase 9: Growth Report Table (2h)     ←  [after P6]
Phase 10: Client Report Generator (2h) ←  [after P5+P6+P8]
```

**Critical path:** P1 → P2/P3 → P4 → P5-P8 → P10
**Max parallelism:** 4 workers on P5-P8

## File Ownership Matrix

| Phase | New Schema Files | New Service Files | New API Files | New UI Files |
|-------|-----------------|-------------------|---------------|-------------|
| P1 | `schema/notion.ts`, `schema/sheet-content.ts`, `schema/activity-log.ts` | — | — | — |
| P2 | — | `notion-data-import.service.ts`, `sheet-content-import.service.ts`, `activity-log-crud.service.ts` | — | — |
| P3 | — | `unified-dashboard-aggregator.service.ts` | — | — |
| P4 | — | — | `api/v1/notion-sync/route.ts`, `api/v1/sheet-content/route.ts`, `api/v1/activity-log/route.ts`, `api/v1/dashboard/unified-summary/route.ts` | — |
| P5 | — | — | — | `dashboard-v2-overview-tab.tsx`, `dashboard-v2-activity-feed.tsx`, `dashboard-v2-project-progress-bars.tsx` |
| P6 | — | — | — | `dashboard-v2-growth-tab.tsx`, `dashboard-v2-growth-trend-charts.tsx`, `dashboard-v2-growth-top-movers.tsx`, `dashboard-v2-growth-month-comparison.tsx` |
| P7 | — | — | — | `dashboard-v2-execution-tab.tsx`, `dashboard-v2-execution-content-tracker.tsx`, `dashboard-v2-execution-task-summary.tsx` |
| P8 | — | — | — | `dashboard-v2-seo-strength-tab.tsx`, `dashboard-v2-seo-strength-backlink-profile.tsx`, `dashboard-v2-seo-strength-topical-authority.tsx`, `dashboard-v2-seo-strength-onpage-scores.tsx`, `dashboard-v2-seo-strength-internal-links.tsx` |
| P9 | — | — | `api/v1/dashboard/growth-report/route.ts` | `dashboard-v2-growth-report-table.tsx` |
| P10 | — | `client-report-generator.service.ts` | `api/v1/reports/client/route.ts` | `dashboard-v2-client-report-modal.tsx` |

**Shared file edits (single phase only):**
- `page.tsx` (dashboard root) — modified in P5 only (adds 4-tab layout, imports all tabs)
- `src/lib/db/schema/index.ts` — modified in P1 only
- `src/lib/services/index.ts` — modified in P2+P3 (P2 adds 3 exports, P3 adds 1)

## Phases Summary

| # | Name | Effort | Depends On | Files |
|---|------|--------|------------|-------|
| 1 | Schema & Migration | 2h | — | 4 |
| 2 | Import Services | 3h | P1 | 4 |
| 3 | Unified Aggregator | 3h | P1 | 1 |
| 4 | APIs | 2h | P2, P3 | 4 |
| 5 | Tab: Tổng quan | 3h | P4 | 4 |
| 6 | Tab: Tăng trưởng | 3h | P4 | 4 |
| 7 | Tab: Thực thi | 3h | P4 | 3 |
| 8 | Tab: SEO Strength | 3h | P4 | 5 |
| 9 | Growth Report | 2h | P6 | 2 |
| 10 | Client Report | 2h | P5,P6,P8 | 3 |
| **Total** | | **26h** | | **34 files** |

## Validation Summary

**Validated:** 2026-03-22
**Questions asked:** 5

### Confirmed Decisions
- **Notion sync**: Cả hai — JSON POST API trước, thêm Notion API key sau
- **CSV import**: Cả hai — UI upload + Desktop path quick import
- **Old tabs**: Gộp vào tab mới (merge into new 4-tab structure)
- **Client report format**: HTML đẹp + Copy text (no Telegram format)
- **Scope**: Làm hết 1 lần — all 10 phases in 1 implementation pass

### Action Items
- [x] Plan validated, no changes needed — proceed to implementation

## Risk Mitigation
- **Notion schema changes**: notion_* tables use `text` for all flexible fields — no migration needed when Notion DB schema changes
- **sync_logs overlap**: existing table stays untouched; activity_log is the new unified stream
- **Dashboard regression**: old 2-tab code preserved as sub-components; new tabs added alongside
