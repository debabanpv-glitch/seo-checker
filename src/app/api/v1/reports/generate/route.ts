import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { getAudits } from '@/lib/services/audit-results-crud.service';
import { getPhases, getActions } from '@/lib/services/strategy-phases-and-actions-crud.service';
import { getSnapshots } from '@/lib/services/gsc-snapshots-save-and-query.service';
import { getRankingGrowth } from '@/lib/services/keyword.service';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// POST /api/v1/reports/generate
// Auto-generate report content from audit_results + strategy data
// Body: { project_id: string }
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { project_id } = await request.json();
    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    // --- Audit data ---
    const audits = getAudits(project_id);
    const latestAudit = audits[0]; // already sorted desc by created_at
    const summary = (latestAudit?.summary ?? {}) as Record<string, unknown>;

    const technicalData = {
      totalUrls: summary.totalUrls ?? 0,
      seoScore: summary.seoScore ?? summary.seo_score ?? 0,
      status2xx: summary.status_2xx ?? summary.status2xx ?? 0,
      status3xx: summary.status_3xx ?? summary.status3xx ?? 0,
      status4xx: summary.status_4xx ?? summary.status4xx ?? 0,
      status5xx: summary.status_5xx ?? summary.status5xx ?? 0,
      avgSpeed: summary.avg_response_ms ?? summary.avgResponseTime ?? 0,
      contentScore: summary.content_score ?? 0,
      technicalScore: summary.technical_score ?? 0,
      imagesScore: summary.images_score ?? 0,
      linksScore: summary.links_score ?? 0,
      eeatScore: summary.eeat_score ?? 0,
      aiReadinessScore: summary.ai_readiness_score ?? 0,
      auditDate: latestAudit?.audit_date ?? null,
      auditType: latestAudit?.audit_type ?? null,
    };

    // --- Strategy progress ---
    const phases = getPhases(project_id);
    const allActions = getActions(undefined, project_id);

    const totalActions = allActions.length;
    const doneActions = allActions.filter((a) => a.status === 'done').length;
    const doingActions = allActions.filter((a) => a.status === 'doing').length;
    const blockedActions = allActions.filter((a) => a.status === 'blocked').length;

    const phasesSummary = phases.map((p) => {
      const pActions = allActions.filter((a) => a.phase_id === p.id);
      const pDone = pActions.filter((a) => a.status === 'done').length;
      return {
        name: p.name,
        status: p.status,
        total: pActions.length,
        done: pDone,
        progress: pActions.length > 0 ? Math.round((pDone / pActions.length) * 100) : 0,
      };
    });

    // --- Auto-generated highlights ---
    const highlights: string[] = [];

    if (technicalData.seoScore) {
      highlights.push(`SEO Score: ${technicalData.seoScore}/100`);
    }
    if (technicalData.totalUrls) {
      highlights.push(`Tổng URLs crawled: ${technicalData.totalUrls}`);
    }
    if (totalActions > 0) {
      highlights.push(`Tiến độ chiến lược: ${doneActions}/${totalActions} actions hoàn thành (${Math.round((doneActions / totalActions) * 100)}%)`);
    }
    if (doingActions > 0) {
      highlights.push(`Đang thực hiện: ${doingActions} actions`);
    }
    if (blockedActions > 0) {
      highlights.push(`Bị chặn: ${blockedActions} actions cần xử lý`);
    }

    // Category scores
    const categories = [
      { key: 'contentScore', label: 'Content' },
      { key: 'technicalScore', label: 'Technical' },
      { key: 'imagesScore', label: 'Images' },
      { key: 'linksScore', label: 'Links' },
      { key: 'eeatScore', label: 'E-E-A-T' },
      { key: 'aiReadinessScore', label: 'AI Readiness' },
    ];
    const scoreLines = categories
      .filter((c) => (technicalData as Record<string, unknown>)[c.key])
      .map((c) => `${c.label}: ${(technicalData as Record<string, unknown>)[c.key]}`);
    if (scoreLines.length > 0) {
      highlights.push(`Điểm chi tiết — ${scoreLines.join(' | ')}`);
    }

    // --- GSC Traffic data ---
    const gscSnapshots = getSnapshots(project_id);
    const latestGsc = gscSnapshots[0]; // sorted desc by date
    const prevGsc = gscSnapshots[1];

    const trafficData = {
      clicks: latestGsc?.clicks ?? 0,
      impressions: latestGsc?.impressions ?? 0,
      ctr: latestGsc?.ctr ?? 0,
      avgPosition: latestGsc?.position ?? 0,
      date: latestGsc?.date ?? null,
      clicksDelta: prevGsc ? (latestGsc?.clicks ?? 0) - prevGsc.clicks : null,
      impressionsDelta: prevGsc ? (latestGsc?.impressions ?? 0) - prevGsc.impressions : null,
      ctrDelta: prevGsc ? ((latestGsc?.ctr ?? 0) - prevGsc.ctr) : null,
      positionDelta: prevGsc ? (prevGsc.position - (latestGsc?.position ?? 0)) : null,
    };

    if (latestGsc) {
      highlights.push(`Traffic: ${trafficData.clicks} clicks / ${trafficData.impressions} impressions (CTR ${(trafficData.ctr * 100).toFixed(1)}%)`);
      if (trafficData.clicksDelta !== null) {
        const sign = trafficData.clicksDelta >= 0 ? '+' : '';
        highlights.push(`So với kỳ trước: ${sign}${trafficData.clicksDelta} clicks, ${trafficData.impressionsDelta! >= 0 ? '+' : ''}${trafficData.impressionsDelta} impressions`);
      }
    }

    // --- Keyword ranking summary ---
    const kwGrowth = getRankingGrowth(project_id, 90);
    const latestKw = kwGrowth.snapshots[kwGrowth.snapshots.length - 1];
    const keywordData = latestKw ? {
      total: latestKw.total,
      top3: latestKw.top3,
      top10: latestKw.top10,
      top20: latestKw.top20,
      top30: latestKw.top30,
      date: latestKw.date,
      summary: kwGrowth.summary,
    } : null;

    if (latestKw) {
      highlights.push(`Keywords: ${latestKw.top3} top 3 / ${latestKw.top10} top 10 / ${latestKw.total} tổng`);
      if (kwGrowth.summary) {
        const s = kwGrowth.summary;
        if (s.top10Change !== 0) {
          highlights.push(`Keyword trend: Top 10 ${s.top10Change > 0 ? '+' : ''}${s.top10Change}, Top 3 ${s.top3Change > 0 ? '+' : ''}${s.top3Change}`);
        }
      }
    }

    // --- Next month plan from strategy ---
    const todoActions = allActions
      .filter((a) => a.status === 'todo')
      .sort((a, b) => {
        const pOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
      })
      .slice(0, 10);

    const nextMonthPlan = todoActions.length > 0
      ? todoActions.map((a, i) => `${i + 1}. [${a.priority?.toUpperCase()}] ${a.title}`).join('\n')
      : 'Chưa có actions pending trong strategy.';

    return NextResponse.json({
      highlights: highlights.join('\n'),
      next_month_plan: nextMonthPlan,
      technical_data: technicalData,
      traffic_data: trafficData,
      keyword_data: keywordData,
      content_data: {
        totalPhases: phases.length,
        phasesSummary,
        totalActions,
        doneActions,
        doingActions,
        blockedActions,
        todoActions: totalActions - doneActions - doingActions - blockedActions,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
