import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gscSnapshots, keywordRankings, sheetContent, notionContent, backlinks, auditResults, projects } from '@/lib/db/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

interface GrowthRow {
  period_label: string;
  clicks: number;
  clicks_delta: number | null;
  impressions: number;
  impressions_delta: number | null;
  kw_top10: number;
  kw_top10_delta: number | null;
  content_published: number;
  content_published_delta: number | null;
  backlinks_new: number;
  backlinks_new_delta: number | null;
  audit_score: number;
  audit_score_delta: number | null;
}

function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const projectId = sp.get('project_id') ?? undefined;
    const period = (sp.get('period') ?? 'weekly') as 'weekly' | 'monthly';

    // Get all GSC snapshots
    const snapshots = projectId
      ? db.select().from(gscSnapshots).where(eq(gscSnapshots.project_id, projectId)).orderBy(desc(gscSnapshots.date)).all()
      : db.select().from(gscSnapshots).orderBy(desc(gscSnapshots.date)).all();

    // Group snapshots by period
    const grouped = new Map<string, { clicks: number; impressions: number; dates: string[] }>();

    for (const s of snapshots) {
      let key: string;
      if (period === 'weekly') {
        const w = getWeekNumber(s.date);
        const m = new Date(s.date).getMonth() + 1;
        const y = new Date(s.date).getFullYear();
        key = `T${w} ${String(m).padStart(2, '0')}/${y}`;
      } else {
        const d = new Date(s.date);
        key = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
      }
      const entry = grouped.get(key) || { clicks: 0, impressions: 0, dates: [] };
      entry.clicks += s.clicks;
      entry.impressions += s.impressions;
      entry.dates.push(s.date);
      grouped.set(key, entry);
    }

    // Get keyword rankings by latest check dates
    const kwConditions = projectId ? eq(keywordRankings.project_id, projectId) : undefined;
    const allKw = db.select({
      check_date: keywordRankings.date,
      position: keywordRankings.position,
    }).from(keywordRankings).where(kwConditions).all();

    // Group KW top10 by check date
    const kwByDate = new Map<string, number>();
    for (const kw of allKw) {
      if (!kw.check_date || !kw.position || kw.position > 10) continue;
      const dateKey = kw.check_date.slice(0, 10);
      kwByDate.set(dateKey, (kwByDate.get(dateKey) || 0) + 1);
    }

    // Content published counts
    const scConditions = projectId ? eq(sheetContent.project_id, projectId) : undefined;
    const sheetRows = db.select({
      publish_date: sheetContent.publish_date,
      content_status: sheetContent.content_status,
    }).from(sheetContent).where(scConditions).all();

    // Backlinks by first_seen (created_at)
    const blConditions = projectId ? eq(backlinks.project_id, projectId) : undefined;
    const blRows = db.select({ created_at: backlinks.created_at }).from(backlinks).where(blConditions).all();

    // Latest audit score
    const auditRows = projectId
      ? db.select({ summary: auditResults.summary }).from(auditResults).where(eq(auditResults.project_id, projectId)).orderBy(desc(auditResults.created_at)).limit(1).all()
      : db.select({ summary: auditResults.summary }).from(auditResults).orderBy(desc(auditResults.created_at)).limit(3).all();

    let latestAuditScore = 0;
    if (auditRows.length > 0) {
      try {
        const s = typeof auditRows[0].summary === 'string' ? JSON.parse(auditRows[0].summary) : auditRows[0].summary;
        latestAuditScore = s?.seo_score ?? 0;
      } catch { /* ignore */ }
    }

    // Build rows from grouped periods
    const periodKeys = Array.from(grouped.keys()).slice(0, 12);
    const rows: GrowthRow[] = [];

    for (let i = 0; i < periodKeys.length; i++) {
      const key = periodKeys[i];
      const curr = grouped.get(key)!;
      const prev = i + 1 < periodKeys.length ? grouped.get(periodKeys[i + 1]) : null;

      // Count content published in this period's dates
      const periodDates = new Set(curr.dates.map(d => d.slice(0, 7)));
      const contentCount = sheetRows.filter(r =>
        r.publish_date && periodDates.has(r.publish_date.slice(0, 7)) &&
        (r.content_status?.toLowerCase().includes('publish') || r.content_status?.toLowerCase().includes('done'))
      ).length;
      const prevContentCount = prev
        ? sheetRows.filter(r => {
            const prevDates = new Set(prev.dates.map(d => d.slice(0, 7)));
            return r.publish_date && prevDates.has(r.publish_date.slice(0, 7)) &&
              (r.content_status?.toLowerCase().includes('publish') || r.content_status?.toLowerCase().includes('done'));
          }).length
        : 0;

      // Backlinks new in period
      const blCount = blRows.filter(r =>
        r.created_at && curr.dates.some(d => r.created_at.startsWith(d.slice(0, 7)))
      ).length;
      const prevBlCount = prev
        ? blRows.filter(r => r.created_at && prev.dates.some(d => r.created_at.startsWith(d.slice(0, 7)))).length
        : 0;

      // KW top10 — use nearest check date
      const nearestDate = curr.dates[0]?.slice(0, 10);
      const kwTop10 = nearestDate ? (kwByDate.get(nearestDate) || 0) : 0;
      const prevNearestDate = prev?.dates[0]?.slice(0, 10);
      const prevKwTop10 = prevNearestDate ? (kwByDate.get(prevNearestDate) || 0) : 0;

      rows.push({
        period_label: key,
        clicks: curr.clicks,
        clicks_delta: prev ? calcDelta(curr.clicks, prev.clicks) : null,
        impressions: curr.impressions,
        impressions_delta: prev ? calcDelta(curr.impressions, prev.impressions) : null,
        kw_top10: kwTop10,
        kw_top10_delta: prev ? kwTop10 - prevKwTop10 : null,
        content_published: contentCount,
        content_published_delta: prev ? contentCount - prevContentCount : null,
        backlinks_new: blCount,
        backlinks_new_delta: prev ? blCount - prevBlCount : null,
        audit_score: latestAuditScore,
        audit_score_delta: null,
      });
    }

    // Get project info
    const project = projectId
      ? db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)).get()
      : null;

    return NextResponse.json({
      project: project || { id: 'all', name: 'Tất cả dự án' },
      period,
      rows,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
