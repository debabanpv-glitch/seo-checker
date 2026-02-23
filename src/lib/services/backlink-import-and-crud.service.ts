import { db } from '@/lib/db';
import { backlinks, backlinkTracking } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';

// ── Helpers ──────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return ''; }
}

/** Parse dd/MM/yyyy HH:mm or dd/MM/yyyy to ISO date string */
function parseDate(raw: string | number | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  // dd/MM/yyyy HH:mm:ss or dd/MM/yyyy HH:mm
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const [, day, month, year] = m;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // Excel serial date
  if (typeof raw === 'number') {
    const d = new Date((raw - 25569) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

// ── Types ────────────────────────────────────────────────────────────────

interface BacklinkRow {
  stt?: number;
  ads_id?: number;
  anchor_text_before: string;
  keyword: string;
  anchor_text_after: string;
  dofollow: boolean;
  target_url: string;
  source_url: string;
  start_date: string | null;
  end_date: string | null;
  order_name: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
}

// ── Import from XLS/CSV buffer ───────────────────────────────────────────

export function importBacklinksFromBuffer(
  buffer: Buffer,
  filename: string,
  projectId: string,
): ImportResult {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Find header row (contains "Từ khóa")
  let headerIdx = -1;
  for (let i = 0; i < Math.min(raw.length, 10); i++) {
    const row = raw[i];
    if (Array.isArray(row) && row.some((c) => String(c).includes('Từ khóa'))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    return { total: 0, imported: 0, skipped: 0, errors: ['Không tìm thấy header "Từ khóa" trong file'] };
  }

  const dataRows = raw.slice(headerIdx + 1).filter(
    (r) => Array.isArray(r) && r.length > 3 && r[3],
  );

  const result: ImportResult = { total: dataRows.length, imported: 0, skipped: 0, errors: [] };
  const parsed: BacklinkRow[] = [];

  for (const row of dataRows) {
    try {
      parsed.push({
        stt: Number(row[0]) || undefined,
        ads_id: Number(row[1]) || undefined,
        anchor_text_before: String(row[2] ?? ''),
        keyword: String(row[3] ?? '').trim(),
        anchor_text_after: String(row[4] ?? ''),
        dofollow: row[5] === 1 || row[5] === '1' || row[5] === true,
        target_url: String(row[6] ?? '').trim(),
        source_url: String(row[7] ?? '').trim(),
        start_date: parseDate(row[8] as string | number),
        end_date: parseDate(row[9] as string | number),
        order_name: String(row[10] ?? ''),
      });
    } catch {
      result.skipped++;
    }
  }

  // Batch insert
  for (const row of parsed) {
    if (!row.keyword || !row.source_url) { result.skipped++; continue; }
    try {
      db.insert(backlinks).values({
        project_id: projectId,
        keyword: row.keyword,
        anchor_text_before: row.anchor_text_before,
        anchor_text_after: row.anchor_text_after,
        target_url: row.target_url,
        source_url: row.source_url,
        source_domain: extractDomain(row.source_url),
        dofollow: row.dofollow,
        order_name: String(row.order_name),
        ads_id: row.ads_id,
        start_date: row.start_date,
        end_date: row.end_date,
      }).run();
      result.imported++;
    } catch (e) {
      result.skipped++;
      if (result.errors.length < 5) result.errors.push(String(e));
    }
  }

  return result;
}

// ── Import from file path ────────────────────────────────────────────────

export function importBacklinksFromPath(
  filePath: string,
  projectId: string,
): ImportResult {
  const fs = require('fs') as typeof import('fs');
  const buffer = fs.readFileSync(filePath);
  const filename = filePath.split('/').pop() ?? 'file';
  return importBacklinksFromBuffer(Buffer.from(buffer), filename, projectId);
}

// ── CRUD ─────────────────────────────────────────────────────────────────

export function getBacklinks(projectId?: string) {
  if (projectId) {
    return db.select().from(backlinks)
      .where(eq(backlinks.project_id, projectId))
      .orderBy(desc(backlinks.created_at))
      .all();
  }
  return db.select().from(backlinks)
    .orderBy(desc(backlinks.created_at))
    .all();
}

export function getBacklinkStats(projectId?: string) {
  const where = projectId ? sql`WHERE project_id = ${projectId}` : sql``;
  const rawDb = (db as unknown as { _: { session: { client: { exec: (s: string) => unknown } } } });

  const all = getBacklinks(projectId);
  const totalBacklinks = all.length;
  const uniqueDomains = new Set(all.map((b) => b.source_domain)).size;
  const uniqueKeywords = new Set(all.map((b) => b.keyword)).size;
  const dofollowCount = all.filter((b) => b.dofollow).length;

  // Group by keyword
  const keywordMap = new Map<string, { count: number; domains: Set<string>; target_url: string }>();
  for (const b of all) {
    const k = b.keyword.toLowerCase();
    if (!keywordMap.has(k)) keywordMap.set(k, { count: 0, domains: new Set(), target_url: b.target_url });
    const entry = keywordMap.get(k)!;
    entry.count++;
    entry.domains.add(b.source_domain);
  }
  const keywordSummary = Array.from(keywordMap.entries()).map(([kw, v]) => ({
    keyword: kw,
    backlink_count: v.count,
    domain_count: v.domains.size,
    target_url: v.target_url,
  })).sort((a, b) => b.backlink_count - a.backlink_count);

  // Group by domain
  const domainMap = new Map<string, number>();
  for (const b of all) {
    domainMap.set(b.source_domain, (domainMap.get(b.source_domain) ?? 0) + 1);
  }
  const domainSummary = Array.from(domainMap.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);

  // Expiring soon (within 30 days)
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const expiringSoon = all.filter((b) => b.end_date && b.end_date <= in30Days && b.end_date >= now.toISOString().slice(0, 10));

  return {
    totalBacklinks,
    uniqueDomains,
    uniqueKeywords,
    dofollowCount,
    nofollowCount: totalBacklinks - dofollowCount,
    keywordSummary,
    domainSummary,
    expiringSoon: expiringSoon.length,
  };
}

export function deleteBacklinksByProject(projectId: string) {
  db.delete(backlinks).where(eq(backlinks.project_id, projectId)).run();
}

export function deleteAllBacklinks() {
  db.delete(backlinks).run();
}

// ── Tracking ─────────────────────────────────────────────────────────────

export function addTrackingEntry(data: {
  backlink_id: string;
  keyword: string;
  position?: number;
  clicks?: number;
  impressions?: number;
}) {
  return db.insert(backlinkTracking).values({
    backlink_id: data.backlink_id,
    keyword: data.keyword,
    position: data.position ?? null,
    clicks: data.clicks ?? 0,
    impressions: data.impressions ?? 0,
  }).returning().get();
}

export function getTrackingByKeyword(keyword: string) {
  return db.select().from(backlinkTracking)
    .where(eq(backlinkTracking.keyword, keyword))
    .orderBy(desc(backlinkTracking.checked_at))
    .all();
}
