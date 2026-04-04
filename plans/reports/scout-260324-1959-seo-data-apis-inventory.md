# SEO Manager — SEO Data APIs Inventory

**Date:** 2026-03-24  
**Purpose:** Map all API endpoints & services providing SEO data for reporting

---

## 1. HEALTH CHECK API
**Route:** `GET /api/v1/health-check`  
**Service:** `health-check-assessment-engine.service.ts`

**Response Fields:**
- Per-project assessments with:
  - `overall_score` — weighted avg (30% SEO, 20% Traffic, 20% KW, 15% Strategy, 15% Freshness)
  - `category_scores` — technical, content, images, links, eeat, aiReadiness
  - `traffic_data` — clicks, impressions, ctr, position, trends
  - `keyword_data` — total, top3, top10, change metrics
  - `warnings[]` — (severity, category, title, detail) for 15+ rules
  - `priority_actions[]` — highest severity items first
  - `strategy_phases[]` — progress, completion %, next actions
  - `progress_report` — timeline vs KPI, forecast

---

## 2. GSC DATA API
**Route:** `GET /api/v1/gsc/snapshot?project_id=xxx&limit=N`  
**Service:** `gsc-snapshots-save-and-query.service.ts`

**Response:**
```json
{
  "snapshots": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "date": "2026-03-24",
      "period": "daily|weekly|monthly",
      "clicks": 150,
      "impressions": 3500,
      "ctr": 0.043,
      "position": 12.5
    }
  ]
}
```

**Key Methods:**
- `getSnapshots(projectId, limit?)` — array of snapshots, latest first
- `saveSnapshot()` — POST new snapshot

---

## 3. KEYWORD INSIGHTS API
**Route:** `GET /api/v1/keyword-insights?projectId=xxx`  
**Service:** `keyword-insights-aggregator.service.ts`

**Response:**
```json
{
  "meta": {
    "projectId": "uuid",
    "latestDate": "2026-03-23",
    "previousDate": "2026-03-16",
    "checkDates": ["2026-03-23", "2026-03-16", ...]
  },
  "summary": {
    "total": 143,
    "improved": 18,
    "declined": 12,
    "stable": 113,
    "newToTop10": 3,
    "exitTop10": 2,
    "trackedTotal": 127,
    "trackedInTop10": 38,
    "totalClicks": 1520,
    "totalImpressions": 28340
  },
  "tiers": {
    "top5": [{ keyword, currentPosition, gscClicks, is_tracked, history }],
    "top10": [...],
    "top15": [...],
    "top30": [...],
    "beyond30": [...]
  },
  "movers": {
    "surging": [{ keyword, change: +5 }],
    "dropping": [{ keyword, change: -3 }]
  },
  "boundary": [...],  // pos 8-12, at risk
  "tracked": [...],   // is_tracked=true only
  "expertInsights": [
    {
      "type": "opportunity|risk|success|action",
      "title": "...",
      "detail": "...",
      "keywords": ["kw1", "kw2"]
    }
  ]
}
```

---

## 4. BACKLINKS API
**Route:** `GET /api/v1/backlinks?project_id=xxx&mode=stats`  
**Service:** `backlink-import-and-crud.service.ts`

**Response (stats mode):**
```json
{
  "total": 1530,
  "alive": 1010,  // link verified active
  "dead": 520,    // link not found or 404
  "avgDR": 35.4,
  "topSources": [
    { "domain": "site.com", "count": 45, "avgDR": 38 }
  ],
  "byStatus": {
    "sống": 1010,      // alive
    "chết": 520,       // dead
    "lỗi": 0          // check error
  },
  "newThisMonth": 142,
  "lastChecked": "2026-03-24T10:30:00Z"
}
```

**Methods:**
- `getBacklinks(projectId?)` — full backlink list
- `getBacklinkStats(projectId?)` — stats summary
- `getBacklinkCheckSummary()` — status check results

---

## 5. STRATEGY API
**Routes:**
- `GET /api/v1/strategy/phases?project_id=xxx`
- `GET /api/v1/strategy/actions?project_id=xxx`

**Service:** `strategy-phases-and-actions-crud.service.ts`

**Phases Response:**
```json
{
  "phases": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "name": "Technical SEO",
      "status": "in_progress|done|pending",
      "total": 12,      // total actions in phase
      "done": 8,        // completed actions
      "progress": 67    // percentage
    }
  ]
}
```

**Actions Response:**
```json
{
  "actions": [
    {
      "id": "uuid",
      "phase_id": "uuid",
      "action_name": "Fix robots.txt",
      "priority": "high|medium|low",
      "status": "pending|in_progress|done",
      "category": "Technical SEO|Content|...",
      "assigned_to": "member_id|null",
      "deadline": "2026-04-15"
    }
  ]
}
```

---

## 6. TOPICAL MAP / CLUSTER API
**Routes:**
- `GET /api/v1/topic-clusters?projectId=xxx` — list all clusters
- `GET /api/v1/topic-clusters?id=xxx` — cluster detail (pages + keywords)
- `GET /api/v1/topic-clusters?id=xxx&stats=true` — stats + completeness score
- `GET /api/v1/topic-clusters?id=xxx&overlap=true` — cannibalization detection

**Service:** `topic-clusters-crud.service.ts`

**List Response:**
```json
[
  {
    "id": "uuid",
    "project_id": "uuid",
    "name": "Nhãn in Brother",
    "pillar_url": "https://domain.com/nlap-in-brother/",
    "keyword_count": 15,
    "page_count": 10,
    "completeness_score": 72,
    "target_keyword_count": 20,
    "target_page_count": 12
  }
]
```

**Detail Response:**
```json
{
  "id": "uuid",
  "name": "...",
  "keywords": [
    { "keyword": "...", "position": 12, "is_tracked": true }
  ],
  "pages": [
    {
      "url": "https://...",
      "title": "...",
      "internal_links_count": 3,
      "anchor_texts": ["anchor1", "anchor2"]
    }
  ],
  "stats": {
    "keyword_coverage": 75,
    "internal_link_density": 2.4,
    "cross_links": 8,
    "completeness": 72   // based on targets
  }
}
```

---

## 7. SEO AUDIT SCORES
**Route:** `GET /api/v1/dashboard/seo-summary`  
**Service:** `audit-results-crud.service.ts` (reads latest audit per project)

**Response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Samco",
      "domain": "samcotech.com.vn",
      "healthScore": 75,
      "auditDate": "2026-03-20",
      "categoryScores": {
        "content": 80,
        "technical": 72,
        "images": 68,
        "links": 65,
        "eeat": 78,
        "aiReadiness": 71
      },
      "gsc": { clicks, impressions, ctr, position },
      "keywords": { total, top3, top10, top20, top50, beyond50 }
    }
  ],
  "totals": {
    "clicks": 540,
    "impressions": 12340,
    "totalKeywords": 1737,
    "keywordsInTop10": 185,
    "improved": 52,
    "declined": 31
  },
  "dailyTrend": [{ date, clicks, impressions }],
  "distribution": { top3, top10, top20, top50, beyond50 }
}
```

---

## 8. WORDPRESS CONTENT STATS
**Route:** `GET /api/v1/dashboard/wp-content-stats`  
**Service:** `wordpress-content-stats.service.ts`

**Response:**
```json
{
  "projects": [
    {
      "projectId": "uuid",
      "projectName": "TCNET",
      "domain": "mangthanhcong.vn",
      "publishedTotal": 82,
      "draftsTotal": 18,
      "postsThisMonth": 4,
      "monthlyTarget": 12,
      "progressPct": 33,
      "onTrack": false,
      "configured": true,
      "lastFetch": "2026-03-24T09:00:00Z"
    }
  ],
  "month": {
    "daysPassed": 24,
    "daysInMonth": 31,
    "timePct": 77        // % of month elapsed
  }
}
```

---

## 9. UNIFIED DASHBOARD SUMMARY
**Route:** `GET /api/v1/dashboard/unified-summary?project_id=xxx`  
**Service:** `unified-dashboard-aggregator.service.ts`

**Response:**
```json
{
  "traffic": {
    "totalClicks": 540,
    "totalImpressions": 12340,
    "avgPosition": 15.3,
    "clicksTrend": 12.5,      // % change
    "impressionsTrend": -3.2
  },
  "keywords": {
    "total": 1737,
    "top3": 42,
    "top10": 185,
    "top30": 380,
    "trackedFromNotion": 127,
    "moversUp": 52,
    "moversDown": 31
  },
  "content": {
    "totalPublished": 144,
    "totalDrafts": 40,
    "publishedThisMonth": 8,
    "fromAI": 5,
    "fromManual": 3
  },
  "tasks": {
    "total": 156,
    "done": 94,
    "inProgress": 38,
    "overdue": 3,
    "byCategory": { "Content": { "total": 60, "done": 38 } }
  },
  "backlinks": {
    "total": 1530,
    "alive": 1010,
    "dead": 520,
    "newThisMonth": 142,
    "avgDR": 35.4
  },
  "seoStrength": {
    "auditScores": { "content": 80, "technical": 72, ... },
    "avgAuditScore": 73,
    "clusterCount": 8,
    "avgCompleteness": 71,
    "orphanPages": 2
  },
  "strategy": {
    "totalActions": 45,
    "completedActions": 32,
    "completionRate": 71,
    "activePhases": 4
  },
  "projects": [
    {
      "id": "uuid",
      "name": "Samco",
      "clicks": 98,
      "kwTop10": 52,
      "kwTrackedTotal": 567,
      "kwTrackedTop10": 45,
      "kwFollowTotal": 363,
      "kwFollowTop10": 18,
      "contentPublished": 62,
      "auditScore": 75,
      "progressPercent": 68,
      "tasksDone": 32,
      "tasksTotal": 45,
      "backlinksAlive": 340,
      "backlinksTotal": 520,
      "strategyRate": 72
    }
  ],
  "recentActivity": [
    { "id": "uuid", "source": "gsc|keyword|backlink|...", "action": "...", "date": "2026-03-24T10:00:00Z" }
  ]
}
```

---

## 10. GROWTH REPORT API
**Route:** `GET /api/v1/dashboard/growth-report?project_id=xxx&period=weekly|monthly`  
**Service:** Embedded in route handler

**Response:**
```json
{
  "period": "weekly|monthly",
  "rows": [
    {
      "period_label": "T12 03/2026",
      "clicks": 150,
      "clicks_delta": 5.2,          // % change
      "impressions": 3500,
      "impressions_delta": -2.1,
      "kw_top10": 45,
      "kw_top10_delta": null,
      "content_published": 2,
      "content_published_delta": 100,
      "backlinks_new": 12,
      "backlinks_new_delta": 40,
      "audit_score": 75,
      "audit_score_delta": 1.3
    }
  ]
}
```

---

## 11. CLIENT REPORT API
**Route:** `GET /api/v1/reports/client?project_id=xxx&period=weekly|monthly&format=text|html&sections=overview,traffic,keywords,...`  
**Service:** `client-report-generator.service.ts`

**Response:**
```json
{
  "title": "Báo cáo SEO — Samco (Tuần 12/2026)",
  "generatedAt": "2026-03-24T10:30:00Z",
  "sections": [
    {
      "heading": "TỔNG QUAN",
      "content": "...",
      "metrics": [
        { "label": "Clicks tuần", "value": "98", "trend": "+5.2%" },
        { "label": "Từ khóa Top 10", "value": "52" }
      ]
    }
  ],
  "rawText": "plain text version for clipboard",
  "htmlContent": "<html>...</html>"
}
```

---

## 12. ACTIVITY LOG / AUDIT TRAIL
**Routes:**
- `GET /api/v1/activity-log` — all activities
- `GET /api/v1/notion-sync` — Notion import logs
- `GET /api/v1/sheet-content` — Sheet import stats

**Service:** `activity-log-crud-and-query.service.ts`

**Response:**
```json
{
  "activities": [
    {
      "id": "uuid",
      "source": "gsc|keyword_sync|backlink_import|...",
      "action": "sync|import|update",
      "projectId": "uuid",
      "details": "JSON details",
      "createdAt": "2026-03-24T10:00:00Z"
    }
  ]
}
```

---

## Summary Table

| Data Source | API Route | Key Metrics | Use Case |
|---|---|---|---|
| Health Check | `/api/v1/health-check` | overall_score, warnings, priority_actions | Executive dashboard, risk alerts |
| GSC | `/api/v1/gsc/snapshot` | clicks, impressions, ctr, position | Traffic trends, KPI tracking |
| Keywords | `/api/v1/keyword-insights` | top3, top10, movers, tiers | Ranking analysis, tier distribution |
| Backlinks | `/api/v1/backlinks` | alive, dead, avgDR, new_this_month | Link health, growth tracking |
| Strategy | `/api/v1/strategy/phases` + `/actions` | completion_rate, priority_actions | Execution tracking, roadmap |
| Topical Map | `/api/v1/topic-clusters` | clusters, keywords, completeness | Content structure, cannibalization |
| SEO Audit | `/api/v1/dashboard/seo-summary` | categoryScores, healthScore | Audit scores, category breakdown |
| WP Content | `/api/v1/dashboard/wp-content-stats` | published, drafts, target progress | Content production tracking |
| Unified Summary | `/api/v1/dashboard/unified-summary` | all KPIs, all projects | Command center dashboard |
| Growth Report | `/api/v1/dashboard/growth-report` | clicks_delta, content_delta, audit_delta | Weekly/monthly growth tracking |
| Client Report | `/api/v1/reports/client` | formatted sections (text/html) | Client delivery, external comms |

---

## Key Implementation Notes

1. **Sync API** — All services use better-sqlite3 sync (no await)
2. **Project Scoping** — Accept `project_id` OR `projectId` param (both supported)
3. **Date Format** — YYYY-MM-DD for snapshots, ISO 8601 for timestamps
4. **Period Types** — daily, weekly, monthly snapshots in GSC
5. **Trend Calc** — % change = ((current - previous) / previous) * 100
6. **Strategy Sorting** — Actions sorted by priority (high → low) by default
7. **Backlink Status** — sống (alive), chết (dead), lỗi (error) categories
8. **Keyword Tracking** — is_tracked=true indicates "Cam kết" keywords, false = "Tự follow"
9. **Completeness Score** — cluster-based, capped at 30 penalty for overlap
10. **Activity Log** — all data changes tracked with source, action, details, timestamp

---

## Files Reviewed

- `/src/app/api/v1/health-check/route.ts`
- `/src/lib/services/health-check-assessment-engine.service.ts`
- `/src/app/api/v1/gsc/snapshot/route.ts`
- `/src/lib/services/gsc-snapshots-save-and-query.service.ts`
- `/src/app/api/v1/keyword-insights/route.ts`
- `/src/lib/services/keyword-insights-aggregator.service.ts`
- `/src/app/api/v1/backlinks/route.ts`
- `/src/lib/services/backlink-import-and-crud.service.ts`
- `/src/app/api/v1/strategy/phases/route.ts`
- `/src/lib/services/strategy-phases-and-actions-crud.service.ts`
- `/src/app/api/v1/topic-clusters/route.ts`
- `/src/lib/services/topic-clusters-crud.service.ts`
- `/src/app/api/v1/dashboard/seo-summary/route.ts`
- `/src/app/api/v1/dashboard/wp-content-stats/route.ts`
- `/src/app/api/v1/dashboard/unified-summary/route.ts`
- `/src/app/api/v1/dashboard/growth-report/route.ts`
- `/src/app/api/v1/reports/client/route.ts`
- `/src/lib/services/client-report-generator.service.ts`
- `/src/lib/services/unified-dashboard-aggregator.service.ts`
- `/src/lib/services/activity-log-crud-and-query.service.ts`

