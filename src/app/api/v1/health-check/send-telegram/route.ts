import { NextResponse } from 'next/server';
import { getAllProjectsHealthCheck } from '@/lib/services/health-check-assessment-engine.service';
import { getAppConfig } from '@/lib/services/app-config-crud.service';
import { handleApiError, AppError } from '@/lib/api-response';
import type { ProjectHealthAssessment, Warning } from '@/lib/services/health-check-assessment-engine.service';

export const dynamic = 'force-dynamic';

// Severity emoji mapping
const severityIcon: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🔵',
};

const trendIcon: Record<string, string> = {
  up: '📈',
  down: '📉',
  stable: '➡️',
  no_data: '—',
};

function scoreEmoji(score: number): string {
  if (score >= 80) return '🟢';
  if (score >= 60) return '🟡';
  if (score >= 40) return '🟠';
  return '🔴';
}

function formatWarnings(warnings: Warning[], max = 3): string {
  if (!warnings.length) return '  Không có cảnh báo';
  return warnings
    .slice(0, max)
    .map(w => `  ${severityIcon[w.severity] ?? '⚪'} ${w.title}`)
    .join('\n') + (warnings.length > max ? `\n  ... +${warnings.length - max} cảnh báo khác` : '');
}

function formatProject(p: ProjectHealthAssessment): string {
  const lines: string[] = [];

  // Header
  lines.push(`${scoreEmoji(p.overallScore)} <b>${p.name}</b> — ${p.overallScore}/100 (${p.overallLabel})`);

  // Category scores (only non-null)
  const cats: string[] = [];
  const c = p.categoryScores;
  if (c.technical != null) cats.push(`Tech ${c.technical}`);
  if (c.content != null) cats.push(`Content ${c.content}`);
  if (c.images != null) cats.push(`Images ${c.images}`);
  if (c.links != null) cats.push(`Links ${c.links}`);
  if (c.eeat != null) cats.push(`EEAT ${c.eeat}`);
  if (cats.length) lines.push(`  SEO: ${cats.join(' | ')}`);

  // Traffic
  if (p.trafficData) {
    const t = p.trafficData;
    let trafficLine = `  ${trendIcon[p.trends.traffic]} Traffic: ${t.clicks} clicks, ${t.impressions} imp`;
    if (t.prevClicks != null) {
      const diff = t.clicks - t.prevClicks;
      trafficLine += ` (${diff >= 0 ? '+' : ''}${diff})`;
    }
    lines.push(trafficLine);
  }

  // Keywords
  if (p.keywordData) {
    const k = p.keywordData;
    let kwLine = `  ${trendIcon[p.trends.keywords]} KW: ${k.total} tổng, ${k.top10} Top10`;
    if (k.top10Change) kwLine += ` (${k.top10Change >= 0 ? '+' : ''}${k.top10Change})`;
    lines.push(kwLine);
  }

  // Strategy
  if (p.strategyData && p.strategyData.totalActions > 0) {
    const s = p.strategyData;
    const pct = Math.round((s.doneActions / s.totalActions) * 100);
    lines.push(`  📋 Strategy: ${s.doneActions}/${s.totalActions} done (${pct}%)`);
  }

  // Progress
  if (p.progressReport) {
    const pr = p.progressReport;
    const trackEmoji = pr.onTrack ? '✅' : '⚠️';
    lines.push(`  ${trackEmoji} Tiến độ: ${pr.timelineProgress}% thời gian, ${pr.overallKpiPercent}% KPI | còn ${pr.daysRemaining} ngày`);
  }

  // Top warnings
  if (p.warnings.length) {
    lines.push(formatWarnings(p.warnings));
  }

  return lines.join('\n');
}

function formatHealthCheckMessage(data: { projects: ProjectHealthAssessment[]; meta: { generatedAt: string; criticalCount: number; healthyCount: number } }): string {
  const now = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const lines: string[] = [];

  lines.push(`<b>🏥 Health Check — ${now}</b>\n`);

  // Sort: worst score first
  const sorted = [...data.projects].sort((a, b) => a.overallScore - b.overallScore);
  for (const p of sorted) {
    lines.push(formatProject(p));
    lines.push(''); // blank line between projects
  }

  // Summary
  if (data.meta.criticalCount > 0) {
    lines.push(`⚠️ <b>${data.meta.criticalCount} dự án cần xử lý khẩn!</b>`);
  }

  return lines.join('\n').trim();
}

export async function POST() {
  try {
    const tokenRow = getAppConfig('telegram_bot_token');
    const chatIdRow = getAppConfig('telegram_chat_id');

    if (!tokenRow?.value) throw new AppError('Chưa cấu hình Telegram Bot Token.', 400);
    if (!chatIdRow?.value) throw new AppError('Chưa cấu hình Telegram Chat ID.', 400);

    const healthData = getAllProjectsHealthCheck();
    const text = formatHealthCheckMessage(healthData);

    const tgRes = await fetch(`https://api.telegram.org/bot${tokenRow.value}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatIdRow.value,
        text,
        parse_mode: 'HTML',
      }),
    });

    const tgData = await tgRes.json() as { ok: boolean; description?: string };
    if (!tgData.ok) {
      throw new AppError(`Telegram API lỗi: ${tgData.description ?? 'Unknown'}`, 502);
    }

    return NextResponse.json({ success: true, projectCount: healthData.projects.length });
  } catch (error) {
    return handleApiError(error);
  }
}
