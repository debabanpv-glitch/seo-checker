import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema/projects';
import { auditResults } from '@/lib/db/schema/audit-results-table';
import { eq, desc } from 'drizzle-orm';
import { handleApiError } from '@/lib/api-response';
import { getSnapshots } from '@/lib/services/gsc-snapshots-save-and-query.service';
import { getKeywordInsights } from '@/lib/services/keyword-insights-aggregator.service';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditSummary {
  seo_score?: number;
  content_score?: number;
  technical_score?: number;
  images_score?: number;
  links_score?: number;
  eeat_score?: number;
  ai_readiness_score?: number;
  [key: string]: unknown;
}

interface DailyPoint {
  date: string;
  clicks: number;
  impressions: number;
}

// ---------------------------------------------------------------------------
// GET /api/v1/dashboard/seo-summary
// ---------------------------------------------------------------------------

export function GET() {
  try {
    const allProjects = db.select().from(projects)
      .where(eq(projects.status, 'active'))
      .all();

    const dailyMap = new Map<string, { clicks: number; impressions: number }>();

    const projectSummaries = allProjects.map((project) => {
      try {
        // --- GSC data ---
        const snapshots = getSnapshots(project.id);
        const weeklySnaps = snapshots.filter((s) => s.period === 'weekly');
        const latest = weeklySnaps[0] ?? null;
        const prev = weeklySnaps[1] ?? null;

        // Collect daily snapshots for trend chart
        const dailySnaps = snapshots.filter((s) => s.period === 'daily');
        for (const snap of dailySnaps) {
          const existing = dailyMap.get(snap.date);
          if (existing) {
            existing.clicks += snap.clicks;
            existing.impressions += snap.impressions;
          } else {
            dailyMap.set(snap.date, { clicks: snap.clicks, impressions: snap.impressions });
          }
        }

        // If no daily, use weekly for trend
        if (dailySnaps.length === 0 && latest) {
          const existing = dailyMap.get(latest.date);
          if (existing) {
            existing.clicks += latest.clicks;
            existing.impressions += latest.impressions;
          } else {
            dailyMap.set(latest.date, { clicks: latest.clicks, impressions: latest.impressions });
          }
        }

        const gsc = {
          clicks: latest?.clicks ?? 0,
          impressions: latest?.impressions ?? 0,
          ctr: latest?.ctr ?? 0,
          position: latest?.position ?? 0,
          prevClicks: prev?.clicks ?? null,
          prevImpressions: prev?.impressions ?? null,
        };

        // --- Keyword data ---
        let keywords = {
          total: 0, top3: 0, top10: 0, top20: 0, top50: 0, beyond50: 0,
          improved: 0, declined: 0,
        };

        try {
          const ki = getKeywordInsights(project.id);
          const tiers = ki.tiers;
          const top3Count = tiers.top5.filter((k) => k.currentPosition <= 3).length;
          const top10Count = tiers.top5.filter((k) => k.currentPosition > 3).length + tiers.top10.length;
          const top20Count = tiers.top15.length;
          const top50Count = tiers.top30.length;
          const beyond50Count = tiers.beyond30.length;

          keywords = {
            total: ki.summary.total,
            top3: top3Count,
            top10: top3Count + top10Count,
            top20: top3Count + top10Count + top20Count,
            top50: top3Count + top10Count + top20Count + top50Count,
            beyond50: beyond50Count,
            improved: ki.summary.improved,
            declined: ki.summary.declined,
          };
        } catch {
          // no keyword data — keep zeros
        }

        // --- Health score from latest audit ---
        let healthScore = 0;
        let auditDate: string | null = null;
        let categoryScores: Record<string, number> | null = null;
        try {
          const latestAudit = db.select().from(auditResults)
            .where(eq(auditResults.project_id, project.id))
            .orderBy(desc(auditResults.audit_date))
            .limit(1)
            .get();

          if (latestAudit) {
            auditDate = latestAudit.audit_date;
            const summary = (latestAudit.summary || {}) as AuditSummary;
            healthScore = summary.seo_score || 0;
            // Category scores from seo-master-auditor
            if (summary.content_score != null) {
              categoryScores = {
                content: summary.content_score || 0,
                technical: summary.technical_score || 0,
                images: summary.images_score || 0,
                links: summary.links_score || 0,
                eeat: summary.eeat_score || 0,
                aiReadiness: summary.ai_readiness_score || 0,
              };
            }
          }
        } catch {
          // no audit data
        }

        return {
          id: project.id,
          name: project.name,
          slug: project.slug,
          domain: project.domain,
          gsc,
          keywords,
          healthScore,
          auditDate,
          categoryScores,
        };
      } catch {
        // Fallback for this project
        return {
          id: project.id,
          name: project.name,
          slug: project.slug,
          domain: project.domain,
          gsc: { clicks: 0, impressions: 0, ctr: 0, position: 0, prevClicks: null, prevImpressions: null },
          keywords: { total: 0, top3: 0, top10: 0, top20: 0, top50: 0, beyond50: 0, improved: 0, declined: 0 },
          healthScore: 0,
          auditDate: null,
        };
      }
    });

    // --- Totals ---
    const totals = {
      clicks: projectSummaries.reduce((s, p) => s + p.gsc.clicks, 0),
      impressions: projectSummaries.reduce((s, p) => s + p.gsc.impressions, 0),
      totalKeywords: projectSummaries.reduce((s, p) => s + p.keywords.total, 0),
      keywordsInTop10: projectSummaries.reduce((s, p) => s + p.keywords.top10, 0),
      improved: projectSummaries.reduce((s, p) => s + p.keywords.improved, 0),
      declined: projectSummaries.reduce((s, p) => s + p.keywords.declined, 0),
    };

    // --- Daily trend (sorted asc) ---
    const dailyTrend: DailyPoint[] = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, clicks: v.clicks, impressions: v.impressions }));

    // --- Keyword distribution (aggregate all projects) ---
    const distribution = {
      top3: projectSummaries.reduce((s, p) => s + p.keywords.top3, 0),
      top10: projectSummaries.reduce((s, p) => s + (p.keywords.top10 - p.keywords.top3), 0),
      top20: projectSummaries.reduce((s, p) => s + (p.keywords.top20 - p.keywords.top10), 0),
      top50: projectSummaries.reduce((s, p) => s + (p.keywords.top50 - p.keywords.top20), 0),
      beyond50: projectSummaries.reduce((s, p) => s + p.keywords.beyond50, 0),
    };

    return NextResponse.json({
      projects: projectSummaries,
      totals,
      dailyTrend,
      distribution,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
