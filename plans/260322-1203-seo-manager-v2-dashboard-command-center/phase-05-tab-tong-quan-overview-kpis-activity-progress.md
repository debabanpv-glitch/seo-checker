# Phase 5: Tab Tổng quan — Overview KPIs, Activity Feed, Project Progress

**Effort:** 3h | **Depends on:** P4 | **Blocks:** P10

## Goal
Build the first (default) tab of Dashboard V2: unified KPI row, activity feed, and per-project progress bars. Also refactor `page.tsx` from 2 tabs to 4 tabs.

## New Files (all in `src/app/(dashboard)/`)

### 1. `dashboard-v2-overview-tab.tsx`
Main container for the Tổng quan tab.

```
Layout:
┌─────────────────────────────────────────────────┐
│  KPI Cards Row (6 cards)                        │
├────────────────────────┬────────────────────────┤
│  Activity Feed (left)  │  Project Progress      │
│  scrollable list       │  (right)               │
│  last 30 items         │  3 project bars        │
└────────────────────────┴────────────────────────┘
```

**Data source:** `GET /api/v1/dashboard/unified-summary`
- Fetches on mount via `useEffect` + `useState`
- Shows loading skeleton while fetching
- Error state with retry button

**KPI Cards (6):**
1. Clicks tuần này — `traffic.totalClicks` with `traffic.clicksTrend` %
2. Impressions — `traffic.totalImpressions` with trend
3. KW Top 10 — `keywords.top10`
4. Nội dung đã xuất bản — `content.totalPublished` (AI: `content.fromAI`, Manual: `content.fromManual`)
5. Việc đã xong — `tasks.done` / `tasks.total`
6. Backlinks sống — `backlinks.alive` / `backlinks.total`

**Styling:** Reuse existing KPI card pattern from `dashboard-seo-kpi-cards-row.tsx` (copy style, not import — avoid coupling).

### 2. `dashboard-v2-activity-feed.tsx`
Scrollable timeline of recent activities.

**Props:** `activities: Array<{ source, action, description, project_id, created_at }>`

**UI:**
- Vertical timeline with source icon (color-coded by source)
- Source badges: Notion (purple), Sheet (green), GSC (blue), WP (orange), Audit (red), Manual (gray)
- Relative time: "2 giờ trước", "hôm qua"
- Max height 400px, overflow-y scroll
- Empty state: "Chưa có hoạt động nào"

### 3. `dashboard-v2-project-progress-bars.tsx`
Per-project progress summary.

**Props:** `projects: Array<{ id, name, clicks, kwTop10, contentPublished, auditScore, progressPercent }>`

**UI per project:**
- Project name + overall progress %
- Progress bar with color thresholds (red <30%, yellow 30-70%, green >70%)
- Mini stats: clicks, KW top10, content count
- Growth indicator: ↑ or ↓ vs previous period

### 4. `page.tsx` — MODIFY (dashboard root)
Refactor from 2 tabs to 4 tabs:

```typescript
type DashboardTab = 'overview' | 'growth' | 'execution' | 'seo-strength';

// Tab config:
const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'growth', label: 'Tăng trưởng', icon: TrendingUp },
  { id: 'execution', label: 'Thực thi', icon: ListChecks },
  { id: 'seo-strength', label: 'SEO Strength', icon: Shield },
];

// Default tab: 'overview' (was 'content')
// Keep month/year picker visible for execution tab only
// Lazy render: only render active tab component
```

**Import strategy:**
- Import all 4 tab components
- Render with `{activeTab === 'overview' && <DashboardV2OverviewTab />}`
- Old Content tab becomes part of Execution tab (P7)
- Old SEO Overview tab data merged into Overview + SEO Strength tabs

## Acceptance Criteria
- [ ] 4 tabs visible, default = Tổng quan
- [ ] KPI cards show real data from unified-summary API
- [ ] Activity feed scrollable, color-coded sources
- [ ] Project progress bars render for all 3 projects
- [ ] Loading skeleton shown during fetch
- [ ] Old tabs (Content, SEO Overview) still accessible via Execution + SEO Strength
- [ ] No TypeScript errors

## Notes
- `page.tsx` is the ONLY shared file modified in this phase — other phases import their tab components here
- Actually: P5 creates the tab shell in page.tsx. P6/P7/P8 only create their tab component files. page.tsx imports are added incrementally (P5 adds all 4 imports with placeholder components for P6/P7/P8 tabs)
- Alternative: P5 adds all 4 tab imports but P6/P7/P8 tabs export from their own files. This means page.tsx is modified ONCE in P5.
