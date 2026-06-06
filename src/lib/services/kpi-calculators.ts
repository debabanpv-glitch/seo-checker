// ---------------------------------------------------------------------------
// KPI calculators — pure helpers dùng chung cho các dashboard/report service
// để tránh mỗi service tự viết lại logic (gây lệch số). V7 — Đợt 1.
// ---------------------------------------------------------------------------
import { isPublishedStatus } from '@/lib/task-helpers';
import { db } from '@/lib/db';
import { auditResults, seoResults } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

/** % thay đổi (current vs previous), làm tròn 1 chữ số. previous=0 → 0. */
export function safePct(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

/** Prefix tháng hiện tại dạng 'YYYY-MM' (dùng đối chiếu publish_date). */
export function currentMonthPrefix(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Đếm strategy actions hoàn thành + tỉ lệ %. */
export function computeStrategyCompletion(
  actions: Array<{ status: string | null }>,
): { total: number; done: number; rate: number } {
  const total = actions.length;
  const done = actions.filter((a) => a.status === 'done').length;
  return { total, done, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
}

/**
 * Đếm số bản ghi "đã publish" theo field trạng thái (dùng isPublishedStatus chung).
 * rows: mảng object; statusField: tên field chứa trạng thái.
 */
export function countPublishedContent<T extends Record<string, unknown>>(
  rows: T[],
  statusField: keyof T,
): number {
  return rows.filter((r) => isPublishedStatus(r[statusField] as string | null)).length;
}

/**
 * Health/SEO score chuẩn của 1 dự án — định nghĩa ĐẦY ĐỦ NHẤT, dùng chung mọi dashboard.
 * Ưu tiên: (1) điểm seo_master_auditor → (2) seo_score từ crawl Screaming Frog →
 * (3) AVG điểm on-page (seo_results theo domain). Trả kèm nguồn để hiển thị minh bạch.
 */
export async function getHealthScore(
  projectId: string,
  domain?: string | null,
): Promise<{ score: number; source: 'auditor' | 'crawl' | 'onpage' | 'none'; checkedPages: number }> {
  const latestAudit = (await db.select().from(auditResults)
    .where(eq(auditResults.project_id, projectId))
    .orderBy(desc(auditResults.audit_date)).limit(1))[0];
  const summary = (latestAudit?.summary || {}) as { seo_score?: number };
  const isAuditor = latestAudit?.audit_type === 'seo_master_auditor';

  let avgScore = 0;
  let checkedPages = 0;
  if (domain) {
    const stat = (await db.select({ avg: sql<number>`AVG(score)`, count: sql<number>`COUNT(*)` })
      .from(seoResults).where(sql`url LIKE ${'%' + domain + '%'}`))[0];
    avgScore = Math.round(Number(stat?.avg) || 0);
    checkedPages = Number(stat?.count) || 0;
  }

  if (isAuditor && summary.seo_score != null) return { score: summary.seo_score, source: 'auditor', checkedPages };
  if (summary.seo_score != null && summary.seo_score > 0) return { score: summary.seo_score, source: 'crawl', checkedPages };
  if (checkedPages > 0) return { score: avgScore, source: 'onpage', checkedPages };
  return { score: 0, source: 'none', checkedPages: 0 };
}

/** Đếm keyword theo tier vị trí (luôn lọc position>0 && <=N). */
export function countKeywordTiers(
  rows: Array<{ position: number | null }>,
  tiers: number[] = [3, 10, 30],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of tiers) {
    out[`top${t}`] = rows.filter((r) => r.position != null && r.position > 0 && r.position <= t).length;
  }
  return out;
}
