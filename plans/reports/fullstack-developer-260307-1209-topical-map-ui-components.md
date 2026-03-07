# Phase Implementation Report

## Executed Phase
- Phase: UI components — Topical Map page
- Plan: none (direct task)
- Status: completed

## Files Modified

### Created (7 files, 1349 lines total)
- `src/app/(dashboard)/topical-map/page.tsx` — 1 line, re-export
- `src/app/(dashboard)/topical-map/topical-map-main-two-column-layout-with-cluster-sidebar.tsx` — 115 lines
- `src/app/(dashboard)/topical-map/topical-map-cluster-list-with-project-filter-and-create-form.tsx` — 179 lines
- `src/app/(dashboard)/topical-map/topical-map-cluster-detail-with-tabs-keywords-pages-overlap.tsx` — 301 lines
- `src/app/(dashboard)/topical-map/topical-map-keyword-assign-table-with-gsc-stats-and-modal.tsx` — 280 lines
- `src/app/(dashboard)/topical-map/topical-map-internal-links-table-with-pillar-status-and-warnings.tsx` — 331 lines
- `src/app/(dashboard)/topical-map/topical-map-overlap-check-cannibalization-warnings.tsx` — 142 lines

### Modified (1 file)
- `src/modules/registry.ts` — thêm `topical-map` entry (order 10, group core, icon Network)

## Tasks Completed
- [x] `page.tsx` re-export
- [x] Main orchestrator 2-column layout (sidebar + detail)
- [x] Cluster list: project dropdown, inline create form, card list với highlight selected
- [x] Cluster detail: inline edit name/pillar URL, delete, 3 tabs
- [x] Keyword assign: stats bar (total/avgPos/top10/clicks), table với position change indicator, modal multi-select unassigned keywords
- [x] Internal links: warning banners, add/edit inline/delete, role badges (pillar/supporting/related), link status checkmarks
- [x] Overlap check: cannibalization warnings hoặc green "không trùng lặp"
- [x] Registry: Topical Map xuất hiện trong sidebar

## Tests Status
- Type check: pass (0 errors trong topical-map files)
- Pre-existing errors: 9 lỗi ở gsc/dashboard/telegram — không liên quan, tồn tại trước

## API Endpoints Expected
Các component gọi các API sau (cần được implement bởi backend phase):
- `GET /api/v1/topic-clusters?projectId=xxx` — danh sách clusters
- `GET /api/v1/topic-clusters?id=xxx` — detail 1 cluster
- `GET /api/v1/topic-clusters?id=xxx&stats=true` — keywords + pages
- `GET /api/v1/topic-clusters?id=xxx&overlap=true` — cannibalization
- `POST /api/v1/topic-clusters` — tạo cluster
- `PUT /api/v1/topic-clusters` — update cluster (name, pillar_url)
- `DELETE /api/v1/topic-clusters?id=xxx` — xóa cluster
- `GET /api/v1/topic-clusters/keywords?projectId=xxx&unassigned=true` — KW chưa gán
- `POST /api/v1/topic-clusters/keywords` — gán keywords vào cluster
- `DELETE /api/v1/topic-clusters/keywords?cluster_id=xxx&keyword_id=xxx` — bỏ gán
- `POST /api/v1/topic-clusters/pages` — thêm page
- `PUT /api/v1/topic-clusters/pages` — sửa page
- `DELETE /api/v1/topic-clusters/pages?id=xxx` — xóa page

## Issues Encountered
- Không có conflict file ownership
- Pre-existing TS errors (9) trong gsc/dashboard/telegram — không phải do phase này gây ra

## Next Steps
- Backend cần implement API routes trên để UI hoạt động
- Test thực tế trên browser sau khi API sẵn sàng
