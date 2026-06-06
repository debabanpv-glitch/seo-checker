// ---------------------------------------------------------------------------
// Sheet Content Import & Query — upsert Google Sheets CSV data, query helpers
// Dedupes by project_id + stt + month + year
// ---------------------------------------------------------------------------

import { isPublishedStatus } from '@/lib/task-helpers';
import { db } from '@/lib/db';
import { sheetContent, activityLog } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SheetContentInput {
  stt?: number;
  year?: number;
  month?: number;
  parent_keyword?: string;
  sub_keywords?: string;
  search_volume?: number;
  title?: string;
  outline_status?: string;
  pic?: string;
  doc_file?: string;
  deadline?: string;
  content_status?: string;
  publish_url?: string;
  publish_date?: string;
  notes?: string;
}

export interface SheetContentRow {
  id: string;
  project_id: string | null;
  stt: number | null;
  year: number | null;
  month: number | null;
  parent_keyword: string | null;
  sub_keywords: string | null;
  search_volume: number | null;
  title: string | null;
  outline_status: string | null;
  pic: string | null;
  doc_file: string | null;
  deadline: string | null;
  content_status: string | null;
  publish_url: string | null;
  publish_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SheetContentStats {
  total: number;
  published: number;
  inProgress: number;
  byMonth: Array<{ month: number; year: number; total: number; published: number }>;
}

// ── Upsert ─────────────────────────────────────────────────────────────────

export async function upsertSheetContent(
  projectId: string,
  data: SheetContentInput[]
): Promise<{ inserted: number; updated: number }> {
  if (!data.length) return { inserted: 0, updated: 0 };
  let inserted = 0, updated = 0;
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

  await db.transaction(async (tx) => {
    for (const item of data) {
      // Find existing by project_id + stt + month + year
      const existing = (item.stt && item.month && item.year)
        ? (await tx.select({ id: sheetContent.id }).from(sheetContent).where(
            and(
              eq(sheetContent.project_id, projectId),
              eq(sheetContent.stt, item.stt),
              eq(sheetContent.month, item.month),
              eq(sheetContent.year, item.year)
            )
          ))[0]
        : null;

      if (existing) {
        await tx.update(sheetContent).set({
          parent_keyword: item.parent_keyword,
          sub_keywords: item.sub_keywords,
          search_volume: item.search_volume,
          title: item.title,
          outline_status: item.outline_status,
          pic: item.pic,
          doc_file: item.doc_file,
          deadline: item.deadline,
          content_status: item.content_status,
          publish_url: item.publish_url,
          publish_date: item.publish_date,
          notes: item.notes,
          updated_at: nowStr,
        }).where(eq(sheetContent.id, existing.id));
        updated++;
      } else {
        await tx.insert(sheetContent).values({
          id: crypto.randomUUID(),
          project_id: projectId,
          ...item,
          created_at: nowStr,
          updated_at: nowStr,
        });
        inserted++;
      }
    }
  });

  // Log activity
  await db.insert(activityLog).values({
    id: crypto.randomUUID(),
    source: 'sheet',
    action: 'synced',
    description: `Đồng bộ ${data.length} bản ghi nội dung từ Google Sheets`,
    project_id: projectId,
    entity_type: 'content',
  });

  return { inserted, updated };
}

// ── Query ──────────────────────────────────────────────────────────────────

export async function getSheetContent(filters: {
  projectId?: string;
  month?: number;
  year?: number;
  status?: string;
}): Promise<SheetContentRow[]> {
  const conditions = [];
  if (filters.projectId) conditions.push(eq(sheetContent.project_id, filters.projectId));
  if (filters.month) conditions.push(eq(sheetContent.month, filters.month));
  if (filters.year) conditions.push(eq(sheetContent.year, filters.year));
  if (filters.status) conditions.push(eq(sheetContent.content_status, filters.status));

  const where = conditions.length ? and(...conditions) : undefined;
  return (await db.select().from(sheetContent).where(where)) as SheetContentRow[];
}

export async function getSheetContentStats(projectId: string): Promise<SheetContentStats> {
  const rows = await db.select().from(sheetContent)
    .where(eq(sheetContent.project_id, projectId));

  const published = rows.filter(r => isPublishedStatus(r.content_status)).length;

  const inProgress = rows.filter(r =>
    r.content_status?.toLowerCase().includes('progress') ||
    r.content_status?.toLowerCase().includes('writing') ||
    r.content_status?.toLowerCase().includes('đang')
  ).length;

  // Group by month/year
  const monthMap = new Map<string, { month: number; year: number; total: number; published: number }>();
  for (const row of rows) {
    if (!row.month || !row.year) continue;
    const key = `${row.year}-${row.month}`;
    const entry = monthMap.get(key) || { month: row.month, year: row.year, total: 0, published: 0 };
    entry.total++;
    if (isPublishedStatus(row.content_status)) {
      entry.published++;
    }
    monthMap.set(key, entry);
  }

  return {
    total: rows.length,
    published,
    inProgress,
    byMonth: Array.from(monthMap.values()).sort((a, b) =>
      a.year !== b.year ? b.year - a.year : b.month - a.month
    ),
  };
}
