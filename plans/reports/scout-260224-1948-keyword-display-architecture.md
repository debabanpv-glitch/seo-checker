# Keyword Display Architecture — Scout Report

## Overview
Two distinct keyword UI pages with different display approaches and shared `is_tracked` field:
1. **keyword-ranking** — flat table view with GSC sync & sheet config
2. **keyword-insights** — multi-section analysis with tier distribution & tracked keywords

## File Structure

### Keyword Ranking Page
Base: `/src/app/(dashboard)/keyword-ranking/`

| File | Purpose |
|------|---------|
| `page.tsx` | Main orchestrator — projects, tabs (all/cam-kết/blog/cơ-hội/giảm/gsc-only), filters, sort |
| `keyword-ranking-types-and-helpers.ts` | Types: KeywordRanking, KeywordTrend, ViewTab, GscSnapshot; `buildGscQueryMap()` |
| `keyword-ranking-shared-sub-components.tsx` | ScoreCard component (badge display) |
| `keyword-ranking-gsc-traffic-overview-section.tsx` | GSC traffic chart section |
| `keyword-ranking-keyword-row-with-expand.tsx` | Table row with expand history |
| `keyword-ranking-sheet-config-modal.tsx` | Google Sheet URL config modal |

**Key Flow:**
- Fetches: rankings, projects, sheet configs, GSC snapshots
- Builds keyword trends from rankings (latest vs previous date)
- **No star toggle** — `is_tracked` field not displayed here
- Tabs filter by: keyword_type (cam-kết/blog) or position (cơ-hội) or change (declining) or GSC-only

### Keyword Insights Page
Base: `/src/app/(dashboard)/keyword-insights/`

| File | Purpose |
|------|---------|
| `page.tsx` | Re-export from main-dashboard |
| `keyword-insights-main-dashboard.tsx` | Main orchestrator — projects, tabs (tiers/movers/boundary/tracked), star toggle handler |
| `keyword-insights-types-and-helpers.ts` | Types: KeywordInsight, ExpertInsight, InsightsSummary; TIER_CONFIG; posColor(), changeBadge(), fmtNum() |
| `keyword-insights-summary-stats-bar.tsx` | Summary stats display (total, improved, declined, tracked in top10) |
| `keyword-insights-tier-distribution-section.tsx` | Tabs for Top5/Top10/Top15/Top30/Beyond30 |
| `keyword-insights-movers-surging-and-dropping-section.tsx` | Surging (±5) & dropping (±5) keywords |
| `keyword-insights-boundary-near-page-one-section.tsx` | Keywords at positions 8-12 |
| `keyword-insights-tracked-keywords-section.tsx` | Splits tracked: In Top 10 / Outside Top 10 |
| `keyword-insights-keyword-row-with-sparkline.tsx` | Row with star toggle + sparkline chart |
| `keyword-insights-expert-analysis-panel.tsx` | AI-generated insights (opportunity/risk/success/action) |
| `keyword-insights-sparkline-mini-chart.tsx` | SVG sparkline chart |

**Key Flow:**
- Fetches insights from `GET /api/v1/keyword-insights?projectId=xxx`
- Service aggregates rankings by keyword → calculates tiers, movers, boundary, tracked, expert insights
- **Star toggle enabled** — each keyword row has star button
- Clicking star: optimistic update to local state + `PATCH /api/v1/keyword-insights` API call

### Service Layer
| File | Purpose |
|------|---------|
| `src/lib/services/keyword-insights-aggregator.service.ts` | `getKeywordInsights(projectId)` — main aggregator, builds all tiers/movers/boundary/tracked, generates expert insights |
| `src/lib/services/keyword.service.ts` | `getRankings()`, `getRankingGrowth()`, `toggleTracked(keyword, projectId, isTracked)` — CRUD ops |

### Schema
`src/lib/db/schema/seo.ts`:
```typescript
keywordRankings {
  id: string (PK)
  keyword: string
  url: string
  position: real
  date: string
  project_id: string (FK)
  ranking_tier: string | null     // "Top 1-3", "Top 4-5", etc.
  keyword_type: string | null     // "KW Cam kết", "KW Blog"
  is_tracked: boolean (default: false) ← TRACKED FIELD
}
```

### API Routes
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/keyword-rankings` | GET | Fetch all rankings (limit 5000) — NO `is_tracked` display |
| `/api/v1/keyword-insights` | GET | Fetch aggregated insights + tiers/movers/boundary/tracked |
| `/api/v1/keyword-insights` | PATCH | Toggle tracked: `{ keyword, project_id, is_tracked }` |

## `is_tracked` Field Usage

### Keyword Ranking Page
- **Not displayed** in table
- Not used for filtering or highlighting
- Field exists in DB but ignored in page logic

### Keyword Insights Page
**Full integration:**

1. **Data source** (service layer):
   - `keyword-insights-aggregator.service.ts` line 111: `is_tracked: !!r.is_tracked`
   - Propagates through all tiers/movers/boundary
   - `tracked` array: `allKeywords.filter((k) => k.is_tracked)` (line 177)

2. **Summary stats**:
   - `trackedTotal`: count of all keywords with `is_tracked=true`
   - `trackedInTop10`: count of tracked keywords with position ≤ 10
   - Displayed in summary bar

3. **UI display**:
   - **TrackedKeywordsSection** (line 12): Shows only tracked keywords, splits by Top 10 / Outside
   - **KeywordRow** (line 25): Star icon
     - Filled amber if `is_tracked=true`
     - Gray/hover if `is_tracked=false`
   - All other sections (tiers/movers/boundary) show star toggle on rows

4. **Toggle handler** (main-dashboard.tsx line 61):
   - Optimistic update: flips `is_tracked` in all arrays
   - Updates summary stats (trackedTotal, trackedInTop10)
   - API call: `PATCH /api/v1/keyword-insights` with `{ keyword, project_id, is_tracked }`
   - Service applies: `toggleTracked()` updates all rows for keyword+project

### Summary Stats Usage
```
Total keywords: ALL
Tracked total: is_tracked=true count
Tracked in Top 10: is_tracked=true AND position ≤ 10
```

## Key Differences

| Aspect | Keyword Ranking | Keyword Insights |
|--------|-----------------|------------------|
| **Display** | Flat table | Multi-section (tiers/movers/boundary/tracked) |
| **Star toggle** | Not shown | Enabled on every row |
| **is_tracked** | Stored but hidden | Fully integrated |
| **Data grouping** | By keyword_type (cam-kết/blog) or position | By position tier, movement, boundary, tracked flag |
| **GSC** | Merged into row (clicks/impr cols) | Merged into row (clicks/impr inline) |
| **Expert insights** | None | AI panel (opportunity/risk/success/action) |
| **Sparkline** | History expandable row | Mini SVG inline chart |
| **Filter tabs** | keyword_type, position range | tiers (5 level), movers, boundary, tracked |

## Data Flow Diagram

```
keyword-insights-aggregator.service.getKeywordInsights(projectId)
  ├─ Fetches all rankings for project (sorted by date desc, keyword asc)
  ├─ Groups by keyword → builds KeywordInsight[]
  ├─ Enriches with GSC data (buildGscQueryMap)
  ├─ Classifies into:
  │  ├─ tiers: [top5, top10, top15, top30, beyond30]
  │  ├─ movers: [surging (±5), dropping (±5)]
  │  ├─ boundary: positions 8-12
  │  └─ tracked: filter(is_tracked=true)
  ├─ Generates expert insights (6 rules)
  └─ Returns InsightsResponse

keyword-insights-main-dashboard
  ├─ Fetches projects
  ├─ User selects project
  ├─ Calls GET /api/v1/keyword-insights?projectId=xxx
  ├─ Renders by activeTab (tiers/movers/boundary/tracked)
  ├─ On star click: handleToggleTracked(keyword, currentTracked)
  │  ├─ Optimistic: flip is_tracked in state
  │  └─ PATCH /api/v1/keyword-insights with new value
  └─ Displays summary stats with trackedTotal & trackedInTop10
```

## Data Transformations

**KeywordRanking (DB row) → KeywordInsight (API response)**
```
is_tracked: integer (boolean mode) → is_tracked: boolean
```

**All keyword rows show is_tracked state** but:
- Keyword Ranking: ignores it
- Keyword Insights: displays star, filters tracked array, includes in summary

## Current Tracked Keywords Count
From memory: 510 tracked keywords (auto-set for "KW Cam kết" type on DLBM)

## Unresolved Questions
- Keyword Ranking page: why is `is_tracked` field stored but not used? (intentional or legacy?)
- Auto-populate tracked on sync: does it happen when keyword_type="KW Cam kết"?

## Visual File Map

### Keyword Ranking Page Files
```
src/app/(dashboard)/keyword-ranking/
├── page.tsx ← MAIN ENTRY
│   ├── imports: KeywordRanking, KeywordTrend, ViewTab, buildGscQueryMap
│   ├── fetches: /api/v1/keyword-rankings, /api/v1/projects
│   ├── tabs: all | cam-kết | blog | cơ-hội | giảm | gsc-only
│   └── renders: score cards → GSC section → table (KeywordRow)
│
├── keyword-ranking-types-and-helpers.ts
│   ├── type KeywordRanking { id, keyword, url, position, date, project_id, ranking_tier, keyword_type, gscClicks?, ... }
│   ├── type KeywordTrend { similar + history[] + change }
│   ├── type ViewTab = 'all' | 'cam_ket' | 'blog' | 'opportunity' | 'declining' | 'gsc_only'
│   └── buildGscQueryMap(snapshots) → Map<keyword, {clicks, impr, ctr, pos}>
│
├── keyword-ranking-shared-sub-components.tsx
│   └── ScoreCard(label, value, icon, color)
│
├── keyword-ranking-gsc-traffic-overview-section.tsx
│   └── GscTrafficSection(snapshots)
│
├── keyword-ranking-keyword-row-with-expand.tsx
│   ├── KeywordRow(trend, idx, expanded, onToggle, showGsc)
│   └── [No is_tracked display]
│
└── keyword-ranking-sheet-config-modal.tsx
    └── SheetConfigModal(configs, projects, onConfigsChange, onSave, onClose)
```

### Keyword Insights Page Files
```
src/app/(dashboard)/keyword-insights/
├── page.tsx ← RE-EXPORT
│   └── export { default } from './keyword-insights-main-dashboard'
│
├── keyword-insights-main-dashboard.tsx ← MAIN ENTRY
│   ├── state: projects, selectedProjectId, data, isLoading, activeTab
│   ├── tabs: tiers | movers | boundary | tracked
│   ├── fetches: /api/v1/projects, /api/v1/keyword-insights?projectId=xxx
│   ├── handleToggleTracked(keyword, currentTracked)
│   │   ├── optimistic update all arrays
│   │   ├── PATCH /api/v1/keyword-insights { keyword, project_id, is_tracked }
│   │   └── update summary stats
│   └── renders: summary → [tiers|movers|boundary|tracked] + expert panel
│
├── keyword-insights-types-and-helpers.ts
│   ├── type KeywordInsight { keyword, url, currentPosition, previousPosition, change, history[], is_tracked, gscClicks, ... }
│   ├── type ExpertInsight { type, title, detail, keywords[] }
│   ├── type InsightsSummary { total, improved, declined, stable, trackedTotal, trackedInTop10, ... }
│   ├── type InsightsResponse { meta, summary, tiers, movers, boundary, tracked, expertInsights }
│   ├── const TIER_CONFIG [ {key, label, range, color, bg, border}, ... ]
│   ├── posColor(pos) → CSS color by position
│   ├── changeBadge(change) → {text, cls}
│   └── fmtNum(n) → "1.2K" or "123"
│
├── keyword-insights-summary-stats-bar.tsx
│   └── SummaryStatsBar(meta, summary) ← shows trackedTotal & trackedInTop10
│
├── keyword-insights-tier-distribution-section.tsx
│   ├── TierDistributionSection(tiers, onToggleTracked)
│   └── renders 5 tier tabs + KeywordRow list
│
├── keyword-insights-movers-surging-and-dropping-section.tsx
│   ├── MoversSection(movers, onToggleTracked)
│   └── Surging (change ≥ +5) + Dropping (change ≤ -5)
│
├── keyword-insights-boundary-near-page-one-section.tsx
│   ├── BoundarySection(boundary, onToggleTracked)
│   └── Keywords at positions 8-12
│
├── keyword-insights-tracked-keywords-section.tsx
│   ├── TrackedKeywordsSection(tracked, onToggleTracked)
│   ├── In Top 10 (emerald) vs Outside Top 10 (amber)
│   └── KeywordRow list
│
├── keyword-insights-keyword-row-with-sparkline.tsx ← STAR TOGGLE HERE
│   ├── KeywordRow(kw, onToggleTracked, showGsc)
│   ├── Star button onClick → onToggleTracked(keyword, is_tracked)
│   │   ├── filled amber if is_tracked=true
│   │   └── gray if is_tracked=false
│   ├── position badge | change | keyword | GSC data
│   └── Sparkline(history)
│
├── keyword-insights-sparkline-mini-chart.tsx
│   └── Sparkline(data, width, height) ← SVG inline chart
│
└── keyword-insights-expert-analysis-panel.tsx
    ├── ExpertPanel(insights)
    └── renders opportunity/risk/success/action cards
```

### Service Layer Files
```
src/lib/services/
├── keyword-insights-aggregator.service.ts
│   └── getKeywordInsights(projectId: string) → InsightsResponse
│       ├─ fetch all rankings by project
│       ├─ group by keyword (case insensitive)
│       ├─ build KeywordInsight[] with:
│       │  ├─ is_tracked: !!r.is_tracked (line 111, 132)
│       │  ├─ gscClicks, gscImpressions, gscCtr, gscPosition from GSC
│       │  ├─ currentPosition, previousPosition, change, history[]
│       │  └─ ranking_tier, keyword_type
│       ├─ classify into tiers [top5, top10, top15, top30, beyond30]
│       ├─ classify into movers {surging: [±5], dropping: [±5]}
│       ├─ classify into boundary (pos 8-12)
│       ├─ filter tracked: all keywords where is_tracked=true
│       └─ generate expert insights (6 rules + boundary/drops/surges/tracked)
│
└── keyword.service.ts
    ├─ getRankings(filters) → KeywordRanking[]
    ├─ deleteRankings(params)
    ├─ upsertRankingsBatch(rows)
    ├─ getRankingGrowth(projectId?, days=30) → DailySnapshot[]
    └─ toggleTracked(keyword, projectId, isTracked) ← UPDATES DB
        └─ UPDATE keyword_rankings SET is_tracked = ? WHERE keyword = ? AND project_id = ?
```

### API Routes
```
src/app/api/v1/
├── keyword-rankings/
│   └── route.ts (GET) → fetch rankings
└── keyword-insights/
    └── route.ts
        ├─ GET ?projectId=xxx → calls getKeywordInsights(projectId)
        └─ PATCH { keyword, project_id, is_tracked } → calls toggleTracked()
```

## Key Integration Points

### Star Toggle Flow
```
User clicks star on KeywordRow
  ↓
KeywordRow.onToggleTracked(keyword, currentTracked)
  ↓
main-dashboard.handleToggleTracked(keyword, currentTracked)
  ↓
1. Optimistic update:
   - Flip is_tracked in all arrays (tiers/movers/boundary/tracked)
   - Update summary (trackedTotal ±1, trackedInTop10 ±0/1)
   - setState()
  ↓
2. API call:
   PATCH /api/v1/keyword-insights
   { keyword, project_id, is_tracked: !currentTracked }
  ↓
3. Backend:
   toggleTracked(keyword, projectId, isTracked)
   UPDATE keyword_rankings SET is_tracked = isTracked
     WHERE keyword = keyword AND project_id = projectId
```

### Tracked Keywords Display
```
InsightsResponse.tracked = [KeywordInsight] where is_tracked=true
  ↓
TrackedKeywordsSection(tracked, onToggleTracked)
  ├─ inTop10 = tracked.filter(pos ≤ 10)  ← emerald section
  └─ outTop10 = tracked.filter(pos > 10) ← amber section
  ↓
KeywordRow × N with star toggle
```

### Summary Stats Update
```
summary.trackedTotal = count of keywords where is_tracked=true
summary.trackedInTop10 = count where is_tracked=true AND position ≤ 10

Displayed in: SummaryStatsBar component
Updated on: toggle, or re-fetch
```

## Code Snippets

### Propagating is_tracked (keyword-insights-aggregator.service.ts:111)
```typescript
kwMap.set(key, {
  keyword: r.keyword,
  // ... other fields
  is_tracked: !!r.is_tracked,  // ← from DB integer
  // ... gsc fields
});
```

### Filtering tracked (line 177)
```typescript
const tracked = allKeywords
  .filter((k) => k.is_tracked)
  .sort((a, b) => a.currentPosition - b.currentPosition);
```

### Star UI (keyword-insights-keyword-row-with-sparkline.tsx:25)
```typescript
<Star className={cn(
  'w-3.5 h-3.5',
  kw.is_tracked
    ? 'fill-amber-400 text-amber-400'
    : 'text-[#444460] hover:text-amber-400/50'
)} />
```

### Toggle handler (main-dashboard.tsx:61-102)
```typescript
const handleToggleTracked = useCallback(async (keyword: string, currentTracked: boolean) => {
  if (!data) return;
  const newTracked = !currentTracked;

  // Optimistic update
  const updateKw = (kw) => kw.keyword === keyword ? { ...kw, is_tracked: newTracked } : kw;
  setData((prev) => ({
    ...prev,
    tiers: { top5: prev.tiers.top5.map(updateKw), ... },
    movers: { surging: prev.movers.surging.map(updateKw), ... },
    boundary: prev.boundary.map(updateKw),
    tracked: newTracked ? [...prev.tracked, ...found] : prev.tracked.filter(k => k.keyword !== keyword),
    summary: { ...prev.summary, trackedTotal: prev.summary.trackedTotal + (newTracked ? 1 : -1) }
  }));

  // API call
  await fetch('/api/v1/keyword-insights', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, project_id: selectedProjectId, is_tracked: newTracked })
  }).catch(console.error);
}, [data, selectedProjectId]);
```

---

## Summary
- **keyword-ranking**: Simple table, `is_tracked` stored but unused
- **keyword-insights**: Full analysis dashboard, `is_tracked` fully integrated with star toggle
- Star buttons appear on all keyword rows (tiers/movers/boundary/tracked sections)
- Tracked keywords section auto-groups by Top 10 / Outside
- Summary stats show trackedTotal & trackedInTop10 metrics
- DB updates via PATCH → toggleTracked() updates all rows for keyword+project
