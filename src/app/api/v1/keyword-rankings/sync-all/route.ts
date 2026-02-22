import { NextRequest, NextResponse } from 'next/server';
import { getAppConfig, upsertAppConfig } from '@/lib/services/app-config-crud.service';
import { upsertRankingsBatch, parseCSV, findColumnIndex, parseRankingDate } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// Config format stored in app_config key "keyword_sheet_configs":
// [{ url: string, project_id: string, label: string }]

interface SheetConfig {
  url: string;
  project_id: string;
  label: string;
}

// GET — return saved sheet configs
export function GET() {
  try {
    const row = getAppConfig('keyword_sheet_configs');
    const configs: SheetConfig[] = row?.value ? JSON.parse(row.value) : [];
    return NextResponse.json({ configs });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT — save sheet configs
export async function PUT(request: NextRequest) {
  try {
    const { configs } = await request.json();
    upsertAppConfig('keyword_sheet_configs', JSON.stringify(configs || []));
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST — sync all configured sheets (or specific one if index provided)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetIndex = typeof body.index === 'number' ? body.index : null;

    const row = getAppConfig('keyword_sheet_configs');
    const configs: SheetConfig[] = row?.value ? JSON.parse(row.value) : [];

    if (configs.length === 0) {
      return NextResponse.json({ error: 'Chưa cấu hình Google Sheet nào' }, { status: 400 });
    }

    const sheetsToSync = targetIndex !== null ? [configs[targetIndex]].filter(Boolean) : configs;
    const results: { label: string; success: boolean; message: string; count: number }[] = [];

    for (const cfg of sheetsToSync) {
      try {
        const count = await syncOneSheet(cfg.url, cfg.project_id);
        results.push({ label: cfg.label, success: true, message: `${count} từ khóa`, count });
      } catch (err) {
        results.push({ label: cfg.label, success: false, message: err instanceof Error ? err.message : 'Unknown error', count: 0 });
      }
    }

    const totalSynced = results.reduce((s, r) => s + r.count, 0);
    const allOk = results.every((r) => r.success);

    return NextResponse.json({
      success: allOk,
      message: `Đồng bộ ${totalSynced} từ khóa từ ${results.filter((r) => r.success).length}/${sheetsToSync.length} sheet`,
      results,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ---------------------------------------------------------------------------
// Core sync logic extracted from sync/route.ts
// ---------------------------------------------------------------------------
async function syncOneSheet(sheetUrl: string, projectId?: string): Promise<number> {
  const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!sheetIdMatch) throw new Error('Invalid Google Sheets URL');

  const sheetId = sheetIdMatch[1];
  const gidMatch = sheetUrl.match(/[?&#]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';

  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error('Không thể fetch sheet. Đảm bảo sheet ở chế độ public.');

  const csvText = await response.text();
  const rows = parseCSV(csvText);
  if (rows.length < 2) throw new Error('Sheet trống');

  const headers = rows[0].map((h) =>
    h.toLowerCase().trim()
      .replace(/^\uFEFF/, '')
      .replace(/[^\w\sàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/gi, ''),
  );

  const keywordIdx = findColumnIndex(headers, ['keyword', 'từ khóa', 'tu khoa', 'kw', 'từkhóa', 'tukhoa']);
  const urlIdx = findColumnIndex(headers, ['url', 'link', 'đường dẫn', 'đườngdẫn']);
  const positionIdx = findColumnIndex(headers, ['position', 'top', 'vị trí', 'rank', 'vịtrí']);
  const dateIdx = findColumnIndex(headers, ['date', 'ngày', 'ngay', 'check_date', 'checked', 'checkdate']);
  const rankingTierIdx = findColumnIndex(headers, ['ranking']);
  const keywordTypeIdx = findColumnIndex(headers, ['type', 'loại', 'loai', 'kw type']);

  if (keywordIdx === -1) throw new Error('Không tìm thấy cột "keyword"');
  if (positionIdx === -1) throw new Error('Không tìm thấy cột "top/position"');

  const rankings: Array<{ keyword: string; url: string; position: number; date: string; project_id?: string | null; ranking_tier?: string | null; keyword_type?: string | null }> = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((cell) => !cell.trim())) continue;

    const keyword = row[keywordIdx]?.trim();
    if (!keyword) continue;

    const url = urlIdx !== -1 ? row[urlIdx]?.trim() : '';
    const positionStr = row[positionIdx]?.trim();
    const dateStr = dateIdx !== -1 ? row[dateIdx]?.trim() : '';
    const rankingTier = rankingTierIdx !== -1 ? row[rankingTierIdx]?.trim() : '';
    const keywordType = keywordTypeIdx !== -1 ? row[keywordTypeIdx]?.trim() : '';

    let position = 0;
    if (positionStr) {
      const cleaned = positionStr.replace(/[^\d.]/g, '');
      position = parseFloat(cleaned) || 0;
    }
    if (position <= 0 || position > 200) continue;

    let parsedDate = dateStr ? parseRankingDate(dateStr) : '';
    if (!parsedDate) parsedDate = new Date().toISOString().split('T')[0];

    rankings.push({
      keyword,
      url: url || '',
      position: Math.round(position * 10) / 10,
      date: parsedDate,
      project_id: projectId || null,
      ranking_tier: rankingTier || null,
      keyword_type: keywordType || null,
    });
  }

  if (rankings.length === 0) throw new Error('Không tìm thấy dữ liệu ranking hợp lệ');

  upsertRankingsBatch(rankings);
  return rankings.length;
}
