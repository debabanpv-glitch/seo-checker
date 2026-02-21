import { db } from '@/lib/db';
import { tasks, projects, salaryPayments } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { calculateSalary } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Salary data (GET /api/salary)
// ---------------------------------------------------------------------------

// Local helper matching original route logic (status-based check)
function isPublishedByStatus(statusContent: string | null) {
  if (!statusContent) return false;
  const status = statusContent.toLowerCase().trim();
  return status.includes('publish') || status.includes('4.') || status === 'done' || status === 'hoàn thành';
}

export function getSalaryData(month: number, year: number, projectId?: string) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const conditions = [gte(tasks.publish_date, startDate), lte(tasks.publish_date, endDate)];
  if (projectId) conditions.push(eq(tasks.project_id, projectId));

  const taskList = db.select().from(tasks)
    .leftJoin(projects, eq(tasks.project_id, projects.id))
    .where(and(...conditions))
    .all();

  // Filter published tasks
  const publishedTasks = taskList.filter(
    (row) => (row.tasks.title || row.tasks.keyword_sub) && isPublishedByStatus(row.tasks.status_content)
  );

  // Group by PIC
  const picData = new Map<string, {
    count: number;
    tasks: Array<{ id: string; title: string; project: string; publish_date: string | null; link: string | null }>;
  }>();

  publishedTasks.forEach((row) => {
    const pic = row.tasks.pic || 'Unknown';
    const existing = picData.get(pic) || { count: 0, tasks: [] };
    existing.count += 1;
    existing.tasks.push({
      id: row.tasks.id,
      title: row.tasks.title || row.tasks.keyword_sub || '',
      project: row.projects?.name || '',
      publish_date: row.tasks.publish_date,
      link: row.tasks.link_publish,
    });
    picData.set(pic, existing);
  });

  const salaryData = Array.from(picData.entries())
    .filter(([name]) => name !== 'Unknown')
    .map(([name, data]) => {
      const salary = calculateSalary(data.count);
      return {
        name,
        publishedCount: data.count,
        tasks: data.tasks.sort((a, b) => {
          if (!a.publish_date) return 1;
          if (!b.publish_date) return -1;
          return new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime();
        }),
        ...salary,
      };
    })
    .sort((a, b) => b.total - a.total);

  const projectList = db.select({ id: projects.id, name: projects.name }).from(projects).all();

  return {
    salaryData,
    projects: projectList,
    meta: { month, year, projectId: projectId || '', totalPublished: publishedTasks.length },
  };
}

// ---------------------------------------------------------------------------
// Salary analytics (GET /api/salary/analytics)
// ---------------------------------------------------------------------------

export function getSalaryAnalytics(months: number = 6) {
  const now = new Date();
  const monthlyData: Array<{
    month: number; year: number; label: string; shortLabel: string;
    totalSalary: number; totalPaid: number; memberCount: number; paidCount: number;
    articleCount: number; avgCostPerArticle: number; isPaid: boolean;
  }> = [];

  const projectTotals = new Map<string, { name: string; total: number; count: number; members: Set<string> }>();
  const memberTotals = new Map<string, {
    name: string; totalEarnings: number; totalArticles: number;
    monthlyData: { month: number; year: number; label: string; salary: number; articles: number }[];
    projects: Set<string>; kpiMetCount: number;
  }>();
  const projectMonthlyData = new Map<string, {
    id: string; name: string;
    monthlyData: { month: number; year: number; label: string; cost: number; articles: number }[];
  }>();

  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const monthLabel = `T${month}/${year}`;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const taskRows = db.select().from(tasks)
      .leftJoin(projects, eq(tasks.project_id, projects.id))
      .where(and(gte(tasks.publish_date, startDate), lte(tasks.publish_date, endDate)))
      .all();

    const publishedTasks = taskRows.filter(
      (row) => (row.tasks.title || row.tasks.keyword_sub) && isPublishedByStatus(row.tasks.status_content)
    );

    const picCounts = new Map<string, number>();
    const projectCounts = new Map<string, { id: string; name: string; count: number; members: Set<string> }>();

    publishedTasks.forEach((row) => {
      const pic = row.tasks.pic || 'Unknown';
      if (pic !== 'Unknown') picCounts.set(pic, (picCounts.get(pic) || 0) + 1);

      const pId = row.tasks.project_id || 'unknown';
      const pName = row.projects?.name || 'Không xác định';
      const existing = projectCounts.get(pId) || { id: pId, name: pName, count: 0, members: new Set<string>() };
      existing.count += 1;
      if (pic !== 'Unknown') existing.members.add(pic);
      projectCounts.set(pId, existing);
    });

    let totalSalary = 0;
    picCounts.forEach((count, memberName) => {
      const salary = calculateSalary(count);
      totalSalary += salary.total;

      const memberData = memberTotals.get(memberName) || {
        name: memberName, totalEarnings: 0, totalArticles: 0, monthlyData: [], projects: new Set<string>(), kpiMetCount: 0,
      };
      memberData.totalEarnings += salary.total;
      memberData.totalArticles += count;
      memberData.monthlyData.push({ month, year, label: monthLabel, salary: salary.total, articles: count });
      if (salary.isKpiMet) memberData.kpiMetCount += 1;

      publishedTasks.filter((r) => r.tasks.pic === memberName).forEach((r) => {
        if (r.projects?.name) memberData.projects.add(r.projects.name);
      });
      memberTotals.set(memberName, memberData);
    });

    const payments = db.select().from(salaryPayments)
      .where(and(eq(salaryPayments.month, month), eq(salaryPayments.year, year)))
      .all();

    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const paidCount = payments.length;

    projectCounts.forEach((data, pId) => {
      const existing = projectTotals.get(pId) || { name: data.name, total: 0, count: 0, members: new Set<string>() };
      const articleCost = data.count * 125000;
      existing.total += articleCost;
      existing.count += data.count;
      data.members.forEach((m) => existing.members.add(m));
      projectTotals.set(pId, existing);

      const pm = projectMonthlyData.get(pId) || { id: pId, name: data.name, monthlyData: [] };
      pm.monthlyData.push({ month, year, label: monthLabel, cost: articleCost, articles: data.count });
      projectMonthlyData.set(pId, pm);
    });

    monthlyData.push({
      month, year, label: monthLabel, shortLabel: `T${month}`,
      totalSalary, totalPaid, memberCount: picCounts.size, paidCount,
      articleCount: publishedTasks.length,
      avgCostPerArticle: publishedTasks.length > 0 ? Math.round(totalSalary / publishedTasks.length) : 0,
      isPaid: paidCount >= picCounts.size && picCounts.size > 0,
    });
  }

  monthlyData.reverse();

  const projectBreakdown = Array.from(projectTotals.entries())
    .map(([id, data]) => ({
      id, name: data.name, total: data.total, count: data.count,
      memberCount: data.members.size,
      avgCostPerArticle: data.count > 0 ? Math.round(data.total / data.count) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const projectTrends = Array.from(projectMonthlyData.entries())
    .map(([id, data]) => ({ id, name: data.name, monthlyData: data.monthlyData.reverse() }))
    .sort((a, b) => {
      const totalA = a.monthlyData.reduce((sum, m) => sum + m.cost, 0);
      const totalB = b.monthlyData.reduce((sum, m) => sum + m.cost, 0);
      return totalB - totalA;
    });

  const memberBreakdown = Array.from(memberTotals.entries())
    .map(([name, data]) => ({
      name, totalEarnings: data.totalEarnings, totalArticles: data.totalArticles,
      monthlyData: data.monthlyData.reverse(), projects: Array.from(data.projects),
      kpiMetCount: data.kpiMetCount,
      avgMonthlyEarnings: data.monthlyData.length > 0 ? Math.round(data.totalEarnings / data.monthlyData.length) : 0,
      avgArticlesPerMonth: data.monthlyData.length > 0 ? Math.round(data.totalArticles / data.monthlyData.length * 10) / 10 : 0,
    }))
    .sort((a, b) => b.totalEarnings - a.totalEarnings);

  const currentMonth = monthlyData[monthlyData.length - 1];
  const lastMonth = monthlyData.length >= 2 ? monthlyData[monthlyData.length - 2] : null;
  const firstMonth = monthlyData[0];

  const totalAllTime = monthlyData.reduce((sum, m) => sum + m.totalSalary, 0);
  const totalArticlesAllTime = monthlyData.reduce((sum, m) => sum + m.articleCount, 0);
  const avgMonthly = totalAllTime / monthlyData.length;
  const avgCostPerArticle = totalArticlesAllTime > 0 ? Math.round(totalAllTime / totalArticlesAllTime) : 0;

  const changeFromLastMonth = lastMonth && lastMonth.totalSalary > 0
    ? ((currentMonth.totalSalary - lastMonth.totalSalary) / lastMonth.totalSalary * 100) : 0;

  const costGrowthRate = firstMonth && firstMonth.totalSalary > 0
    ? ((currentMonth.totalSalary - firstMonth.totalSalary) / firstMonth.totalSalary * 100) : 0;

  const teamGrowthRate = firstMonth && firstMonth.memberCount > 0
    ? ((currentMonth.memberCount - firstMonth.memberCount) / firstMonth.memberCount * 100) : 0;

  return {
    summary: {
      currentMonth: currentMonth.totalSalary, lastMonth: lastMonth?.totalSalary || 0,
      changePercent: Math.round(changeFromLastMonth), avgMonthly: Math.round(avgMonthly),
      avgCostPerArticle, totalMembers: currentMonth.memberCount, paidMembers: currentMonth.paidCount,
      totalArticles: currentMonth.articleCount, totalAllTime, totalArticlesAllTime,
      costGrowthRate: Math.round(costGrowthRate), teamGrowthRate: Math.round(teamGrowthRate),
    },
    monthlyTrend: monthlyData,
    projectBreakdown,
    projectTrends,
    memberBreakdown,
  };
}

// ---------------------------------------------------------------------------
// Salary payments CRUD (GET/POST/DELETE /api/salary-payments)
// ---------------------------------------------------------------------------

export function getPayments(month: number, year: number) {
  return db.select().from(salaryPayments)
    .where(and(eq(salaryPayments.month, month), eq(salaryPayments.year, year)))
    .all();
}

export function upsertPayment(member_name: string, month: number, year: number, amount: number) {
  return db.insert(salaryPayments)
    .values({ member_name, month, year, amount })
    .onConflictDoUpdate({
      target: [salaryPayments.member_name, salaryPayments.month, salaryPayments.year],
      set: { amount },
    })
    .returning().get();
}

export function deletePayment(member_name: string, month: number, year: number) {
  db.delete(salaryPayments)
    .where(and(
      eq(salaryPayments.member_name, member_name),
      eq(salaryPayments.month, month),
      eq(salaryPayments.year, year),
    ))
    .run();
}
