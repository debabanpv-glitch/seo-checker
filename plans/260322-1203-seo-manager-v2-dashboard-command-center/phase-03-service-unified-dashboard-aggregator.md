# Phase 3: Service — Unified Dashboard Aggregator

**Effort:** 3h | **Depends on:** P1 | **Blocks:** P4

## Goal
Single service that reads ALL data sources (notion_*, sheet_content, keyword_rankings, gsc_snapshots, backlinks, audit_results, topic_clusters, strategy_actions, wordpress stats) and produces a unified KPI summary for the dashboard.

## New Files

### 1. `src/lib/services/unified-dashboard-aggregator.service.ts`

**Core function:**
```typescript
export function getUnifiedDashboardSummary(projectId?: string): UnifiedDashboardSummary
```

**Return type:**
```typescript
interface UnifiedDashboardSummary {
  // Traffic KPIs (from gsc_snapshots)
  traffic: {
    totalClicks: number;
    totalImpressions: number;
    avgPosition: number;
    clicksTrend: number;           // % change vs previous period
    impressionsTrend: number;
  };

  // Keyword KPIs (from keyword_rankings + notion_keywords)
  keywords: {
    total: number;
    top3: number;
    top10: number;
    top30: number;
    trackedFromNotion: number;
    moversUp: number;
    moversDown: number;
  };

  // Content KPIs (from sheet_content + notion_content + wordpress)
  content: {
    totalPublished: number;
    totalDrafts: number;
    publishedThisMonth: number;
    fromAI: number;                // notion_content source
    fromManual: number;            // sheet_content source
    wpPublished: number;
    wpDrafts: number;
  };

  // Task KPIs (from notion_tasks + tasks)
  tasks: {
    total: number;
    done: number;
    inProgress: number;
    overdue: number;
    byCategory: Record<string, { total: number; done: number }>;
  };

  // Backlink KPIs (from backlinks + notion_backlinks)
  backlinks: {
    total: number;
    alive: number;
    dead: number;
    newThisMonth: number;
    avgDR: number;
  };

  // SEO Strength (from audit_results + topic_clusters)
  seoStrength: {
    auditScores: Record<string, number>;  // content, technical, images, links, eeat, ai_readiness
    avgAuditScore: number;
    clusterCount: number;
    avgCompleteness: number;
    orphanPages: number;
  };

  // Strategy (from strategy_actions + strategy_phases)
  strategy: {
    totalActions: number;
    completedActions: number;
    completionRate: number;
    activePhases: number;
  };

  // Per-project breakdown
  projects: Array<{
    id: string;
    name: string;
    clicks: number;
    kwTop10: number;
    contentPublished: number;
    auditScore: number;
    progressPercent: number;       // from project_goals
  }>;

  // Recent activity (from activity_log)
  recentActivity: Array<{
    source: string;
    action: string;
    description: string;
    project_id?: string;
    created_at: string;
  }>;

  meta: {
    generatedAt: string;
    projectFilter: string | null;
  };
}
```

**Implementation approach:**
1. Query each table once (sync), collect raw data
2. Compute aggregations in-memory (fast for ~2000 rows)
3. If `projectId` provided, filter all queries by project
4. For trends: compare latest 7 days vs previous 7 days from gsc_snapshots
5. Reuse existing service functions where possible:
   - `getWordPressContentStats()` from wordpress-content-stats.service
   - Keyword tier logic from keyword-insights-aggregator.service (but inline, don't import the whole thing)
6. Return single JSON object

**Helper functions (private):**
```typescript
function getTrafficKPIs(projectId?: string): TrafficKPIs
function getKeywordKPIs(projectId?: string): KeywordKPIs
function getContentKPIs(projectId?: string): ContentKPIs
function getTaskKPIs(projectId?: string): TaskKPIs
function getBacklinkKPIs(projectId?: string): BacklinkKPIs
function getSeoStrengthKPIs(projectId?: string): SeoStrengthKPIs
function getStrategyKPIs(projectId?: string): StrategyKPIs
function getProjectBreakdowns(): ProjectBreakdown[]
```

### 2. `src/lib/services/index.ts` — MODIFY
Add 1 export:
```typescript
export * from './unified-dashboard-aggregator.service';
```

## Acceptance Criteria
- [ ] Returns complete UnifiedDashboardSummary with all sections populated
- [ ] Handles empty tables gracefully (0 counts, not errors)
- [ ] Project filter works correctly
- [ ] Trend calculations use correct date windows
- [ ] All functions sync (no async)
- [ ] Performance: <500ms for 3 projects with typical data volume

## Notes
- This is the HEAVIEST service — reads from 10+ tables. Keep queries lean (SELECT only needed columns)
- Don't import health-check-assessment-engine (too coupled). Re-derive what's needed
- WordPress stats: call existing `getWordPressContentStats(projectId)` which returns `{ published, drafts }`
- Existing `dashboard.service.ts` stays untouched — it serves the old Content tab
