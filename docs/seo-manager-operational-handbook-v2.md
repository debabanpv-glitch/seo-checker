# SEO MANAGER — SO TAY THUC HANH TUNG BUOC
# "Mo len, bam dau, go gi, ket qua ra sao"

> Version: 2.0 — 21/02/2026
> Danh cho: Puchin — SEO Manager quan ly 3 du an
> App: http://localhost:3001
> Claude Code: cd ~/Developer/seo-manager-local && claude

---

# PHAN 0: KHOI DONG MOI NGAY

```bash
# Buoc 1: Mo Terminal, chay app
cd ~/Developer/seo-manager-local
npm run dev
# → Thay "Ready in xxxms" la OK
# → Mo browser: http://localhost:3001

# Buoc 2: Mo Terminal MOI (Cmd+T), chay Claude Code
cd ~/Developer/seo-manager-local
claude
# → Thay logo Claude Code la OK
# → Go lenh vao day
```

**Tat cuoi ngay:**
- Terminal app: `Ctrl+C`
- Claude Code: go `/exit`

---

# ═══════════════════════════════════════════
# PHAN 1: DASHBOARD (Tong quan)
# ═══════════════════════════════════════════

## Mo: http://localhost:3001

## Hien gi:
- 3 cards cho 3 du an (Samco, TCNET, DLBM)
- Moi card: SEO Health Score, Content Progress, Issues Count
- Phan duoi: Tasks deadline tuan nay, Keywords rot hang, Actions pending

## Khong can go gi — data tu tong hop tu DB

## Khi nao can update Dashboard:
→ Sau khi sync Google Sheets (content moi)
→ Sau khi import Screaming Frog (audit moi)
→ Sau khi pull GSC data (ranking moi)
→ Reload browser (F5) la thay data moi

---

# ═══════════════════════════════════════════
# PHAN 2: KEYWORDS (Nghien cuu tu khoa)
# ═══════════════════════════════════════════

## Mo: http://localhost:3001/keywords

## Muc nay lam gi:
- Xem danh sach TAT CA keywords dang theo doi
- Xem ranking hien tai, search volume, thay doi vi tri
- Filter theo du an, theo nhom keyword

---

### KICH BAN 2.1: Research keywords MOI cho 1 du an

**Buoc 1:** Mo Claude Code, go:
```
Research 50 keywords tiem nang cho samcotech.com.vn (nganh may in nhan Brother).
Chia thanh nhom:
- Thuong hieu: "may in nhan brother", "brother pt-e110"...
- San pham: "may in nhan cam tay", "may in tem nhan ma vach"...
- Huong dan: "cach in nhan", "cach thay ribbon brother"...
- So sanh: "may in nhan brother vs dymo", "may in nhan nao tot"...

Voi moi keyword cho: search volume uoc tinh, keyword difficulty, intent (informational/commercial/transactional).
Luu vao DB qua POST http://localhost:3001/api/v1/keyword-rankings/bulk
Log hoat dong qua POST http://localhost:3001/api/v1/claude/log
```

**Buoc 2:** Cho Claude Code chay (2-5 phut)

**Buoc 3:** Mo browser → http://localhost:3001/keywords → Filter "Samco Tech"
→ Thay 50 keywords moi voi volume, difficulty, intent

---

### KICH BAN 2.2: Check ranking keywords hien tai

**Buoc 1:** Claude Code:
```
Dung GSC MCP pull ranking data 30 ngay cho samcotech.com.vn.
Top 50 queries theo clicks.
Update vao DB: POST http://localhost:3001/api/v1/keyword-rankings/bulk
So sanh voi data cu trong DB, highlight keywords thay doi > 5 vi tri.
```

**Buoc 2:** Xem → http://localhost:3001/keywords
→ Cot "THAY DOI" hien xanh (len) hoac do (xuong)

---

### KICH BAN 2.3: Tim keyword co hoi (dang gan top 10)

**Buoc 1:** Claude Code:
```
Tu GSC data mangthanhcong.vn 30 ngay:
Tim keywords co position 5-15 VA impressions > 100/thang.
Day la keywords gan top → co hoi optimize len top 5.
Voi moi keyword: suggest cach optimize (improve title, add content, internal link).
Luu ket qua vao Notes tags: opportunity, tcnet
Tao tasks tuong ung trong DB.
```

**Buoc 2:** Xem co hoi → http://localhost:3001/notes → filter tag "opportunity"
**Buoc 3:** Xem tasks → http://localhost:3001/tasks → filter "On-page"

---

### KICH BAN 2.4: Phan tich keyword doi thu

**Buoc 1:** Claude Code:
```
So sanh keywords giua samcotech.com.vn va brother.com.vn:
1. Keywords ma doi thu rank top 10 nhung minh chua co content → Content Gap
2. Keywords ma ca 2 cung rank → Head-to-head competition
3. Keywords ma minh rank nhung doi thu khong → Advantage

Luu vao Notes tags: competitor, samco, keyword-gap
```

**Buoc 2:** Xem → http://localhost:3001/notes → filter "competitor"

---

# ═══════════════════════════════════════════
# PHAN 3: SEO AUDIT (Kiem tra suc khoe web)
# ═══════════════════════════════════════════

## Mo: http://localhost:3001/seo-audit

## Muc nay lam gi:
- Xem diem SEO tong /100
- Xem issues theo category: Technical, Content, Links, E-E-A-T
- So sanh audit lan truoc vs lan nay
- Xem action plan fix issues

---

### KICH BAN 3.1: Audit toan dien 1 website bang Claude Code

**Buoc 1:** Claude Code:
```
Audit SEO toan dien cho mangthanhcong.vn. Kiem tra:

TECHNICAL:
- Status codes (200, 301, 404, 500)
- Page speed / Core Web Vitals
- Mobile-friendly
- Security headers (HTTPS, HSTS)
- XML Sitemap
- Robots.txt
- Canonical tags
- Hreflang tags

CONTENT:
- Meta title (thieu, trung, qua dai, qua ngan)
- Meta description (thieu, trung)
- H1 tags (thieu, trung, multiple)
- Thin content (< 300 tu)
- Duplicate content
- Keyword stuffing

LINKS:
- Internal links / trang
- Orphan pages (khong co link tro den)
- Broken links
- Redirect chains
- External links

E-E-A-T:
- Author info
- About page
- Contact page
- Privacy policy
- Schema markup (Organization, Article, FAQ, Product)

Cho diem /100 theo tung category.
Luu ket qua: POST http://localhost:3001/api/v1/seo-results
Log: POST http://localhost:3001/api/v1/claude/log
```

**Buoc 2:** Cho 5-10 phut

**Buoc 3:** Mo → http://localhost:3001/seo-audit → Chon TCNET
→ Thay: Score ring, issues list, category breakdown

---

### KICH BAN 3.2: Import data tu Screaming Frog

**Buoc 1:** Dam bao SF da scan xong (data o `/Users/puchinpham/Developer/SEO/`)

**Buoc 2:** Mo → http://localhost:3001/audit-import

**Buoc 3:** Chon du an: "TCNET (Mang Thanh Cong)"

**Buoc 4:** App hien danh sach lan crawl:
```
☐ 2026.02.14 — 354 files — 5,314 URLs
☐ 2026.02.07 — 354 files — 5,287 URLs
☐ 2026.01.31 — 354 files — 5,201 URLs
```

**Buoc 5:** Click "Import" lan moi nhat (14/02)

**Buoc 6:** Cho parse (1-2 phut cho 354 files)

**Buoc 7:** Xem ket qua → http://localhost:3001/seo-audit → TCNET
→ Data chi tiet: status codes, titles, meta, links, orphan pages...

---

### KICH BAN 3.3: Audit nhanh 1 URL cu the

**Buoc 1:** Claude Code:
```
Audit chi tiet 1 URL: https://mangthanhcong.vn/cap-quang-single-mode

Kiem tra:
1. Title tag: co keyword khong, bao nhieu ky tu
2. Meta description: co khong, bao nhieu ky tu
3. H1: noi dung gi, co keyword khong
4. H2-H6: cau truc heading
5. Word count
6. Internal links: bao nhieu, tro di dau
7. External links: bao nhieu
8. Images: bao nhieu, co alt khong
9. Schema markup: co loai gi
10. Page speed: bao lau
11. Mobile-friendly: co khong
12. Canonical: tro dung khong

Cho diem /100 va list 5 viec can lam ngay.
```

**Buoc 2:** Xem ket qua Claude Code tra ve ngay trong terminal
**Buoc 3:** Claude Code tu log → xem lai o http://localhost:3001/claude-log

---

### KICH BAN 3.4: Sau audit → tu tao danh sach tasks fix

**Buoc 1:** Claude Code:
```
Doc ket qua audit moi nhat cua mangthanhcong.vn tu DB.
Tao tasks cho TAT CA issues:

Rules:
- Critical issues (score impact > 10) → task priority: critical, deadline: 7 ngay
- Major issues (score impact 5-10) → task priority: high, deadline: 14 ngay
- Minor issues (score impact 1-5) → task priority: medium, deadline: 30 ngay
- Info (score impact < 1) → task priority: low, deadline: 60 ngay

Moi task ghi ro:
- Title: "Fix [issue type]: [chi tiet]"
- Category: technical/content/onpage
- Huong dan fix ngan gon trong description

Goi POST /api/v1/tasks cho tung task.
```

**Buoc 2:** Xem → http://localhost:3001/tasks → filter "technical"
→ Thay danh sach tasks da duoc tao, co priority, deadline

---

# ═══════════════════════════════════════════
# PHAN 4: TASKS (Ke hoach cong viec)
# ═══════════════════════════════════════════

## Mo: http://localhost:3001/tasks

## Muc nay lam gi:
- Xem TAT CA cong viec SEO (khong chi content)
- Filter theo: tuan/thang, du an, category, PIC, priority
- Tao task moi thu cong

---

### KICH BAN 4.1: Xem tasks tuan nay can lam

**Buoc 1:** Mo → http://localhost:3001/tasks
**Buoc 2:** Click tab "Tuan nay"
→ Hien tat ca tasks deadline tuan nay, across ALL projects
→ Sort theo priority: critical → high → medium → low

---

### KICH BAN 4.2: Tao task Technical SEO

**Tren app:**
1. Tasks → "+ Them task"
2. Dien:
   - Title: "Fix 39 loi 404 tren mangthanhcong.vn"
   - Category: Technical
   - Priority: High
   - Du an: TCNET
   - Deadline: 2026-03-07
   - Assigned: Puchin
3. Save

**Hoac Claude Code:**
```
Tao task moi:
- Title: Fix 39 loi 404 tren mangthanhcong.vn
- Category: technical
- Priority: high
- Project: TCNET
- Deadline: 7/3/2026
- Assigned: Puchin
- Description: Export list 404 tu Screaming Frog, setup redirect 301 cho tung URL

POST /api/v1/tasks
```

---

### KICH BAN 4.3: Tao task Link Building

**Claude Code:**
```
Tao 5 tasks link building cho Samco Tech thang 3:
1. Guest post tren congnghe.vn - deadline 7/3
2. Guest post tren thongtincoban.vn - deadline 14/3
3. Dang bai PR tren bao dien tu - deadline 21/3
4. Xay 20 local citations (Google Business, Yelp...) - deadline 28/3
5. Lien he 10 blogger review may in nhan - deadline 31/3

Tat ca category: linkbuilding, priority: medium, project: Samco
POST /api/v1/tasks cho tung task.
```

---

### KICH BAN 4.4: Tao task On-page Optimization

**Claude Code:**
```
Tu audit data, tao tasks on-page cho mangthanhcong.vn:
1. Optimize 15 trang thieu meta description - priority high
2. Fix 8 trang co duplicate title - priority high
3. Them H1 cho homepage - priority critical
4. Optimize 20 images thieu alt text - priority medium
5. Them FAQ schema cho 10 bai blog top traffic - priority medium

Category: onpage, project: TCNET
POST /api/v1/tasks
```

---

### KICH BAN 4.5: Review tasks cuoi tuan

**Claude Code:**
```
Tong ket tasks tuan 17-21/02/2026:
1. Bao nhieu tasks da xong?
2. Bao nhieu tasks overdue?
3. Tasks nao can chuyen sang tuan sau?
4. Update status tasks da xong thanh "done"

Fetch GET /api/v1/tasks?week=current roi phan tich.
```

---

# ═══════════════════════════════════════════
# PHAN 5: CHIEN LUOC (Ke hoach SEO dai han)
# ═══════════════════════════════════════════

## Mo: http://localhost:3001/strategy

## Muc nay lam gi:
- Xem ke hoach SEO theo PHASES (giai doan 2-3 thang)
- Moi phase co nhieu ACTIONS (viec can lam)
- Timeline: khi nao bat dau, khi nao ket thuc
- Status: planning → in-progress → done

---

### KICH BAN 5.1: Tao chien luoc SEO 6 thang cho 1 du an

**Buoc 1:** Claude Code:
```
Tao chien luoc SEO 6 thang cho Samco Tech (samcotech.com.vn).
Dua tren audit data + keyword data hien co trong DB.

Phase 1: Foundation Fix (T3-T4/2026) — Sua nen tang
- Fix tat ca 404 errors
- Optimize page speed < 3 giay
- Them schema Organization + Product
- Fix canonical issues
- Setup XML sitemap chuan
- Them security headers

Phase 2: Content Cluster (T5-T6/2026) — Xay noi dung
- Tao 5 pillar pages (5 dong san pham chinh)
- Viet 50 bai cluster (10 bai/pillar)
- Internal link cluster → pillar
- Them FAQ schema moi bai
- Optimize existing 30 bai cu

Phase 3: Authority Build (T7-T8/2026) — Xay uy tin
- Guest post 10 bai/thang
- Local SEO (Google Business, directories)
- Social signals campaign
- Digital PR 2 bai/thang
- Xay relationships voi bloggers nganh

Moi action co: title, description, priority (critical/high/medium/low), estimated hours.
Luu: POST /api/v1/strategy/phases va /actions
```

**Buoc 2:** Xem → http://localhost:3001/strategy → Chon "Samco Tech"
→ Thay 3 phases voi timeline, click mo → thay actions

---

### KICH BAN 5.2: Review chien luoc hang thang

**Claude Code:**
```
Review chien luoc Samco Tech thang 2/2026:
1. Doc tat ca phases + actions tu DB
2. Check actions nao da xong (so voi tasks completed)
3. Check actions nao bi delay
4. Dua tren audit + ranking data moi: can dieu chinh gi?
5. Update status tung action
6. Ghi summary vao Notes tags: strategy-review, samco, T2-2026

POST /api/v1/strategy/actions/[id] update status
POST /api/v1/notes ghi review
POST /api/v1/claude/log ghi hoat dong
```

---

### KICH BAN 5.3: Them action vao phase co san

**Tren app:**
1. Strategy → Click vao Phase → "+ Them Action"
2. Dien: Title, description, priority, responsible
3. Save

**Claude Code:**
```
Them 3 actions moi vao Phase 1 (Foundation) cua Samco Tech:
1. Implement lazy loading cho images - priority medium
2. Minify CSS/JS - priority medium
3. Setup CDN cho static files - priority low

POST /api/v1/strategy/actions
```

---

# ═══════════════════════════════════════════
# PHAN 6: SEARCH CONSOLE (Du lieu Google)
# ═══════════════════════════════════════════

## Mo: http://localhost:3001/gsc

## Muc nay lam gi:
- Xem data tu Google Search Console: clicks, impressions, CTR, position
- So sanh 2 giai doan
- Tim co hoi keyword

---

### KICH BAN 6.1: Pull data GSC hang tuan

**Buoc 1:** Claude Code:
```
Pull GSC data 7 ngay gan nhat cho mangthanhcong.vn:
- Top 100 queries (clicks, impressions, CTR, position)
- Top 50 pages by clicks
- Device breakdown (desktop/mobile/tablet)

Luu snapshot: POST /api/v1/gsc/snapshot
Log: POST /api/v1/claude/log
```

**Buoc 2:** Xem → http://localhost:3001/gsc → Chon TCNET

---

### KICH BAN 6.2: So sanh thang nay vs thang truoc

**Claude Code:**
```
So sanh GSC data mangthanhcong.vn:
Thang 1/2026 vs Thang 2/2026

Highlight:
1. Total clicks thay doi bao nhieu %
2. Total impressions thay doi bao nhieu %
3. Top 10 queries tang clicks nhieu nhat
4. Top 10 queries giam clicks nhieu nhat
5. Top 5 pages moi xuat hien
6. Top 5 pages mat traffic

Luu vao Notes tags: gsc-compare, tcnet, T2-2026
```

---

### KICH BAN 6.3: Tim keyword co hoi tu GSC

**Claude Code:**
```
Phan tich GSC data mangthanhcong.vn 30 ngay, tim 3 loai co hoi:

1. "Low-hanging fruit" — Position 5-15, Impressions > 100
   → Gan top roi, chi can optimize them la len
   → Suggest: cai thien title, them content, internal link

2. "CTR problem" — Position < 10, CTR < 2%
   → Da rank tot nhung it ai click
   → Suggest: viet lai title + meta description hap dan hon

3. "Rising stars" — Impressions tang > 50% so voi tuan truoc
   → Google dang test rank cho keywords nay
   → Suggest: tao them content, internal link, update bai

Moi keyword: suggest cach optimize cu the.
Tao tasks cho top 10 co hoi.
POST /api/v1/tasks, /api/v1/notes, /api/v1/claude/log
```

---

# ═══════════════════════════════════════════
# PHAN 7: CLAUDE LOG (Nhat ky AI)
# ═══════════════════════════════════════════

## Mo: http://localhost:3001/claude-log

## Muc nay lam gi:
- Xem lich su TAT CA viec Claude Code da lam
- Filter theo: loai (audit/keywords/content...) va du an
- Khong can go gi — data tu vao khi Claude Code chay tasks

## Khi nao data vao:
| Ban go trong Claude Code | Claude Log ghi |
|--------------------------|----------------|
| `/mkt:seo:keywords "..."` | Keyword Research |
| `/mkt:seo:audit` | SEO Audit |
| `/mkt:content:good "..."` | Content Draft |
| `/mkt:scout "..."` | Phan tich doi thu |
| Fix technical issues | Technical Fix |
| Bat ky task SEO nao | Chung |

## Ghi thu cong (neu can):
```bash
curl -X POST http://localhost:3001/api/v1/claude/log \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mo ta viec da lam",
    "activity_type": "keyword_research",
    "result_summary": "Ket qua tom tat",
    "source": "claude-code"
  }'
```

**activity_type options:** keyword_research, content_draft, seo_audit, competitor_analysis, technical_fix, link_building, general

---

# ═══════════════════════════════════════════
# PHAN 8: NOTES (Ghi chu)
# ═══════════════════════════════════════════

## Mo: http://localhost:3001/notes

## Muc nay lam gi:
- Luu ghi chu, nghien cuu, phan tich
- Tags de organize: competitor, strategy, meeting, keyword-gap...
- Claude Code tu luu khi phan tich

---

### KICH BAN 8.1: Ghi chu meeting SEO

**Claude Code:**
```
Ghi lai meeting SEO ngay 21/02/2026:

## Quyet dinh:
- Samco: uu tien fix technical truoc thang 3
- TCNET: focus content cluster cap quang + switch
- DLBM: tap trung local SEO Can Tho, Chau Doc

## Action items:
- Puchin: hoan thanh audit Samco truoc 28/02
- Team content: 10 bai cluster TCNET truoc 15/03
- Thue freelancer viet 5 bai DLBM

## Budget Q1:
- 50 bai/thang total (20 Samco, 20 TCNET, 10 DLBM)

Luu Notes tags: meeting, planning, Q1-2026
POST /api/v1/notes
```

---

### KICH BAN 8.2: Research SEO trend 2026

**Claude Code:**
```
Research xu huong SEO 2026 ap dung cho 3 du an:
1. AI Search Optimization (SGE, AI Overview)
2. E-E-A-T signals
3. Core Web Vitals thay doi
4. Video SEO
5. Voice Search

Voi moi trend: giai thich ngan + cach ap dung cho Samco/TCNET/DLBM.
Luu Notes tags: seo-trends, 2026, research
POST /api/v1/notes
```

---

# ═══════════════════════════════════════════
# PHAN 9: BAO CAO (Reports)
# ═══════════════════════════════════════════

## Mo: http://localhost:3001/reports

## Muc nay lam gi:
- Bao cao tong hop SEO theo thang/tuan
- Export PDF gui sep/khach hang

---

### KICH BAN 9.1: Tao bao cao thang

**Claude Code:**
```
Tao bao cao SEO thang 2/2026 cho TAT CA 3 du an:

Voi MOI du an ghi:

TONG QUAN:
- SEO Health Score: xx/100 (thay doi vs thang truoc)
- Content published: xx bai (target: xx)
- Keywords tracking: xx keywords

CONTENT:
- Bai moi publish thang nay: list
- Bai dang viet: list
- Bai tre deadline: list

RANKINGS:
- Keywords len top 10: list
- Keywords rot khoi top 10: list
- Top 5 keywords traffic cao nhat

TECHNICAL:
- Issues da fix: list
- Issues con ton: list
- Audit score thay doi

CHIEN LUOC:
- Actions da hoan thanh thang nay
- Actions ke hoach thang sau
- KPIs target thang sau

Luu: POST /api/v1/reports
```

**Xem:** http://localhost:3001/reports → Click "Thang 2/2026"

---

# ═══════════════════════════════════════════
# PHAN 10: DU AN CHI TIET
# ═══════════════════════════════════════════

## Mo: http://localhost:3001/projects → Click vao 1 du an

## Tabs trong trang du an:

### Tab Overview:
- SEO Score ring /100
- Cards: tong trang, status 200, 301, 404, speed, orphan pages
- Radar chart: diem theo category
- Top issues can fix gap

### Tab Links:
- Tong internal links, TB links/trang
- Orphan pages, broken links, redirect chains
- Top trang nhan nhieu link
- De xuat internal link moi

### Tab Content:
- Thin content (< 300 tu)
- Duplicate content
- Missing meta title/description
- Keyword stuffing
- Content quality score

### Tab Technical:
- Page speed / Core Web Vitals
- Mobile-friendly
- Security headers
- Schema markup
- Canonical, hreflang
- Crawl errors

### Tab Opportunities:
- Content gap analysis
- Keyword opportunities
- Quick wins

### Tab Action Plan:
- Doc tu strategy DB (import tu Obsidian)
- Phases voi progress bar thuc
- Actions voi status: todo/doing/done/blocked
- Filter theo phase, category summary

---

# ═══════════════════════════════════════════
# PHAN 11: SCREAMING FROG IMPORT
# ═══════════════════════════════════════════

## Data SF o dau: /Users/puchinpham/Developer/SEO/

## Flow hang tuan:

**Buoc 1:** Screaming Frog tu scan (da schedule) → export CSV

**Buoc 2:** Mo → http://localhost:3001/seo-audit → Tab "Crawl Data"

**Buoc 3:** Chon du an → Thay danh sach lan crawl moi

**Buoc 4:** Click "Import" → App parse CSV files → Luu DB

**Buoc 5:** Xem ket qua → chuyen qua tab Overview, Links, Content, Technical...

### Cac file CSV SF quan trong:
| File | Xem gi |
|------|--------|
| internal_all.csv | Tat ca URLs crawl duoc |
| response_codes_all.csv | Status 200/301/404/500 |
| page_titles_all.csv | Title tags (thieu/trung/dai) |
| meta_description_all.csv | Meta desc (thieu/trung) |
| h1_all.csv | H1 headings |
| images_missing_alt_text.csv | Anh thieu alt |
| canonical_all.csv | Canonical tags |
| orphan_pages.csv | Trang mo coi |
| redirect_chains.csv | Redirect loops |
| analytics_all.csv | Analytics data |

---

# ═══════════════════════════════════════════
# PHAN 12: SETTINGS (Cai dat)
# ═══════════════════════════════════════════

## Mo: http://localhost:3001/settings

### Tab Du an:
- Xem 3 du an: ten, domain, Sheet ID, target
- Sua: click icon but chi
- Them: "+ Them du an" → nhap ten, slug, domain, Sheet ID
- Sync: "Sync ngay" → pull data moi tu Google Sheets

### Tab Thanh vien:
- Danh sach members: ten, role, projects assigned
- Them/sua member

### Tab Cau hinh:
- Screaming Frog path: /Users/puchinpham/Developer/SEO/
- Monthly target mac dinh: 20 bai
- Sync settings

---

# ═══════════════════════════════════════════
# PROMPT CLAUDE CODE HAY DUNG — COPY & PASTE
# ═══════════════════════════════════════════

## HANG NGAY:
```
Tom tat tasks hom nay can lam, across all projects, sort by priority.
```

## HANG TUAN:
```
Tong ket tuan: tasks completed, overdue, ranking changes, next week priorities.
```

## HANG THANG:
```
Tao bao cao SEO thang [X]/2026 cho 3 du an. Full report luu vao /api/v1/reports.
```

## RESEARCH:
```
/mkt:seo:keywords "[keyword chinh] [domain]"
/mkt:scout "phan tich doi thu [domain1] vs [domain2]"
```

## AUDIT:
```
Audit toan dien [domain]. Luu DB + tao tasks cho issues.
```

## CONTENT:
```
/mkt:content:good "viet outline [topic] cho [project]"
/mkt:brainstorm "10 y tuong bai viet cho [project] thang [X]"
```

## CHIEN LUOC:
```
/mkt:plan "chien luoc SEO [project] Q[X] 2026"
Review chien luoc [project]: update status actions, suggest dieu chinh.
```

## FIX ISSUES:
```
Doc audit [project], tao tasks fix cho tat ca critical + high issues.
```

---

# BACKUP DU LIEU

```bash
# Copy DB ra backup
cp ~/Developer/seo-manager-local/data/seo-manager.db ~/Developer/seo-manager-local/data/backups/seo-manager-$(date +%Y%m%d).db

# Hoac qua Claude Code
npm run db:backup
```
