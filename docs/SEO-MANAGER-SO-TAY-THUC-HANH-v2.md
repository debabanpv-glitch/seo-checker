# SEO MANAGER — SỔ TAY THỰC HÀNH TỪNG BƯỚC
# "Mở lên, bấm đâu, gõ gì, kết quả ra sao"

> Version: 2.0 — 21/02/2026
> Dành cho: Puchin — SEO Manager quản lý 3 dự án
> App: http://localhost:3001
> Claude Code: cd ~/Developer/seo-manager-local && claude

---

# PHẦN 0: KHỞI ĐỘNG MỖI NGÀY

```bash
# Bước 1: Mở Terminal, chạy app
cd ~/Developer/seo-manager-local
npm run dev
# → Thấy "Ready in xxxms" là OK
# → Mở browser: http://localhost:3001

# Bước 2: Mở Terminal MỚI (Cmd+T), chạy Claude Code
cd ~/Developer/seo-manager-local
claude
# → Thấy logo Claude Code là OK
# → Gõ lệnh vào đây
```

**Tắt cuối ngày:**
- Terminal app: `Ctrl+C`
- Claude Code: gõ `/exit`

---

# ═══════════════════════════════════════════
# PHẦN 1: DASHBOARD (Tổng quan)
# ═══════════════════════════════════════════

## Mở: http://localhost:3001

## Hiện gì:
- 3 cards cho 3 dự án (Samco, TCNET, DLBM)
- Mỗi card: SEO Health Score, Content Progress, Issues Count
- Phần dưới: Tasks deadline tuần này, Keywords rớt hạng, Actions pending

## Không cần gõ gì — data tự tổng hợp từ DB

## Khi nào cần update Dashboard:
→ Sau khi sync Google Sheets (content mới)
→ Sau khi import Screaming Frog (audit mới)
→ Sau khi pull GSC data (ranking mới)
→ Reload browser (F5) là thấy data mới

---

# ═══════════════════════════════════════════
# PHẦN 2: KEYWORDS (Nghiên cứu từ khóa)
# ═══════════════════════════════════════════

## Mở: http://localhost:3001/keywords

## Mục này làm gì:
- Xem danh sách TẤT CẢ keywords đang theo dõi
- Xem ranking hiện tại, search volume, thay đổi vị trí
- Filter theo dự án, theo nhóm keyword

---

### KỊCH BẢN 2.1: Research keywords MỚI cho 1 dự án

**Bước 1:** Mở Claude Code, gõ:
```
Research 50 keywords tiềm năng cho samcotech.com.vn (ngành máy in nhãn Brother).
Chia thành nhóm:
- Thương hiệu: "máy in nhãn brother", "brother pt-e110"...
- Sản phẩm: "máy in nhãn cầm tay", "máy in tem nhãn mã vạch"...
- Hướng dẫn: "cách in nhãn", "cách thay ribbon brother"...
- So sánh: "máy in nhãn brother vs dymo", "máy in nhãn nào tốt"...

Với mỗi keyword cho: search volume ước tính, keyword difficulty, intent (informational/commercial/transactional).
Lưu vào DB qua POST http://localhost:3001/api/v1/keyword-rankings/bulk
Log hoạt động qua POST http://localhost:3001/api/v1/claude/log
```

**Bước 2:** Chờ Claude Code chạy (2-5 phút)

**Bước 3:** Mở browser → http://localhost:3001/keywords → Filter "Samco Tech"
→ Thấy 50 keywords mới với volume, difficulty, intent

---

### KỊCH BẢN 2.2: Check ranking keywords hiện tại

**Bước 1:** Claude Code:
```
Dùng GSC MCP pull ranking data 30 ngày cho samcotech.com.vn.
Top 50 queries theo clicks.
Update vào DB: POST http://localhost:3001/api/v1/keyword-rankings/bulk
So sánh với data cũ trong DB, highlight keywords thay đổi > 5 vị trí.
```

**Bước 2:** Xem → http://localhost:3001/keywords
→ Cột "THAY ĐỔI" hiện xanh (lên) hoặc đỏ (xuống)

---

### KỊCH BẢN 2.3: Tìm keyword cơ hội (đang gần top 10)

**Bước 1:** Claude Code:
```
Từ GSC data mangthanhcong.vn 30 ngày:
Tìm keywords có position 5-15 VÀ impressions > 100/tháng.
Đây là keywords gần top → cơ hội optimize lên top 5.
Với mỗi keyword: suggest cách optimize (improve title, add content, internal link).
Lưu kết quả vào Notes tags: opportunity, tcnet
Tạo tasks tương ứng trong DB.
```

**Bước 2:** Xem cơ hội → http://localhost:3001/notes → filter tag "opportunity"
**Bước 3:** Xem tasks → http://localhost:3001/tasks → filter "On-page"

---

### KỊCH BẢN 2.4: Phân tích keyword đối thủ

**Bước 1:** Claude Code:
```
So sánh keywords giữa samcotech.com.vn và brother.com.vn:
1. Keywords mà đối thủ rank top 10 nhưng mình chưa có content → Content Gap
2. Keywords mà cả 2 cùng rank → Head-to-head competition
3. Keywords mà mình rank nhưng đối thủ không → Advantage

Lưu vào Notes tags: competitor, samco, keyword-gap
```

**Bước 2:** Xem → http://localhost:3001/notes → filter "competitor"

---

# ═══════════════════════════════════════════
# PHẦN 3: SEO AUDIT (Kiểm tra sức khỏe web)
# ═══════════════════════════════════════════

## Mở: http://localhost:3001/seo-audit

## Mục này làm gì:
- Xem điểm SEO tổng /100
- Xem issues theo category: Technical, Content, Links, E-E-A-T
- So sánh audit lần trước vs lần này

---

### KỊCH BẢN 3.1: Audit toàn diện 1 website bằng Claude Code

**Bước 1:** Claude Code:
```
Audit SEO toàn diện cho mangthanhcong.vn. Kiểm tra:

TECHNICAL:
- Status codes (200, 301, 404, 500)
- Page speed / Core Web Vitals
- Mobile-friendly, Security headers
- XML Sitemap, Robots.txt, Canonical, Hreflang

CONTENT:
- Meta title/description (thiếu, trùng, quá dài/ngắn)
- H1 tags, Thin content, Duplicate, Keyword stuffing

LINKS:
- Internal links/trang, Orphan pages, Broken links, Redirect chains

E-E-A-T:
- Author info, About/Contact, Schema markup

Cho điểm /100.
Lưu: POST http://localhost:3001/api/v1/seo-results
Log: POST http://localhost:3001/api/v1/claude/log
```

**Bước 2:** Chờ 5-10 phút
**Bước 3:** Mở → http://localhost:3001/seo-audit → Chọn TCNET

---

### KỊCH BẢN 3.2: Import data từ Screaming Frog

**Bước 1:** SF đã scan (data ở /Users/puchinpham/Developer/SEO/)
**Bước 2:** Mở → http://localhost:3001/audit-import
**Bước 3:** Chọn dự án → Chọn lần crawl → "Import"
**Bước 4:** Xem → http://localhost:3001/seo-audit

---

### KỊCH BẢN 3.3: Audit nhanh 1 URL

**Claude Code:**
```
Audit chi tiết URL: https://mangthanhcong.vn/cap-quang-single-mode
Check: title, meta, H1-H6, word count, links, images, schema, speed.
Cho điểm /100 và list 5 việc cần làm ngay.
```

---

### KỊCH BẢN 3.4: Sau audit → tự tạo tasks fix

**Claude Code:**
```
Đọc audit mới nhất mangthanhcong.vn. Tạo tasks cho TẤT CẢ issues:
- Critical → priority high, deadline 7 ngày
- Major → priority high, deadline 14 ngày
- Minor → priority medium, deadline 30 ngày
POST /api/v1/tasks cho từng task.
```
→ Xem: http://localhost:3001/tasks → filter "technical"

---

# ═══════════════════════════════════════════
# PHẦN 4: TASKS (Kế hoạch công việc)
# ═══════════════════════════════════════════

## Mở: http://localhost:3001/tasks

## Mục này làm gì:
- Xem TẤT CẢ công việc SEO (không chỉ content)
- Filter theo: tuần/tháng, dự án, category, PIC, priority

### Các loại task:
| Category | Ví dụ |
|----------|-------|
| Content | Viết bài, outline, publish (sync từ Google Sheets) |
| Technical | Fix 404, speed, schema (tạo thủ công/Claude Code) |
| Link Building | Guest post, outreach |
| On-page | Optimize title, meta, heading |
| Audit | Chạy SF, check index |

---

### KỊCH BẢN 4.1: Tạo task Technical SEO

**Claude Code:**
```
Tạo task: Fix 39 lỗi 404 trên mangthanhcong.vn
Category: technical, Priority: high, Project: TCNET
Deadline: 7/3/2026, Assigned: Puchin
POST /api/v1/tasks
```

### KỊCH BẢN 4.2: Tạo task Link Building

**Claude Code:**
```
Tạo 5 tasks link building cho Samco Tech tháng 3:
1. Guest post congnghe.vn - deadline 7/3
2. Guest post thongtincoban.vn - deadline 14/3
3. Bài PR báo điện tử - deadline 21/3
4. 20 local citations - deadline 28/3
5. Liên hệ 10 blogger review - deadline 31/3
Category: linkbuilding, priority: medium, project: Samco
POST /api/v1/tasks
```

### KỊCH BẢN 4.3: Review tasks cuối tuần

**Claude Code:**
```
Tổng kết tasks tuần này: bao nhiêu xong, overdue, chuyển tuần sau.
Update status done cho tasks đã hoàn thành.
```

---

# ═══════════════════════════════════════════
# PHẦN 5: CHIẾN LƯỢC (Kế hoạch SEO dài hạn)
# ═══════════════════════════════════════════

## Mở: http://localhost:3001/strategy

## Mục này làm gì:
- Xem kế hoạch theo PHASES (giai đoạn) → ACTIONS (việc cần làm)
- Timeline, status: planning → in-progress → done

---

### KỊCH BẢN 5.1: Tạo chiến lược 6 tháng

**Claude Code:**
```
Tạo chiến lược SEO 6 tháng cho Samco Tech:

Phase 1: Foundation Fix (T3-T4/2026)
- Fix 404, page speed, schema, canonical, sitemap, security headers

Phase 2: Content Cluster (T5-T6/2026)
- 5 pillar pages, 50 bài cluster, internal link, FAQ schema

Phase 3: Authority Build (T7-T8/2026)
- Guest post 10/tháng, Local SEO, Digital PR, Social signals

Lưu: POST /api/v1/strategy/phases và /actions
```
→ Xem: http://localhost:3001/strategy → Samco Tech

### KỊCH BẢN 5.2: Review chiến lược hàng tháng

**Claude Code:**
```
Review chiến lược Samco Tech T2/2026:
- Actions nào xong? Delay? Cần điều chỉnh?
- Update status, ghi summary vào Notes
```

---

# ═══════════════════════════════════════════
# PHẦN 6: SEARCH CONSOLE
# ═══════════════════════════════════════════

## Mở: http://localhost:3001/gsc

### KỊCH BẢN 6.1: Pull data GSC hàng tuần

**Claude Code:**
```
Pull GSC data 7 ngày cho mangthanhcong.vn:
Top 100 queries, top 50 pages, device breakdown.
Lưu: POST /api/v1/gsc/snapshot
```

### KỊCH BẢN 6.2: Tìm keyword cơ hội

**Claude Code:**
```
Phân tích GSC mangthanhcong.vn 30 ngày:
1. Low-hanging fruit: Position 5-15, Impressions > 100
2. CTR problem: Position < 10, CTR < 2%
3. Rising stars: Impressions tăng > 50%
Tạo tasks cho top 10 cơ hội.
```

---

# ═══════════════════════════════════════════
# PHẦN 7: CLAUDE LOG (Nhật ký AI)
# ═══════════════════════════════════════════

## Mở: http://localhost:3001/claude-log

## Data TỰ ĐỘNG vào khi chạy Claude Code:
| Bạn gõ | Claude Log ghi |
|--------|----------------|
| `/mkt:seo:keywords "..."` | Keyword Research |
| `/mkt:seo:audit` | SEO Audit |
| `/mkt:content:good "..."` | Content Draft |
| `/mkt:scout "..."` | Phân tích |
| Fix technical | Technical Fix |

## Ghi thủ công (terminal mới):
```bash
curl -X POST http://localhost:3001/api/v1/claude/log \
  -H "Content-Type: application/json" \
  -d '{"title":"Mô tả","activity_type":"keyword_research","result_summary":"Kết quả","source":"claude-code"}'
```

**activity_type:** keyword_research, content_draft, seo_audit, competitor_analysis, technical_fix, link_building, general

---

# ═══════════════════════════════════════════
# PHẦN 8: NOTES (Ghi chú)
# ═══════════════════════════════════════════

## Mở: http://localhost:3001/notes

### KỊCH BẢN: Ghi chú meeting

**Claude Code:**
```
Ghi meeting SEO 21/02: Samco fix technical T3, TCNET focus content cluster, DLBM local SEO.
Lưu Notes tags: meeting, planning, Q1-2026
```

### KỊCH BẢN: Research trends

**Claude Code:**
```
Research xu hướng SEO 2026: AI Search, E-E-A-T, Core Web Vitals, Video SEO.
Cách áp dụng cho 3 dự án.
Lưu Notes tags: seo-trends, 2026
```

---

# ═══════════════════════════════════════════
# PHẦN 9: BÁO CÁO
# ═══════════════════════════════════════════

## Mở: http://localhost:3001/reports

### Tạo báo cáo tháng:

**Claude Code:**
```
Tạo báo cáo SEO tháng 2/2026 cho 3 dự án:
Mỗi dự án: content progress, ranking changes, technical issues, strategy status.
Lưu: POST /api/v1/reports
```
→ Xem: http://localhost:3001/reports

---

# ═══════════════════════════════════════════
# PHẦN 10: SETTINGS
# ═══════════════════════════════════════════

## Mở: http://localhost:3001/settings

### Tab Dự án: Thêm/sửa project, Sheet ID, nút "Sync ngay"
### Tab Thành viên: CRUD members, salary rate
### Tab Cấu hình: SF path, monthly target

---

# ═══════════════════════════════════════════
# PROMPT HAY DÙNG — COPY & PASTE VÀO CLAUDE CODE
# ═══════════════════════════════════════════

## HÀNG NGÀY:
```
Tóm tắt tasks hôm nay cần làm, across all projects, sort by priority.
```

## HÀNG TUẦN:
```
Tổng kết tuần: tasks completed, overdue, ranking changes, next week priorities.
```

## HÀNG THÁNG:
```
Tạo báo cáo SEO tháng [X]/2026 cho 3 dự án.
```

## RESEARCH:
```
/mkt:seo:keywords "[keyword chính] [domain]"
/mkt:scout "phân tích đối thủ [domain1] vs [domain2]"
```

## AUDIT:
```
Audit toàn diện [domain]. Lưu DB + tạo tasks cho issues.
```

## CONTENT:
```
/mkt:content:good "viết outline [topic] cho [project]"
/mkt:brainstorm "10 ý tưởng bài viết cho [project] tháng [X]"
```

## CHIẾN LƯỢC:
```
/mkt:plan "chiến lược SEO [project] Q[X] 2026"
```

## FIX ISSUES:
```
Đọc audit [project], tạo tasks fix cho tất cả critical + high issues.
```

---

# BACKUP DỮ LIỆU
```bash
cp ~/Developer/seo-manager-local/data/seo-manager.db ~/Developer/seo-manager-local/data/backups/seo-manager-$(date +%Y%m%d).db
```