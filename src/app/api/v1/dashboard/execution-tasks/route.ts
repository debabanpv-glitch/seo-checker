import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks, notionTasks, projects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// Normalized task item for execution tab
interface ExecutionTask {
  id: string;
  title: string;
  source: 'sheet' | 'notion';
  category: string;
  status: string;
  assignee?: string;
  deadline?: string;
  publishUrl?: string;
  publishDate?: string;
  priority?: string;
}

// Map notion status → normalized status
function normalizeNotionStatus(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes('hoàn thành') || s.includes('done')) return 'done';
  if (s.includes('đang làm') || s.includes('doing') || s.includes('progress')) return 'in_progress';
  if (s.includes('review') || s.includes('chờ')) return 'review';
  return 'backlog';
}

// Map tasks.status_content → normalized
function normalizeTaskStatus(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes('publish') || s.includes('done') || s.includes('đã đăng') || s.includes('live')) return 'done';
  if (s.includes('qc') || s.includes('fix') || s.includes('writing') || s.includes('doing')) return 'in_progress';
  return 'pending';
}

// Normalize category names for consistent grouping
function normalizeCategory(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (s.includes('content') || s === '') return 'Content';
  if (s.includes('onpage') || s.includes('on-page') || s.includes('on page')) return 'Onpage';
  if (s.includes('technical') || s.includes('audit')) return 'Technical';
  if (s.includes('backlink') || s.includes('link')) return 'Backlink';
  if (s.includes('report')) return 'Report';
  if (s.includes('keyword')) return 'Keyword Research';
  if (s.includes('competitor')) return 'Competitor';
  return raw || 'Content';
}

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const projectId = sp.get('project_id') || undefined;
    const month = sp.get('month') ? parseInt(sp.get('month')!) : undefined;
    const year = sp.get('year') ? parseInt(sp.get('year')!) : undefined;

    // Get project slug for notion_tasks mapping
    let projectSlug: string | undefined;
    if (projectId) {
      const proj = db.select({ slug: projects.slug }).from(projects).where(eq(projects.id, projectId)).get();
      projectSlug = proj?.slug ?? undefined;
    }

    // 1. Fetch tasks table (content tasks with month/year)
    const taskConditions = [];
    if (projectId) taskConditions.push(eq(tasks.project_id, projectId));
    if (month) taskConditions.push(eq(tasks.month, month));
    if (year) taskConditions.push(eq(tasks.year, year));

    const taskRows = taskConditions.length > 0
      ? db.select().from(tasks).where(and(...taskConditions)).all()
      : db.select().from(tasks).all();

    const items: ExecutionTask[] = [];

    for (const row of taskRows) {
      items.push({
        id: row.id,
        title: row.title || row.parent_keyword || '',
        source: 'sheet',
        category: normalizeCategory(row.category),
        status: normalizeTaskStatus(row.status_content),
        assignee: row.pic || undefined,
        deadline: row.deadline || undefined,
        publishUrl: row.link_publish || undefined,
        publishDate: row.publish_date || undefined,
        priority: row.priority || undefined,
      });
    }

    // 2. Fetch notion_tasks — filter by deadline month/year if specified
    const allNotionRows = projectSlug
      ? db.select().from(notionTasks).where(eq(notionTasks.project, projectSlug)).all()
      : db.select().from(notionTasks).all();

    const notionRows = (month && year)
      ? allNotionRows.filter((r) => {
          if (!r.deadline) return true; // no deadline → always include
          const d = new Date(r.deadline);
          return d.getMonth() + 1 === month && d.getFullYear() === year;
        })
      : allNotionRows;

    for (const row of notionRows) {
      items.push({
        id: row.notion_page_id,
        title: row.task_name,
        source: 'notion',
        category: normalizeCategory(row.category ?? ''),
        status: normalizeNotionStatus(row.status ?? ''),
        assignee: row.assignee || undefined,
        deadline: row.deadline || undefined,
        priority: row.priority || undefined,
      });
    }

    // Build summary stats
    const now = new Date().toISOString().slice(0, 10);
    let done = 0, inProgress = 0, overdue = 0;
    const byCategory: Record<string, { total: number; done: number }> = {};

    for (const item of items) {
      const isDone = item.status === 'done';
      if (isDone) done++;
      else if (item.status === 'in_progress' || item.status === 'review') inProgress++;
      if (!isDone && item.deadline && item.deadline < now) overdue++;

      if (!byCategory[item.category]) byCategory[item.category] = { total: 0, done: 0 };
      byCategory[item.category].total++;
      if (isDone) byCategory[item.category].done++;
    }

    return NextResponse.json({
      items,
      summary: { total: items.length, done, inProgress, overdue, byCategory },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
