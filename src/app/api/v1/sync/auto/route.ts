import { NextResponse } from 'next/server';
import { syncAllProjects } from '@/lib/services';
import { getAppConfig } from '@/lib/services/app-config-crud.service';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// POST /api/v1/sync/auto
// Auto-sync Google Sheets + notify Telegram if new data found
// Called by cron job (2x/day)
// ---------------------------------------------------------------------------

async function sendTelegramNotify(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  return res.json();
}

export async function POST() {
  try {
    const result = await syncAllProjects();

    // Only notify if there's actual data synced
    if (result.syncedCount > 0) {
      const tokenRow = getAppConfig('telegram_bot_token');
      const chatIdRow = getAppConfig('telegram_chat_id');

      if (tokenRow?.value && chatIdRow?.value) {
        const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        const msg = [
          `<b>🔄 Đồng bộ Google Sheets</b>`,
          ``,
          `📅 ${now}`,
          `📊 ${result.syncedCount} tasks từ ${result.projectsSynced} dự án`,
          `⏱ ${result.duration}ms`,
          ``,
          `✅ ${result.message}`,
        ].join('\n');

        await sendTelegramNotify(tokenRow.value, chatIdRow.value, msg);
      }
    }

    return NextResponse.json({ ...result, notified: result.syncedCount > 0 });
  } catch (error) {
    // Notify error via Telegram too
    try {
      const tokenRow = getAppConfig('telegram_bot_token');
      const chatIdRow = getAppConfig('telegram_chat_id');
      if (tokenRow?.value && chatIdRow?.value) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        await sendTelegramNotify(tokenRow.value, chatIdRow.value,
          `<b>❌ Lỗi đồng bộ Google Sheets</b>\n\n${errMsg}`);
      }
    } catch { /* ignore telegram error */ }
    return handleApiError(error);
  }
}
