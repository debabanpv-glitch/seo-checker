# Phase 10: Client Report Generator — Service, API, Export Modal

**Effort:** 2h | **Depends on:** P5, P6, P8 | **Blocks:** nothing

## Goal
Generate a formatted client-facing report from all dashboard data. Exportable as copyable text, Telegram message, or HTML.

## New Files

### 1. `src/lib/services/client-report-generator.service.ts`

```typescript
// Exported functions:
export function generateClientReport(projectId: string, options: ReportOptions): ClientReport

interface ReportOptions {
  period: 'weekly' | 'monthly';
  sections: ('overview' | 'traffic' | 'keywords' | 'content' | 'backlinks' | 'seo' | 'actions')[];
  format: 'text' | 'html' | 'telegram';
  language: 'vi';  // always Vietnamese
}

interface ClientReport {
  title: string;           // "Báo cáo SEO - {project} - {period}"
  generatedAt: string;
  sections: ReportSection[];
  rawText: string;         // plain text version for clipboard
  htmlContent: string;     // styled HTML for preview/export
  telegramMarkdown: string; // Telegram-compatible markdown
}

interface ReportSection {
  heading: string;
  content: string;
  metrics: Array<{ label: string; value: string; trend?: string }>;
}
```

**Implementation:**
1. Call `getUnifiedDashboardSummary(projectId)` for all data
2. For each requested section, format metrics into Vietnamese prose
3. Generate 3 output formats simultaneously:
   - `rawText`: plain text with section headers, bullet points
   - `htmlContent`: styled divs with colors, tables
   - `telegramMarkdown`: Telegram MarkdownV2 format

**Section templates:**

```
📊 TỔNG QUAN
• Clicks tuần: {N} ({trend}% so với tuần trước)
• Impressions: {N} ({trend}%)
• Từ khóa Top 10: {N}

📈 TỪ KHÓA NỔI BẬT
• Tăng mạnh: {keyword} (+{N} vị trí)
• Giảm mạnh: {keyword} (-{N} vị trí)

📝 NỘI DUNG
• Đã xuất bản tháng này: {N} bài
• Đang viết: {N} bài
• Tiến độ: {N}% so với mục tiêu

🔗 BACKLINKS
• Tổng: {N} | Sống: {N} | Mới: {N}
• DR trung bình: {N}

🏗️ SEO AUDIT
• Điểm trung bình: {N}/100
• Kỹ thuật: {N} | Nội dung: {N} | E-E-A-T: {N}

✅ HÀNH ĐỘNG TIẾP THEO
• {action 1}
• {action 2}
• {action 3}
```

### 2. `src/app/api/v1/reports/client/route.ts`

```typescript
export const dynamic = 'force-dynamic';

// GET /api/v1/reports/client?project_id=X&period=weekly&format=text&sections=overview,traffic,keywords
// → calls generateClientReport()
// → returns ClientReport JSON
```

### 3. `src/app/(dashboard)/dashboard-v2-client-report-modal.tsx`

**Trigger:** "Xuất báo cáo" button in Overview tab header.

**UI:**
- Modal overlay with configuration form:
  - Project selector (dropdown)
  - Period: Tuần / Tháng (radio)
  - Sections: checkboxes (all checked by default)
  - Format: Văn bản / HTML / Telegram (tabs)
- Preview area: rendered report in selected format
- Action buttons:
  - "Sao chép" — copies rawText to clipboard
  - "Gửi Telegram" — POST to `/api/v1/telegram/send-message` with telegramMarkdown
  - "Tải HTML" — download htmlContent as .html file

**State:** open/closed modal, config form, preview content, loading.

### 4. `src/lib/services/index.ts` — MODIFY
Add export:
```typescript
export * from './client-report-generator.service';
```

## Acceptance Criteria
- [ ] Report generates for each project with all sections
- [ ] Plain text format readable, well-structured
- [ ] HTML format has basic styling (inline CSS for portability)
- [ ] Telegram format compatible with MarkdownV2
- [ ] Copy to clipboard works
- [ ] Telegram send works (reuses existing Telegram integration)
- [ ] Modal opens/closes cleanly
- [ ] Sections toggle on/off in preview

## Notes
- Vietnamese prose: concise, professional tone. No emojis in HTML format, emojis OK in Telegram/text.
- HTML export: inline CSS only (no external stylesheets) for email/standalone compatibility
- Telegram: respect 4096 char limit. If report exceeds, split into multiple messages.
- "Hành động tiếp theo" section: derive from strategy_actions where status != 'done', top 3 by priority
- This is the final phase — depends on data from Overview, Growth, and SEO Strength tabs being functional
