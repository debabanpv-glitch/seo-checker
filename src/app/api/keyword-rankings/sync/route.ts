import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RankingRow {
  keyword: string;
  url: string;
  position: number;
  date: string;
  project_id?: string;
}

// POST: Sync keyword rankings from Google Sheets
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sheetUrl, projectId } = body;

    if (!sheetUrl) {
      return NextResponse.json({ error: 'Sheet URL is required' }, { status: 400 });
    }

    // Extract sheet ID from URL
    const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      return NextResponse.json({ error: 'Invalid Google Sheets URL' }, { status: 400 });
    }

    const sheetId = sheetIdMatch[1];

    // Fetch data from Google Sheets (public sheet as CSV)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    const response = await fetch(csvUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch sheet data. Make sure the sheet is public.' },
        { status: 400 }
      );
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return NextResponse.json({ error: 'Sheet is empty or has no data rows' }, { status: 400 });
    }

    // First row is headers
    const headers = rows[0].map((h) => h.toLowerCase().trim());

    // Find column indices - support Vietnamese and English headers
    const keywordIdx = findColumnIndex(headers, ['keyword', 'từ khóa', 'tu khoa', 'kw']);
    const urlIdx = findColumnIndex(headers, ['url', 'link', 'đường dẫn']);
    const positionIdx = findColumnIndex(headers, ['position', 'top', 'vị trí', 'rank', 'ranking']);
    const dateIdx = findColumnIndex(headers, ['date', 'ngày', 'ngay', 'check_date', 'checked']);

    if (keywordIdx === -1) {
      return NextResponse.json(
        { error: 'Missing "keyword" column. Required columns: keyword, url (optional), position/top, date' },
        { status: 400 }
      );
    }

    if (positionIdx === -1) {
      return NextResponse.json(
        { error: 'Missing "position/top" column. Required columns: keyword, url (optional), position/top, date' },
        { status: 400 }
      );
    }

    // Parse data rows
    const rankings: RankingRow[] = [];
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || row.every((cell) => !cell.trim())) continue; // Skip empty rows

      const keyword = row[keywordIdx]?.trim();
      const url = urlIdx !== -1 ? row[urlIdx]?.trim() : '';
      const positionStr = row[positionIdx]?.trim();
      const dateStr = dateIdx !== -1 ? row[dateIdx]?.trim() : '';

      if (!keyword) {
        errors.push(`Row ${i + 1}: Missing keyword`);
        continue;
      }

      // Parse position - handle various formats
      let position = 0;
      if (positionStr) {
        // Remove non-numeric characters except decimal point
        const cleaned = positionStr.replace(/[^\d.]/g, '');
        position = parseFloat(cleaned) || 0;
      }

      if (position <= 0 || position > 200) {
        // Skip rows with invalid position (0 or > 200 likely means no ranking)
        continue;
      }

      // Parse date - support various formats
      let parsedDate = '';
      if (dateStr) {
        parsedDate = parseDate(dateStr);
      }

      // If no date provided, use today
      if (!parsedDate) {
        parsedDate = new Date().toISOString().split('T')[0];
      }

      rankings.push({
        keyword,
        url: url || '',
        position: Math.round(position * 10) / 10, // Round to 1 decimal
        date: parsedDate,
        project_id: projectId || null,
      });
    }

    if (rankings.length === 0) {
      return NextResponse.json(
        { error: 'No valid ranking data found', details: errors },
        { status: 400 }
      );
    }

    // Insert into database (upsert by keyword + date + project_id)
    let insertedCount = 0;
    let updatedCount = 0;

    for (const ranking of rankings) {
      // Check if exists
      const { data: existing } = await supabase
        .from('keyword_rankings')
        .select('id')
        .eq('keyword', ranking.keyword)
        .eq('date', ranking.date)
        .eq('project_id', ranking.project_id || '')
        .single();

      if (existing) {
        // Update
        await supabase
          .from('keyword_rankings')
          .update({
            url: ranking.url,
            position: ranking.position,
          })
          .eq('id', existing.id);
        updatedCount++;
      } else {
        // Insert
        await supabase.from('keyword_rankings').insert({
          keyword: ranking.keyword,
          url: ranking.url,
          position: ranking.position,
          date: ranking.date,
          project_id: ranking.project_id || null,
        });
        insertedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${rankings.length} rankings (${insertedCount} new, ${updatedCount} updated)`,
      stats: {
        total: rankings.length,
        inserted: insertedCount,
        updated: updatedCount,
        errors: errors.length,
      },
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    console.error('Keyword ranking sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// Helper: Parse CSV
function parseCSV(text: string): string[][] {
  const lines = text.split('\n');
  const result: string[][] = [];

  for (const line of lines) {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current);
    result.push(row);
  }

  return result;
}

// Helper: Find column index
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const idx = headers.findIndex((h) => h.includes(name));
    if (idx !== -1) return idx;
  }
  return -1;
}

// Helper: Parse date from various formats
function parseDate(dateStr: string): string {
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.substring(0, 10);
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Try MM/DD/YYYY
  const mdyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mdyMatch) {
    const month = mdyMatch[1].padStart(2, '0');
    const day = mdyMatch[2].padStart(2, '0');
    const year = mdyMatch[3];
    // Assume DD/MM if day > 12
    if (parseInt(month) > 12) {
      return `${year}-${day}-${month}`;
    }
    return `${year}-${month}-${day}`;
  }

  // Try to parse with Date
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Ignore
  }

  return '';
}
