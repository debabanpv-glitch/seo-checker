import { NextResponse } from 'next/server';
import { getAppConfig } from '@/lib/services/app-config-crud.service';
import { getProjects } from '@/lib/services/project.service';
import { handleApiError, AppError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// Send a persistent menu message with inline keyboard buttons
export async function POST() {
  try {
    const token = getAppConfig('telegram_bot_token')?.value;
    const chatId = getAppConfig('telegram_chat_id')?.value;
    if (!token || !chatId) throw new AppError('Chưa cấu hình Telegram.', 400);

    const projects = getProjects();

    const text = `<b>📊 SEO Manager — Menu</b>\n\nBấm nút bên dưới để nhận báo cáo:`;

    // Build project detail buttons (2 per row)
    const projectButtons: { text: string; callback_data: string }[][] = [];
    for (let i = 0; i < projects.length; i += 2) {
      const row = [{ text: `🔍 ${projects[i].name}`, callback_data: `cmd:detail:${projects[i].id}` }];
      if (projects[i + 1]) {
        row.push({ text: `🔍 ${projects[i + 1].name}`, callback_data: `cmd:detail:${projects[i + 1].id}` });
      }
      projectButtons.push(row);
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🏥 Health Check', callback_data: 'cmd:healthcheck' },
          { text: '📈 Traffic GSC', callback_data: 'cmd:traffic' },
        ],
        [
          { text: '🔑 Keyword Insights', callback_data: 'cmd:keywords' },
          { text: '🔗 Backlinks', callback_data: 'cmd:backlinks' },
        ],
        // Separator label
        [{ text: '── Chi tiết dự án ──', callback_data: 'noop' }],
        ...projectButtons,
      ],
    };

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      }),
    });

    const data = await res.json() as { ok: boolean; description?: string; result?: { message_id: number } };
    if (!data.ok) throw new AppError(`Telegram: ${data.description}`, 502);

    return NextResponse.json({ success: true, messageId: data.result?.message_id });
  } catch (error) {
    return handleApiError(error);
  }
}
