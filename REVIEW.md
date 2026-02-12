# Review Toàn Bộ Dự Án: Content Tracker & SEO Checker

## Tổng quan

Đây là một **nền tảng quản lý nội dung SEO và phân tích hiệu suất team**, được xây dựng bằng **Next.js 14 + TypeScript + Supabase + Tailwind CSS**. Giao diện hoàn toàn bằng tiếng Việt. Deploy trên Vercel.

**Tech Stack:** Next.js 14.2, React 18.3, TypeScript 5, Supabase, Tailwind CSS 3.4, Recharts, Lucide React, bcryptjs

**Quy mô:** 54 file TypeScript/TSX, 26 API routes, 10 trang dashboard, 6 components tái sử dụng

---

## 10 Tính Năng Chính

### 1. Dashboard (Tổng quan)
- **File:** `src/app/(dashboard)/page.tsx`
- **API:** `/api/stats`, `/api/dashboard/overview`
- Tổng quan KPI: tổng bài, đã xuất bản, đang làm, quá hạn
- Cảnh báo thông minh (overdue, sắp deadline, lương chưa trả, keyword giảm)
- Bảng xếp hạng thành viên (leaderboard)
- Phân tích bottleneck workflow theo dự án
- Báo cáo theo tuần với biểu đồ grid
- Quick navigation đến các trang chính

### 2. Quản lý Task
- **File:** `src/app/(dashboard)/tasks/page.tsx`
- **API:** `/api/tasks`
- Lọc theo tháng, dự án, PIC (người phụ trách), trạng thái
- Workflow 2 nhánh song song: Outline (5 trạng thái) + Content (6 trạng thái)
- Tổng hợp KPI theo PIC: % xuất bản, % đúng hạn
- Màu sắc theo trạng thái (đỏ = quá hạn, cam = sắp deadline, xanh = đã xuất bản)
- Hiển thị top 10 PIC với task counts

### 3. Quản lý Dự án & Analytics
- **File:** `src/app/(dashboard)/projects/page.tsx`
- **API:** `/api/projects`, `/api/keyword-rankings/growth`, `/api/keyword-rankings/details`, `/api/keyword-rankings/analysis`
- KPI keyword ranking: Top 3, 10, 20, 30 với change indicators
- Biểu đồ tăng trưởng ranking (7-90 ngày, Recharts area chart)
- Phân tích content: bài có ranking vs không ranking
- Keyword cơ hội (vị trí 11-20) và keyword đang giảm
- Dual view: xem theo keyword hoặc theo URL
- URL analysis với SEO scores

### 4. SEO Audit
- **File:** `src/app/(dashboard)/seo-audit/page.tsx`, `src/app/api/seo-check/route.ts`
- **API:** `/api/seo-check`, `/api/seo-results`, `/api/seo-results/batch`
- **20+ tiêu chí kiểm tra on-page SEO**, chia 3 nhóm:
  - **Content (10 mục):** Title (60-70 ký tự), meta description (≤160), keyword trong sapo, đầu/cuối bài, mật độ keyword (0.5-2.5%), H2 chứa keyword, heading ngắn gọn, độ dài bài (≥1200 từ), kết bài, keyword phụ
  - **Hình ảnh (3 mục):** Alt text, alt chứa keyword, tỷ lệ ảnh/heading
  - **Kỹ thuật (5 mục):** Canonical tag, viewport, internal links (≥3), external links (1-5), H1 duy nhất
- Kiểm tra hàng loạt (batch check) hoặc từng bài
- Phân tích link: doFollow/noFollow, trùng lặp
- Hỗ trợ keyword chính + nhiều keyword phụ
- Chấm điểm 0-100 với gợi ý cải thiện cụ thể

### 5. Keyword Ranking
- **File:** `src/app/(dashboard)/keyword-ranking/page.tsx`
- **API:** `/api/keyword-rankings`
- Theo dõi vị trí keyword theo thời gian (6 tháng lịch sử)
- 7 stat cards: Total, Top 3/10/20/30, Improved, Declined
- Sparkline chart mini trong bảng
- Modal chi tiết timeline với SVG visualization
- Lọc theo vị trí (Top 3/10/20/30/>30), tăng/giảm
- Sắp xếp theo vị trí, thay đổi, tên

### 6. Quản lý Lương
- **File:** `src/app/(dashboard)/salary/page.tsx`
- **API:** `/api/salary`, `/api/salary/analytics`, `/api/salary-payments`
- Tính lương tự động: **Base 2.5M + KPI bonus 500K (≥20 bài) + 120K/bài thêm**
- 4 tab: Tổng quan, Dự án, Thành viên, Chi tiết
- Biểu đồ xu hướng lương 6 tháng (area chart)
- Chi phí/bài viết theo dự án (bar chart)
- Đánh dấu đã thanh toán/chưa thanh toán
- Xuất CSV (hỗ trợ BOM cho Unicode tiếng Việt)

### 7. Quản lý Thành viên
- **File:** `src/app/(dashboard)/members/page.tsx`
- **API:** `/api/members`
- CRUD thành viên: tên, nickname, role, email, phone, bank info
- 4 role nghiệp vụ: Content Writer, SEO Specialist, Editor, Manager
- Xem theo ngày/tuần/tháng
- KPI progress bar cho từng thành viên
- Gán dự án cho thành viên
- Thống kê: on-time rate, published count

### 8. Authentication & Authorization
- **File:** `src/middleware.ts`, `src/lib/auth.ts`, `src/contexts/AuthContext.tsx`
- **API:** `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Đăng nhập username/password với bcrypt hashing
- Session token (64 ký tự random, HttpOnly cookie, 7 ngày)
- **3 role với phân quyền rõ ràng:**
  - **Admin:** Toàn quyền (settings, users, salary, sync)
  - **SEO:** Xem tất cả dự án/task, kiểm tra SEO, không truy cập salary/settings
  - **Member:** Chỉ xem dự án/task được gán, lương cá nhân
- Middleware validate session ở mọi request
- Activity logging với IP và User-Agent
- Protected routes theo role

### 9. Đồng bộ Dữ liệu
- **File:** `src/app/api/sync/route.ts`, `src/app/api/keyword-rankings/sync/route.ts`
- Sync task từ **Google Sheets** qua gviz API
- Sync keyword ranking từ Google Sheets (CSV export)
- Auto-detect cột (hỗ trợ header tiếng Việt)
- Batch upsert 500 record/lần
- Lịch sử sync với trạng thái và thời gian
- Hỗ trợ nhiều định dạng ngày (YYYY-MM-DD, DD/MM/YYYY, v.v.)

### 10. Settings & Quản trị
- **File:** `src/app/(dashboard)/settings/page.tsx`, `src/app/(dashboard)/users/page.tsx`
- **API:** `/api/projects`, `/api/targets`, `/api/sync/logs`, `/api/activity-logs`, `/api/users`
- CRUD dự án với Google Sheet integration
- Quản lý KPI target theo tháng/dự án
- Quản lý users: tạo/sửa/xóa, gán role và dự án
- Lịch sử sync và activity log
- Trang docs với changelog version 1.0 → 1.4

---

## Kiến Trúc Kỹ Thuật

### Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3.4, CSS Variables (dark mode) |
| Database | Supabase (PostgreSQL) với RLS |
| Auth | bcryptjs, session-based, HttpOnly cookies |
| Charts | Recharts (Area, Bar) + Custom SVG sparklines |
| Icons | Lucide React |
| Deploy | Vercel |

### Cấu trúc Source

```
src/
├── app/
│   ├── api/                    # 26 API routes (backend)
│   │   ├── auth/               # Login, logout, me
│   │   ├── dashboard/          # Overview endpoint
│   │   ├── keyword-rankings/   # Rankings CRUD, growth, details, analysis, sync
│   │   ├── projects/           # Projects CRUD, report
│   │   ├── salary/             # Salary, analytics
│   │   ├── seo-check/          # SEO audit engine
│   │   ├── seo-results/        # SEO results storage, batch
│   │   ├── sync/               # Google Sheets sync, logs
│   │   ├── activity-logs/      # Audit logs
│   │   ├── members/            # Members CRUD
│   │   ├── salary-payments/    # Payment tracking
│   │   ├── stats/              # Statistics
│   │   ├── targets/            # Monthly targets
│   │   └── users/              # User management
│   ├── (dashboard)/            # 10 dashboard pages
│   │   ├── page.tsx            # Main dashboard
│   │   ├── tasks/              # Task management
│   │   ├── projects/           # Project analytics
│   │   ├── keyword-ranking/    # Keyword tracking
│   │   ├── salary/             # Salary management
│   │   ├── members/            # Team management
│   │   ├── seo-audit/          # SEO checker
│   │   ├── settings/           # System settings
│   │   ├── users/              # User management
│   │   └── docs/               # Documentation
│   └── login/                  # Login page
├── components/                 # 6 reusable components
│   ├── Sidebar.tsx             # Navigation + role-based menu
│   ├── StatsCard.tsx           # KPI display card
│   ├── ProgressBar.tsx         # Progress indicator
│   ├── StatusBadge.tsx         # Status label
│   ├── LoadingSpinner.tsx      # Loading states
│   └── EmptyState.tsx          # Empty data placeholder
├── contexts/
│   └── AuthContext.tsx          # Global auth state + permission checking
├── lib/
│   ├── auth.ts                 # Session management, password hashing
│   ├── supabase.ts             # Supabase client (singleton)
│   ├── task-helpers.ts         # Task status detection (shared logic)
│   └── utils.ts                # Formatting, validation, salary calc
├── types/
│   ├── index.ts                # Domain types (Project, Task, Stats, etc.)
│   └── auth.ts                 # Auth types + permission matrix
└── middleware.ts               # Route protection + session validation
```

### Database Schema

| Bảng | Mô tả |
|---|---|
| `projects` | Dự án với sheet_id, monthly_target |
| `tasks` | Task content với workflow status tracking |
| `monthly_targets` | KPI target theo tháng/dự án |
| `users` | Tài khoản với role (admin/seo/member) |
| `sessions` | Session token + IP/User-Agent |
| `members` | Thông tin thành viên (bank, contact) |
| `keyword_rankings` | Lịch sử ranking keyword |
| `seo_results` | Kết quả SEO audit |
| `salary_payments` | Lịch sử thanh toán lương |
| `activity_logs` | Audit log hoạt động |
| `sync_logs` | Lịch sử đồng bộ |

---

## Đánh Giá & Nhận Xét

### Điểm mạnh
1. **Tính năng phong phú** - Bao phủ toàn bộ workflow content SEO từ planning đến publishing và tracking
2. **Phân quyền rõ ràng** - 3 role với permission matrix chi tiết, session-based auth an toàn
3. **SEO audit engine chi tiết** - 20+ tiêu chí kiểm tra với gợi ý cụ thể
4. **UI nhất quán** - Color coding, status system, responsive design
5. **Google Sheets integration** - Sync data tự động, hỗ trợ nhiều format
6. **Analytics sâu** - Biểu đồ ranking growth, salary trends, bottleneck analysis
7. **Vietnamese localization** - Toàn bộ UI, gợi ý SEO, format tiền tệ/ngày tháng

### Điểm cần cải thiện
1. **Không có test** - Không có unit test hay integration test
2. **RLS policy quá mở** - `USING (true)` cho tất cả bảng, phụ thuộc hoàn toàn vào app-level auth
3. **SEO check parse HTML bằng regex** - Dễ lỗi edge cases, nên dùng HTML parser (cheerio/jsdom)
4. **API `/api/auth` legacy** - Dùng plain text password comparison, base64 token (nên xóa)
5. **`deleteAll` keyword rankings** - Xóa toàn bộ bảng không có confirmation
6. **Sync phá hủy dữ liệu** - Xóa toàn bộ tasks cũ trước khi sync, nếu fail giữa chừng sẽ mất data
7. **Không có pagination** - Hầu hết danh sách load toàn bộ data cùng lúc
8. **Dashboard page quá lớn** - `page.tsx` ~1400 dòng, nên tách thành nhiều component
