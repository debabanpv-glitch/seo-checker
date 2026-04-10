# Scout Report: WordPress REST API + Audit Data Integration

**Date:** 2026-04-10 21:35  
**Codebase:** /Users/puchinpham/Developer/seo-manager-local  
**Task:** Find WordPress REST API integration, audit data structure, and image-related utilities

---

## 1. WordPress REST API Integration

### Architecture
- **Client Library**: `/Users/puchinpham/Developer/seo-manager-local/src/lib/services/wordpress-rest-api-v2-client.service.ts`
  - `WordPressAPI` class — handles all WP REST API v2 calls via Basic Auth
  - Constructor: `new WordPressAPI(siteUrl, username, appPassword)`
  - Base URL: `{siteUrl}/wp-json/wp/v2`
  - Authentication: Base64-encoded `{username}:{appPassword}` header

### API Endpoints
- **GET `/api/v1/wordpress`** — read operations
  - `action=posts` — fetch published/draft posts (per_page, page, search, status params)
  - `action=pages` — fetch pages
  - `action=categories` — fetch all categories
  - `action=test` — verify connection
- **POST `/api/v1/wordpress`** — write operations
  - `action=create_post` — create new post
  - `action=update_post` — update post (post_id, title, content, status, categories)
  - `action=update_seo` — update Yoast SEO meta (post_id, _yoast_wpseo_title, _yoast_wpseo_metadesc, _yoast_wpseo_focuskw)
- **Route File**: `/Users/puchinpham/Developer/seo-manager-local/src/app/api/v1/wordpress/route.ts`

### Credential Storage Pattern
- **Schema**: `app_config` table (key-value store) in SQLite
  - Table: `/Users/puchinpham/Developer/seo-manager-local/src/lib/db/schema/app-config.ts`
  - CRUD: `/Users/puchinpham/Developer/seo-manager-local/src/lib/services/app-config-crud.service.ts`
- **Keys** per project:
  ```
  wp_{projectId}_site_url
  wp_{projectId}_username
  wp_{projectId}_app_password
  ```
- **Fallback** (global): `wp_site_url`, `wp_username`, `wp_app_password`
- **Access Pattern**:
  ```typescript
  const siteUrl = getAppConfig(`wp_${projectId}_site_url`)?.value;
  const username = getAppConfig(`wp_${projectId}_username`)?.value;
  const appPassword = getAppConfig(`wp_${projectId}_app_password`)?.value;
  ```

### Content Stats Service
- **File**: `/Users/puchinpham/Developer/seo-manager-local/src/lib/services/wordpress-content-stats.service.ts`
- **Function**: `getWPContentStats(projectId: string): Promise<WPContentStats>`
- **Returns**:
  - `configured: boolean`
  - `siteUrl: string | null`
  - `totalPublished: number`
  - `totalDrafts: number`
  - `postsThisMonth: number`
  - `postsLastMonth: number`
  - `latestPosts: WPPostSummary[]` (id, title, date, slug, status)
  - `drafts: WPPostSummary[]`
- **Batch Fetch**: Uses `Promise.all()` for parallel published + draft requests

### WPPost Interface
```typescript
interface WPPost {
  id: number;
  title: { rendered: string };
  slug: string;
  status: string;
  date: string;
  link: string;
  content?: { rendered: string };
  excerpt?: { rendered: string };
  categories?: number[];
  yoast_head_json?: { title?, description?, og_title?, og_description? };
}
```

---

## 2. Audit Data Structure

### Schema
- **Table**: `audit_results` in SQLite
- **File**: `/Users/puchinpham/Developer/seo-manager-local/src/lib/db/schema/audit-results-table.ts`
- **Columns**:
  ```typescript
  id: text (UUID, PK)
  project_id: text (nullable)
  audit_type: text // 'screaming_frog' | 'custom' | 'gsc'
  audit_date: text
  summary: JSON // { total_urls, errors, warnings... }
  details: JSON // per-URL details
  raw_file: text (path to original CSV)
  source: text // 'manual' | 'claude-code'
  created_at: text (auto-generated timestamp)
  ```

### CRUD Service
- **File**: `/Users/puchinpham/Developer/seo-manager-local/src/lib/services/audit-results-crud.service.ts`
- **Functions**:
  - `getAudits(projectId?: string)` — all audits, sorted DESC by created_at
  - `getAudit(id: string)` — single audit (throws if not found)
  - `createAudit(data: { project_id?, audit_type, audit_date, summary?, details?, raw_file?, source? })`
  - `deleteAudit(id: string)`

### SEO Results Table
- **Related but separate table**: `seo_results` (for on-page SEO analysis)
- **File**: `/Users/puchinpham/Developer/seo-manager-local/src/lib/db/schema/seo.ts`
- **Columns**:
  ```typescript
  id: text (UUID, PK)
  url: text (UNIQUE)
  score: integer
  max_score: integer
  content_score: integer
  content_max: integer
  images_score: integer
  images_max: integer
  technical_score: integer
  technical_max: integer
  details: JSON (unknown[])
  links: JSON ({ internal: [], external: [] })
  keywords: JSON ({ primary: string, sub: string[] })
  checked_at: text
  ```
- **CRUD**: `/Users/puchinpham/Developer/seo-manager-local/src/lib/services/seo.service.ts`
  - `getSeoResults(filters)` — query by url/urls with optional minimal projection
  - `upsertSeoResult(url, result)` — insert or update by URL
  - `getBatchSeoResults(urls[], minimal?)` — batch fetch

---

## 3. Image-Related Utilities

### Missing Alt Text Detection
**Status**: NO existing implementation found for missing alt text extraction.

**Implications**:
- Audit data structure has `details: JSON` column but no schema for storing image issues
- SEO results table has `images_score` + `images_max` but no column for specific image problems
- UI component `/src/app/(dashboard)/seo-audit/seo-audit-technical-seo-analysis-tab.tsx` imports `Image` icon from lucide-react but doesn't track alt text issues

### Existing Image-Related Code
- **Icon usage**: `import { Image } from 'lucide-react'` in technical SEO audit component
- **Content fetch**: No existing HTML parser or DOM utilities found
  - No cheerio, jsdom, or similar HTML parsing library in use
  - Fetch calls are used but limited to API routes (WordPress, GSC, Google Sheets)
- **Batch processing patterns**:
  - Backlink checker uses batch processing (dedupe by source_url, concurrency=3, 500ms delay)
  - File: `/Users/puchinpham/Developer/seo-manager-local/src/lib/services/backlink-status-checker.service.ts`
  - Pattern: split URLs, dedupe, batch with concurrency control

---

## 4. Key Integration Patterns

### Batch Processing Pattern (Backlink Status Checker)
```typescript
// From backlink-status-checker.service.ts:
// - Dedupe URLs by source_url
// - Process in batches with Promise.allSettled()
// - Concurrency control: 3 concurrent fetches
// - Delay between batches: 500ms
// - Update DB after each batch
```

### Data Flow Patterns
1. **Credential Resolution** → app_config lookup (project-specific then global fallback)
2. **API Call** → WordPressAPI class method → fetch with Basic Auth header
3. **Response Mapping** → Transform to interface type (WPPost → WPPostSummary)
4. **DB Upsert** → onConflictDoUpdate strategy

### Error Handling
- `WordPressAPI.testConnection()` returns boolean (no exception throw)
- `getWPContentStats()` returns EMPTY state on any error but preserves siteUrl
- API routes use `handleApiError()` for consistent error responses

---

## 5. Database Patterns

### Key-Value Config Pattern
- **UPSERT**: `onConflictDoUpdate` with `updated_at` refresh
- **Query**: Direct `.get()` or `.all()`
- **No validation** in service layer (trusts input)

### Sync Timestamps
- **Text format**: ISO 8601 (e.g., `2026-04-10T21:35:00.000Z`)
- **Auto-generation**: Drizzle's `sql`(datetime('now'))``
- **Manual updates**: `new Date().toISOString()`

---

## 6. Unresolved Questions

1. **Image Alt Text Schema**: How should missing alt text issues be stored?
   - Extend `audit_results.details` JSON structure?
   - Create new `image_audits` table?
   - Add column to `seo_results`?

2. **HTML Parsing**: Which library to use for extracting images from WordPress posts?
   - cheerio (npm available?)
   - Node's built-in DOMParser?
   - Custom regex parser?

3. **WordPress Media Endpoint**: Should we use `/wp/v2/media` to fetch images separately, or parse post HTML content?

4. **Batch Size**: What's the optimal batch size for fetching and analyzing images from N posts?
   - Consider WordPress API rate limits
   - Consider HTML parsing performance

5. **Cron Integration**: Should alt text fixes be triggered via existing cron jobs or new dedicated job?

