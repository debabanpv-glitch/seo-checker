# 📋 TÀI LIỆU DỰ ÁN: SEO MANAGER TOOL (LOCAL) v2

> **Phiên bản:** 2.0 — Modular Plugin + REST API + Claude Code SDK  
> **Ngày tạo:** 21/02/2026  
> **Người dùng:** Puchin Pham (1 người duy nhất)  
> **Nguyên tắc #1:** Thêm module mới KHÔNG BAO GIỜ phá cái cũ  
> **Nguyên tắc #2:** Claude Code = 1 nhân sự, ghi data trực tiếp qua SDK  

---

## MỤC LỤC

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Hiện trạng & Vấn đề](#2-hiện-trạng--vấn-đề)
3. [Kiến trúc hệ thống mới](#3-kiến-trúc-hệ-thống-mới)
4. [**MODULE SYSTEM — Mở rộng không phá vỡ**](#4-module-system--mở-rộng-không-phá-vỡ)
5. [**CLAUDE CODE SDK — Nhân sự AI ghi data**](#5-claude-code-sdk--nhân-sự-ai-ghi-data)
6. [Tech Stack & Công nghệ](#6-tech-stack--công-nghệ)
7. [Database Schema](#7-database-schema)
8. [Tính năng chi tiết](#8-tính-năng-chi-tiết)
9. [Cấu trúc thư mục dự án](#9-cấu-trúc-thư-mục-dự-án)
10. [API Routes](#10-api-routes)
11. [Data Flow & Sync](#11-data-flow--sync)
12. [Tính năng MỚI cần phát triển](#12-tính-năng-mới-cần-phát-triển)
13. [Kế hoạch triển khai (Phases)](#13-kế-hoạch-triển-khai-phases)
14. [Hướng dẫn cài đặt & chạy](#14-hướng-dẫn-cài-đặt--chạy)
15. [Quy ước & Chuẩn hóa dự án](#15-quy-ước--chuẩn-hóa-dự-án)
16. [Phụ lục](#16-phụ-lục)

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1 Mục tiêu

Xây dựng **1 công cụ duy nhất** chạy local trên Mac, quản lý tập trung toàn bộ hoạt động SEO cho nhiều dự án. Thay thế workflow rời rạc hiện tại (Claude Code + Claude Cowork + Obsidian) bằng 1 dashboard thống nhất.

### 1.2 Nguyên tắc thiết kế (BẮT BUỘC tuân theo)

| # | Nguyên tắc | Giải thích |
|---|-----------|------------|
| 1 | **Modular — thêm không phá** | Mỗi feature là 1 module độc lập. Thêm module mới = thêm folder, KHÔNG sửa code cũ |
| 2 | **Claude Code = nhân sự** | Claude Code ghi data qua SDK/API giống content writer ghi vào Sheet. Có helper sẵn, không cần biết SQL |
| 3 | **REST API là cửa duy nhất** | Mọi thứ (UI, Claude Code, script) đều đọc/ghi qua API. Không ai truy cập DB trực tiếp |
| 4 | **API versioning** | `/api/v1/...` — sau này cần breaking change → tạo `/api/v2/` mà không phá v1 |
| 5 | **Offline-first** | Core features chạy không cần internet |
| 6 | **Single file DB** | SQLite — backup = copy 1 file |

### 1.3 Người dùng

| STT | Vai trò | Cách tương tác |
|-----|---------|----------------|
| 1 | **Puchin (SEO Manager)** | Browser → localhost:3000 → xem/quản lý |
| 2 | Content Writer 1-3 | Nhập data vào Google Sheets → tool sync về |
| 3 | **Claude Code** | Gọi REST API hoặc dùng SDK → **ghi trực tiếp vào DB** |
| 4 | **Claude Chat** | Hỗ trợ phân tích, generate report qua API |
| 5 | **Khách hàng** | Nhận report PDF/HTML (không truy cập tool) |

### 1.3 Các dự án đang quản lý

| Dự án | Website | Ngành | Trạng thái |
|-------|---------|-------|------------|
| **Samco Tech** | samcotech.com.vn | Máy in nhãn, mã vạch | 🟢 Active |
| **TCNET Marketing** | mangthanhcong.vn | Thiết bị mạng quang điện | 🟢 Active |
| **Du Lịch Bình Minh** | dulichbinhminh.com | Tour du lịch Miền Tây | 🟢 Active |
| *(Done)* Coin68, NinaGroup, TieuDiemBongDa, WebsiteXeHoi | — | — | ⚫ Done |

### 1.4 Nhân sự

| STT | Vai trò | Công việc chính |
|-----|---------|-----------------|
| 1 | SEO Manager (bạn) | Chiến lược, QC, audit, report, quản lý |
| 2 | Content Writer 1 | Viết outline + content |
| 3 | Content Writer 2 | Viết outline + content |
| 4 | Content Writer 3 | Viết outline + content |
| 5 | Claude AI | Hỗ trợ: SEO audit, generate content drafts, reports |

---

## 2. HIỆN TRẠNG & VẤN ĐỀ

### 2.1 App hiện tại (v1)

- **URL:** https://banpham-seo.vercel.app
- **GitHub:** github.com/debabanpv-glitch/seo-checker
- **Tech:** Next.js 14 + Supabase + Tailwind + Recharts
- **Data:** Google Sheets → Supabase (sync cron daily 14h VN)

#### Tính năng đã có (v1):

| # | Tính năng | Mô tả |
|---|-----------|-------|
| 1 | **Dashboard** | Tổng quan: KPIs, alerts, bottleneck workflow, leaderboard |
| 2 | **Projects** | Xem tiến độ từng dự án, keyword growth chart |
| 3 | **Tasks** | Danh sách tasks, filter theo project/PIC/status |
| 4 | **Members** | Thành viên, published count, on-time rate |
| 5 | **Salary** | Tính lương tự động theo bài publish (125k/bài, KPI 20 bài) |
| 6 | **SEO Audit** | Kiểm tra on-page SEO từng URL (15 checks) |
| 7 | **Keyword Rankings** | Track keyword positions, growth chart |
| 8 | **Settings** | Quản lý projects, monthly targets, Google Sheet links |
| 9 | **Auth** | Login/logout, roles (admin/seo/member) |
| 10 | **Docs** | Hướng dẫn sử dụng tích hợp |

#### Database Tables hiện tại (Supabase):

| Table | Chức năng |
|-------|-----------|
| `projects` | Dự án: name, sheet_id, monthly_target |
| `tasks` | Tasks content: keyword, title, PIC, status, deadline, publish_date |
| `monthly_targets` | KPI target theo tháng/dự án |
| `keyword_rankings` | Keyword + position + date + URL |
| `users` | Tài khoản: username, role (admin/seo/member) |
| `sessions` | Phiên đăng nhập |
| `activity_logs` | Log hoạt động |
| `members` | Thông tin nhân sự: tên, bank, email, phone |
| `sync_logs` | Log sync Google Sheets |
| `seo_results` | Kết quả SEO audit |
| `salary_payments` | Trạng thái thanh toán lương |

### 2.2 Vấn đề cần giải quyết

| # | Vấn đề | Chi tiết |
|---|--------|----------|
| 1 | **Supabase INACTIVE** | Tất cả 3 Supabase projects đều bị pause → app không có DB |
| 2 | **Vercel cold start** | Serverless functions chậm, timeout khi data nhiều |
| 3 | **Chi phí** | Supabase free tier giới hạn, lo vượt khi scale |
| 4 | **Quản lý rời rạc** | Obsidian + Claude Code + Claude Cowork → không nhất quán |
| 5 | **Mỗi dự án 1 kiểu** | Cấu trúc quản lý không đồng nhất giữa các projects |
| 6 | **Thiếu strategy planner** | Không có chiến lược ngắn/dài hạn, ưu tiên xử lý |
| 7 | **Thiếu report cho khách** | Không auto-generate monthly report |
| 8 | **Claude triển khai không track** | Những gì Claude làm không được ghi nhận/report |
| 9 | **Screaming Frog** | Chưa tích hợp, phải xem riêng |

---

## 3. KIẾN TRÚC HỆ THỐNG MỚI

### 3.1 Tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                     MÁY MAC CỦA BẠN                             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │           Next.js 14 (localhost:3000)                    │     │
│  │                                                          │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │     │
│  │  │Dashboard │ │ Projects │ │  Tasks   │ │ Members  │   │     │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │     │
│  │  │ Salary   │ │SEO Audit │ │ Keywords │ │ Strategy │   │     │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐               │     │
│  │  │ Reports  │ │ SF Import│ │ Settings │               │     │
│  │  └──────────┘ └──────────┘ └──────────┘               │     │
│  │                                                          │     │
│  │                    API Routes                            │     │
│  │           ┌──────────────────────┐                      │     │
│  │           │   SQLite Database    │                      │     │
│  │           │   (local .db file)   │                      │     │
│  │           └──────────────────────┘                      │     │
│  └─────────────────────────────────────────────────────────┘     │
│                              │                                    │
│              ┌───────────────┼───────────────┐                   │
│              ▼               ▼               ▼                   │
│     Google Sheets    GSC API (MCP)    Claude API                 │
│     (content data)   (search data)   (AI analysis)              │
│                                                                   │
│     Screaming Frog CSV    Obsidian Files                         │
│     (import audit)        (read-only reference)                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Tại sao Local + SQLite?

| Tiêu chí | Local + SQLite | Vercel + Supabase (cũ) |
|-----------|---------------|----------------------|
| **Tốc độ** | <10ms query | 100-500ms (network + cold start) |
| **Offline** | ✅ Chạy mọi lúc | ❌ Cần internet |
| **Chi phí** | 0đ/tháng | Free tier, risk vượt |
| **DB crash** | Không bao giờ | Supabase có thể pause |
| **Backup** | Copy 1 file .db | Export từ Supabase |
| **Data size** | Unlimited (ổ cứng) | 500MB free tier |
| **Bảo mật** | Data không ra internet | Data trên cloud |
| **Đọc Obsidian** | Trực tiếp file system | Không thể |
| **Complexity** | Đơn giản | Phải quản lý nhiều services |

### 3.3 Nguyên tắc thiết kế

1. **Single source of truth:** SQLite DB là trung tâm, mọi data đều qua đây
2. **Chuẩn hóa:** Tất cả dự án dùng chung 1 cấu trúc, 1 workflow
3. **Offline-first:** Không phụ thuộc internet cho core features
4. **AI-augmented:** Claude hỗ trợ nhưng không bắt buộc
5. **Export-ready:** Mọi thứ đều export được cho khách hàng

### 3.4 Layers — Quy tắc gọi

```
Layer 1: UI (React pages)          ← Chỉ gọi API, không import DB
Layer 2: API Routes (/api/v1/...)  ← Cửa DUY NHẤT vào data
Layer 3: Service Layer             ← Business logic, validation
Layer 4: Database (Drizzle + SQLite)

Quy tắc: Layer trên chỉ gọi layer ngay dưới. Không skip layer.
UI → API → Service → DB  ✅
UI → DB                   ❌ (KHÔNG BAO GIỜ)
Claude Code → API → DB    ✅
Claude Code → DB           ❌ (KHÔNG BAO GIỜ)
```

### 3.5 Data flow tổng quan

```
┌──────────────────────────────────────────────────────────────────────┐
│                        LOCALHOST:3000                                  │
│                                                                        │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│   │Module:  │ │Module:  │ │Module:  │ │Module:  │  + module mới...   │
│   │Dashboard│ │Strategy │ │Reports  │ │ [tùy]   │                   │
│   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘                   │
│        └────────────┴──────────┴────────────┘                        │
│                          │                                            │
│   ┌──────────────────────▼────────────────────────────────────┐      │
│   │              REST API  /api/v1/[module]/...                │      │
│   │     UI, Claude Code, scripts — TẤT CẢ đều qua đây        │      │
│   └──────────────────────┬────────────────────────────────────┘      │
│                          │                                            │
│   ┌──────────────────────▼────────────────────────────────────┐      │
│   │              SQLite (data/seo-manager.db)                  │      │
│   └────────────────────────────────────────────────────────────┘      │
│                                                                        │
│  INPUTS (đều ghi qua API):                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────────┐    │
│  │ Google   │ │ GSC MCP  │ │Screaming │ │  CLAUDE CODE (SDK)    │    │
│  │ Sheets   │ │          │ │ Frog CSV │ │  = 1 nhân sự          │    │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. MODULE SYSTEM — MỞ RỘNG KHÔNG PHÁ VỠ

> **Vấn đề:** Thêm feature mới thường phải sửa sidebar, sửa DB schema, sửa routing → dễ phá code cũ.
> **Giải pháp:** Mỗi feature là 1 module độc lập. Thêm module = thêm folder. KHÔNG sửa file nào khác.

### 4.1 Module là gì?

Một module = 1 tính năng hoàn chỉnh, chứa tất cả code riêng:

```
src/modules/[ten-module]/
├── schema.ts          ← DB table definitions (nếu cần thêm table)
├── service.ts         ← Business logic riêng module
├── types.ts           ← TypeScript types
└── README.md          ← Mô tả module (optional)
```

Phần UI và API vẫn đặt theo cấu trúc Next.js:
```
src/app/(dashboard)/[ten-module]/page.tsx    ← UI page
src/app/api/v1/[ten-module]/route.ts         ← API endpoints
```

### 4.2 Module Registry — Sidebar tự detect

File `src/modules/registry.ts`:

```typescript
export interface ModuleConfig {
  id: string;            // 'strategy', 'reports'
  name: string;          // 'Chiến lược', 'Reports'
  icon: string;          // Lucide icon name
  path: string;          // '/strategy'
  order: number;         // Thứ tự sidebar (0 = đầu tiên)
  group: 'core' | 'extension' | 'settings';
  enabled: boolean;      // Bật/tắt module
}

export const modules: ModuleConfig[] = [
  // ─── CORE (luôn bật) ───
  { id: 'dashboard',  name: 'Dashboard',    icon: 'LayoutDashboard', path: '/',                order: 0,  group: 'core', enabled: true },
  { id: 'projects',   name: 'Dự án',        icon: 'FolderKanban',    path: '/projects',        order: 1,  group: 'core', enabled: true },
  { id: 'tasks',      name: 'Tasks',        icon: 'ListTodo',        path: '/tasks',           order: 2,  group: 'core', enabled: true },
  { id: 'members',    name: 'Thành viên',   icon: 'Users',           path: '/members',         order: 3,  group: 'core', enabled: true },
  { id: 'salary',     name: 'Tính lương',   icon: 'Wallet',          path: '/salary',          order: 4,  group: 'core', enabled: true },
  { id: 'seo-audit',  name: 'SEO Audit',    icon: 'Search',          path: '/seo-audit',       order: 5,  group: 'core', enabled: true },
  { id: 'keywords',   name: 'Keywords',     icon: 'TrendingUp',      path: '/keyword-ranking', order: 6,  group: 'core', enabled: true },

  // ─── EXTENSIONS (bật/tắt tùy ý, thêm mới ở đây) ───
  { id: 'strategy',     name: 'Chiến lược',     icon: 'Target',       path: '/strategy',      order: 10, group: 'extension', enabled: true },
  { id: 'audit-import', name: 'Audit Import',   icon: 'Upload',       path: '/audit-import',  order: 11, group: 'extension', enabled: true },
  { id: 'gsc',          name: 'Search Console', icon: 'Globe',        path: '/gsc',           order: 12, group: 'extension', enabled: true },
  { id: 'reports',      name: 'Reports',        icon: 'FileText',     path: '/reports',       order: 13, group: 'extension', enabled: true },
  { id: 'claude-log',   name: 'Claude Log',     icon: 'Bot',          path: '/claude-log',    order: 14, group: 'extension', enabled: true },
  { id: 'notes',        name: 'Notes',          icon: 'StickyNote',   path: '/notes',         order: 15, group: 'extension', enabled: true },

  // ─── SETTINGS ───
  { id: 'settings',  name: 'Cài đặt', icon: 'Settings', path: '/settings', order: 90, group: 'settings', enabled: true },
  { id: 'docs',      name: 'Docs',     icon: 'BookOpen', path: '/docs',     order: 91, group: 'settings', enabled: true },
];
```

**Sidebar.tsx đọc registry → tự render:**
```typescript
import { modules } from '@/modules/registry';

// Sidebar tự group + sort + render
const coreNav = modules.filter(m => m.group === 'core' && m.enabled).sort((a,b) => a.order - b.order);
const extNav  = modules.filter(m => m.group === 'extension' && m.enabled).sort((a,b) => a.order - b.order);
```

### 4.3 DB Schema tự merge

```typescript
// src/db/schema/index.ts — auto-export tất cả
export * from './core';       // projects, tasks, members...
export * from './strategy';   // strategy_phases, strategy_actions
export * from './reports';    // monthly_reports
export * from './audit';      // audit_results
export * from './claude';     // claude_activities
export * from './gsc';        // gsc_snapshots
export * from './notes';      // notes

// Thêm module mới có table? Chỉ cần:
// 1. Tạo file: src/db/schema/[module].ts
// 2. Thêm 1 dòng export ở đây
// 3. Chạy: npm run db:migrate
```

### 4.4 Checklist: Thêm module mới

```
VÍ DỤ: Thêm module "Backlink Tracker" sau 6 tháng nữa

□ Bước 1: Tạo DB schema (nếu cần)
  → src/db/schema/backlinks.ts
  → Thêm 1 dòng trong src/db/schema/index.ts
  → npm run db:migrate

□ Bước 2: Tạo module logic
  → src/modules/backlinks/service.ts
  → src/modules/backlinks/types.ts

□ Bước 3: Tạo API
  → src/app/api/v1/backlinks/route.ts

□ Bước 4: Tạo UI
  → src/app/(dashboard)/backlinks/page.tsx

□ Bước 5: Đăng ký vào registry (1 dòng)
  → { id: 'backlinks', name: 'Backlinks', ..., order: 16, enabled: true }

✅ XONG. Không sửa bất kỳ file nào khác.
   Sidebar tự hiện menu mới.
   API tự có route mới.
   DB tự có table mới.
```

---

## 5. CLAUDE CODE SDK — NHÂN SỰ AI GHI DATA

> **Concept:** Claude Code = 1 nhân sự ảo. Nó ghi data giống content writer ghi vào Google Sheets.
> Có SDK helper sẵn → Claude Code chỉ cần `import { sdk }` và gọi functions.
> Không cần biết SQL, không cần biết DB schema. SDK lo hết.

### 5.1 Kiến trúc

```
Claude Code terminal
        │
        │  import { sdk } from './scripts/sdk/seo-manager-sdk'
        │  await sdk.tasks.create({...})
        │  await sdk.log('Đã viết 5 bài...')
        │
        ▼
┌─────────────────────────────────────────┐
│  SDK: seo-manager-sdk.ts                 │
│  (file helper, Claude Code import)       │
│                                           │
│  Bên trong: gọi fetch() → REST API      │
│  Auto-attach header: X-Worker: claude    │
│  Auto-log mọi hoạt động                 │
└──────────────────┬──────────────────────┘
                   │
                   ▼
          REST API /api/v1/...
                   │
                   ▼
              SQLite DB
```

### 5.2 SDK File — `scripts/sdk/seo-manager-sdk.ts`

Claude Code import file này và dùng ngay. **Đây là tài liệu đầy đủ cho Claude Code đọc.**

```typescript
/**
 * SEO Manager SDK — Dành cho Claude Code / scripts bên ngoài
 *
 * CÁCH DÙNG:
 *   import { sdk } from '/path/to/seo-manager-sdk'
 *   await sdk.tasks.create({ project: 'samco', keyword: '...', title: '...' })
 *   await sdk.log.activity('Đã viết bài XYZ', 'samco', 'content_draft')
 */

const BASE = 'http://localhost:3000/api/v1';

async function api(path: string, method = 'GET', body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Worker': 'claude-code' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export const sdk = {

  // ═══ TASKS ═══
  tasks: {
    /** Tạo task mới (Claude = PIC mặc định) */
    create: (data: {
      project: string;       // slug: 'samco' | 'tcnet' | 'dulichbinhminh'
      keyword: string;
      title?: string;
      pic?: string;          // Default: 'Claude'
      deadline?: string;     // 'YYYY-MM-DD'
      note?: string;
    }) => api('/tasks', 'POST', { ...data, pic: data.pic || 'Claude', assigned_to: 'claude', source: 'claude-code' }),

    /** Cập nhật status */
    updateStatus: (taskId: string, status: string, note?: string) =>
      api(`/tasks/${taskId}/status`, 'PUT', { status_content: status, note }),

    /** Đánh dấu đã publish */
    publish: (taskId: string, link: string) =>
      api(`/tasks/${taskId}/publish`, 'PUT', {
        link_publish: link,
        status_content: '4. Publish',
        publish_date: new Date().toISOString().split('T')[0],
      }),

    /** Lấy danh sách tasks */
    list: (filters?: { project?: string; status?: string; pic?: string }) =>
      api(`/tasks?${new URLSearchParams(filters as any)}`),
  },

  // ═══ SEO AUDIT ═══
  audit: {
    /** Submit kết quả audit cho 1 URL */
    submit: (data: {
      url: string;
      project: string;
      keyword?: string;
      score: number;
      details: any;
    }) => api('/seo-results', 'POST', { ...data, source: 'claude-code' }),

    /** Submit technical audit (bulk từ Screaming Frog hoặc custom) */
    submitBulk: (data: {
      project: string;
      audit_type: string;    // 'custom' | 'screaming_frog'
      summary: any;
      details: any[];
    }) => api('/audit-import', 'POST', { ...data, source: 'claude-code' }),
  },

  // ═══ KEYWORDS ═══
  keywords: {
    /** Track 1 keyword */
    track: (data: {
      keyword: string;
      position: number;
      url?: string;
      project: string;
    }) => api('/keyword-rankings', 'POST', { ...data, source: 'claude-code' }),

    /** Track nhiều keywords 1 lần */
    trackBulk: (rankings: Array<{
      keyword: string;
      position: number;
      url?: string;
      project: string;
    }>) => api('/keyword-rankings/bulk', 'POST', { rankings, source: 'claude-code' }),
  },

  // ═══ STRATEGY ═══
  strategy: {
    /** Cập nhật action (status, result) */
    updateAction: (actionId: string, data: {
      status?: string;       // 'todo' | 'doing' | 'done' | 'blocked'
      result?: string;
      note?: string;
    }) => api(`/strategy/actions/${actionId}`, 'PUT', data),

    /** Tạo action mới */
    createAction: (data: {
      phase_id: string;
      project: string;
      title: string;
      category?: string;     // 'technical' | 'content' | 'links' | 'authority'
      priority?: string;
    }) => api('/strategy/actions', 'POST', { ...data, assigned_to: 'claude' }),
  },

  // ═══ LOG — Ghi Claude đã làm gì ═══
  log: {
    /** Ghi nhanh 1 dòng (dùng nhiều nhất) */
    activity: (message: string, project?: string, type?: string) =>
      api('/claude/log', 'POST', {
        title: message,
        project_slug: project,
        activity_type: type || 'general',
      }),

    /** Ghi chi tiết (khi cần lưu input/output) */
    detailed: (data: {
      project?: string;
      activity_type: string; // 'content_draft' | 'seo_audit' | 'report' | 'analysis' | 'technical_fix'
      title: string;
      description?: string;
      input_data?: any;
      output_data?: any;
    }) => api('/claude/log', 'POST', data),
  },

  // ═══ REPORTS ═══
  reports: {
    /** Lưu nội dung report */
    save: (data: {
      project: string;
      month: number;
      year: number;
      content: any;
      highlights?: string;
      next_month_plan?: string;
    }) => api('/reports', 'POST', { ...data, generated_by: 'claude-code' }),
  },

  // ═══ PROJECTS (đọc thôi) ═══
  projects: {
    list: () => api('/projects'),
    get: (slug: string) => api(`/projects?slug=${slug}`),
  },

  // ═══ NOTES — Ghi chú tự do ═══
  notes: {
    add: (data: {
      project?: string;
      title: string;
      content: string;
      tags?: string[];
    }) => api('/notes', 'POST', { ...data, source: 'claude-code' }),
  },

  // ═══ GSC ═══
  gsc: {
    /** Lưu GSC snapshot */
    saveSnapshot: (data: {
      project: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
      top_queries?: any;
      top_pages?: any;
    }) => api('/gsc/snapshot', 'POST', { ...data, source: 'claude-code' }),
  },
};
```

### 5.3 Ví dụ sử dụng trong Claude Code

**Claude Code viết xong 1 bài → ghi vào tool:**
```typescript
import { sdk } from './scripts/sdk/seo-manager-sdk';

// Tạo task
const task = await sdk.tasks.create({
  project: 'samco',
  keyword: 'máy in nhãn brother pt-e110',
  title: 'Máy In Nhãn Brother PT-E110: Đánh Giá Chi Tiết 2026',
});

// Ghi log
await sdk.log.activity('Viết xong bài review PT-E110, 2500 từ', 'samco', 'content_draft');
```

**Claude Code audit xong → ghi kết quả:**
```typescript
await sdk.audit.submit({
  url: 'https://samcotech.com.vn/may-in-nhan-brother/',
  project: 'samco',
  keyword: 'máy in nhãn brother',
  score: 78,
  details: { title: 'pass', meta: 'warning', h1: 'pass', word_count: 2800 },
});
await sdk.log.activity('Audit /may-in-nhan-brother/ → 78/100', 'samco', 'seo_audit');
```

**Claude Code track keywords:**
```typescript
await sdk.keywords.trackBulk([
  { keyword: 'máy in nhãn', position: 5, url: '/may-in-nhan/', project: 'samco' },
  { keyword: 'máy in mã vạch', position: 8, url: '/may-in-ma-vach/', project: 'samco' },
]);
await sdk.log.activity('Track 2 keywords: #5, #8', 'samco', 'analysis');
```

**Claude Code phân tích xong → cập nhật strategy:**
```typescript
await sdk.strategy.updateAction('action-123', {
  status: 'done',
  result: 'Keyword research hoàn tất: 500+ keywords, 5 clusters chính',
});
await sdk.log.detailed({
  project: 'samco',
  activity_type: 'analysis',
  title: 'Keyword Research xong',
  output_data: { total: 500, clusters: 5 },
});
```

### 5.4 API nhận biết worker

Mọi request từ SDK đều có header `X-Worker: claude-code`. API middleware tự động:

```typescript
// src/lib/api-helpers.ts
export function getWorker(request: NextRequest): string {
  return request.headers.get('X-Worker') || 'web-ui';
}

// Trong mỗi POST API route:
const worker = getWorker(request);
if (worker !== 'web-ui') {
  // Auto-log vào claude_activities
  await db.insert(claude_activities).values({
    activity_type: 'api_call',
    title: `[Auto] ${method} ${path}`,
    worker,
  });
}
```

- Tasks do Claude tạo → `assigned_to: 'claude'`, `source: 'claude-code'`
- Rankings do Claude track → `source: 'claude-code'`
- Audits do Claude chạy → `source: 'claude-code'`
- Tất cả đều tự động xuất hiện trong Claude Log page

### 5.5 CLI Helper (Thay thế cho trường hợp không import được SDK)

```bash
# Ghi log nhanh
node scripts/cli.js log "Đã fix 5 broken links" --project samco --type technical_fix

# Track keyword
node scripts/cli.js track "máy in nhãn" 5 --project samco

# Tạo task
node scripts/cli.js task "Viết bài Honeywell" --project samco --keyword "máy quét honeywell"

# Xem status
node scripts/cli.js status samco
```

---

## 4. TECH STACK & CÔNG NGHỆ

### 4.1 Core Stack

| Layer | Công nghệ | Version | Lý do chọn |
|-------|-----------|---------|------------|
| **Framework** | Next.js | 14.x | Giữ nguyên code cũ, SSR + API routes |
| **Language** | TypeScript | 5.x | Type-safe, ít bug |
| **Database** | SQLite | 3.x | Zero-config, file-based, cực nhanh |
| **ORM** | Drizzle ORM | latest | Nhẹ, type-safe, hỗ trợ SQLite tốt |
| **UI** | Tailwind CSS | 3.4 | Giữ nguyên styling hiện tại |
| **Charts** | Recharts | 2.15 | Giữ nguyên charts hiện tại |
| **Icons** | Lucide React | 0.468 | Giữ nguyên |
| **Runtime** | Node.js | 20+ | LTS, stable |

### 4.2 Data Sources (External)

| Source | Phương thức | Dữ liệu | Tần suất |
|--------|------------|----------|----------|
| **Google Sheets** | Public API (gviz) | Tasks content: keyword, PIC, status, deadline | On-demand + daily |
| **Google Search Console** | GSC MCP (đã có) | Clicks, impressions, position, CTR | Weekly |
| **Screaming Frog** | Import CSV | Technical audit: broken links, errors, redirects | On-demand |
| **Claude API** | REST API | AI analysis, report generation, content drafts | On-demand |
| **Obsidian Files** | Node.js `fs.readFile` | Reference: SOPs, templates, brand guidelines | Read-only |

### 4.3 Dependencies mới (thay thế Supabase)

```json
{
  "dependencies": {
    "better-sqlite3": "^11.x",
    "drizzle-orm": "^0.35.x",
    "@anthropic-ai/sdk": "^0.30.x",
    "papaparse": "^5.4.x",
    "puppeteer": "^23.x"
  },
  "devDependencies": {
    "drizzle-kit": "^0.25.x"
  }
}
```

| Package | Thay thế | Mục đích |
|---------|----------|----------|
| `better-sqlite3` | `@supabase/supabase-js` | SQLite driver cho Node.js |
| `drizzle-orm` | Raw Supabase queries | Type-safe ORM |
| `papaparse` | (mới) | Parse CSV từ Screaming Frog |
| `puppeteer` | (mới) | Export report ra PDF |
| `@anthropic-ai/sdk` | (mới) | Claude API cho AI features |

---

## 5. DATABASE SCHEMA

### 5.1 Tổng quan bảng

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  projects   │────<│    tasks     │     │ keyword_rankings │
└─────────────┘     └─────────────┘     └──────────────────┘
       │                   │                      │
       │            ┌──────┘                      │
       ▼            ▼                             │
┌─────────────┐  ┌────────────┐   ┌──────────────┘
│monthly_tgts │  │  members   │   │
└─────────────┘  └────────────┘   │
                                   ▼
┌─────────────┐  ┌────────────┐  ┌──────────────────┐
│strategy_plan│  │audit_results│  │  monthly_reports  │
└─────────────┘  └────────────┘  └──────────────────┘

┌─────────────┐  ┌────────────┐  ┌──────────────────┐
│ sync_logs   │  │seo_results │  │ salary_payments   │
└─────────────┘  └────────────┘  └──────────────────┘

┌──────────────────┐
│ claude_activities │  ← MỚI: track Claude làm gì
└──────────────────┘
```

### 5.2 Bảng hiện tại (giữ nguyên, chuyển sang SQLite)

#### `projects`
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,       -- 'samco', 'tcnet', 'dulichbinhminh' (SDK dùng slug để lookup)
  website TEXT,                    -- URL website (VD: samcotech.com.vn)
  industry TEXT,                   -- Ngành (VD: Máy in nhãn)
  sheet_id TEXT NOT NULL,          -- Google Sheet ID
  sheet_name TEXT DEFAULT 'Content',
  monthly_target INTEGER DEFAULT 20,
  ranking_sheet_url TEXT,
  gsc_property TEXT,               -- MỚI: GSC property URL
  status TEXT DEFAULT 'active',    -- active / paused / done
  config TEXT,                     -- JSON: project-specific settings
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### `tasks`
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  stt INTEGER,
  year INTEGER,
  month INTEGER,
  parent_keyword TEXT,
  keyword_sub TEXT,
  keyword_count INTEGER DEFAULT 0,
  keywords_list TEXT,              -- JSON array
  search_volume INTEGER DEFAULT 0,
  title TEXT,
  outline TEXT,
  timeline_outline TEXT,
  status_outline TEXT,
  pic TEXT,                        -- Người phụ trách
  assigned_to TEXT DEFAULT 'human', -- 'human' | 'claude' ← phân biệt ai làm
  content_file TEXT,
  deadline TEXT,                   -- ISO date string
  status_content TEXT,
  link_publish TEXT,
  publish_date TEXT,
  note TEXT,
  month_year TEXT,
  source TEXT DEFAULT 'sheets',    -- 'sheets' | 'claude-code' | 'manual' ← data đến từ đâu
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### `monthly_targets`
```sql
CREATE TABLE monthly_targets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  target INTEGER DEFAULT 20,
  UNIQUE(project_id, month, year)
);
```

#### `keyword_rankings`
```sql
CREATE TABLE keyword_rankings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  keyword TEXT NOT NULL,
  url TEXT DEFAULT '',
  position REAL NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_kr_unique ON keyword_rankings(keyword, date, project_id);
```

#### `members`
```sql
CREATE TABLE members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  nickname TEXT,
  role TEXT DEFAULT 'Content Writer',
  projects TEXT,                   -- JSON array of project names
  start_date TEXT,
  email TEXT,
  phone TEXT,
  bank_name TEXT,
  bank_account TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### `salary_payments`
```sql
CREATE TABLE salary_payments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_name TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount INTEGER DEFAULT 0,
  is_paid INTEGER DEFAULT 0,
  paid_date TEXT,
  note TEXT,
  UNIQUE(member_name, month, year)
);
```

#### `seo_results`
```sql
CREATE TABLE seo_results (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  url TEXT NOT NULL,
  project_id TEXT REFERENCES projects(id),
  keyword TEXT,
  score INTEGER,
  max_score INTEGER DEFAULT 100,
  details TEXT,                    -- JSON: full check results
  checked_at TEXT DEFAULT (datetime('now'))
);
```

#### `sync_logs`
```sql
CREATE TABLE sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT DEFAULT 'running',
  started_at TEXT,
  completed_at TEXT,
  tasks_synced INTEGER DEFAULT 0,
  projects_synced INTEGER DEFAULT 0,
  error TEXT,
  duration_ms INTEGER
);
```

### 5.3 Bảng MỚI

#### `strategy_phases` — Chiến lược ngắn/dài hạn
```sql
CREATE TABLE strategy_phases (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- VD: "Phase 1: Foundation"
  description TEXT,
  phase_type TEXT NOT NULL,        -- 'short_term' / 'long_term'
  priority INTEGER DEFAULT 0,     -- Thứ tự ưu tiên (0 = cao nhất)
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'planned',   -- planned / in_progress / completed / blocked
  progress INTEGER DEFAULT 0,     -- 0-100%
  dependencies TEXT,               -- JSON array of phase IDs
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### `strategy_actions` — Actions trong mỗi phase
```sql
CREATE TABLE strategy_actions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  phase_id TEXT REFERENCES strategy_phases(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,                   -- 'technical' / 'content' / 'links' / 'authority'
  priority TEXT DEFAULT 'medium',  -- critical / high / medium / low
  assigned_to TEXT,                -- Tên người hoặc 'claude'
  status TEXT DEFAULT 'todo',      -- todo / doing / done / blocked
  due_date TEXT,
  completed_date TEXT,
  result TEXT,                     -- Kết quả sau khi hoàn thành
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### `audit_results` — Import từ Screaming Frog + custom audit
```sql
CREATE TABLE audit_results (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  audit_type TEXT NOT NULL,        -- 'screaming_frog' / 'custom' / 'gsc'
  audit_date TEXT NOT NULL,
  summary TEXT,                    -- JSON: tổng hợp (total_urls, errors, warnings...)
  details TEXT,                    -- JSON: chi tiết từng URL
  raw_file TEXT,                   -- Path to original CSV file
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### `monthly_reports` — Báo cáo tháng cho khách hàng
```sql
CREATE TABLE monthly_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'draft',     -- draft / generated / sent
  content TEXT,                    -- JSON/HTML content
  file_path TEXT,                  -- Path to PDF/HTML file
  gsc_data TEXT,                   -- JSON: GSC metrics snapshot
  ranking_data TEXT,               -- JSON: keyword ranking snapshot
  content_data TEXT,               -- JSON: content published summary
  technical_data TEXT,             -- JSON: technical fixes summary
  highlights TEXT,                 -- AI-generated highlights
  next_month_plan TEXT,            -- Kế hoạch tháng sau
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(project_id, month, year)
);
```

#### `claude_activities` — Track những gì Claude triển khai
```sql
CREATE TABLE claude_activities (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT REFERENCES projects(id),
  project_slug TEXT,               -- Cho SDK lookup nhanh
  activity_type TEXT NOT NULL,     -- 'content_draft' / 'seo_audit' / 'report' / 'analysis' / 'technical_fix' / 'api_call' / 'general'
  title TEXT NOT NULL,
  description TEXT,
  input_data TEXT,                 -- JSON
  output_data TEXT,                -- JSON
  status TEXT DEFAULT 'completed',
  worker TEXT DEFAULT 'claude-code', -- 'claude-code' / 'claude-chat' / 'web-ui'
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### `notes` — Ghi chú tự do (Claude Code hoặc manual)
```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT REFERENCES projects(id),
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT,                       -- JSON array
  source TEXT DEFAULT 'manual',    -- 'manual' / 'claude-code'
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### `gsc_snapshots` — Lưu data GSC theo tuần
```sql
CREATE TABLE gsc_snapshots (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  period TEXT DEFAULT 'weekly',    -- 'daily' / 'weekly' / 'monthly'
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0,
  position REAL DEFAULT 0,
  top_queries TEXT,                -- JSON: top 20 queries
  top_pages TEXT,                  -- JSON: top 20 pages
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(project_id, date, period)
);
```

---

## 6. TÍNH NĂNG CHI TIẾT

### 6.1 Tính năng GIỮ NGUYÊN (từ v1 → v2)

#### 📊 Dashboard (/)
- **Quick stats:** Tổng bài, Đã publish, Đang làm, Trễ deadline
- **Alert banner:** Cảnh báo tasks overdue, lương chưa TT, keyword drop
- **Quick navigation cards:** Lương, Keywords, SEO Score, KPI
- **Bottleneck workflow:** Hiển thị nghẽn ở đâu (content vs SEO)
- **Leaderboard:** Top performers tháng
- **Attention box:** Tasks overdue + sắp trễ, nhóm theo project
- **Planning status:** Thiếu topic / deadline / outline
- **Weekly breakdown:** Tiến độ từng tuần trong tháng
- **Month/Year picker:** Chọn tháng xem

#### 📁 Projects (/projects)
- Danh sách dự án + stats (published/target/overdue)
- Keyword growth chart (positions over time)
- Content stats: bài đăng, URL có ranking
- Detail tables: keywords + URLs

#### 📋 Tasks (/tasks)
- Danh sách tasks filter theo project/PIC/status/month
- Summary cards: Total, Published, In Progress, Overdue, Due Soon
- PIC overview: progress mỗi người
- Link đến content file + published URL

#### 👥 Members (/members)
- Thành viên + published count + on-time rate
- Filter theo day/week/month
- Thông tin cá nhân (bank, email, phone)

#### 💰 Salary (/salary)
- Tự động tính lương: 125k/bài (dưới 20 bài), KPI bonus 500k (đạt 20), 120k/bài vượt
- Dashboard: tổng lương, trend, breakdown theo project
- Trạng thái thanh toán
- Chi tiết tasks đã publish mỗi người

#### 🔍 SEO Audit (/seo-audit)
- Kiểm tra on-page SEO cho 1 URL
- 15 checks: title, meta, keyword density, headings, images, links, technical
- Score 0-100 theo 3 categories: Content, Images, Technical
- Link analysis: internal/external, dofollow/nofollow

#### 📈 Keyword Rankings (/keyword-ranking)
- Track positions theo ngày
- Growth chart: xu hướng keywords
- Filter theo project
- Import từ Google Sheets ranking data

#### ⚙️ Settings (/settings)
- CRUD projects
- Monthly targets
- Google Sheet links

### 6.2 Tính năng MỚI (v2)

#### 🎯 Strategy Planner (/strategy) — MỚI
**Mục đích:** Xem và lập kế hoạch chiến lược dài hạn + ngắn hạn cho mỗi dự án.

- **Timeline Gantt chart:** Hiển thị phases theo thời gian
- **Phase management:** Tạo/sửa phases (Foundation → Expansion → Authority)
- **Action tracker:** Mỗi phase có danh sách actions cụ thể
- **Priority matrix:** Xem cần xử lý phần nào trước
- **Dependencies:** Phase nào phụ thuộc phase nào
- **Progress tracking:** % hoàn thành tự động tính từ actions
- **Cross-project view:** So sánh tiến độ giữa các dự án

```
Ví dụ cho Samco:
Phase 1: Foundation (T1-T2) ████████░░ 80%
  ✅ Technical Audit
  ✅ Keyword Research  
  ✅ Competitor Analysis
  🔄 5 Pillar Pages (đang làm)
  ⬜ 10 Brand Pages

Phase 2: Expansion (T3-T4) ██░░░░░░░░ 20%
  🔄 50 Product Pages
  ⬜ 20 Category Pages
  ⬜ Schema Markup

Phase 3: Authority (T5-T6) ░░░░░░░░░░ 0%
  ⬜ 20+ Blog Posts
  ⬜ Link Building
  ⬜ Expert Content
```

#### 📊 Screaming Frog Import (/audit-import) — MỚI
**Mục đích:** Import CSV từ Screaming Frog, lưu vào DB, xem trên dashboard.

- **Upload CSV:** Drag & drop file CSV
- **Auto-parse:** Nhận diện columns (URL, Status Code, Title, H1, Meta Desc...)
- **Summary dashboard:** Tổng URLs, errors, warnings, redirects
- **Category breakdown:** By status code (2xx, 3xx, 4xx, 5xx)
- **Issue tracker:** Danh sách issues cần fix + trạng thái
- **Compare audits:** So sánh 2 audit (before vs after)
- **History:** Lưu tất cả audits theo timeline

#### 📝 Report Generator (/reports) — MỚI
**Mục đích:** Auto-generate monthly report cho khách hàng.

- **Data aggregation:** Tự động pull data từ DB (GSC, keywords, content, technical)
- **AI-powered highlights:** Claude tóm tắt điểm nổi bật tháng
- **Template-based:** Dùng template chuẩn cho tất cả projects
- **Export PDF/HTML:** Download hoặc gửi link
- **Report history:** Lưu tất cả reports đã tạo

**Template report bao gồm:**
1. Executive Summary (AI-generated)
2. Traffic Overview (GSC data)
3. Keyword Rankings (positions change)
4. Content Published (bài mới tháng này)
5. Technical Improvements (fixes done)
6. Claude AI Activities (những gì AI đã hỗ trợ)
7. Next Month Plan

#### 🤖 Claude Activities (/claude-log) — MỚI
**Mục đích:** Track tất cả những gì Claude đã triển khai.

- **Activity feed:** Timeline các hoạt động của Claude
- **Filter theo type:** Content draft, SEO audit, Report, Analysis
- **Filter theo project**
- **Token usage:** Theo dõi tokens đã dùng
- **Export:** Include trong monthly report cho khách

#### 📡 GSC Integration (/gsc) — MỚI
**Mục đích:** Pull và lưu data từ Google Search Console.

- **Auto-snapshot:** Pull weekly data từ GSC MCP
- **Trend charts:** Clicks, Impressions, CTR, Position over time
- **Top queries:** Keywords có traffic cao nhất
- **Top pages:** Pages có traffic cao nhất
- **Compare periods:** So sánh tuần/tháng
- **Alerts:** Cảnh báo khi traffic drop bất thường

#### 🏗️ Project Template (/settings/templates) — MỚI
**Mục đích:** Chuẩn hóa cấu trúc quản lý cho mọi dự án.

Khi tạo project mới, tự động setup:
- Strategy phases mặc định (5 phases)
- Monthly target mặc định
- GSC property link
- Report template
- Checklist items

---

## 7. CẤU TRÚC THƯ MỤC DỰ ÁN

```
seo-manager-local/
├── 📄 package.json
├── 📄 next.config.mjs
├── 📄 tailwind.config.ts
├── 📄 tsconfig.json
├── 📄 drizzle.config.ts            ← MỚI: Drizzle ORM config
│
├── 📁 data/                         ← DATA (git-ignore)
│   ├── 📄 seo-manager.db           ← SQLite database file
│   ├── 📁 imports/                  ← Screaming Frog CSV uploads
│   ├── 📁 reports/                  ← Generated PDF/HTML reports
│   └── 📁 backups/                  ← DB backups
│
├── 📁 scripts/                      ← CLI & SDK cho Claude Code
│   ├── 📁 sdk/
│   │   └── 📄 seo-manager-sdk.ts   ← ★ Claude Code import file này
│   ├── 📄 cli.js                   ← CLI helper (alternative)
│   ├── 📄 init-db.ts               ← Initialize database
│   ├── 📄 migrate.ts               ← Run migrations
│   ├── 📄 backup-db.ts             ← Backup database
│   └── 📄 seed-data.ts             ← Seed sample data
│
├── 📁 src/
│   ├── 📁 modules/                  ← ★ Module Registry
│   │   └── 📄 registry.ts          ← Sidebar auto-detect từ đây
│   │
│   ├── 📁 app/
│   │   ├── 📄 layout.tsx
│   │   ├── 📄 globals.css
│   │   │
│   │   ├── 📁 (dashboard)/         ← Route group (có sidebar)
│   │   │   ├── 📄 layout.tsx       ← Dashboard layout + Sidebar đọc registry
│   │   │   ├── 📄 page.tsx         ← Dashboard home
│   │   │   ├── 📁 projects/
│   │   │   ├── 📁 tasks/
│   │   │   ├── 📁 members/
│   │   │   ├── 📁 salary/
│   │   │   ├── 📁 seo-audit/
│   │   │   ├── 📁 keyword-ranking/
│   │   │   ├── 📁 settings/
│   │   │   ├── 📁 strategy/        ← Extension module
│   │   │   ├── 📁 reports/         ← Extension module
│   │   │   ├── 📁 audit-import/    ← Extension module
│   │   │   ├── 📁 claude-log/      ← Extension module
│   │   │   ├── 📁 gsc/             ← Extension module
│   │   │   ├── 📁 notes/           ← Extension module
│   │   │   └── 📁 docs/
│   │   │
│   │   └── 📁 api/v1/              ← ★ API versioned! (v1)
│   │       ├── 📁 stats/
│   │       ├── 📁 dashboard/overview/
│   │       ├── 📁 projects/
│   │       │   └── 📁 [id]/
│   │       ├── 📁 tasks/
│   │       │   └── 📁 [id]/
│   │       │       ├── 📁 status/   ← SDK endpoint
│   │       │       └── 📁 publish/  ← SDK endpoint
│   │       ├── 📁 members/
│   │       ├── 📁 salary/
│   │       ├── 📁 seo-check/
│   │       ├── 📁 seo-results/
│   │       ├── 📁 keyword-rankings/
│   │       │   └── 📁 bulk/        ← SDK endpoint (track nhiều keywords)
│   │       ├── 📁 sync/
│   │       ├── 📁 strategy/
│   │       │   ├── 📁 phases/
│   │       │   └── 📁 actions/
│   │       │       └── 📁 [id]/
│   │       ├── 📁 reports/
│   │       ├── 📁 audit-import/
│   │       ├── 📁 claude/
│   │       │   └── 📁 log/         ← SDK endpoint (ghi hoạt động)
│   │       ├── 📁 gsc/
│   │       │   └── 📁 snapshot/    ← SDK endpoint
│   │       ├── 📁 notes/           ← SDK endpoint
│   │       └── 📁 targets/
│   │
│   ├── 📁 components/
│   │   ├── 📄 Sidebar.tsx          ← Đọc registry → auto render menu
│   │   ├── 📄 ProgressBar.tsx
│   │   ├── 📄 StatsCard.tsx
│   │   ├── 📄 StatusBadge.tsx
│   │   ├── 📄 LoadingSpinner.tsx
│   │   ├── 📄 EmptyState.tsx
│   │   ├── 📄 GanttChart.tsx       ← Strategy timeline
│   │   ├── 📄 CSVUploader.tsx      ← SF import
│   │   └── 📄 ReportPreview.tsx    ← Report preview
│   │
│   ├── 📁 db/                      ← Database layer
│   │   ├── 📄 index.ts             ← SQLite connection
│   │   ├── 📁 schema/
│   │   │   ├── 📄 index.ts         ← Export all (thêm module = thêm 1 dòng)
│   │   │   ├── 📄 core.ts          ← projects, tasks, members, salary_payments, sync_logs
│   │   │   ├── 📄 strategy.ts      ← strategy_phases, strategy_actions
│   │   │   ├── 📄 claude.ts        ← claude_activities
│   │   │   ├── 📄 audit.ts         ← audit_results, seo_results
│   │   │   ├── 📄 reports.ts       ← monthly_reports
│   │   │   ├── 📄 gsc.ts           ← gsc_snapshots
│   │   │   └── 📄 notes.ts         ← notes
│   │   └── 📁 migrations/          ← Auto-generated by drizzle-kit
│   │
│   ├── 📁 lib/
│   │   ├── 📄 utils.ts
│   │   ├── 📄 task-helpers.ts
│   │   ├── 📄 db.ts                ← DB helper (thay supabase.ts)
│   │   ├── 📄 api-helpers.ts       ← getWorker(), common API utils
│   │   ├── 📄 csv-parser.ts        ← Parse SF CSV
│   │   └── 📄 report-generator.ts  ← Generate reports
│   │
│   └── 📁 types/
│       └── 📄 index.ts
│
└── 📄 README.md
```

---

## 8. API ROUTES

### 8.1 Giữ nguyên (chuyển Supabase → SQLite, versioned `/api/v1/`)

| Method | Route | Nguồn gọi | Chức năng |
|--------|-------|-----------|-----------|
| GET | `/api/v1/stats` | UI | Dashboard statistics |
| GET | `/api/v1/dashboard/overview` | UI | Manager overview (alerts, finance, SEO) |
| GET/POST/PUT/DELETE | `/api/v1/projects` | UI + **SDK** | CRUD projects |
| GET/POST/PUT/DELETE | `/api/v1/tasks` | UI + **SDK** | CRUD tasks |
| PUT | `/api/v1/tasks/[id]/status` | **SDK** | Update status only |
| PUT | `/api/v1/tasks/[id]/publish` | **SDK** | Mark published + link |
| GET/POST/PUT/DELETE | `/api/v1/members` | UI | CRUD members |
| GET | `/api/v1/salary` | UI | Tính lương |
| GET | `/api/v1/salary/analytics` | UI | Salary trends |
| GET/POST | `/api/v1/salary-payments` | UI | Thanh toán lương |
| POST | `/api/v1/seo-check` | UI + **SDK** | On-page SEO check |
| GET/POST | `/api/v1/seo-results` | UI + **SDK** | Lưu/lấy kết quả SEO audit |
| GET/POST | `/api/v1/keyword-rankings` | UI + **SDK** | CRUD keyword rankings |
| POST | `/api/v1/keyword-rankings/bulk` | **SDK** | Bulk track keywords |
| GET | `/api/v1/keyword-rankings/growth` | UI | Growth chart data |
| GET | `/api/v1/keyword-rankings/analysis` | UI | Content performance analysis |
| GET | `/api/v1/keyword-rankings/details` | UI | Detailed keywords/URLs |
| POST/GET | `/api/v1/sync` | UI | Sync từ Google Sheets |
| GET | `/api/v1/sync/logs` | UI | Sync history |
| GET/POST | `/api/v1/targets` | UI | Monthly targets |

### 8.2 API Routes MỚI

| Method | Route | Nguồn gọi | Chức năng |
|--------|-------|-----------|-----------|
| **Strategy** | | | |
| GET/POST | `/api/v1/strategy/phases` | UI + SDK | CRUD phases |
| GET/POST | `/api/v1/strategy/actions` | UI + **SDK** | CRUD actions |
| PUT | `/api/v1/strategy/actions/[id]` | UI + **SDK** | Update action |
| **Audit Import** | | | |
| POST | `/api/v1/audit-import` | UI + **SDK** | Upload audit data |
| GET | `/api/v1/audit-import` | UI | List audits |
| **Reports** | | | |
| GET/POST | `/api/v1/reports` | UI + **SDK** | CRUD reports |
| GET | `/api/v1/reports/[id]/download` | UI | Download PDF |
| **Claude Log** | | | |
| POST | `/api/v1/claude/log` | **SDK** | ★ Ghi hoạt động Claude |
| GET | `/api/v1/claude/log` | UI | Xem activities |
| **GSC** | | | |
| POST | `/api/v1/gsc/snapshot` | Script + **SDK** | Save GSC data |
| GET | `/api/v1/gsc/trends` | UI | Trends chart |
| **Notes** | | | |
| GET/POST | `/api/v1/notes` | UI + **SDK** | CRUD notes |

> **SDK** = Claude Code gọi qua `seo-manager-sdk.ts`. Auto-attach `X-Worker: claude-code` header.

---

## 9. DATA FLOW & SYNC

### 9.1 Google Sheets → SQLite (Content Tasks)

```
Google Sheets (Content Writers nhập)
        │
        ▼
  API: /api/sync (POST)
        │
        ├── Fetch sheet via gviz API
        ├── Parse rows → map to task fields
        ├── Delete existing tasks for project
        └── Insert new tasks vào SQLite
        │
        ▼
  SQLite: tasks table
```

**Trigger:** Manual button "Sync" trên UI hoặc schedule script.

### 9.2 GSC → SQLite (Search Metrics)

```
Google Search Console
        │
        ▼
  GSC MCP (đã có) hoặc API direct
        │
        ├── get_search_analytics()
        ├── get_performance_overview()
        └── get_search_by_page_query()
        │
        ▼
  API: /api/gsc/snapshot (POST)
        │
        └── Lưu vào gsc_snapshots table
```

**Trigger:** Manual hoặc weekly script.

### 9.3 Screaming Frog → SQLite (Technical Audit)

```
Screaming Frog Desktop
        │
        ▼
  Export CSV file
        │
        ▼
  Upload via UI (/audit-import)
        │
        ▼
  API: /api/audit-import/upload (POST)
        │
        ├── PapaParse: parse CSV
        ├── Categorize issues
        └── Lưu vào audit_results table
```

**Trigger:** Manual upload.

### 9.4 Report Generation Flow

```
  User click "Generate Report" cho Project X, Tháng Y
        │
        ▼
  API: /api/reports/generate (POST)
        │
        ├── Pull từ SQLite:
        │   ├── gsc_snapshots (traffic data)
        │   ├── keyword_rankings (ranking changes)
        │   ├── tasks (content published)
        │   ├── audit_results (technical fixes)
        │   ├── claude_activities (AI work done)
        │   └── strategy_actions (strategy progress)
        │
        ├── Call Claude API:
        │   └── Generate highlights + summary
        │
        ├── Render HTML template
        ├── Convert to PDF (puppeteer)
        └── Lưu vào monthly_reports + file system
        │
        ▼
  Download PDF / View HTML
```

---

## 10. TÍNH NĂNG MỚI CẦN PHÁT TRIỂN

### 10.1 Ma trận ưu tiên

| # | Tính năng | Ưu tiên | Effort | Phụ thuộc |
|---|-----------|---------|--------|-----------|
| 1 | Chuyển Supabase → SQLite | 🔴 P0 | Lớn | Không |
| 2 | Bỏ Auth system (1 user) | 🔴 P0 | Nhỏ | #1 |
| 3 | Strategy Planner | 🔴 P0 | Trung bình | #1 |
| 4 | Chuẩn hóa project template | 🔴 P0 | Nhỏ | #1 |
| 5 | Screaming Frog Import | 🟡 P1 | Trung bình | #1 |
| 6 | Report Generator | 🟡 P1 | Lớn | #1, Claude API |
| 7 | Claude Activities Log | 🟡 P1 | Nhỏ | #1 |
| 8 | GSC Integration (save to DB) | 🟡 P1 | Trung bình | #1, GSC MCP |
| 9 | PDF Export | 🟢 P2 | Trung bình | #6 |
| 10 | Custom SEO Audit Tool | 🟢 P2 | Lớn | #1 |
| 11 | Obsidian File Reader | 🟢 P2 | Nhỏ | #1 |

### 10.2 Bỏ features (không cần cho local 1 user)

| Feature | Lý do bỏ |
|---------|----------|
| Auth system (login/logout) | Chỉ 1 user, chạy local |
| Roles (admin/seo/member) | Không cần phân quyền |
| Sessions table | Không cần |
| User management (/users) | Không cần |
| Activity logs (user tracking) | Thay bằng claude_activities |

---

## 11. KẾ HOẠCH TRIỂN KHAI (PHASES)

### Phase 1: Migration & Foundation (Tuần 1-2)

**Mục tiêu:** App chạy local với đầy đủ tính năng v1 + Module System + Claude Code SDK

| Task | Chi tiết | Thời gian |
|------|----------|-----------|
| Setup project local | Clone repo, install deps mới | 2h |
| Setup SQLite + Drizzle | Schema files, migrations, seed data | 4h |
| Setup Module Registry | `registry.ts`, Sidebar auto-detect | 2h |
| Chuyển tất cả API routes → `/api/v1/` | Supabase → SQLite queries, versioned paths | 8h |
| Bỏ Auth middleware | Remove login, session, roles | 2h |
| Tạo Claude Code SDK | `seo-manager-sdk.ts` + CLI helper | 3h |
| Tạo API middleware | `getWorker()`, auto-log claude activities | 2h |
| Test toàn bộ features v1 | Dashboard, Tasks, Members, Salary, SEO Audit, Keywords | 4h |
| Test SDK endpoints | Claude Code ghi task, log, track keyword | 2h |

**Deliverable:** App chạy `npm run dev` → localhost:3000. Claude Code gọi SDK ghi data thành công.

### Phase 2: Strategy & Standardization (Tuần 3-4)

**Mục tiêu:** Quản lý chiến lược + chuẩn hóa dự án

| Task | Chi tiết | Thời gian |
|------|----------|-----------|
| Strategy Planner UI | Gantt chart, phase cards, action tracker | 8h |
| Strategy API routes | CRUD phases + actions | 4h |
| Project template system | Khi tạo project → auto setup phases | 4h |
| Priority matrix view | Dashboard hiển thị cần làm gì trước | 4h |
| Import strategy từ Obsidian | Đọc START-HERE.md → populate phases | 4h |

**Deliverable:** Mỗi project có strategy planner với phases + actions.

### Phase 3: Data Integration (Tuần 5-6)

**Mục tiêu:** Tích hợp data từ các nguồn bên ngoài

| Task | Chi tiết | Thời gian |
|------|----------|-----------|
| Screaming Frog CSV import | Upload, parse, lưu DB | 6h |
| Audit dashboard | Summary, issues, compare | 6h |
| GSC data save to DB | Snapshot API, lưu gsc_snapshots | 4h |
| GSC trends UI | Charts clicks/impressions/position over time | 4h |
| Claude activity tracking | Log mỗi khi Claude được gọi | 4h |

**Deliverable:** Import SF CSV, xem GSC trends, track Claude activities.

### Phase 4: Reports & Export (Tuần 7-8)

**Mục tiêu:** Auto-generate reports cho khách hàng

| Task | Chi tiết | Thời gian |
|------|----------|-----------|
| Report template design | HTML template cho monthly report | 6h |
| Report data aggregation | Pull tất cả data cần thiết | 4h |
| Claude AI summary | Claude viết highlights | 4h |
| PDF export | Puppeteer render HTML → PDF | 4h |
| Report history + download | Lưu + list + download | 4h |

**Deliverable:** Click 1 nút → generate monthly report PDF cho khách.

---

## 12. HƯỚNG DẪN CÀI ĐẶT & CHẠY

### 12.1 Yêu cầu hệ thống

- **macOS** (đang dùng)
- **Node.js** ≥ 20
- **npm** hoặc **pnpm**
- **Git**

### 12.2 Cài đặt

```bash
# 1. Clone project
cd ~/Projects  # hoặc thư mục bạn muốn
git clone https://github.com/debabanpv-glitch/seo-checker.git seo-manager-local
cd seo-manager-local

# 2. Install dependencies
npm install

# 3. Install dependencies mới
npm install better-sqlite3 drizzle-orm papaparse
npm install -D drizzle-kit @types/better-sqlite3 @types/papaparse

# 4. Tạo file .env.local
cat > .env.local << 'EOF'
# Database
DATABASE_URL=./data/seo-manager.db

# Claude API (optional - cho AI features)
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Google Sheets (giữ nguyên)
# Không cần key — dùng public gviz API

# Screaming Frog (không cần key — import CSV)
EOF

# 5. Initialize database
npm run db:init

# 6. Seed data (optional - dữ liệu mẫu)
npm run db:seed

# 7. Chạy app
npm run dev
```

### 12.3 Truy cập

```
Mở browser → http://localhost:3000
```

### 12.4 Scripts hữu ích

```bash
# Chạy development
npm run dev

# Build production
npm run build && npm start

# Database
npm run db:init       # Tạo DB + tables
npm run db:migrate    # Chạy migrations
npm run db:seed       # Thêm dữ liệu mẫu
npm run db:backup     # Backup DB → data/backups/
npm run db:studio     # Mở Drizzle Studio (xem DB trực quan)

# Sync
npm run sync          # Sync Google Sheets → DB
npm run gsc:pull      # Pull GSC data → DB
```

### 12.5 Backup

```bash
# Manual backup
cp data/seo-manager.db data/backups/seo-manager-$(date +%Y%m%d).db

# Hoặc dùng script
npm run db:backup
```

---

## 13. QUY ƯỚC & CHUẨN HÓA DỰ ÁN

### 13.1 Chuẩn hóa cấu trúc dự án SEO

**Mỗi dự án SEO khi tạo mới sẽ tự động có:**

```
Project: [Tên dự án]
│
├── Strategy Phases (auto-created):
│   ├── Phase 1: Foundation (Tháng 1-2)
│   │   ├── Technical Audit
│   │   ├── Keyword Research
│   │   ├── Competitor Analysis
│   │   ├── Topical Map
│   │   └── Site Structure Optimization
│   │
│   ├── Phase 2: Content Foundation (Tháng 2-3)
│   │   ├── Category/Pillar Pages
│   │   ├── Brand Pages
│   │   ├── Schema Markup
│   │   └── Internal Linking Structure
│   │
│   ├── Phase 3: Content Expansion (Tháng 3-5)
│   │   ├── Product/Service Pages
│   │   ├── Blog Posts
│   │   ├── FAQ Content
│   │   └── GEO/AI Optimization
│   │
│   ├── Phase 4: Authority Building (Tháng 5-7)
│   │   ├── Link Building
│   │   ├── Digital PR
│   │   ├── Expert Content
│   │   └── Social Signals
│   │
│   └── Phase 5: Scale & Optimize (Tháng 7+)
│       ├── A/B Testing
│       ├── Conversion Optimization
│       ├── International SEO
│       └── Continuous Improvement
│
├── Monthly Targets: 20 bài/tháng (default)
├── GSC Property: [auto-link]
├── Report Template: Standard
└── Team Assignment: [Content writers]
```

### 13.2 Workflow chuẩn cho content

```
1. Research (Keyword)     → status_outline: chưa có
2. Outline (Writer)       → status_outline: 1. Doing Outline
3. Fix Outline (Writer)   → status_outline: 1.1 Fixing Outline
4. QC Outline (SEO)       → status_outline: 2. QC Outline
5. Done Outline           → status_outline: 3. Done QC Outline
6. Writing (Writer)       → status_content: 1. Doing
7. Fix Content (Writer)   → status_content: 1.1 Fixing
8. QC Content (SEO)       → status_content: 2. QC Content
9. Done QC                → status_content: 3. Done QC
10. Publish               → status_content: 4. Publish + publish_date
```

### 13.3 Công thức tính lương

```
Nếu published < 20 bài:
  Lương = published × 125,000đ

Nếu published >= 20 bài:
  Base       = 2,500,000đ
  KPI Bonus  = 500,000đ
  Extra      = (published - 20) × 120,000đ
  Tổng       = 2,500,000 + 500,000 + Extra
```

### 13.4 SEO Audit Scoring

| Category | Max Score | Checks |
|----------|-----------|--------|
| Content | ~32 pts | Title, Meta Desc, Sapo, Keyword position, Sub-keywords, H2, Heading length, Word count, Conclusion, Density |
| Images | ~8 pts | Alt text, Alt keyword, Image count |
| Technical | ~9 pts | Canonical, Viewport, Internal links, External links, H1 |
| **Total** | **~49 pts** | **Normalize to 100** |

---

## 14. PHỤ LỤC

### 14.1 Obsidian Data Paths

```
SEO Learning:
/Users/puchinpham/Library/Mobile Documents/iCloud~md~obsidian/Documents/Em/Learn (Học Tập)/SEO Learning 2026

Projects:
/Users/puchinpham/Library/Mobile Documents/iCloud~md~obsidian/Documents/Em/Work (Công Việc)/Projects (Dự Án)
```

#### SEO Learning Structure:
```
SEO Learning 2026/
├── 01_Framework/        ← AEO, AIO, GEO, SXO
├── 02_Technical_SEO/    ← Core Web Vitals, Crawlability, Schema
├── 03_On_Page_SEO/      ← Content Strategy, E-E-A-T, Internal Linking
├── 04_Off_Page_SEO/     ← Link Building, Digital PR
├── 05_GEO_AI_SEO/       ← AI Content, AI Visibility, Prompt Engineering
├── 06_Tools_Resources/  ← Tool guides
├── 07_Templates/        ← Report templates, Content briefs, Checklists
├── 08_Project_Implementation/  ← Phase 1-5 guides, Roadmap
└── 09_Projects/         ← Project-specific implementations
```

#### Projects Structure (active):
```
Projects (Dự Án)/
├── DuLichBinhMinh/    ← 00_Dashboard → 06_Resources
├── Samco/             ← 00_Dashboard → 07_Resources
├── TCNET_Marketing/   ← 00_Dashboard → 06_Resources
└── Done/              ← Coin68, NinaGroup, TieuDiemBongDa, WebsiteXeHoi
```

### 14.2 Google Sheets Column Mapping

| Col | Field | Ký hiệu |
|-----|-------|---------|
| A (0) | STT | stt |
| B (1) | Year | (derived from deadline) |
| C (2) | Month | (derived from deadline) |
| D (3) | Parent Keyword | parent_keyword |
| E (4) | Keyword Sub | keyword_sub |
| F (5) | Search Volume | search_volume |
| G (6) | Title | title |
| H (7) | Outline | outline |
| I (8) | Timeline Outline | timeline_outline |
| J (9) | Status Outline | status_outline |
| K (10) | PIC | pic |
| L (11) | Content File | content_file |
| M (12) | Deadline | deadline |
| N (13) | Status Content | status_content |
| O (14) | Link Publish | link_publish |
| P (15) | Publish Date | publish_date |
| Q (16) | Note | note |

### 14.3 GSC Properties

| Project | GSC Property |
|---------|-------------|
| Samco Tech | sc-domain:samcotech.com.vn |
| TCNET | sc-domain:mangthanhcong.vn |
| Du Lịch Bình Minh | sc-domain:dulichbinhminh.com |

### 14.4 WordPress API (Samco)

```
Site:         https://samcotech.com.vn
Username:     duc
App Password: OUbn TsMp GyKU 58Vv hYhh HEIx
```

### 14.5 Sidebar Navigation (v2)

```
📊 Dashboard          /
📁 Dự án              /projects
📋 Tasks              /tasks
🎯 Chiến lược         /strategy        ← MỚI
🔍 SEO Audit          /seo-audit
📈 Keywords           /keyword-ranking
🏗️ Audit Import       /audit-import    ← MỚI
📡 Search Console     /gsc             ← MỚI
👥 Thành viên         /members
💰 Tính lương         /salary
📝 Reports            /reports         ← MỚI
🤖 Claude Log         /claude-log      ← MỚI
────────────────────
⚙️ Cài đặt            /settings
📖 Docs               /docs
```

---

> **Tài liệu này là blueprint hoàn chỉnh để triển khai dự án.**  
> **3 thứ quan trọng nhất:**
> 1. **Module System** (Mục 4) — thêm module mới = thêm folder, không sửa code cũ
> 2. **Claude Code SDK** (Mục 5) — Claude Code ghi data qua `sdk.tasks.create()`, `sdk.log.activity()`
> 3. **API versioning** — tất cả qua `/api/v1/`, breaking change → tạo `/api/v2/`
>
> Khi bắt đầu code, follow Phase 1 → 2 → 3 → 4 trong mục 13.
