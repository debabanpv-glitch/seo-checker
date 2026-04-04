// ---------------------------------------------------------------------------
// Notion Data Import — upsert JSON data into notion_* tables
// Accepts pre-extracted JSON arrays (Notion MCP only works in Claude session)
// ---------------------------------------------------------------------------

import { db } from '@/lib/db';
import {
  notionTasks,
  notionContent,
  notionBacklinks,
  notionKeywords,
  notionCompetitors,
  activityLog,
  projects,
} from '@/lib/db/schema';
import { like, or } from 'drizzle-orm';

// ── Input Types ────────────────────────────────────────────────────────────

export interface NotionTaskInput {
  notion_page_id: string;
  task_name: string;
  project?: string;
  category?: string;
  status?: string;
  priority?: string;
  deadline?: string;
  assignee?: string;
  notes?: string;
}

export interface NotionContentInput {
  notion_page_id: string;
  title: string;
  project?: string;
  work_type?: string;
  status?: string;
  target_keyword?: string;
  page_url?: string;
  word_count?: number;
  onpage_score?: number;
  publish_date?: string;
  assignee?: string;
  reviewer?: string;
}

export interface NotionBacklinkInput {
  notion_page_id: string;
  source_url: string;
  target_url: string;
  anchor_text?: string;
  dr?: number;
  da?: number;
  follow_type?: string;
  link_type?: string;
  status?: string;
  build_date?: string;
  project?: string;
}

export interface NotionKeywordInput {
  notion_page_id: string;
  keyword: string;
  project?: string;
  volume?: number;
  kd?: number;
  cpc?: number;
  intent?: string;
  funnel?: string;
  topic_group?: string;
  current_position?: number;
  target_position?: number;
  target_url?: string;
  status?: string;
}

export interface NotionCompetitorInput {
  notion_page_id: string;
  competitor_name: string;
  website?: string;
  da?: number;
  dr?: number;
  organic_traffic?: number;
  backlink_count?: number;
  keyword_count?: number;
  strengths?: string;
  weaknesses?: string;
  opportunities?: string;
  project?: string;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function resolveProjectId(projectSlug: string | undefined): string | null {
  if (!projectSlug) return null;
  const slug = projectSlug.toLowerCase();
  const row = db.select({ id: projects.id }).from(projects).where(
    or(
      like(projects.slug, `%${slug}%`),
      like(projects.name, `%${slug}%`)
    )
  ).get();
  return row?.id ?? null;
}

function logActivity(table: string, count: number, projectSlug?: string) {
  const projectId = resolveProjectId(projectSlug);
  db.insert(activityLog).values({
    id: crypto.randomUUID(),
    source: 'notion',
    action: 'synced',
    description: `Đồng bộ ${count} bản ghi vào ${table}`,
    project_id: projectId,
    entity_type: table.replace('notion_', ''),
  }).run();
}

const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// ── Query Functions ──────────────────────────────────────────────────────

/** Get all notion tasks, optionally filtered by project name */
export function getNotionTasks(filters?: { project?: string; status?: string }) {
  let rows = db.select().from(notionTasks).all();
  if (filters?.project) {
    const p = filters.project.toLowerCase();
    rows = rows.filter(r => r.project?.toLowerCase().includes(p));
  }
  if (filters?.status) {
    rows = rows.filter(r => r.status === filters.status);
  }
  return rows;
}

/** Summary stats for notion tasks */
export function getNotionTasksSummary() {
  const all = db.select().from(notionTasks).all();
  const byStatus: Record<string, number> = {};
  const byProject: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  for (const t of all) {
    byStatus[t.status || 'unknown'] = (byStatus[t.status || 'unknown'] || 0) + 1;
    byProject[t.project || 'unknown'] = (byProject[t.project || 'unknown'] || 0) + 1;
    byCategory[t.category || 'unknown'] = (byCategory[t.category || 'unknown'] || 0) + 1;
  }
  const lastSync = all.length > 0 ? all.reduce((max, t) => t.synced_at > max ? t.synced_at : max, '') : null;
  return { total: all.length, byStatus, byProject, byCategory, lastSync };
}

// ── Upsert Functions ───────────────────────────────────────────────────────

export function upsertNotionTasks(data: NotionTaskInput[]): UpsertResult {
  if (!data.length) return { inserted: 0, updated: 0 };
  let inserted = 0, updated = 0;
  const syncedAt = now();

  db.transaction((tx) => {
    for (const item of data) {
      const existing = tx.select({ id: notionTasks.notion_page_id })
        .from(notionTasks)
        .where(like(notionTasks.notion_page_id, item.notion_page_id))
        .get();

      if (existing) {
        tx.update(notionTasks).set({
          task_name: item.task_name,
          project: item.project,
          category: item.category,
          status: item.status,
          priority: item.priority,
          deadline: item.deadline,
          assignee: item.assignee,
          notes: item.notes,
          synced_at: syncedAt,
        }).where(like(notionTasks.notion_page_id, item.notion_page_id)).run();
        updated++;
      } else {
        tx.insert(notionTasks).values({ ...item, synced_at: syncedAt }).run();
        inserted++;
      }
    }
  });

  logActivity('notion_tasks', data.length, data[0]?.project);
  return { inserted, updated };
}

export function upsertNotionContent(data: NotionContentInput[]): UpsertResult {
  if (!data.length) return { inserted: 0, updated: 0 };
  let inserted = 0, updated = 0;
  const syncedAt = now();

  db.transaction((tx) => {
    for (const item of data) {
      const existing = tx.select({ id: notionContent.notion_page_id })
        .from(notionContent)
        .where(like(notionContent.notion_page_id, item.notion_page_id))
        .get();

      if (existing) {
        tx.update(notionContent).set({
          title: item.title,
          project: item.project,
          work_type: item.work_type,
          status: item.status,
          target_keyword: item.target_keyword,
          page_url: item.page_url,
          word_count: item.word_count,
          onpage_score: item.onpage_score,
          publish_date: item.publish_date,
          assignee: item.assignee,
          reviewer: item.reviewer,
          synced_at: syncedAt,
        }).where(like(notionContent.notion_page_id, item.notion_page_id)).run();
        updated++;
      } else {
        tx.insert(notionContent).values({ ...item, synced_at: syncedAt }).run();
        inserted++;
      }
    }
  });

  logActivity('notion_content', data.length, data[0]?.project);
  return { inserted, updated };
}

export function upsertNotionBacklinks(data: NotionBacklinkInput[]): UpsertResult {
  if (!data.length) return { inserted: 0, updated: 0 };
  let inserted = 0, updated = 0;
  const syncedAt = now();

  db.transaction((tx) => {
    for (const item of data) {
      const existing = tx.select({ id: notionBacklinks.notion_page_id })
        .from(notionBacklinks)
        .where(like(notionBacklinks.notion_page_id, item.notion_page_id))
        .get();

      if (existing) {
        tx.update(notionBacklinks).set({
          source_url: item.source_url,
          target_url: item.target_url,
          anchor_text: item.anchor_text,
          dr: item.dr,
          da: item.da,
          follow_type: item.follow_type,
          link_type: item.link_type,
          status: item.status,
          build_date: item.build_date,
          project: item.project,
          synced_at: syncedAt,
        }).where(like(notionBacklinks.notion_page_id, item.notion_page_id)).run();
        updated++;
      } else {
        tx.insert(notionBacklinks).values({ ...item, synced_at: syncedAt }).run();
        inserted++;
      }
    }
  });

  logActivity('notion_backlinks', data.length, data[0]?.project);
  return { inserted, updated };
}

export function upsertNotionKeywords(data: NotionKeywordInput[]): UpsertResult {
  if (!data.length) return { inserted: 0, updated: 0 };
  let inserted = 0, updated = 0;
  const syncedAt = now();

  db.transaction((tx) => {
    for (const item of data) {
      const existing = tx.select({ id: notionKeywords.notion_page_id })
        .from(notionKeywords)
        .where(like(notionKeywords.notion_page_id, item.notion_page_id))
        .get();

      if (existing) {
        tx.update(notionKeywords).set({
          keyword: item.keyword,
          project: item.project,
          volume: item.volume,
          kd: item.kd,
          cpc: item.cpc,
          intent: item.intent,
          funnel: item.funnel,
          topic_group: item.topic_group,
          current_position: item.current_position,
          target_position: item.target_position,
          target_url: item.target_url,
          status: item.status,
          synced_at: syncedAt,
        }).where(like(notionKeywords.notion_page_id, item.notion_page_id)).run();
        updated++;
      } else {
        tx.insert(notionKeywords).values({ ...item, synced_at: syncedAt }).run();
        inserted++;
      }
    }
  });

  logActivity('notion_keywords', data.length, data[0]?.project);
  return { inserted, updated };
}

export function upsertNotionCompetitors(data: NotionCompetitorInput[]): UpsertResult {
  if (!data.length) return { inserted: 0, updated: 0 };
  let inserted = 0, updated = 0;
  const syncedAt = now();

  db.transaction((tx) => {
    for (const item of data) {
      const existing = tx.select({ id: notionCompetitors.notion_page_id })
        .from(notionCompetitors)
        .where(like(notionCompetitors.notion_page_id, item.notion_page_id))
        .get();

      if (existing) {
        tx.update(notionCompetitors).set({
          competitor_name: item.competitor_name,
          website: item.website,
          da: item.da,
          dr: item.dr,
          organic_traffic: item.organic_traffic,
          backlink_count: item.backlink_count,
          keyword_count: item.keyword_count,
          strengths: item.strengths,
          weaknesses: item.weaknesses,
          opportunities: item.opportunities,
          project: item.project,
          synced_at: syncedAt,
        }).where(like(notionCompetitors.notion_page_id, item.notion_page_id)).run();
        updated++;
      } else {
        tx.insert(notionCompetitors).values({ ...item, synced_at: syncedAt }).run();
        inserted++;
      }
    }
  });

  logActivity('notion_competitors', data.length, data[0]?.project);
  return { inserted, updated };
}
