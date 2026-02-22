import { NextRequest, NextResponse } from 'next/server';
import { getReport } from '@/lib/services';
import { getAppConfig } from '@/lib/services/app-config-crud.service';
import { handleApiError, AppError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

interface ContentData {
  totalPhases?: number;
  totalActions?: number;
  doneActions?: number;
  doingActions?: number;
  blockedActions?: number;
  todoActions?: number;
}

function formatTelegramMessage(report: {
  month: number;
  year: number;
  highlights?: string | null;
  next_month_plan?: string | null;
  content_data?: unknown;
  technical_data?: unknown;
}): string {
  const period = `${report.month}/${report.year}`;

  let contentData: ContentData | null = null;
  if (report.content_data) {
    try {
      contentData = typeof report.content_data === 'string'
        ? JSON.parse(report.content_data)
        : report.content_data as ContentData;
    } catch {
      // ignore parse error
    }
  }

  let msg = `<b>📊 Báo cáo SEO tháng ${period}</b>\n`;

  if (report.highlights) {
    msg += `\n<b>🎯 Highlights</b>\n${report.highlights}\n`;
  }

  if (contentData && contentData.totalActions != null && contentData.totalActions > 0) {
    const done = contentData.doneActions ?? 0;
    const total = contentData.totalActions;
    const pct = Math.round((done / total) * 100);
    msg += `\n<b>📈 Tiến độ chiến lược</b>\n`;
    if (contentData.totalPhases != null) {
      msg += `• Tổng phases: ${contentData.totalPhases}\n`;
    }
    msg += `• Actions: ${done}/${total} (${pct}%)\n`;
    if (contentData.doingActions) msg += `• Đang làm: ${contentData.doingActions}`;
    if (contentData.blockedActions) msg += ` | Bị chặn: ${contentData.blockedActions}`;
    if (contentData.doingActions || contentData.blockedActions) msg += '\n';
  }

  if (report.next_month_plan) {
    msg += `\n<b>📋 Kế hoạch tháng tới</b>\n${report.next_month_plan}\n`;
  }

  return msg.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { report_id } = body as { report_id?: string };

    if (!report_id) {
      return NextResponse.json({ error: 'report_id is required' }, { status: 400 });
    }

    const report = getReport(report_id);

    const tokenRow = getAppConfig('telegram_bot_token');
    const chatIdRow = getAppConfig('telegram_chat_id');

    if (!tokenRow?.value) {
      throw new AppError('Chưa cấu hình Telegram Bot Token. Vào Settings → Cấu hình để thiết lập.', 400);
    }
    if (!chatIdRow?.value) {
      throw new AppError('Chưa cấu hình Telegram Chat ID. Vào Settings → Cấu hình để thiết lập.', 400);
    }

    const token = tokenRow.value;
    const chatId = chatIdRow.value;

    const text = formatTelegramMessage(report);

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const tgData = await tgRes.json() as { ok: boolean; description?: string };

    if (!tgData.ok) {
      throw new AppError(`Telegram API lỗi: ${tgData.description ?? 'Unknown error'}`, 502);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
