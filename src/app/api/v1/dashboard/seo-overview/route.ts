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
  status_200?: number;
  status_301?: number;
  status_404?: number;
  avg_speed?: number;
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
      if (project.domain) {
        const domainPattern = `%${project.domain}%`;
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

      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        domain: project.domain,
        healthScore: avgScore,
        checkedPages,
        auditDate: latestAudit?.audit_date || null,
        stats: {
          totalPages: summary.total_urls || 0,
          status200: summary.status_200 || 0,
          status301: summary.status_301 || 0,
          status404: summary.status_404 || 0,
          avgSpeed: summary.avg_speed || 0,
          orphanPages: summary.orphan_pages || 0,
          indexable: summary.indexable || 0,
        },
      };
    });

    return NextResponse.json({ projects: projectCards });
  } catch (error) {
    return handleApiError(error);
  }
}
