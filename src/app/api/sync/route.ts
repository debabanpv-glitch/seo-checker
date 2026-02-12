import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseSheetDate } from '@/lib/utils';

// Vercel function config: extend timeout for sync operations
export const maxDuration = 60; // 60 seconds (requires Vercel Pro plan, Hobby = 10s)

// Google Sheets API endpoint (using public CSV export)
async function fetchGoogleSheet(sheetId: string, sheetName: string) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      signal: AbortSignal.timeout(15000),
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
    const cell = row.c[index];
    if (!cell) return '';
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

  const parseKeywords = (str: string): string[] => {
    if (!str) return [];

    let keywords = str
      .split(/[\r\n]+|\\n|,|;/)
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keywords.length === 1 && keywords[0].length > 50) {
      const merged = keywords[0];
      const splitByCase = merged.split(/(?<=[a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ])(?=[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐM])/);
      if (splitByCase.length > 1) {
        keywords = splitByCase.map(k => k.trim()).filter(k => k.length > 0);
      }
    }

    return keywords;
  };

  const extractMonthYear = (dateStr: string | null): { month: number; year: number } | null => {
    if (!dateStr) return null;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return {
        year: parseInt(match[1]),
        month: parseInt(match[2]),
      };
    }
    return null;
  };

  const stt = getNumberValue(0);
  const parentKeyword = getStringValue(3);
  const keywordSub = getStringValue(4);

  const keywordsList = parseKeywords(keywordSub);
  const keywordCount = keywordsList.length;
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

  const dateInfo = extractMonthYear(deadline) || extractMonthYear(publishDate);
  const year = dateInfo?.year || new Date().getFullYear();
  const month = dateInfo?.month || new Date().getMonth() + 1;

  return {
    project_id: projectId,
    stt,
    year,
    month,
    parent_keyword: parentKeyword,
    keyword_sub: keywordSub,
    keyword_count: keywordCount,
    keywords_list: keywordsList,
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
    .insert({
      status: 'running',
      started_at: new Date().toISOString(),
    })
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
    let totalFailed = 0;
    let totalSkipped = 0;
    let projectsSynced = 0;
    const projectErrors: string[] = [];

    // Phase 1: Fetch ALL data from all sheets first (don't touch DB yet)
    const projectData: Array<{
      project: typeof projects[0];
      tasks: ReturnType<typeof mapRowToTask>[];
      totalRows: number;
      skippedRows: number;
    }> = [];

    for (const project of projects || []) {
      try {
        const sheetData = await fetchGoogleSheet(project.sheet_id, project.sheet_name);

        if (!sheetData?.rows?.length) {
          projectErrors.push(`${project.name}: Không có dữ liệu trên Sheet`);
          continue;
        }

        const totalRows = sheetData.rows.length;

        const tasks = sheetData.rows
          .filter((row: SheetRow) => isValidRow(row))
          .map((row: SheetRow) => mapRowToTask(row, project.id));

        const skippedRows = totalRows - tasks.length;
        totalSkipped += skippedRows;

        if (tasks.length === 0) {
          projectErrors.push(`${project.name}: ${totalRows} rows nhưng không có row hợp lệ`);
          continue;
        }

        projectData.push({ project, tasks, totalRows, skippedRows });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        projectErrors.push(`${project.name}: Fetch Sheet lỗi - ${msg}`);
      }
    }

    // Phase 2: All data fetched successfully, now update DB
    for (const { project, tasks, totalRows, skippedRows } of projectData) {
      try {
        // Delete old tasks for this project
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('project_id', project.id);

        if (deleteError) {
          projectErrors.push(`${project.name}: Xóa data cũ thất bại - ${deleteError.message}`);
          continue;
        }

        // Insert new tasks in batches
        let insertedCount = 0;
        let batchErrors = 0;
        const batchSize = 100;

        for (let i = 0; i < tasks.length; i += batchSize) {
          const batch = tasks.slice(i, i + batchSize);
          const { error: insertError } = await supabase.from('tasks').insert(batch);

          if (insertError) {
            console.error(`Error inserting batch for ${project.name}:`, insertError);
            batchErrors++;
            totalFailed += batch.length;
          } else {
            insertedCount += batch.length;
          }
        }

        totalSynced += insertedCount;
        projectsSynced++;

        if (batchErrors > 0) {
          projectErrors.push(`${project.name}: ${insertedCount}/${tasks.length} tasks OK, ${batchErrors} batch lỗi`);
        }
        if (skippedRows > 0) {
          console.log(`[SYNC] ${project.name}: ${skippedRows}/${totalRows} rows bỏ qua (thiếu title/keyword)`);
        }

        console.log(`Synced ${insertedCount} tasks for ${project.name}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        projectErrors.push(`${project.name}: DB error - ${msg}`);
      }
    }

    const hasErrors = projectErrors.length > 0;
    const status = totalSynced > 0 ? 'success' : 'failed';
    const errorSummary = hasErrors ? projectErrors.join('; ') : undefined;

    await updateSyncLog(logId, status, totalSynced, projectsSynced, errorSummary, startTime);

    return NextResponse.json({
      success: totalSynced > 0,
      syncedCount: totalSynced,
      projectsSynced,
      failedCount: totalFailed,
      skippedCount: totalSkipped,
      message: `Đồng bộ ${totalSynced} tasks từ ${projectsSynced} dự án` +
        (totalFailed > 0 ? `, ${totalFailed} tasks lỗi` : '') +
        (totalSkipped > 0 ? `, ${totalSkipped} rows bỏ qua` : ''),
      errors: hasErrors ? projectErrors : undefined,
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
  return POST();
}
