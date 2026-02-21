import { db } from '@/lib/db';
import { monthlyReports } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { AppError } from '@/lib/api-response';

export function getReports(projectId?: string, year?: number) {
  const rows = db.select().from(monthlyReports)
    .orderBy(desc(monthlyReports.year), desc(monthlyReports.month))
    .all();

  return rows.filter((r) => {
    if (projectId && r.project_id !== projectId) return false;
    if (year && r.year !== year) return false;
    return true;
  });
}

export function getReport(id: string) {
  const row = db.select().from(monthlyReports).where(eq(monthlyReports.id, id)).get();
  if (!row) throw new AppError('Report not found', 404);
  return row;
}

export function createReport(data: {
  project_id?: string;
  month: number;
  year: number;
  status?: string;
  content?: unknown;
  file_path?: string;
  gsc_data?: unknown;
  ranking_data?: unknown;
  content_data?: unknown;
  technical_data?: unknown;
  highlights?: string;
  next_month_plan?: string;
}) {
  return db.insert(monthlyReports).values({
    project_id: data.project_id ?? null,
    month: data.month,
    year: data.year,
    status: data.status ?? 'draft',
    content: data.content ?? null,
    file_path: data.file_path ?? null,
    gsc_data: data.gsc_data ?? null,
    ranking_data: data.ranking_data ?? null,
    content_data: data.content_data ?? null,
    technical_data: data.technical_data ?? null,
    highlights: data.highlights ?? null,
    next_month_plan: data.next_month_plan ?? null,
  }).onConflictDoUpdate({
    target: [monthlyReports.project_id, monthlyReports.month, monthlyReports.year],
    set: {
      status: data.status ?? 'draft',
      content: data.content ?? null,
      file_path: data.file_path ?? null,
      gsc_data: data.gsc_data ?? null,
      ranking_data: data.ranking_data ?? null,
      content_data: data.content_data ?? null,
      technical_data: data.technical_data ?? null,
      highlights: data.highlights ?? null,
      next_month_plan: data.next_month_plan ?? null,
      updated_at: new Date().toISOString(),
    },
  }).returning().get();
}

export function updateReport(id: string, data: Partial<typeof monthlyReports.$inferInsert>) {
  const updated = db.update(monthlyReports)
    .set({ ...data, updated_at: new Date().toISOString() })
    .where(eq(monthlyReports.id, id))
    .returning().get();
  if (!updated) throw new AppError('Report not found', 404);
  return updated;
}

export function deleteReport(id: string) {
  const row = db.select().from(monthlyReports).where(eq(monthlyReports.id, id)).get();
  if (!row) throw new AppError('Report not found', 404);
  db.delete(monthlyReports).where(eq(monthlyReports.id, id)).run();
}
