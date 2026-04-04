# Phase Implementation Report

## Executed Phase
- Phase: topical-map-4-advanced-features
- Plan: none (direct task)
- Status: completed

## Files Modified

### New files created
- `src/app/api/v1/topic-clusters/cross-links/route.ts` — GET/POST/DELETE cross-cluster links API
- `src/app/(dashboard)/topical-map/topical-map-evaluation-tab-completeness-anchor-crosslinks-cannibalization.tsx` — Full evaluation tab: score ring, anchor table, semantic bridge, cannibalization
- `src/app/(dashboard)/topical-map/topical-map-internal-links-table-with-pillar-status-anchor-text-and-warnings.tsx` — Internal links table with 2 new inline-editable anchor columns

### Modified files
- `src/lib/services/topic-clusters-crud.service.ts` — Added 5 functions (13–17), updated interfaces
- `src/app/api/v1/topic-clusters/route.ts` — PUT accepts target counts, GET stats includes completeness
- `src/app/(dashboard)/topical-map/topical-map-cluster-detail-with-tabs-keywords-pages-overlap.tsx` — Wired new components, updated PageRow interface

## Tasks Completed

- [x] Service: import `crossClusterLinks` from schema
- [x] Service: update `ClusterPage` interface — added `anchor_to_pillar`, `anchor_from_pillar`
- [x] Service: update `ClusterStats` interface — added `completenessScore`, `targetKeywordCount`, `targetPageCount`
- [x] Service: added `CrossClusterLink` + `ClusterCompleteness` interfaces
- [x] Service fn 13: `getCrossClusterLinks(clusterId)` — outgoing + incoming with cluster names
- [x] Service fn 14: `addCrossClusterLink(data)` — insert into cross_cluster_links
- [x] Service fn 15: `removeCrossClusterLink(id)` — delete by id
- [x] Service fn 16: `getClusterCompleteness(id)` — weighted score, breakdown, overlap penalty
- [x] Service fn 17: `updateClusterTargets(id, data)` — update target_keyword_count + target_page_count
- [x] Service: `getClusterStats` updated to include completeness fields
- [x] API: cross-links route GET/POST/DELETE
- [x] API: topic-clusters PUT accepts `target_keyword_count`, `target_page_count`
- [x] API: topic-clusters GET stats includes full `completeness` object
- [x] UI: evaluation tab — Section 1 ScoreRing + breakdown bars + editable targets
- [x] UI: evaluation tab — Section 2 anchor text distribution table with inline edit
- [x] UI: evaluation tab — Section 3 cross-cluster links (semantic bridge) table + add form
- [x] UI: evaluation tab — Section 4 cannibalization (moved from old component)
- [x] UI: internal links table — 2 new columns `anchor_to_pillar`, `anchor_from_pillar` (AnchorCell inline edit)
- [x] Cluster detail: wired `TopicalMapEvaluationTab` replacing old `TopicalMapOverlapCheck`
- [x] Cluster detail: `PageRow` updated with anchor fields, mapped from API response

## Tests Status
- Type check: pass (0 errors in new/modified files)
- Pre-existing errors: 11 (gsc, dashboard, telegram — unrelated)
- Unit tests: not applicable (no test suite configured)

## Issues Encountered
- `isNull` import removed (was unused after refactor) — fixed by removing from import
- `cn` import accidentally removed from cluster-detail — caught and restored
- PUT handler for topic-clusters simplified to avoid dynamic import anti-pattern

## Next Steps
- Old file `topical-map-overlap-check-cannibalization-warnings.tsx` and `topical-map-internal-links-table-with-pillar-status-and-warnings.tsx` still exist — can be removed once confirmed unused
- Verify `cross_cluster_links` table exists in live DB (schema already defined in schema file)
