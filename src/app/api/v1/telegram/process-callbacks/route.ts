import { NextResponse } from 'next/server';
import { getAppConfig, upsertAppConfig } from '@/lib/services/app-config-crud.service';
import { getAllProjectsHealthCheck } from '@/lib/services/health-check-assessment-engine.service';
import { getProjects } from '@/lib/services/project.service';
import { getSnapshots } from '@/lib/services/gsc-snapshots-save-and-query.service';
import { getKeywordInsights } from '@/lib/services/keyword-insights-aggregator.service';
import { getBacklinkStats } from '@/lib/services/backlink-import-and-crud.service';
import { getBacklinkCheckSummary } from '@/lib/services/backlink-status-checker.service';
import { handleApiError, AppError } from '@/lib/api-response';
import type { ProjectHealthAssessment } from '@/lib/services/health-check-assessment-engine.service';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Telegram helpers
// ---------------------------------------------------------------------------

async function tgApi(token: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ ok: boolean; result?: unknown; description?: string }>;
}

// ---------------------------------------------------------------------------
// Report formatters
// ---------------------------------------------------------------------------

function scoreEmoji(s: number) {
  if (s >= 80) return '🟢';
  if (s >= 60) return '🟡';
  if (s >= 40) return '🟠';
  return '🔴';
}

function formatHealthCheck(): string {
  const data = getAllProjectsHealthCheck();
  const lines: string[] = ['<b>🏥 Health Check</b>\n'];
  const sorted = [...data.projects].sort((a, b) => a.overallScore - b.overallScore);
  for (const p of sorted) {
    lines.push(formatProjectShort(p));
  }
  if (data.meta.criticalCount > 0) {
    lines.push(`\n⚠️ <b>${data.meta.criticalCount} dự án cần xử lý khẩn!</b>`);
  }
  return lines.join('\n');
}

function formatProjectShort(p: ProjectHealthAssessment): string {
  const parts = [`${scoreEmoji(p.overallScore)} <b>${p.name}</b> — ${p.overallScore}/100`];
  const c = p.categoryScores;
  const cats: string[] = [];
  if (c.technical != null) cats.push(`Tech ${c.technical}`);
  if (c.content != null) cats.push(`Content ${c.content}`);
  if (c.eeat != null) cats.push(`EEAT ${c.eeat}`);
  if (cats.length) parts.push(`  ${cats.join(' | ')}`);
  if (p.trafficData) parts.push(`  Traffic: ${p.trafficData.clicks} clicks, ${p.trafficData.impressions} imp`);
  if (p.keywordData) parts.push(`  KW: ${p.keywordData.total} tổng, ${p.keywordData.top10} Top10`);
  if (p.warnings.length) {
    const top = p.warnings.slice(0, 2).map(w => w.title).join('; ');
    parts.push(`  ⚠️ ${top}`);
  }
  return parts.join('\n');
}

function formatTraffic(): string {
  const projects = getProjects();
  const lines: string[] = ['<b>📈 Traffic GSC</b>\n'];
  for (const proj of projects) {
    const snaps = getSnapshots(proj.id, 2);
    if (!snaps.length) { lines.push(`${proj.name}: chưa có dữ liệu`); continue; }
    const latest = snaps[0] as { clicks: number; impressions: number; ctr: number; position: number; snapshot_date: string };
    let line = `<b>${proj.name}</b> (${latest.snapshot_date})\n  ${latest.clicks} clicks | ${latest.impressions} imp | CTR ${(latest.ctr * 100).toFixed(1)}% | Pos ${latest.position.toFixed(1)}`;
    if (snaps.length > 1) {
      const prev = snaps[1] as { clicks: number; impressions: number };
      const diffC = latest.clicks - prev.clicks;
      const diffI = latest.impressions - prev.impressions;
      line += `\n  vs trước: ${diffC >= 0 ? '+' : ''}${diffC} clicks, ${diffI >= 0 ? '+' : ''}${diffI} imp`;
    }
    lines.push(line);
  }
  return lines.join('\n\n');
}

function formatKeywords(): string {
  const projects = getProjects();
  const lines: string[] = ['<b>🔑 Keyword Insights</b>\n'];
  for (const proj of projects) {
    try {
      const data = getKeywordInsights(proj.id);
      const s = data.summary;
      lines.push(
        `<b>${proj.name}</b>` +
        `\n  Tổng: ${s.total} | Top10: ${s.inTop10} | Tăng: ${s.improved} | Giảm: ${s.declined}` +
        `\n  Surging: ${data.surging.length} | Dropping: ${data.dropping.length} | Boundary: ${data.boundary.length}` +
        (s.totalClicks ? `\n  Clicks: ${s.totalClicks} | Imp: ${s.totalImpressions}` : '')
      );
    } catch {
      lines.push(`${proj.name}: chưa có dữ liệu`);
    }
  }
  return lines.join('\n\n');
}

function formatBacklinks(): string {
  const projects = getProjects();
  const lines: string[] = ['<b>🔗 Backlinks</b>\n'];
  for (const proj of projects) {
    const stats = getBacklinkStats(proj.id);
    if (!stats || stats.totalBacklinks === 0) { lines.push(`${proj.name}: chưa có dữ liệu`); continue; }
    const check = getBacklinkCheckSummary(proj.id);
    let line = `<b>${proj.name}</b>\n  Tổng: ${stats.totalBacklinks} | Domains: ${stats.uniqueDomains} | Dofollow: ${stats.dofollowCount}`;
    if (check && check.total > 0) {
      line += `\n  Sống: ${check.alive} (${Math.round(check.alive / check.total * 100)}%) | Chết: ${check.dead}`;
    }
    lines.push(line);
  }
  return lines.join('\n\n');
}

// Detail report for a single project
function formatProjectDetail(projectId: string): string {
  const data = getAllProjectsHealthCheck();
  const p = data.projects.find(proj => proj.id === projectId);
  if (!p) return `Không tìm thấy dự án.`;

  const lines: string[] = [];
  lines.push(`${scoreEmoji(p.overallScore)} <b>${p.name}</b> — ${p.overallScore}/100 (${p.overallLabel})\n`);

  // SEO category scores
  const c = p.categoryScores;
  lines.push('<b>📊 SEO Scores</b>');
  if (c.technical != null) lines.push(`  Technical: ${c.technical}/100`);
  if (c.content != null) lines.push(`  Content: ${c.content}/100`);
  if (c.images != null) lines.push(`  Images: ${c.images}/100`);
  if (c.links != null) lines.push(`  Links: ${c.links}/100`);
  if (c.eeat != null) lines.push(`  EEAT: ${c.eeat}/100`);

  // Traffic
  if (p.trafficData) {
    const t = p.trafficData;
    lines.push('');
    lines.push('<b>📈 Traffic</b>');
    lines.push(`  Clicks: ${t.clicks}${t.prevClicks != null ? ` (${t.clicks - t.prevClicks >= 0 ? '+' : ''}${t.clicks - t.prevClicks})` : ''}`);
    lines.push(`  Impressions: ${t.impressions}${t.prevImpressions != null ? ` (${t.impressions - t.prevImpressions >= 0 ? '+' : ''}${t.impressions - t.prevImpressions})` : ''}`);
    lines.push(`  CTR: ${(t.ctr * 100).toFixed(1)}% | Pos: ${t.position.toFixed(1)}`);
  }

  // Keywords
  if (p.keywordData) {
    const k = p.keywordData;
    lines.push('');
    lines.push('<b>🔑 Keywords</b>');
    lines.push(`  Tổng: ${k.total} | Top3: ${k.top3} | Top10: ${k.top10}`);
    if (k.top10Change) lines.push(`  Top10 thay đổi: ${k.top10Change >= 0 ? '+' : ''}${k.top10Change}`);
  }

  // Strategy
  if (p.strategyData && p.strategyData.totalActions > 0) {
    const s = p.strategyData;
    const pct = Math.round((s.doneActions / s.totalActions) * 100);
    lines.push('');
    lines.push('<b>📋 Strategy</b>');
    lines.push(`  Done: ${s.doneActions}/${s.totalActions} (${pct}%)`);
    if (s.doingActions) lines.push(`  Đang làm: ${s.doingActions}`);
    if (s.blockedActions) lines.push(`  Bị chặn: ${s.blockedActions}`);
  }

  // Backlinks
  const blStats = getBacklinkStats(projectId);
  if (blStats && blStats.totalBacklinks > 0) {
    const blCheck = getBacklinkCheckSummary(projectId);
    lines.push('');
    lines.push('<b>🔗 Backlinks</b>');
    lines.push(`  Tổng: ${blStats.totalBacklinks} | Domains: ${blStats.uniqueDomains} | Dofollow: ${blStats.dofollowCount}`);
    if (blCheck && blCheck.total > 0) {
      lines.push(`  Sống: ${blCheck.alive} (${Math.round(blCheck.alive / blCheck.total * 100)}%) | Chết: ${blCheck.dead}`);
    }
  }

  // Progress
  if (p.progressReport) {
    const pr = p.progressReport;
    lines.push('');
    lines.push(`<b>${pr.onTrack ? '✅' : '⚠️'} Tiến độ</b>`);
    lines.push(`  Thời gian: ${pr.timelineProgress}% | KPI: ${pr.overallKpiPercent}%`);
    lines.push(`  Còn ${pr.daysRemaining} ngày → ${pr.deadline}`);
    if (pr.forecast) lines.push(`  Dự báo: ${pr.forecast}`);
  }

  // Warnings
  if (p.warnings.length) {
    lines.push('');
    lines.push('<b>⚠️ Cảnh báo</b>');
    for (const w of p.warnings.slice(0, 5)) {
      lines.push(`  ${w.title}`);
    }
    if (p.warnings.length > 5) lines.push(`  ... +${p.warnings.length - 5} khác`);
  }

  return lines.join('\n');
}

// Map callback_data → formatter
const handlers: Record<string, () => string> = {
  'cmd:healthcheck': formatHealthCheck,
  'cmd:traffic': formatTraffic,
  'cmd:keywords': formatKeywords,
  'cmd:backlinks': formatBacklinks,
};

// ---------------------------------------------------------------------------
// Main: poll getUpdates, process callback queries
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    const token = getAppConfig('telegram_bot_token')?.value;
    const chatId = getAppConfig('telegram_chat_id')?.value;
    if (!token || !chatId) throw new AppError('Chưa cấu hình Telegram.', 400);

    // Get last processed update_id
    const lastOffset = parseInt(getAppConfig('telegram_last_update_id')?.value ?? '0', 10);

    // Fetch new updates (callback queries only, timeout=0 for non-blocking)
    const updates = await tgApi(token, 'getUpdates', {
      offset: lastOffset + 1,
      timeout: 0,
      allowed_updates: ['callback_query'],
    });

    if (!updates.ok || !Array.isArray(updates.result)) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    const callbacks = updates.result as {
      update_id: number;
      callback_query?: {
        id: string;
        data?: string;
        from: { id: number; first_name?: string };
      };
    }[];

    let processed = 0;
    let maxId = lastOffset;

    for (const update of callbacks) {
      if (update.update_id > maxId) maxId = update.update_id;

      const cb = update.callback_query;
      if (!cb?.data) continue;

      // Skip noop buttons
      if (cb.data === 'noop') {
        await tgApi(token, 'answerCallbackQuery', { callback_query_id: cb.id });
        continue;
      }

      // Resolve handler: static commands or dynamic project detail
      let text: string | null = null;
      const handler = handlers[cb.data];
      if (handler) {
        text = handler();
      } else if (cb.data.startsWith('cmd:detail:')) {
        const projectId = cb.data.replace('cmd:detail:', '');
        text = formatProjectDetail(projectId);
      }

      if (!text) {
        await tgApi(token, 'answerCallbackQuery', { callback_query_id: cb.id, text: 'Không rõ lệnh' });
        continue;
      }

      // Answer callback (remove loading spinner)
      await tgApi(token, 'answerCallbackQuery', { callback_query_id: cb.id, text: '⏳ Đang tạo báo cáo...' });
      await tgApi(token, 'sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      });

      processed++;
    }

    // Save offset
    if (maxId > lastOffset) {
      upsertAppConfig('telegram_last_update_id', String(maxId));
    }

    return NextResponse.json({ success: true, processed });
  } catch (error) {
    return handleApiError(error);
  }
}
