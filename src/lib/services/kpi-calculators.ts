// ---------------------------------------------------------------------------
// KPI calculators — pure helpers dùng chung cho các dashboard/report service
// để tránh mỗi service tự viết lại logic (gây lệch số). V7 — Đợt 1.
// ---------------------------------------------------------------------------
import { isPublishedStatus } from '@/lib/task-helpers';

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
