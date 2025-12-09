import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseSheetDate } from '@/lib/utils';

// Google Sheets API endpoint (using public CSV export)
async function fetchGoogleSheet(sheetId: string, sheetName: string) {
  // Use Google Sheets API v4 or public CSV export
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status}`);
    }

    const text = await response.text();

    // Parse the JSONP response
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    const data = JSON.parse(jsonMatch[1]);
    return data.table;
  } catch (error) {
    console.error('Error fetching Google Sheet:', error);
    throw error;
  }
}

// Cell type from Google Sheets gviz response
type SheetCell = { v: string | number | null; f?: string };
type SheetRow = { c: Array<SheetCell> };

// Check if row has valid data (not empty/Untitled)
function isValidRow(row: SheetRow): boolean {
  if (!row.c) return false;
  const parentKeyword = row.c[3]?.v; // Column D - Parent Keyword
  const keywordSub = row.c[4]?.v;    // Column E - Keyword phụ
  const title = row.c[6]?.v;         // Column G - Title
  // Row is valid if it has at least title or keyword
  return !!(title || parentKeyword || keywordSub);
}

// Map sheet columns to task fields
function mapRowToTask(row: SheetRow, projectId: string) {
  const getValue = (index: number) => {
    const cell = row.c[index];
    return cell?.v ?? null;
  };

  const getFormattedValue = (index: number): string => {
    // Get formatted value (f) which is what user sees, or fall back to raw value (v)
    const cell = row.c[index];
    if (!cell) return '';
    // Prefer formatted value for dates
    if (cell.f) return String(cell.f);
    return cell.v !== null ? String(cell.v) : '';
  };

  const getStringValue = (index: number): string => {
    const val = getValue(index);
    return val !== null ? String(val) : '';
  };

  const getNumberValue = (index: number): number => {
    const val = getValue(index);
    return typeof val === 'number' ? val : parseInt(String(val)) || 0;
  };

  // Column mapping based on typical content tracking sheet structure
  // Adjust indices based on actual sheet structure
  const stt = getNumberValue(0);
  const year = getNumberValue(1) || new Date().getFullYear();
  const month = getNumberValue(2) || new Date().getMonth() + 1;
  const parentKeyword = getStringValue(3);
  const keywordSub = getStringValue(4);
  const searchVolume = getNumberValue(5);
  const title = getStringValue(6);
  const outline = getStringValue(7);
  const timelineOutline = getStringValue(8);
  const statusOutline = getStringValue(9);
  const pic = getStringValue(10);
  const contentFile = getStringValue(11);
  const rawDeadline = getFormattedValue(12);
  const deadline = parseSheetDate(rawDeadline);
  const statusContent = getStringValue(13);
  const linkPublish = getStringValue(14);
  const rawPublishDate = getFormattedValue(15);
  const publishDate = parseSheetDate(rawPublishDate);
  const note = getStringValue(16);

  // Debug log for dates
  if (rawPublishDate || rawDeadline) {
    console.log(`[SYNC DEBUG] Row ${stt}: deadline="${rawDeadline}" -> ${deadline}, publishDate="${rawPublishDate}" -> ${publishDate}`);
  }

  return {
    project_id: projectId,
    stt,
    year,
    month,
    parent_keyword: parentKeyword,
    keyword_sub: keywordSub,
    search_volume: searchVolume,
    title,
    outline,
    timeline_outline: timelineOutline,
    status_outline: statusOutline,
    pic,
    content_file: contentFile,
    deadline,
    status_content: statusContent,
    link_publish: linkPublish,
    publish_date: publishDate,
    note,
    month_year: `${month}/${year}`,
    updated_at: new Date().toISOString(),
  };
}

// Create sync log entry
async function createSyncLog() {
  const { data, error } = await supabase
    .from('sync_logs')
    .insert({ status: 'running' })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create sync log:', error);
    return null;
  }
  return data?.id;
}

// Update sync log
async function updateSyncLog(
  logId: number | null,
  status: 'success' | 'failed',
  tasksSynced: number,
  projectsSynced: number,
  error?: string,
  startTime?: number
) {
  if (!logId) return;

  const duration = startTime ? Date.now() - startTime : null;

  await supabase
    .from('sync_logs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      tasks_synced: tasksSynced,
      projects_synced: projectsSynced,
      error: error || null,
      duration_ms: duration,
    })
    .eq('id', logId);
}

// POST: Manual sync trigger
export async function POST() {
  const startTime = Date.now();
  const logId = await createSyncLog();

  try {
    // Fetch all projects
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*');

    if (projectError) {
      await updateSyncLog(logId, 'failed', 0, 0, projectError.message, startTime);
      return NextResponse.json({ error: projectError.message }, { status: 500 });
    }

    let totalSynced = 0;
    let projectsSynced = 0;

    for (const project of projects || []) {
      try {
        // Fetch data from Google Sheet
        const sheetData = await fetchGoogleSheet(project.sheet_id, project.sheet_name);

        if (!sheetData?.rows?.length) {
          console.log(`No data found for project: ${project.name}`);
          continue;
        }

        // Skip header row and map data - only include rows with valid data
        const tasks = sheetData.rows
          .slice(1) // Skip header
          .filter((row: SheetRow) => isValidRow(row))
          .map((row: SheetRow) => mapRowToTask(row, project.id));

        // Delete existing tasks for this project and insert new ones
        await supabase.from('tasks').delete().eq('project_id', project.id);

        // Insert in batches of 100
        const batchSize = 100;
        for (let i = 0; i < tasks.length; i += batchSize) {
          const batch = tasks.slice(i, i + batchSize);
          const { error: insertError } = await supabase.from('tasks').insert(batch);

          if (insertError) {
            console.error(`Error inserting batch for ${project.name}:`, insertError);
          }
        }

        totalSynced += tasks.length;
        projectsSynced++;
        console.log(`Synced ${tasks.length} tasks for ${project.name}`);
      } catch (error) {
        console.error(`Error syncing project ${project.name}:`, error);
      }
    }

    await updateSyncLog(logId, 'success', totalSynced, projectsSynced, undefined, startTime);

    return NextResponse.json({
      success: true,
      syncedCount: totalSynced,
      projectsSynced,
      message: `Đồng bộ thành công ${totalSynced} tasks từ ${projectsSynced} dự án`,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await updateSyncLog(logId, 'failed', 0, 0, errorMsg, startTime);

    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: errorMsg },
      { status: 500 }
    );
  }
}

// GET: For Vercel Cron or manual trigger
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  // For Vercel Cron, just run the sync
  return POST();
}
