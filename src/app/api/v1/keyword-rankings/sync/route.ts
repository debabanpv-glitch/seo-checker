import { NextRequest, NextResponse } from 'next/server';
import { upsertRankingsBatch, parseCSV, findColumnIndex, parseRankingDate } from '@/lib/services';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sheetUrl, projectId, columnMapping } = body;

    if (!sheetUrl) {
      return NextResponse.json({ error: 'Sheet URL is required' }, { status: 400 });
    }

    const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      return NextResponse.json({ error: 'Invalid Google Sheets URL' }, { status: 400 });
    }

    const sheetId = sheetIdMatch[1];
    const gidMatch = sheetUrl.match(/[?&#]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(csvUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch sheet data. Make sure the sheet is public.' },
        { status: 400 },
      );
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return NextResponse.json({ error: 'Sheet is empty or has no data rows' }, { status: 400 });
    }

    const headers = rows[0].map((h) =>
      h.toLowerCase().trim()
        .replace(/^\uFEFF/, '')
        .replace(/[^\w\sàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/gi, ''),
    );

    let keywordIdx: number;
    let urlIdx: number;
    let positionIdx: number;
    let dateIdx: number;

    if (columnMapping && typeof columnMapping.keyword === 'number') {
      keywordIdx = columnMapping.keyword;
      urlIdx = typeof columnMapping.url === 'number' ? columnMapping.url : -1;
      positionIdx = typeof columnMapping.top === 'number' ? columnMapping.top : -1;
      dateIdx = typeof columnMapping.date === 'number' ? columnMapping.date : -1;
    } else {
      keywordIdx = findColumnIndex(headers, ['keyword', 'từ khóa', 'tu khoa', 'kw', 'từkhóa', 'tukhoa']);
      urlIdx = findColumnIndex(headers, ['url', 'link', 'đường dẫn', 'đườngdẫn']);
      positionIdx = findColumnIndex(headers, ['position', 'top', 'vị trí', 'rank', 'ranking', 'vịtrí']);
      dateIdx = findColumnIndex(headers, ['date', 'ngày', 'ngay', 'check_date', 'checked', 'checkdate']);
    }

    const rankingTierIdx = findColumnIndex(headers, ['ranking']);
    const keywordTypeIdx = findColumnIndex(headers, ['type', 'loại', 'loai', 'kw type']);

    if (keywordIdx === -1) {
      return NextResponse.json(
        { error: 'Không tìm thấy cột "keyword". Bạn có thể sử dụng chế độ chỉ định cột thủ công.', debug: { headers, firstRow: rows[0] } },
        { status: 400 },
      );
    }

    if (positionIdx === -1) {
      return NextResponse.json(
        { error: 'Không tìm thấy cột "top/position". Bạn có thể sử dụng chế độ chỉ định cột thủ công.', debug: { headers, firstRow: rows[0] } },
        { status: 400 },
      );
    }

    interface RankingRow { keyword: string; url: string; position: number; date: string; project_id?: string | null; ranking_tier?: string | null; keyword_type?: string | null }
    const rankings: RankingRow[] = [];
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || row.every((cell) => !cell.trim())) continue;

      const keyword = row[keywordIdx]?.trim();
      const url = urlIdx !== -1 ? row[urlIdx]?.trim() : '';
      const positionStr = row[positionIdx]?.trim();
      const dateStr = dateIdx !== -1 ? row[dateIdx]?.trim() : '';
      const rankingTier = rankingTierIdx !== -1 ? row[rankingTierIdx]?.trim() : '';
      const keywordType = keywordTypeIdx !== -1 ? row[keywordTypeIdx]?.trim() : '';

      if (!keyword) { errors.push(`Row ${i + 1}: Missing keyword`); continue; }

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

    if (rankings.length === 0) {
      return NextResponse.json({ error: 'No valid ranking data found', details: errors }, { status: 400 });
    }

    await upsertRankingsBatch(rankings);

    return NextResponse.json({
      success: true,
      message: `Đồng bộ thành công ${rankings.length} từ khóa!`,
      stats: { total: rankings.length, upserted: rankings.length, errors: errors.length },
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error('Keyword ranking sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    );
  }
}
