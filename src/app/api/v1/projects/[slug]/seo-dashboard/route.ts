import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema/projects';
import { auditResults } from '@/lib/db/schema/audit-results-table';
import { seoResults } from '@/lib/db/schema/seo';
import { eq, or, desc, like } from 'drizzle-orm';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Find project by slug or id
    const project = db
      .select()
      .from(projects)
      .where(or(eq(projects.slug, slug), eq(projects.id, slug)))
      .get();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get all audit results for this project ordered by audit_date DESC
    const audits = db
      .select()
      .from(auditResults)
      .where(eq(auditResults.project_id, project.id))
      .orderBy(desc(auditResults.audit_date))
      .all();

    const latestAudit = audits[0] || null;

    // Get seo_results for URLs matching project domain
    const domain = project.domain || project.website || '';
    let seoStats: {
      totalPages: number;
      avgScore: number;
      avgContentScore: number;
      avgTechnicalScore: number;
      avgImagesScore: number;
      topIssues: Array<{ type: string; count: number; severity: string }>;
      scoreDistribution: { good: number; average: number; poor: number };
    } = {
      totalPages: 0,
      avgScore: 0,
      avgContentScore: 0,
      avgTechnicalScore: 0,
      avgImagesScore: 0,
      topIssues: [],
      scoreDistribution: { good: 0, average: 0, poor: 0 },
    };

    if (domain) {
      const domainPattern = `%${domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}%`;
      const seoRows = db
        .select()
        .from(seoResults)
        .where(like(seoResults.url, domainPattern))
        .all();

      if (seoRows.length > 0) {
        const total = seoRows.length;
        const sumScore = seoRows.reduce((s, r) => s + r.score, 0);
        const sumContent = seoRows.reduce((s, r) => s + r.content_score, 0);
        const sumTech = seoRows.reduce((s, r) => s + r.technical_score, 0);
        const sumImages = seoRows.reduce((s, r) => s + r.images_score, 0);

        // Score distribution (normalize to 0-100)
        const normalizeScore = (r: typeof seoRows[0]) =>
          r.max_score > 0 ? Math.round((r.score / r.max_score) * 100) : r.score;

        const scoreDistribution = { good: 0, average: 0, poor: 0 };
        const issueMap: Record<string, number> = {};

        for (const row of seoRows) {
          const normalized = normalizeScore(row);
          if (normalized >= 80) scoreDistribution.good++;
          else if (normalized >= 60) scoreDistribution.average++;
          else scoreDistribution.poor++;

          // Aggregate issues from details
          const details = row.details as Array<{ type?: string; status?: string; label?: string }> | null;
          if (Array.isArray(details)) {
            for (const d of details) {
              if (d.status === 'fail' || d.status === 'warning') {
                const key = d.type || d.label || 'unknown';
                issueMap[key] = (issueMap[key] || 0) + 1;
              }
            }
          }
        }

        // Top 5 issues
        const topIssues = Object.entries(issueMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([type, count]) => ({
            type,
            count,
            severity: count > total * 0.5 ? 'critical' : count > total * 0.2 ? 'warning' : 'info',
          }));

        seoStats = {
          totalPages: total,
          avgScore: total > 0 ? Math.round(sumScore / total) : 0,
          avgContentScore: total > 0 ? Math.round(sumContent / total) : 0,
          avgTechnicalScore: total > 0 ? Math.round(sumTech / total) : 0,
          avgImagesScore: total > 0 ? Math.round(sumImages / total) : 0,
          topIssues,
          scoreDistribution,
        };
      }
    }

    // Audit history summary
    const auditHistory = audits.slice(0, 10).map((a) => {
      const summary = a.summary as Record<string, unknown> | null;
      return {
        id: a.id,
        audit_date: a.audit_date,
        audit_type: a.audit_type,
        total_urls: summary?.total_urls ?? 0,
        indexable: summary?.indexable ?? 0,
        status_200: summary?.status_200 ?? 0,
        status_3xx: summary?.status_3xx ?? 0,
        status_4xx: summary?.status_4xx ?? 0,
        errors: summary?.errors ?? 0,
        warnings: summary?.warnings ?? 0,
        avg_response_ms: summary?.avg_response_ms ?? 0,
        orphan_pages: summary?.orphan_pages ?? 0,
      };
    });

    // Latest audit parsed
    let latestAuditParsed = null;
    if (latestAudit) {
      const s = latestAudit.summary as Record<string, unknown> | null;
      latestAuditParsed = {
        id: latestAudit.id,
        audit_date: latestAudit.audit_date,
        audit_type: latestAudit.audit_type,
        total_urls: s?.total_urls ?? 0,
        indexable: s?.indexable ?? 0,
        status_200: s?.status_200 ?? 0,
        status_3xx: s?.status_3xx ?? 0,
        status_4xx: s?.status_4xx ?? 0,
        errors: s?.errors ?? 0,
        warnings: s?.warnings ?? 0,
        avg_response_ms: s?.avg_response_ms ?? 0,
        orphan_pages: s?.orphan_pages ?? 0,
        internal_links: s?.internal_links ?? 0,
        avg_inlinks: s?.avg_inlinks ?? 0,
        broken_links: s?.broken_links ?? 0,
        thin_content: s?.thin_content ?? 0,
        avg_word_count: s?.avg_word_count ?? 0,
        duplicate_content: s?.duplicate_content ?? 0,
        avg_speed_score: s?.avg_speed_score ?? 0,
        security_headers: s?.security_headers ?? 0,
        schema_coverage: s?.schema_coverage ?? 0,
        redirect_chains: s?.redirect_chains ?? 0,
      };
    }

    return NextResponse.json({
      project,
      latestAudit: latestAuditParsed,
      seoStats,
      auditHistory,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
