import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema/projects';
import { auditResults } from '@/lib/db/schema/audit-results-table';
import { seoResults } from '@/lib/db/schema/seo';
import { eq, desc, sql } from 'drizzle-orm';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

interface AuditSummary {
  total_urls?: number;
  seo_score?: number;
  // SF crawl format
  status_200?: number;
  status_301?: number;
  status_404?: number;
  avg_speed?: number;
  // Auditor format
  status_3xx?: number;
  status_4xx?: number;
  avg_response_ms?: number;
  status_codes?: Record<string, number>;
  // Category scores (auditor)
  content_score?: number;
  technical_score?: number;
  images_score?: number;
  links_score?: number;
  eeat_score?: number;
  ai_readiness_score?: number;
  // Shared
  orphan_pages?: number;
  indexable?: number;
  [key: string]: unknown;
}

export function GET() {
  try {
    // Get all active projects
    const allProjects = db.select().from(projects)
      .where(eq(projects.status, 'active'))
      .all();

    // For each project, get the latest audit + avg SEO score
    const projectCards = allProjects.map((project) => {
      // Latest audit result for this project
      const latestAudit = db.select().from(auditResults)
        .where(eq(auditResults.project_id, project.id))
        .orderBy(desc(auditResults.audit_date))
        .limit(1)
        .get();

      // Avg SEO score from seo_results for URLs matching project domain
      let avgScore = 0;
      let checkedPages = 0;
      const domainValue = project.domain || project.website;
      if (domainValue) {
        const domainPattern = `%${domainValue}%`;
        const seoStats = db.select({
          avgScore: sql<number>`AVG(score)`,
          count: sql<number>`COUNT(*)`,
        }).from(seoResults)
          .where(sql`url LIKE ${domainPattern}`)
          .get();
        avgScore = Math.round(seoStats?.avgScore || 0);
        checkedPages = seoStats?.count || 0;
      }

      const summary = (latestAudit?.summary || {}) as AuditSummary;
      const isAuditor = latestAudit?.audit_type === 'seo_master_auditor';

      // Use auditor seo_score when available, fallback to seo_results avg
      const healthScore = isAuditor ? (summary.seo_score || 0) : avgScore;

      // Map status codes: auditor uses status_3xx/status_4xx, SF uses status_301/status_404
      const sc = summary.status_codes || {};
      const status200 = summary.status_200 || sc['200'] || 0;
      const status301 = summary.status_301 || summary.status_3xx || sc['301'] || 0;
      const status404 = summary.status_404 || summary.status_4xx || sc['404'] || 0;

      // Auditor stores ms, SF stores seconds
      const avgSpeed = isAuditor
        ? +((summary.avg_response_ms || 0) / 1000).toFixed(1)
        : (summary.avg_speed || 0);

      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        domain: project.domain,
        healthScore,
        checkedPages,
        auditDate: latestAudit?.audit_date || null,
        auditType: latestAudit?.audit_type || null,
        stats: {
          totalPages: summary.total_urls || 0,
          status200,
          status301,
          status404,
          avgSpeed,
          orphanPages: summary.orphan_pages || 0,
          indexable: summary.indexable || 0,
        },
        categoryScores: isAuditor ? {
          content: summary.content_score || 0,
          technical: summary.technical_score || 0,
          images: summary.images_score || 0,
          links: summary.links_score || 0,
          eeat: summary.eeat_score || 0,
          aiReadiness: summary.ai_readiness_score || 0,
        } : null,
      };
    });

    return NextResponse.json({ projects: projectCards });
  } catch (error) {
    return handleApiError(error);
  }
}
