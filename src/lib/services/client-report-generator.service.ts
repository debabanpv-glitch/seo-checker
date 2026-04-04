// ---------------------------------------------------------------------------
// Client Report Generator — generate formatted Vietnamese client-facing reports
// Formats: plain text (clipboard), styled HTML (download/preview)
// ---------------------------------------------------------------------------

import { getUnifiedDashboardSummary, type UnifiedDashboardSummary } from './unified-dashboard-aggregator.service';
import { db } from '@/lib/db';
import { projects, strategyActions } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReportOptions {
  period: 'weekly' | 'monthly';
  sections: ('overview' | 'traffic' | 'keywords' | 'content' | 'backlinks' | 'seo' | 'actions')[];
  format: 'text' | 'html';
}

export interface ReportSection {
  heading: string;
  content: string;
  metrics: Array<{ label: string; value: string; trend?: string }>;
}

export interface ClientReport {
  title: string;
  generatedAt: string;
  sections: ReportSection[];
  rawText: string;
  htmlContent: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function trendStr(val: number | undefined | null): string {
  if (val === undefined || val === null) return '';
  if (val > 0) return `+${val.toFixed(1)}%`;
  if (val < 0) return `${val.toFixed(1)}%`;
  return '0%';
}

function periodLabel(period: 'weekly' | 'monthly'): string {
  return period === 'weekly' ? 'tuần' : 'tháng';
}

function getNextActions(projectId?: string): string[] {
  try {
    const conditions = [];
    if (projectId) {
      // Get phases for project, then actions for those phases
      const rows = db.all(sql`
        SELECT sa.action_name FROM strategy_actions sa
        JOIN strategy_phases sp ON sa.phase_id = sp.id
        WHERE sp.project_id = ${projectId} AND sa.status != 'done'
        ORDER BY sa.priority ASC LIMIT 3
      `) as any[];
      return rows.map(r => r.action_name);
    }
    const rows = db.all(sql`
      SELECT action_name FROM strategy_actions
      WHERE status != 'done'
      ORDER BY priority ASC LIMIT 3
    `) as any[];
    return rows.map(r => r.action_name);
  } catch {
    return [];
  }
}

// ── Section Builders ───────────────────────────────────────────────────────

function buildOverviewSection(data: UnifiedDashboardSummary, period: string): ReportSection {
  return {
    heading: 'TỔNG QUAN',
    content: `Báo cáo ${period} cho tất cả dự án SEO.`,
    metrics: [
      { label: `Clicks ${period}`, value: data.traffic.totalClicks.toLocaleString(), trend: trendStr(data.traffic.clicksTrend) },
      { label: 'Impressions', value: data.traffic.totalImpressions.toLocaleString(), trend: trendStr(data.traffic.impressionsTrend) },
      { label: 'Từ khóa Top 10', value: String(data.keywords.top10) },
      { label: 'Việc hoàn thành', value: `${data.tasks.done}/${data.tasks.total}` },
    ],
  };
}

function buildTrafficSection(data: UnifiedDashboardSummary, period: string): ReportSection {
  return {
    heading: 'TRAFFIC & HIỂN THỊ',
    content: `Lưu lượng truy cập từ Google Search Console ${period} qua.`,
    metrics: [
      { label: 'Tổng Clicks', value: data.traffic.totalClicks.toLocaleString(), trend: trendStr(data.traffic.clicksTrend) },
      { label: 'Tổng Impressions', value: data.traffic.totalImpressions.toLocaleString(), trend: trendStr(data.traffic.impressionsTrend) },
      { label: 'Vị trí TB', value: data.traffic.avgPosition.toFixed(1) },
    ],
  };
}

function buildKeywordsSection(data: UnifiedDashboardSummary): ReportSection {
  return {
    heading: 'TỪ KHÓA NỔI BẬT',
    content: 'Phân bố từ khóa theo vị trí trên Google.',
    metrics: [
      { label: 'Tổng từ khóa', value: String(data.keywords.total) },
      { label: 'Top 3', value: String(data.keywords.top3) },
      { label: 'Top 10', value: String(data.keywords.top10) },
      { label: 'Top 30', value: String(data.keywords.top30) },
      { label: 'Tăng mạnh', value: `${data.keywords.moversUp} từ khóa` },
      { label: 'Giảm mạnh', value: `${data.keywords.moversDown} từ khóa` },
    ],
  };
}

function buildContentSection(data: UnifiedDashboardSummary): ReportSection {
  return {
    heading: 'NỘI DUNG',
    content: 'Tình hình sản xuất và xuất bản nội dung.',
    metrics: [
      { label: 'Đã xuất bản', value: String(data.content.totalPublished) },
      { label: 'Xuất bản tháng này', value: String(data.content.publishedThisMonth) },
      { label: 'Từ AI', value: String(data.content.fromAI) },
      { label: 'Thủ công', value: String(data.content.fromManual) },
    ],
  };
}

function buildBacklinksSection(data: UnifiedDashboardSummary): ReportSection {
  const aliveRate = data.backlinks.total > 0
    ? Math.round((data.backlinks.alive / data.backlinks.total) * 100)
    : 0;
  return {
    heading: 'BACKLINKS',
    content: `Hồ sơ backlink hiện tại. Tỷ lệ sống: ${aliveRate}%.`,
    metrics: [
      { label: 'Tổng', value: String(data.backlinks.total) },
      { label: 'Sống', value: String(data.backlinks.alive) },
      { label: 'Chết', value: String(data.backlinks.dead) },
      { label: 'Mới tháng này', value: String(data.backlinks.newThisMonth) },
      { label: 'DR trung bình', value: String(data.backlinks.avgDR) },
    ],
  };
}

function buildSeoSection(data: UnifiedDashboardSummary): ReportSection {
  const scoreEntries = Object.entries(data.seoStrength.auditScores);
  const labelMap: Record<string, string> = {
    content: 'Nội dung',
    technical: 'Kỹ thuật',
    images: 'Hình ảnh',
    links: 'Liên kết',
    eeat: 'E-E-A-T',
    ai_readiness: 'AI Readiness',
  };

  return {
    heading: 'SEO AUDIT',
    content: `Điểm trung bình: ${data.seoStrength.avgAuditScore}/100. ${data.seoStrength.clusterCount} cụm chủ đề.`,
    metrics: scoreEntries.map(([key, val]) => ({
      label: labelMap[key] || key,
      value: `${val}/100`,
    })),
  };
}

function buildActionsSection(projectId?: string): ReportSection {
  const actions = getNextActions(projectId);
  return {
    heading: 'HÀNH ĐỘNG TIẾP THEO',
    content: actions.length ? 'Các công việc ưu tiên cần thực hiện:' : 'Không có công việc đang chờ.',
    metrics: actions.map((a, i) => ({ label: `${i + 1}`, value: a })),
  };
}

// ── Format Generators ──────────────────────────────────────────────────────

function formatText(title: string, sections: ReportSection[]): string {
  const lines: string[] = [];
  lines.push(`═══ ${title} ═══`);
  lines.push(`Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}`);
  lines.push('');

  for (const s of sections) {
    lines.push(`📊 ${s.heading}`);
    if (s.content) lines.push(s.content);
    for (const m of s.metrics) {
      const trend = m.trend ? ` (${m.trend})` : '';
      lines.push(`  • ${m.label}: ${m.value}${trend}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatHtml(title: string, sections: ReportSection[]): string {
  const date = new Date().toLocaleDateString('vi-VN');

  const sectionHtml = sections.map(s => {
    const metricsHtml = s.metrics.map(m => {
      const trend = m.trend
        ? `<span style="color:${m.trend.startsWith('+') ? '#22C55E' : m.trend.startsWith('-') ? '#EF4444' : '#8888a0'};font-size:12px;margin-left:6px">${m.trend}</span>`
        : '';
      return `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#555">${m.label}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600;color:#1a1a2e">${m.value}${trend}</td></tr>`;
    }).join('');

    return `
      <div style="margin-bottom:24px">
        <h2 style="color:#1a1a2e;font-size:16px;margin:0 0 8px 0;padding-bottom:6px;border-bottom:2px solid #6366F1">${s.heading}</h2>
        <p style="color:#666;font-size:13px;margin:0 0 12px 0">${s.content}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          ${metricsHtml}
        </table>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:680px;margin:0 auto;padding:32px;background:#fff;color:#1a1a2e">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="font-size:22px;margin:0;color:#1a1a2e">${title}</h1>
    <p style="color:#888;font-size:13px;margin:8px 0 0 0">Ngày tạo: ${date}</p>
  </div>
  ${sectionHtml}
  <div style="text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #eee">
    <p style="color:#aaa;font-size:11px">Báo cáo được tạo tự động bởi SEO Manager</p>
  </div>
</body>
</html>`;
}

// ── Main Export ─────────────────────────────────────────────────────────────

export function generateClientReport(projectId: string | undefined, options: ReportOptions): ClientReport {
  const data = getUnifiedDashboardSummary(projectId);
  const pLabel = periodLabel(options.period);

  // Get project name
  let projectName = 'Tất cả dự án';
  if (projectId) {
    const p = db.select({ name: projects.name }).from(projects).where(eq(projects.id, projectId)).get();
    if (p) projectName = p.name;
  }

  const title = `Báo cáo SEO - ${projectName} - ${pLabel}`;
  const generatedAt = new Date().toISOString();

  const sectionBuilders: Record<string, () => ReportSection> = {
    overview: () => buildOverviewSection(data, pLabel),
    traffic: () => buildTrafficSection(data, pLabel),
    keywords: () => buildKeywordsSection(data),
    content: () => buildContentSection(data),
    backlinks: () => buildBacklinksSection(data),
    seo: () => buildSeoSection(data),
    actions: () => buildActionsSection(projectId),
  };

  const sections = options.sections
    .filter(s => sectionBuilders[s])
    .map(s => sectionBuilders[s]());

  return {
    title,
    generatedAt,
    sections,
    rawText: formatText(title, sections),
    htmlContent: formatHtml(title, sections),
  };
}
