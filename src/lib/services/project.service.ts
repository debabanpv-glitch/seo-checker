import { db } from '@/lib/db';
import { projects, tasks, monthlyTargets } from '@/lib/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { AppError } from '@/lib/api-response';
import { isPublished, isDoneQC } from '@/lib/task-helpers';

// ---------------------------------------------------------------------------
// Projects CRUD
// ---------------------------------------------------------------------------

export function getProjects() {
  return db.select().from(projects).orderBy(asc(projects.created_at)).all();
}

export function getProjectById(id: string) {
  const project = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) throw new AppError('Project not found', 404);
  return project;
}

export function createProject(data: {
  name: string;
  sheet_id: string;
  sheet_name?: string;
  monthly_target?: number;
  ranking_sheet_url?: string | null;
}) {
  return db.insert(projects).values({
    name: data.name,
    sheet_id: data.sheet_id,
    sheet_name: data.sheet_name || 'Content',
    monthly_target: data.monthly_target ?? 20,
    ranking_sheet_url: data.ranking_sheet_url ?? null,
  }).returning().get();
}

export function updateProject(id: string, data: Partial<typeof projects.$inferInsert>) {
  const updated = db.update(projects).set(data).where(eq(projects.id, id)).returning().get();
  if (!updated) throw new AppError('Project not found', 404);
  return updated;
}

export function deleteProject(id: string) {
  db.delete(projects).where(eq(projects.id, id)).run();
}

// ---------------------------------------------------------------------------
// Projects with stats (GET /api/projects)
// ---------------------------------------------------------------------------

export function getProjectsWithStats(month: number, year: number) {
  const allProjects = db.select().from(projects).orderBy(asc(projects.created_at)).all();

  const targets = db.select().from(monthlyTargets)
    .where(and(eq(monthlyTargets.month, month), eq(monthlyTargets.year, year)))
    .all();

  return allProjects.map((project) => {
    const projectTasks = db.select().from(tasks)
      .where(and(
        eq(tasks.project_id, project.id),
        eq(tasks.month, month),
        eq(tasks.year, year),
      ))
      .all();

    const published = projectTasks.filter((t) => isPublished(t)).length;
    const inProgress = projectTasks.filter((t) =>
      t.status_content && !isPublished(t) && !isDoneQC(t.status_content)
    ).length;
    const doneQC = projectTasks.filter((t) =>
      isDoneQC(t.status_content) && !isPublished(t)
    ).length;
    const overdue = projectTasks.filter((t) => {
      if (!t.deadline || isPublished(t)) return false;
      return new Date(t.deadline) < new Date();
    }).length;

    const pics = [...new Set(projectTasks.map((t) => t.pic).filter(Boolean))];

    // Total tasks all time
    const allTimeTasks = db.select().from(tasks)
      .where(eq(tasks.project_id, project.id))
      .all();

    const monthlyTarget = targets.find((mt) => mt.project_id === project.id);
    const target = monthlyTarget?.target || project.monthly_target || 20;

    return {
      ...project,
      actual: published,
      target,
      totalTasks: allTimeTasks.length,
      thisMonthTotal: projectTasks.length,
      inProgress,
      doneQC,
      overdue,
      pics,
    };
  });
}

// ---------------------------------------------------------------------------
// Project report (GET /api/projects/report)
// ---------------------------------------------------------------------------

function getWeeksInMonth(year: number, month: number) {
  const lastDay = new Date(year, month, 0);
  const totalDays = lastDay.getDate();
  const weeks: { weekNum: number; start: Date; end: Date }[] = [];

  for (let week = 1; week <= 5; week++) {
    const startDay = (week - 1) * 7 + 1;
    if (startDay > totalDays) break;
    const endDay = Math.min(week * 7, totalDays);
    const start = new Date(year, month - 1, startDay);
    const end = new Date(year, month - 1, endDay, 23, 59, 59);
    weeks.push({ weekNum: week, start, end });
  }

  return weeks;
}

export function getProjectReports(selectedMonth: number, selectedYear: number) {
  let prevMonth = selectedMonth - 1;
  let prevYear = selectedYear;
  if (prevMonth === 0) { prevMonth = 12; prevYear--; }

  const allProjects = db.select().from(projects).all();

  const currentMonthTasks = db.select().from(tasks)
    .where(and(eq(tasks.month, selectedMonth), eq(tasks.year, selectedYear)))
    .all();

  const prevMonthTasks = db.select().from(tasks)
    .where(and(eq(tasks.month, prevMonth), eq(tasks.year, prevYear)))
    .all();

  const targets = db.select().from(monthlyTargets)
    .where(and(eq(monthlyTargets.month, selectedMonth), eq(monthlyTargets.year, selectedYear)))
    .all();

  const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0);
  const today = new Date();
  const isCurrentMonth = selectedMonth === (today.getMonth() + 1) && selectedYear === today.getFullYear();
  const daysRemaining = isCurrentMonth
    ? Math.max(0, lastDayOfMonth.getDate() - today.getDate())
    : selectedMonth > (today.getMonth() + 1) || selectedYear > today.getFullYear()
      ? lastDayOfMonth.getDate()
      : 0;
  const daysElapsed = isCurrentMonth
    ? today.getDate()
    : selectedMonth < (today.getMonth() + 1) || selectedYear < today.getFullYear()
      ? lastDayOfMonth.getDate()
      : 0;
  const weeksElapsed = Math.max(1, Math.ceil(daysElapsed / 7));
  const weeksInMonth = getWeeksInMonth(selectedYear, selectedMonth);
  const currentWeekInMonth = isCurrentMonth ? Math.ceil(today.getDate() / 7) : 0;

  const projectReports = allProjects.map((project) => {
    const projectTasks = currentMonthTasks.filter(
      (t) => t.project_id === project.id && (t.title || t.keyword_sub)
    );
    const prevProjectTasks = prevMonthTasks.filter(
      (t) => t.project_id === project.id && (t.title || t.keyword_sub)
    );

    const monthlyTarget = targets.find((mt) => mt.project_id === project.id);
    const target = monthlyTarget?.target || project.monthly_target || 20;

    const published = projectTasks.filter((t) => isPublished(t)).length;
    const doneQC = projectTasks.filter((t) => isDoneQC(t.status_content) && !isPublished(t)).length;
    const inProgress = projectTasks.filter((t) =>
      t.status_content && !isPublished(t) && !isDoneQC(t.status_content)
    ).length;
    const overdue = projectTasks.filter((t) => {
      if (!t.deadline || isPublished(t)) return false;
      return new Date(t.deadline) < new Date();
    }).length;

    const prevPublished = prevProjectTasks.filter((t) => isPublished(t)).length;
    const momChange = prevPublished > 0
      ? Math.round(((published - prevPublished) / prevPublished) * 100)
      : published > 0 ? 100 : 0;

    const weeklyTarget = Math.ceil(target / weeksInMonth.length);
    const weeklyBreakdown = weeksInMonth.map((week) => {
      const tasksInWeek = projectTasks.filter((t) => {
        if (!t.publish_date || !isPublished(t)) return false;
        const pubDate = new Date(t.publish_date);
        return pubDate >= week.start && pubDate <= week.end;
      });
      return { weekNum: week.weekNum, count: tasksInWeek.length, target: weeklyTarget, isCurrent: week.weekNum === currentWeekInMonth };
    });

    const weeklyRate = weeksElapsed > 0 ? published / weeksElapsed : 0;
    const remaining = target - published;
    const weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7));
    const requiredRate = remaining > 0 ? remaining / weeksRemaining : 0;
    const projectedTotal = Math.round(published + (weeklyRate * weeksRemaining));

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (weeklyRate > requiredRate * 1.1) trend = 'up';
    else if (weeklyRate < requiredRate * 0.8) trend = 'down';

    let health: 'good' | 'warning' | 'danger' = 'good';
    const progress = target > 0 ? (published / target) * 100 : 0;
    const expectedProgress = (daysElapsed / lastDayOfMonth.getDate()) * 100;
    if (progress < expectedProgress * 0.6 || overdue > 3) health = 'danger';
    else if (progress < expectedProgress * 0.85 || overdue > 0) health = 'warning';

    // Bottleneck
    const qcContentCount = projectTasks.filter((t) =>
      t.status_content && t.status_content.toLowerCase().includes('qc') && !isPublished(t)
    ).length;
    const doingCount = projectTasks.filter((t) =>
      t.status_content && t.status_content.toLowerCase().includes('doing')
    ).length;
    const fixingCount = projectTasks.filter((t) =>
      (t.status_content && t.status_content.toLowerCase().includes('fix')) ||
      (t.status_outline && t.status_outline.toLowerCase().includes('fix'))
    ).length;

    let bottleneck: string | null = null;
    if (doneQC > 3) bottleneck = `${doneQC} bài chờ publish`;
    else if (qcContentCount > 3) bottleneck = `${qcContentCount} bài chờ QC`;
    else if (doingCount > 5) bottleneck = `${doingCount} bài đang viết`;
    else if (fixingCount > 2) bottleneck = `${fixingCount} bài đang sửa`;

    const pics = [...new Set(projectTasks.map((t) => t.pic).filter(Boolean))] as string[];

    // Top performer
    const picCounts: Record<string, number> = {};
    projectTasks.filter((t) => isPublished(t)).forEach((t) => {
      if (t.pic) picCounts[t.pic] = (picCounts[t.pic] || 0) + 1;
    });
    const topPerformer = Object.entries(picCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))[0] || null;

    // Per-person breakdown
    const picBreakdown: Record<string, { published: number; inProgress: number; doneQC: number; overdue: number; total: number }> = {};
    projectTasks.forEach((t) => {
      if (!t.pic) return;
      if (!picBreakdown[t.pic]) picBreakdown[t.pic] = { published: 0, inProgress: 0, doneQC: 0, overdue: 0, total: 0 };
      picBreakdown[t.pic].total++;
      if (isPublished(t)) picBreakdown[t.pic].published++;
      else if (isDoneQC(t.status_content)) picBreakdown[t.pic].doneQC++;
      else if (t.status_content) picBreakdown[t.pic].inProgress++;
      if (!isPublished(t) && t.deadline && new Date(t.deadline) < new Date()) picBreakdown[t.pic].overdue++;
    });
    const picDetails = Object.entries(picBreakdown)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.published - a.published);

    // Pipeline
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const pipeline = {
      doingOutline: projectTasks.filter((t) => t.status_outline && t.status_outline.toLowerCase().includes('doing') && !isPublished(t)).length,
      qcOutline: projectTasks.filter((t) => t.status_outline && t.status_outline.toLowerCase().includes('qc') && !isPublished(t)).length,
      fixingOutline: projectTasks.filter((t) => t.status_outline && t.status_outline.toLowerCase().includes('fix') && !isPublished(t)).length,
      doingContent: projectTasks.filter((t) => t.status_content && t.status_content.toLowerCase().includes('doing') && !isPublished(t)).length,
      qcContent: qcContentCount,
      fixingContent: projectTasks.filter((t) => t.status_content && t.status_content.toLowerCase().includes('fix') && !isPublished(t)).length,
      waitPublish: projectTasks.filter((t) => isDoneQC(t.status_content) && !isPublished(t)).length,
    };

    // Deadline distribution
    const threeDaysLater = new Date(todayDate);
    threeDaysLater.setDate(todayDate.getDate() + 3);
    const sevenDaysLater = new Date(todayDate);
    sevenDaysLater.setDate(todayDate.getDate() + 7);

    const deadlineDistribution = {
      overdue: projectTasks.filter((t) => { if (isPublished(t) || !t.deadline) return false; return new Date(t.deadline) < todayDate; }).length,
      dueSoon: projectTasks.filter((t) => { if (isPublished(t) || !t.deadline) return false; const d = new Date(t.deadline); return d >= todayDate && d <= threeDaysLater; }).length,
      dueThisWeek: projectTasks.filter((t) => { if (isPublished(t) || !t.deadline) return false; const d = new Date(t.deadline); return d > threeDaysLater && d <= sevenDaysLater; }).length,
      later: projectTasks.filter((t) => { if (isPublished(t) || !t.deadline) return false; return new Date(t.deadline) > sevenDaysLater; }).length,
      noDeadline: projectTasks.filter((t) => !isPublished(t) && !t.deadline).length,
    };

    // Active tasks
    const activeTasks = projectTasks
      .filter((t) => !isPublished(t))
      .map((t) => ({
        id: t.id, title: t.title || t.keyword_sub || t.parent_keyword,
        pic: t.pic, status_outline: t.status_outline, status_content: t.status_content,
        deadline: t.deadline, isOverdue: t.deadline ? new Date(t.deadline) < todayDate : false,
      }))
      .sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        return 0;
      })
      .slice(0, 15);

    // Recent published
    const recentPublished = projectTasks
      .filter((t) => isPublished(t))
      .map((t) => ({ id: t.id, title: t.title || t.keyword_sub, pic: t.pic, publish_date: t.publish_date, link_publish: t.link_publish }))
      .sort((a, b) => {
        if (!a.publish_date || !b.publish_date) return 0;
        return new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime();
      })
      .slice(0, 5);

    return {
      id: project.id, name: project.name, sheet_id: project.sheet_id, sheet_name: project.sheet_name,
      target, published, inProgress, doneQC, overdue,
      weeklyBreakdown, weeklyTarget,
      prevPublished, momChange,
      weeklyRate, requiredRate, daysRemaining, projectedTotal, trend, health, bottleneck,
      pics, topPerformer,
      picDetails, pipeline, deadlineDistribution, activeTasks, recentPublished,
    };
  });

  projectReports.sort((a, b) => {
    const healthOrder = { danger: 0, warning: 1, good: 2 };
    return healthOrder[a.health] - healthOrder[b.health];
  });

  return {
    projects: projectReports,
    meta: { selectedMonth, selectedYear, prevMonth, prevYear, isCurrentMonth, weeksInMonth: weeksInMonth.length, currentWeekInMonth },
  };
}

// ---------------------------------------------------------------------------
// Monthly Targets
// ---------------------------------------------------------------------------

export function getTargets(projectId?: string) {
  if (projectId) {
    return db.select().from(monthlyTargets)
      .where(eq(monthlyTargets.project_id, projectId))
      .orderBy(desc(monthlyTargets.year), desc(monthlyTargets.month))
      .all();
  }
  return db.select().from(monthlyTargets)
    .orderBy(desc(monthlyTargets.year), desc(monthlyTargets.month))
    .all();
}

export function upsertTarget(project_id: string, month: number, year: number, target: number) {
  return db.insert(monthlyTargets)
    .values({ project_id, month, year, target })
    .onConflictDoUpdate({
      target: [monthlyTargets.project_id, monthlyTargets.month, monthlyTargets.year],
      set: { target },
    })
    .returning().get();
}

export function deleteTarget(id: string) {
  db.delete(monthlyTargets).where(eq(monthlyTargets.id, id)).run();
}
