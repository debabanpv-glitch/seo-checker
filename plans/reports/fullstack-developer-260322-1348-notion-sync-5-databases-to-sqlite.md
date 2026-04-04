# Notion Sync — 5 Databases to SQLite

**Date:** 2026-03-22
**Status:** completed (partial — 2 databases empty)

---

## Summary

Đồng bộ dữ liệu từ 5 Notion databases vào SQLite qua `POST /api/v1/notion-sync`.

## Records Synced

| Table | Records | Status |
|---|---|---|
| notion_tasks | 29 | inserted |
| notion_content | 20 | inserted |
| notion_keywords | 13 | inserted |
| notion_backlinks | 0 | empty (no data in Notion) |
| notion_competitors | 0 | empty (no data in Notion) |
| **Total** | **62** | |

## Databases

| Database | Collection URL | Result |
|---|---|---|
| Task Tracker | ec25aebb-422a-4fcf-a51f-a826778fd699 | 29 tasks synced |
| Content & Onpage | 93bf330b-62f2-485b-af8c-714b92333c24 | 20 records synced |
| Keyword Research | ebc680c8-0591-4d21-8c40-a2165269b62e | 13 keywords synced |
| Backlink Tracker | e0229e8b-972a-4799-b335-781cb5aa27d7 | 0 — database empty |
| Competitor Analysis | 05bc04f4-c5e2-465c-8ea8-e4864de90aef | 0 — database empty |

## Task Tracker (29 tasks)

- SAMCO Tech: 25 tasks (TASK-11 đến TASK-32) — Onpage, Content, Technical Audit, Backlink, Report
- Du Lịch Bình Minh: 4 tasks (TASK-3, 4, 6, 7, 8, 9, 10) — Onpage, Content, Keyword Research, Competitor Analysis

Projects mapped:
- SAMCO Tech → samco
- Du Lịch Bình Minh → dulichbinhminh
- (Mạng Thành Công — không có tasks)

## Content & Onpage (20 records)

- SAMCO Tech: 12 records (phase runs, page audits)
- Du Lịch Bình Minh: 8 records (tour landing pages)

## Keywords (13 records)

- Tất cả từ SAMCO Tech
- Bao gồm: ống lồng (418 vol), máy in di động (556 vol), PT-P900W (172 vol), etc.

## Backlink & Competitor Databases

Search với nhiều queries khác nhau đều trả về 0 kết quả:
- Queries thử: "backlink", "link", "SAMCO", "Mạng Thành Công", "Du Lịch Bình Minh", "samco tcnet"
- Kết luận: databases này chưa có dữ liệu trong Notion

## API Used

`POST /api/v1/notion-sync` với body `{ "table": "...", "data": [...] }`

Tables hợp lệ: `tasks`, `content`, `backlinks`, `keywords`, `competitors`

---

## Unresolved Questions

- Backlink Tracker và Competitor Analysis databases trong Notion có thực sự trống hay do Notion MCP search không index được các entries mới?
- Có thể cần thêm data vào Notion trước khi sync lần sau.
