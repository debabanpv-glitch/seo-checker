# GĐ1 — Tách Keyword Master / History Implementation Plan

> **Cho người thực thi:** Thực hiện task-by-task. Dự án KHÔNG có test framework → verify bằng `npx tsc --noEmit`, smoke test endpoint (curl), và đếm row trong Postgres (Docker). Mỗi task xong → verify → commit.

**Goal:** Tách `keyword_rankings` (đang trộn danh-sách-từ-khóa + lịch-sử-thứ-hạng) thành 2 bảng: `keywords` (master, 1 dòng/từ khóa, có intent/volume/difficulty) + `keyword_rankings` (history, nhiều dòng), không vỡ 7 consumer.

**Architecture:** Thêm bảng `keywords` master; backfill từ distinct (project_id, keyword) hiện có; thêm `keyword_id` FK vào `keyword_rankings`; cập nhật `upsertRankingsBatch` ghi master trước rồi history; consumer đọc giữ tương thích (keyword_rankings vẫn còn cột `keyword` để không phải sửa hết ngay).

**Tech Stack:** Next.js 14, Drizzle ORM (pgTable), Postgres local (Docker `seo-manager-pg`), drizzle-kit push.

**Nguyên tắc an toàn:** Backward-compatible — giữ nguyên cột cũ trong `keyword_rankings`, chỉ THÊM. Consumer cũ vẫn chạy. Migrate dần.

---

### Task 1: Thêm schema bảng `keywords` (master)

**Files:**
- Modify: `src/lib/db/schema/seo.ts` (thêm `keywords` table, sau `keywordRankings`)

- [ ] **Step 1:** Thêm định nghĩa bảng `keywords`:

```ts
// --- keywords master table (1 dòng / từ khóa / dự án) ---
export const keywords = pgTable('keywords', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  keyword: text('keyword').notNull(),
  project_id: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  keyword_type: text('keyword_type'),          // 'cam_ket' | 'blog' | 'topic'
  search_intent: text('search_intent'),         // informational | commercial | transactional | navigational
  search_volume: integer('search_volume'),
  difficulty: integer('difficulty'),            // 0-100
  is_committed: boolean('is_committed').notNull().default(false),
  cluster_id: text('cluster_id').references(() => topicClusters.id, { onDelete: 'set null' }),
  created_at: text('created_at').notNull().default(sql`now()`),
  updated_at: text('updated_at').notNull().default(sql`now()`),
});
```
(Đảm bảo `integer`, `sql` đã import ở đầu file — nếu chưa, thêm vào import drizzle-orm/pg-core và drizzle-orm.)

- [ ] **Step 2:** Thêm `keyword_id` (nullable, backward-compat) vào `keywordRankings`:

```ts
  keyword_id: text('keyword_id').references(() => keywords.id, { onDelete: 'set null' }),
```

- [ ] **Step 3:** Verify type: `npx tsc --noEmit 2>&1 | grep "schema/seo" || echo OK`
- [ ] **Step 4:** Commit: `git add src/lib/db/schema/seo.ts && git commit -m "feat(schema): add keywords master table + keyword_id FK"`

---

### Task 2: Push schema lên Postgres local + backfill master

**Files:** (không sửa code, chạy lệnh + script SQL)

- [ ] **Step 1:** Push schema: `export $(grep ^DATABASE_URL_DIRECT .env.local | xargs) && npx drizzle-kit push --force`
- [ ] **Step 2:** Verify bảng `keywords` tồn tại: `docker exec seo-manager-pg psql -U postgres -d seomanager -c "\d keywords"`
- [ ] **Step 3:** Backfill master từ distinct keyword hiện có (giữ keyword_type/is_tracked mới nhất):

```sql
INSERT INTO keywords (id, keyword, project_id, keyword_type, is_committed, cluster_id, created_at, updated_at)
SELECT gen_random_uuid()::text, kr.keyword, kr.project_id,
       MAX(kr.keyword_type), bool_or(kr.is_tracked), MAX(kr.cluster_id), now()::text, now()::text
FROM keyword_rankings kr
GROUP BY kr.keyword, kr.project_id;
```
Chạy qua: `docker exec -i seo-manager-pg psql -U postgres -d seomanager`

- [ ] **Step 4:** Backfill `keyword_id` vào keyword_rankings:

```sql
UPDATE keyword_rankings kr SET keyword_id = k.id
FROM keywords k
WHERE k.keyword = kr.keyword AND k.project_id IS NOT DISTINCT FROM kr.project_id;
```

- [ ] **Step 5:** Verify: số keywords master ≤ số keyword_rankings, và mọi ranking có keyword_id:
```sql
SELECT (SELECT count(*) FROM keywords) AS master,
       (SELECT count(*) FROM keyword_rankings) AS history,
       (SELECT count(*) FROM keyword_rankings WHERE keyword_id IS NULL) AS missing;
```
Expected: `missing = 0`.

- [ ] **Step 6:** Commit: (migration là DB-state, ghi chú vào plan — không có file migration vì dùng push). Tạo file ghi chú `plans/260606-1615-tach-keyword-master-history/migration.sql` chứa 2 câu backfill để tái lập.

---

### Task 3: Cập nhật `upsertRankingsBatch` — ghi master trước, history sau

**Files:**
- Modify: `src/lib/services/keyword.service.ts:63` (hàm `upsertRankingsBatch`)

- [ ] **Step 1:** Đọc hàm hiện tại để biết shape input. Sửa: với mỗi row, upsert vào `keywords` (theo project_id+keyword) lấy id, rồi insert keyword_rankings kèm `keyword_id`. Dùng `onConflictDoUpdate` hoặc select-then-insert.
- [ ] **Step 2:** Đảm bảo backward-compat: vẫn ghi cột `keyword` cũ trong keyword_rankings.
- [ ] **Step 3:** Verify type: `npx tsc --noEmit 2>&1 | grep keyword.service || echo OK`
- [ ] **Step 4:** Smoke test sync keyword: `curl -s -X POST http://localhost:3000/api/v1/keyword-rankings/sync-all -w "\nHTTP %{http_code}\n"` (cần server chạy). Expected: 200, không lỗi.
- [ ] **Step 5:** Verify master tăng đúng (không tạo trùng): chạy lại Step 5 Task 2, master không nhân đôi.
- [ ] **Step 6:** Commit.

---

### Task 4: Thêm hàm đọc/ghi master (intent/volume/difficulty)

**Files:**
- Modify: `src/lib/services/keyword.service.ts` (thêm `getKeywordsMaster`, `updateKeywordMeta`)
- Modify: `src/app/api/v1/keyword-rankings/route.ts` hoặc tạo route `keywords` mới (CRUD master)

- [ ] **Step 1:** Thêm `getKeywordsMaster(projectId?)` trả master + đếm ranking gần nhất.
- [ ] **Step 2:** Thêm `updateKeywordMeta(id, {search_intent, search_volume, difficulty, keyword_type, is_committed, cluster_id})`.
- [ ] **Step 3:** Verify type + smoke test GET.
- [ ] **Step 4:** Commit.

---

### Task 5: Cập nhật `toggleTracked` → `is_committed` ở master

**Files:**
- Modify: `src/lib/services/keyword.service.ts:404` (`toggleTracked`)

- [ ] **Step 1:** `toggleTracked` cập nhật `keywords.is_committed` (master) thay vì `keyword_rankings.is_tracked` rải rác. Giữ đồng bộ `is_tracked` cũ nếu UI còn đọc.
- [ ] **Step 2:** Verify type + test toggle.
- [ ] **Step 3:** Commit.

---

### Task 6: Verify toàn bộ 7 consumer không vỡ

**Files:** (chỉ verify, sửa nếu lỗi)
- dashboard.service.ts, keyword-insights-aggregator.service.ts, unified-dashboard-aggregator.service.ts, topic-clusters-crud.service.ts, growth-report/route.ts, all-pages/seo-keywords/route.ts

- [ ] **Step 1:** `npx tsc --noEmit` toàn dự án → 0 lỗi mới.
- [ ] **Step 2:** Restart dev server, smoke test các endpoint:
```bash
P=b324ac3a-6478-4a10-ac1c-13e8d6292ad0
for ep in "dashboard/unified-summary" "keyword-rankings/analysis?projectId=$P" "keyword-insights?projectId=$P" "dashboard/growth-report?projectId=$P" "all-pages/seo-keywords?projectId=$P"; do
  curl -s -o /dev/null -w "$ep → %{http_code}\n" -m 30 "http://localhost:3000/api/v1/$ep"
done
```
Expected: tất cả 200.
- [ ] **Step 3:** Mở dashboard (preview), xác nhận số keyword KPI không đổi bất thường.
- [ ] **Step 4:** Commit cuối: `git commit -m "refactor(keyword): split master/history complete + verify consumers"`

---

## Định nghĩa hoàn thành (DoD)
- Bảng `keywords` master tồn tại, backfill đủ, mọi ranking có `keyword_id` (missing=0).
- `upsertRankingsBatch` ghi master + history, không tạo trùng master khi sync lại.
- 7 consumer + dashboard trả 200, số liệu KPI keyword không lệch.
- `npx tsc --noEmit` sạch.

## Câu hỏi mở
1. Nguồn `search_volume`/`difficulty` lấy từ đâu (ReviewWeb.site API / nhập tay / Sheet)? — Task 4 để trống field, điền sau khi có nguồn.
2. UI quản lý keyword master (gán intent/cluster) — làm ở GĐ riêng hay tích hợp trang keyword-ranking hiện có?
