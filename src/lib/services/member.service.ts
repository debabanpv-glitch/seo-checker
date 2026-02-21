import { db } from '@/lib/db';
import { members, tasks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { AppError } from '@/lib/api-response';

// ---------------------------------------------------------------------------
// Members CRUD
// ---------------------------------------------------------------------------

export function getAllMembers() {
  return db.select().from(members).all();
}

export function getMemberById(id: string) {
  const member = db.select().from(members).where(eq(members.id, id)).get();
  if (!member) throw new AppError('Member not found', 404);
  return member;
}

export function createMember(data: {
  name: string;
  nickname?: string | null;
  role?: string;
  projects?: string[];
  start_date?: string | null;
  email?: string | null;
  phone?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
}) {
  return db.insert(members).values({
    name: data.name,
    nickname: data.nickname ?? null,
    role: data.role || 'Content Writer',
    projects: data.projects || [],
    start_date: data.start_date ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    bank_name: data.bank_name ?? null,
    bank_account: data.bank_account ?? null,
  }).returning().get();
}

export function updateMember(id: string, data: Partial<typeof members.$inferInsert>) {
  const updated = db.update(members).set(data).where(eq(members.id, id)).returning().get();
  if (!updated) throw new AppError('Member not found', 404);
  return updated;
}

export function deleteMember(id: string) {
  db.delete(members).where(eq(members.id, id)).run();
}

// ---------------------------------------------------------------------------
// Member stats (GET /api/members)
// ---------------------------------------------------------------------------

export function getMemberStats(month: number, year: number, viewType: string = 'month') {
  const allTasks = db.select().from(tasks)
    .where(and(eq(tasks.month, month), eq(tasks.year, year)))
    .all();

  const memberInfos = db.select().from(members).all();

  // Filter tasks by view type
  const now = new Date();
  const filterTasks = (taskList: typeof allTasks) => {
    if (viewType === 'day') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return taskList.filter((t) => {
        const taskDate = t.publish_date ? new Date(t.publish_date) : null;
        if (!taskDate) return false;
        return taskDate >= today && taskDate < tomorrow;
      });
    } else if (viewType === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      return taskList.filter((t) => {
        const taskDate = t.publish_date ? new Date(t.publish_date) : null;
        if (!taskDate) return false;
        return taskDate >= startOfWeek && taskDate < endOfWeek;
      });
    }
    return taskList;
  };

  const tasksForStats = viewType === 'month' ? allTasks : filterTasks(allTasks);

  // Group by PIC
  const memberMap = new Map<string, {
    name: string; totalThisMonth: number; published: number;
    inProgress: number; onTime: number; late: number;
  }>();

  tasksForStats.forEach((task) => {
    const pic = task.pic || 'Unknown';
    if (!memberMap.has(pic)) {
      memberMap.set(pic, { name: pic, totalThisMonth: 0, published: 0, inProgress: 0, onTime: 0, late: 0 });
    }
    const member = memberMap.get(pic)!;
    member.totalThisMonth++;

    if (task.status_content === '4. Publish') {
      member.published++;
      if (task.publish_date && task.deadline) {
        if (new Date(task.publish_date) <= new Date(task.deadline)) member.onTime++;
        else member.late++;
      } else {
        member.onTime++;
      }
    } else if (task.status_content && task.status_content !== '3. Done QC') {
      member.inProgress++;
    }
  });

  const memberStats = Array.from(memberMap.values())
    .map((m) => ({
      ...m,
      onTimeRate: m.published > 0 ? Math.round((m.onTime / m.published) * 100) : 0,
    }))
    .filter((m) => m.name !== 'Unknown')
    .sort((a, b) => b.published - a.published);

  return { members: memberStats, memberInfos };
}
