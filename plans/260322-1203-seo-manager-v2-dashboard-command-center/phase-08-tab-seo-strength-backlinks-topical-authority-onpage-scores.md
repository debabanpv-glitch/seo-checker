# Phase 8: Tab SEO Strength — Backlink Profile, Topical Authority, On-Page Scores

**Effort:** 3h | **Depends on:** P4 | **Blocks:** P10

## Goal
Build the SEO Strength tab combining backlink health, topical map coverage, audit scores, and internal link quality into one view.

## New Files (all in `src/app/(dashboard)/`)

### 1. `dashboard-v2-seo-strength-tab.tsx`
Main container.

```
Layout:
┌─────────────────────────────────────────────────┐
│  Project Filter Dropdown                         │
├────────────────────────┬────────────────────────┤
│  Backlink Profile      │  Topical Authority      │
│  (donut + stats)       │  (cluster bars)         │
├────────────────────────┼────────────────────────┤
│  On-Page Audit Scores  │  Internal Link Health   │
│  (6 category bars)     │  (pillar coverage)      │
└────────────────────────┴────────────────────────┘
```

**Data source:** `GET /api/v1/dashboard/unified-summary?project_id=X`
- `seoStrength.auditScores` → on-page
- `seoStrength.clusterCount`, `avgCompleteness` → topical
- `backlinks.*` → backlink profile
- Additional: `GET /api/v1/topic-clusters?project_id=X` for detailed cluster data

### 2. `dashboard-v2-seo-strength-backlink-profile.tsx`
Backlink health summary.

**Props:**
```typescript
{
  total: number;
  alive: number;
  dead: number;
  newThisMonth: number;
  avgDR: number;
}
```

**UI:**
- SVG donut chart: alive (green) vs dead (red) vs unknown (gray)
- Stats below: Total, Sống, Chết, Mới tháng này, DR trung bình
- Health indicator: >80% alive = "Tốt" (green), 60-80% = "Trung bình" (yellow), <60% = "Cần cải thiện" (red)

### 3. `dashboard-v2-seo-strength-topical-authority.tsx`
Cluster coverage and completeness.

**Props:**
```typescript
{
  clusterCount: number;
  avgCompleteness: number;
  clusters: Array<{
    name: string;
    keywordCount: number;
    pageCount: number;
    completenessScore: number;
  }>;
}
```

**UI:**
- Summary: "{N} cụm chủ đề, hoàn thiện trung bình {X}%"
- Horizontal bar chart per cluster: completeness score (0-100)
  - Color: green >70%, yellow 40-70%, red <40%
- Click cluster → link to /topical-map page

### 4. `dashboard-v2-seo-strength-onpage-scores.tsx`
6-category audit scores.

**Props:**
```typescript
{
  scores: Record<string, number>;  // content, technical, images, links, eeat, ai_readiness
  avgScore: number;
}
```

**UI:**
- 6 horizontal progress bars, one per category
- Color-coded: green >70, yellow 50-70, red <50
- Overall avg score in center badge
- Category labels in Vietnamese:
  - content → "Nội dung"
  - technical → "Kỹ thuật"
  - images → "Hình ảnh"
  - links → "Liên kết"
  - eeat → "E-E-A-T"
  - ai_readiness → "AI Readiness"

### 5. `dashboard-v2-seo-strength-internal-links.tsx`
Internal link health from topical map data.

**Props:**
```typescript
{
  totalPages: number;
  linkedPages: number;
  orphanPages: number;
  avgInternalLinks: number;
  pillarCoverage: number;  // % of clusters with pillar page
}
```

**UI:**
- Stats grid: Tổng trang, Có liên kết nội bộ, Trang mồ côi, Liên kết nội bộ TB
- Pillar coverage bar: "{X}% cụm có trang trụ cột"
- Warning if orphanPages > 0: "⚠ {N} trang chưa có liên kết nội bộ"

## Acceptance Criteria
- [ ] All 4 sub-components render with real data
- [ ] Donut chart renders correctly for backlink profile
- [ ] Cluster bars clickable → navigate to /topical-map
- [ ] Audit scores show all 6 categories
- [ ] Internal link stats derived from topical map data
- [ ] Project filter updates all sub-components
- [ ] Empty states for projects with no audit/cluster data

## Notes
- SVG charts: inline, no library. Donut = two arc paths. Bars = simple rect elements.
- Audit scores come from `audit_results` table (6 categories per project)
- Internal link data derived from `topic_cluster_pages.internal_links` (JSON array)
- Orphan pages = pages in project not assigned to any cluster (approximate)
