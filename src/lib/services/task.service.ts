import { db } from '@/lib/db';
import { tasks, projects } from '@/lib/db/schema';
import { eq, and, like, gte, lte, asc } from 'drizzle-orm';
import { AppError } from '@/lib/api-response';
import { isPublished } from '@/lib/task-helpers';

// ---------------------------------------------------------------------------
// Tasks query with filters (GET /api/tasks)
// ---------------------------------------------------------------------------

export function getTasks(filters: {
  project_id?: string;
  pic?: string;
  status?: string;
  month?: number;
  year?: number;
  published?: boolean;
  category?: string;
  priority?: string;
}) {
  const conditions = [];

  if (filters.project_id) conditions.push(eq(tasks.project_id, filters.project_id));
  if (filters.pic) conditions.push(eq(tasks.pic, filters.pic));
  if (filters.category) conditions.push(eq(tasks.category, filters.category));
  if (filters.priority) conditions.push(eq(tasks.priority, filters.priority));

  // For published filter, use publish_date range
  if (filters.month && filters.year && filters.published) {
    const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
    const endDate = new Date(filters.year, filters.month, 0).toISOString().split('T')[0];
    conditions.push(gte(tasks.publish_date, startDate));
    conditions.push(lte(tasks.publish_date, endDate));
  } else if (filters.month && filters.year) {
    conditions.push(eq(tasks.month, filters.month));
    conditions.push(eq(tasks.year, filters.year));
  }

  // Status filter uses like on both status_content and status_outline
  // For simplicity we filter status_content here; the route can do OR logic
  if (filters.status) {
    conditions.push(like(tasks.status_content, `%${filters.status}%`));
  }

  let result = db.select().from(tasks)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(tasks.deadline))
    .all();

  // Post-filter for published mode
  if (filters.published) {
    result = result.filter(
      (t) => (t.title || t.keyword_sub) && t.link_publish && isPublished(t)
    );
  }

  return result;
}

export function getTasksByProjectMonth(projectId: string, month: number, year: number) {
  return db.select().from(tasks)
    .where(and(
      eq(tasks.project_id, projectId),
      eq(tasks.month, month),
      eq(tasks.year, year),
    ))
    .all();
}

export function getTask(id: string) {
  const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) throw new AppError('Task not found', 404);
  return task;
}

export function updateTask(id: string, data: Partial<typeof tasks.$inferInsert>) {
  data.updated_at = new Date().toISOString();
  const updated = db.update(tasks).set(data).where(eq(tasks.id, id)).returning().get();
  if (!updated) throw new AppError('Task not found', 404);
  return updated;
}

export function deleteTask(id: string) {
  db.delete(tasks).where(eq(tasks.id, id)).run();
}

export function deleteTasksByProject(projectId: string) {
  db.delete(tasks).where(eq(tasks.project_id, projectId)).run();
}

export function insertTasksBatch(taskRows: (typeof tasks.$inferInsert)[]) {
  if (taskRows.length === 0) return;
  db.transaction((tx) => {
    for (let i = 0; i < taskRows.length; i += 100) {
      tx.insert(tasks).values(taskRows.slice(i, i + 100)).run();
    }
  });
}

// Get all tasks (used by stats/dashboard)
export function getAllTasks() {
  return db.select().from(tasks).all();
}

export function createTask(data: {
  project_id: string;
  title: string;
  category?: string;
  priority?: string;
  deadline?: string;
  pic?: string;
  note?: string;
  estimated_hours?: number;
  month?: number;
  year?: number;
}) {
  const now = new Date();
  const month = data.month || now.getMonth() + 1;
  const year = data.year || now.getFullYear();
  return db.insert(tasks).values({
    project_id: data.project_id,
    title: data.title,
    category: data.category || 'content',
    priority: data.priority || 'medium',
    deadline: data.deadline || null,
    pic: data.pic || '',
    note: data.note || '',
    estimated_hours: data.estimated_hours || 0,
    month,
    year,
    month_year: `${month}/${year}`,
    source: 'manual',
    status_content: '1. Doing',
  }).returning().get();
}

// Get all tasks with project name joined
export function getAllTasksWithProject() {
  return db.select().from(tasks)
    .leftJoin(projects, eq(tasks.project_id, projects.id))
    .all()
    .map((row) => ({
      ...row.tasks,
      project: row.projects ? { id: row.projects.id, name: row.projects.name } : null,
    }));
}
