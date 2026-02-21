import { db } from '@/lib/db';
import { tasks, members, projects, salaryPayments, keywordRankings, seoResults, monthlyTargets } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { isPublished, isDoneQC } from '@/lib/task-helpers';

// ---------------------------------------------------------------------------
// Dashboard overview (GET /api/dashboard/overview)
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(amount);
}

export function getDashboardOverview(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  // All queries are sync
  const allTasks = db.select().from(tasks)
    .leftJoin(projects, eq(tasks.project_id, projects.id))
    .all()
    .map((row) => ({ ...row.tasks, project: row.projects ? { id: row.projects.id, name: row.projects.name } : null }));

  // Filter tasks for the date range (matching original: deadline or publish_date in range)
  const monthTasks = allTasks.filter((t) => {
    const inDeadlineRange = t.deadline && t.deadline >= startStr && t.deadline <= endStr;
    const inPublishRange = t.publish_date && t.publish_date >= startStr && t.publish_date <= endStr;
    return inDeadlineRange || inPublishRange;
  });

  const allMembers = db.select().from(members).all();
  const allProjects = db.select().from(projects).all();
  const payments = db.select().from(salaryPayments)
    .where(and(eq(salaryPayments.month, month), eq(salaryPayments.year, year)))
    .all();
  const rankings = db.select().from(keywordRankings)
    .orderBy(desc(keywordRankings.date))
    .limit(1000)
    .all();
  const seoData = db.select({ score: seoResults.score, max_score: seoResults.max_score, url: seoResults.url })
    .from(seoResults)
    .orderBy(desc(seoResults.checked_at))
    .limit(500)
    .all();

  // Task stats
  const publishedTasks = monthTasks.filter((t) =>
    t.status_content?.includes('4. Publish') || t.status_content?.includes('4.Publish')
  );
  const inProgressTasks = monthTasks.filter((t) =>
    t.status_content && !t.status_content.includes('4. Publish') && !t.status_content.includes('4.Publish')
  );
  const overdueTasks = monthTasks.filter((t) => {
    if (!t.deadline || t.status_content?.includes('4. Publish')) return false;
    return new Date(t.deadline) < new Date();
  });
  const dueSoonTasks = monthTasks.filter((t) => {
    if (!t.deadline || t.status_content?.includes('4. Publish')) return false;
    const deadline = new Date(t.deadline);
    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    return deadline >= now && deadline <= threeDaysLater;
  });

  // Salary stats
  const BASE_RATE = 125000;
  const KPI_THRESHOLD = 20;
  const KPI_BONUS = 500000;

  const memberSalaries = allMembers.map((member) => {
    const memberPublished = publishedTasks.filter((t) => t.pic === member.name).length;
    const baseSalary = memberPublished * BASE_RATE;
    const kpiBonus = memberPublished >= KPI_THRESHOLD ? KPI_BONUS : 0;
    const total = baseSalary + kpiBonus;
    const isPaid = payments.some((p) => p.member_name === member.name);
    return { name: member.name, published: memberPublished, salary: total, isPaid, isKpiMet: memberPublished >= KPI_THRESHOLD };
  }).filter((m) => m.published > 0);

  const totalSalary = memberSalaries.reduce((sum, m) => sum + m.salary, 0);
  const paidSalary = memberSalaries.filter((m) => m.isPaid).reduce((sum, m) => sum + m.salary, 0);
  const unpaidSalary = totalSalary - paidSalary;
  const paidCount = memberSalaries.filter((m) => m.isPaid).length;
  const unpaidCount = memberSalaries.filter((m) => !m.isPaid).length;

  // Keyword stats
  const latestDate = rankings.length > 0 ? rankings[0].date : null;
  const latestRankings = latestDate ? rankings.filter((r) => r.date === latestDate) : [];

  const keywordStats = {
    total: latestRankings.length,
    top3: latestRankings.filter((r) => r.position <= 3).length,
    top10: latestRankings.filter((r) => r.position <= 10).length,
    top20: latestRankings.filter((r) => r.position <= 20).length,
    top30: latestRankings.filter((r) => r.position <= 30).length,
  };

  // Declining keywords
  const dates = [...new Set(rankings.map((r) => r.date))].sort().reverse();
  const previousDate = dates[1];
  const previousRankings = previousDate ? rankings.filter((r) => r.date === previousDate) : [];

  const decliningKeywords = latestRankings
    .map((current) => {
      const previous = previousRankings.find((p) => p.keyword === current.keyword);
      if (!previous) return null;
      const change = previous.position - current.position;
      if (change < -5) {
        return { keyword: current.keyword, currentPosition: current.position, previousPosition: previous.position, change };
      }
      return null;
    })
    .filter(Boolean)
    .slice(0, 10);

  // SEO audit stats
  const seoStats = {
    total: seoData.length,
    passed: seoData.filter((r) => r.score >= 70).length,
    failed: seoData.filter((r) => r.score < 70).length,
    avgScore: seoData.length > 0 ? Math.round(seoData.reduce((sum, r) => sum + r.score, 0) / seoData.length) : 0,
  };

  // Alerts
  const alerts: Array<{ type: 'danger' | 'warning' | 'info'; title: string; message: string; count?: number; link?: string }> = [];

  if (overdueTasks.length > 0) {
    alerts.push({ type: 'danger', title: 'Task trễ deadline', message: `${overdueTasks.length} task đang trễ deadline, cần xử lý ngay`, count: overdueTasks.length, link: '/tasks' });
  }
  if (unpaidCount > 0) {
    alerts.push({ type: 'warning', title: 'Lương chưa thanh toán', message: `${unpaidCount} người chưa được thanh toán (${formatCurrency(unpaidSalary)})`, count: unpaidCount, link: '/salary' });
  }
  if (decliningKeywords.length > 0) {
    alerts.push({ type: 'warning', title: 'Keyword giảm mạnh', message: `${decliningKeywords.length} keyword giảm hơn 5 vị trí`, count: decliningKeywords.length, link: '/keyword-ranking' });
  }
  if (dueSoonTasks.length > 0) {
    alerts.push({ type: 'info', title: 'Sắp đến deadline', message: `${dueSoonTasks.length} task sẽ đến hạn trong 3 ngày tới`, count: dueSoonTasks.length, link: '/tasks' });
  }

  // Project stats
  const projectStats = allProjects.map((project) => {
    const projectTasks = monthTasks.filter((t) => t.project_id === project.id);
    const published = projectTasks.filter((t) => t.status_content?.includes('4. Publish')).length;
    const inProgress = projectTasks.filter((t) => t.status_content && !t.status_content.includes('4. Publish')).length;
    const overdue = projectTasks.filter((t) => {
      if (!t.deadline || t.status_content?.includes('4. Publish')) return false;
      return new Date(t.deadline) < new Date();
    }).length;
    return {
      id: project.id, name: project.name, target: project.monthly_target || 0,
      published, inProgress, overdue,
      progress: project.monthly_target ? Math.round((published / project.monthly_target) * 100) : 0,
    };
  });

  const topPerformers = memberSalaries.sort((a, b) => b.published - a.published).slice(0, 5);

  return {
    tasks: {
      total: publishedTasks.length + inProgressTasks.length,
      published: publishedTasks.length, inProgress: inProgressTasks.length,
      overdue: overdueTasks.length, dueSoon: dueSoonTasks.length,
    },
    finance: { totalSalary, paidSalary, unpaidSalary, paidCount, unpaidCount, totalMembers: memberSalaries.length },
    seo: { keywords: keywordStats, audit: seoStats, decliningKeywords },
    alerts,
    projects: projectStats,
    topPerformers,
    meta: { month, year, generatedAt: new Date().toISOString() },
  };
}

// ---------------------------------------------------------------------------
// Stats (GET /api/stats)
// ---------------------------------------------------------------------------

export function getStats(selectedMonth: number, selectedYear: number) {
  // All tasks with project info
  const allTaskRows = db.select().from(tasks)
    .leftJoin(projects, eq(tasks.project_id, projects.id))
    .all();

  const allTasks = allTaskRows.map((row) => ({
    ...row.tasks,
    project: row.projects ? { id: row.projects.id, name: row.projects.name } : null,
  }));

  const taskList = allTasks.filter((t) => t.month === selectedMonth && t.year === selectedYear);
  const validTasks = taskList.filter((t) => t.title || t.keyword_sub || t.parent_keyword);

  const stats = {
    total: validTasks.length,
    published: validTasks.filter((t) => isPublished(t)).length,
    inProgress: validTasks.filter((t) => t.status_content && !isPublished(t) && !isDoneQC(t.status_content)).length,
    overdue: validTasks.filter((t) => { if (!t.deadline || isPublished(t)) return false; return new Date(t.deadline) < new Date(); }).length,
  };

  const allProjects = db.select().from(projects).all();
  const targets = db.select().from(monthlyTargets)
    .where(and(eq(monthlyTargets.month, selectedMonth), eq(monthlyTargets.year, selectedYear)))
    .all();

  const projectStats = allProjects.map((project) => {
    const projectTasks = taskList.filter((t) => t.project_id === project.id && (t.title || t.keyword_sub));
    const published = projectTasks.filter((t) => isPublished(t)).length;
    const monthlyTarget = targets.find((mt) => mt.project_id === project.id);
    const target = monthlyTarget?.target || project.monthly_target || 20;
    return { id: project.id, name: project.name, actual: published, target };
  });

  // Bottleneck
  const activeTasks = allTasks.filter((t) =>
    (t.title || t.keyword_sub) && t.status_content && !isPublished(t)
  );

  const qcContentTasks = activeTasks.filter((t) => t.status_content && t.status_content.toLowerCase().includes('qc'));
  const qcOutlineTasks = activeTasks.filter((t) => t.status_outline && t.status_outline.toLowerCase().includes('qc'));
  const waitPublishTasks = activeTasks.filter((t) => isDoneQC(t.status_content));
  const doingContentTasks = activeTasks.filter((t) => t.status_content && t.status_content.toLowerCase().includes('doing'));
  const fixingOutlineTasks = activeTasks.filter((t) => t.status_outline && t.status_outline.toLowerCase().includes('fix'));
  const fixingContentTasks = activeTasks.filter((t) => t.status_content && t.status_content.toLowerCase().includes('fix'));
  const doingOutlineTasks = activeTasks.filter((t) => t.status_outline && t.status_outline.toLowerCase().includes('doing'));

  const mapTask = (t: typeof activeTasks[number]) => ({
    id: t.id, title: t.title || t.keyword_sub, pic: t.pic, project: t.project?.name, link: t.link_publish || t.content_file, deadline: t.deadline,
  });

  const bottleneck = {
    content: {
      doingOutline: doingOutlineTasks.length, fixingOutline: fixingOutlineTasks.length,
      doingContent: doingContentTasks.length, fixingContent: fixingContentTasks.length,
    },
    seo: { qcOutline: qcOutlineTasks.length, qcContent: qcContentTasks.length, waitPublish: waitPublishTasks.length },
    tasks: {
      qcContent: qcContentTasks.slice(0, 10).map(mapTask),
      qcOutline: qcOutlineTasks.slice(0, 10).map(mapTask),
      waitPublish: waitPublishTasks.slice(0, 10).map(mapTask),
      doingContent: doingContentTasks.slice(0, 10).map(mapTask),
      fixingOutline: fixingOutlineTasks.slice(0, 10).map(mapTask),
      fixingContent: fixingContentTasks.slice(0, 10).map(mapTask),
      doingOutline: doingOutlineTasks.slice(0, 10).map(mapTask),
    },
    biggest: '',
  };

  const contentTotal = Object.values(bottleneck.content).reduce((a, b) => a + b, 0);
  const seoTotal = Object.values(bottleneck.seo).reduce((a, b) => a + b, 0);

  if (bottleneck.content.doingContent > 5) bottleneck.biggest = `Content viết bài (${bottleneck.content.doingContent} bài)`;
  else if (bottleneck.seo.qcContent > 3) bottleneck.biggest = `SEO QC content (${bottleneck.seo.qcContent} bài)`;
  else if (contentTotal > seoTotal && contentTotal > 0) bottleneck.biggest = `Content đang giữ ${contentTotal} bài`;
  else if (seoTotal > 0) bottleneck.biggest = `SEO đang giữ ${seoTotal} bài`;
  else bottleneck.biggest = 'Không có nghẽn';

  // Alerts
  const alerts = activeTasks
    .filter((t) => {
      if (!t.deadline) return false;
      const deadline = new Date(t.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    })
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 10);

  // Recent tasks
  const recentTasks = validTasks
    .sort((a, b) => {
      const dateA = a.publish_date || a.deadline || a.updated_at;
      const dateB = b.publish_date || b.deadline || b.updated_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    })
    .slice(0, 10);

  const allTasksWithProject = validTasks.map((t) => ({
    id: t.id, title: t.title, keyword_sub: t.keyword_sub, pic: t.pic,
    status_content: t.status_content, status_outline: t.status_outline,
    publish_date: t.publish_date, deadline: t.deadline, link_publish: t.link_publish,
    content_file: t.content_file, project: t.project,
  }));

  // Overdue from previous months
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueFromPreviousMonths = allTasks
    .filter((t) => {
      if (!(t.title || t.keyword_sub)) return false;
      if (isPublished(t)) return false;
      if (!t.deadline) return false;
      if (new Date(t.deadline) >= today) return false;
      if (t.year > selectedYear) return false;
      if (t.year === selectedYear && t.month >= selectedMonth) return false;
      return true;
    })
    .map((t) => ({
      id: t.id, title: t.title, keyword_sub: t.keyword_sub, pic: t.pic,
      status_content: t.status_content, status_outline: t.status_outline,
      deadline: t.deadline, link_publish: t.link_publish, content_file: t.content_file,
      project: t.project, month: t.month, year: t.year,
    }))
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());

  return { stats, projectStats, bottleneck, alerts, recentTasks, allTasks: allTasksWithProject, overdueFromPreviousMonths };
}
