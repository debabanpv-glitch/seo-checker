import { db } from '@/lib/db';
import { projects, tasks, syncLogs } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { parseSheetDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Google Sheets fetch (async — external HTTP)
// ---------------------------------------------------------------------------

type SheetCell = { v: string | number | null; f?: string };
type SheetRow = { c: Array<SheetCell> };

async function fetchGoogleSheet(sheetId: string, sheetName: string) {
  // Use gid parameter if sheet_name is numeric (tab ID), otherwise use sheet name
  const sheetParam = /^\d+$/.test(sheetName) ? `gid=${sheetName}` : `sheet=${encodeURIComponent(sheetName)}`;
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&${sheetParam}`;

  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error(`Failed to fetch sheet: ${response.status}`);

  const text = await response.text();
  const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
  if (!jsonMatch) throw new Error('Invalid response format');

  const data = JSON.parse(jsonMatch[1]);
  return data.table;
}

function isValidRow(row: SheetRow): boolean {
  if (!row.c) return false;
  const parentKeyword = row.c[3]?.v;
  const keywordSub = row.c[4]?.v;
  const title = row.c[6]?.v;
  return !!(title || parentKeyword || keywordSub);
}

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
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keywords.length === 1 && keywords[0].length > 50) {
      const splitByCase = keywords[0].split(/(?<=[a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ])(?=[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐM])/);
      if (splitByCase.length > 1) {
        keywords = splitByCase.map((k) => k.trim()).filter((k) => k.length > 0);
      }
    }
    return keywords;
  };

  const extractMonthYear = (dateStr: string | null): { month: number; year: number } | null => {
    if (!dateStr) return null;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return { year: parseInt(match[1]), month: parseInt(match[2]) };
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

// ---------------------------------------------------------------------------
// Sync log helpers
// ---------------------------------------------------------------------------

export function createSyncLog() {
  return db.insert(syncLogs)
    .values({ status: 'running', started_at: new Date().toISOString() })
    .returning().get();
}

export function updateSyncLog(
  id: string,
  status: 'success' | 'failed',
  tasksSynced: number,
  projectsSynced: number,
  error?: string,
  durationMs?: number,
) {
  db.update(syncLogs).set({
    status,
    tasks_synced: tasksSynced,
    projects_synced: projectsSynced,
    error: error ?? null,
    duration_ms: durationMs ?? null,
    completed_at: new Date().toISOString(),
  }).where(eq(syncLogs.id, id)).run();
}

export function getSyncLogs(limit: number = 10) {
  return db.select().from(syncLogs)
    .orderBy(desc(syncLogs.started_at))
    .limit(limit)
    .all();
}

// ---------------------------------------------------------------------------
// Main sync (async — Google Sheets fetch is async)
// ---------------------------------------------------------------------------

export async function syncAllProjects() {
  const startTime = Date.now();
  const log = createSyncLog();

  try {
    const allProjects = db.select().from(projects).all();
    let totalSynced = 0;
    let projectsSynced = 0;

    for (const project of allProjects) {
      try {
        const sheetData = await fetchGoogleSheet(project.sheet_id, project.sheet_name);
        if (!sheetData?.rows?.length) {
          console.log(`No data found for project: ${project.name}`);
          continue;
        }

        const taskRows = sheetData.rows
          .filter((row: SheetRow) => isValidRow(row))
          .map((row: SheetRow) => mapRowToTask(row, project.id));

        // Delete only 'sheets' source tasks, preserve manual/claude-code tasks
        db.transaction((tx) => {
          tx.delete(tasks).where(and(eq(tasks.project_id, project.id), eq(tasks.source, 'sheets'))).run();
          for (let i = 0; i < taskRows.length; i += 100) {
            tx.insert(tasks).values(taskRows.slice(i, i + 100)).run();
          }
        });

        totalSynced += taskRows.length;
        projectsSynced++;
        console.log(`Synced ${taskRows.length} tasks for ${project.name}`);
      } catch (error) {
        console.error(`Error syncing project ${project.name}:`, error);
      }
    }

    updateSyncLog(log.id, 'success', totalSynced, projectsSynced, undefined, Date.now() - startTime);

    return {
      success: true,
      syncedCount: totalSynced,
      projectsSynced,
      message: `Đồng bộ thành công ${totalSynced} tasks từ ${projectsSynced} dự án`,
      duration: Date.now() - startTime,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    updateSyncLog(log.id, 'failed', 0, 0, msg, Date.now() - startTime);
    throw err;
  }
}
