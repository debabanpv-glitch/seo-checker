import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculateSalary } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Helper to check if task is published
const isPublished = (statusContent: string | null) => {
  if (!statusContent) return false;
  const status = statusContent.toLowerCase().trim();
  return status.includes('publish') || status.includes('4.') || status === 'done' || status === 'hoàn thành';
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6');

    const now = new Date();
    const monthlyData = [];
    const projectTotals = new Map<string, { name: string; total: number; count: number; members: Set<string> }>();
    const memberTotals = new Map<string, {
      name: string;
      totalEarnings: number;
      totalArticles: number;
      monthlyData: { month: number; year: number; label: string; salary: number; articles: number }[];
      projects: Set<string>;
      kpiMetCount: number;
    }>();

    // Project monthly breakdown
    const projectMonthlyData = new Map<string, {
      id: string;
      name: string;
      monthlyData: { month: number; year: number; label: string; cost: number; articles: number }[]
    }>();

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const monthLabel = `T${month}/${year}`;

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      // Fetch tasks for this month
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*, project:projects(*)')
        .gte('publish_date', startDate)
        .lte('publish_date', endDate);

      const publishedTasks = (tasks || []).filter(
        (t) => (t.title || t.keyword_sub) && isPublished(t.status_content)
      );

      // Group by PIC
      const picCounts = new Map<string, number>();
      const projectCounts = new Map<string, { id: string; name: string; count: number; members: Set<string> }>();

      publishedTasks.forEach((task) => {
        const pic = task.pic || 'Unknown';
        if (pic !== 'Unknown') {
          picCounts.set(pic, (picCounts.get(pic) || 0) + 1);
        }

        // Track project costs
        const projectId = task.project_id || 'unknown';
        const projectName = task.project?.name || 'Không xác định';
        const existing = projectCounts.get(projectId) || { id: projectId, name: projectName, count: 0, members: new Set<string>() };
        existing.count += 1;
        if (pic !== 'Unknown') existing.members.add(pic);
        projectCounts.set(projectId, existing);
      });

      // Calculate total salary for this month
      let totalSalary = 0;
      let totalPaid = 0;
      const memberCount = picCounts.size;

      picCounts.forEach((count, memberName) => {
        const salary = calculateSalary(count);
        totalSalary += salary.total;

        // Track member totals
        const memberData = memberTotals.get(memberName) || {
          name: memberName,
          totalEarnings: 0,
          totalArticles: 0,
          monthlyData: [],
          projects: new Set<string>(),
          kpiMetCount: 0,
        };
        memberData.totalEarnings += salary.total;
        memberData.totalArticles += count;
        memberData.monthlyData.push({
          month,
          year,
          label: monthLabel,
          salary: salary.total,
          articles: count,
        });
        if (salary.isKpiMet) memberData.kpiMetCount += 1;

        // Track which projects member worked on
        publishedTasks.filter(t => t.pic === memberName).forEach(t => {
          if (t.project?.name) memberData.projects.add(t.project.name);
        });

        memberTotals.set(memberName, memberData);
      });

      // Get payment info for this month
      const { data: payments } = await supabase
        .from('salary_payments')
        .select('*')
        .eq('month', month)
        .eq('year', year);

      totalPaid = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const paidCount = (payments || []).length;

      // Update project totals and monthly data
      projectCounts.forEach((data, projectId) => {
        // Overall totals
        const existing = projectTotals.get(projectId) || { name: data.name, total: 0, count: 0, members: new Set<string>() };
        const articleCost = data.count * 125000;
        existing.total += articleCost;
        existing.count += data.count;
        data.members.forEach(m => existing.members.add(m));
        projectTotals.set(projectId, existing);

        // Monthly breakdown per project
        const projectMonthly = projectMonthlyData.get(projectId) || { id: projectId, name: data.name, monthlyData: [] };
        projectMonthly.monthlyData.push({
          month,
          year,
          label: monthLabel,
          cost: articleCost,
          articles: data.count,
        });
        projectMonthlyData.set(projectId, projectMonthly);
      });

      monthlyData.push({
        month,
        year,
        label: monthLabel,
        shortLabel: `T${month}`,
        totalSalary,
        totalPaid,
        memberCount,
        paidCount,
        articleCount: publishedTasks.length,
        avgCostPerArticle: publishedTasks.length > 0 ? Math.round(totalSalary / publishedTasks.length) : 0,
        isPaid: paidCount >= memberCount && memberCount > 0,
      });
    }

    // Sort monthly data chronologically
    monthlyData.reverse();

    // Convert project totals to array
    const projectBreakdown = Array.from(projectTotals.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        total: data.total,
        count: data.count,
        memberCount: data.members.size,
        avgCostPerArticle: data.count > 0 ? Math.round(data.total / data.count) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Convert project monthly data
    const projectTrends = Array.from(projectMonthlyData.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        monthlyData: data.monthlyData.reverse(),
      }))
      .sort((a, b) => {
        const totalA = a.monthlyData.reduce((sum, m) => sum + m.cost, 0);
        const totalB = b.monthlyData.reduce((sum, m) => sum + m.cost, 0);
        return totalB - totalA;
      });

    // Convert member totals to array
    const memberBreakdown = Array.from(memberTotals.entries())
      .map(([name, data]) => ({
        name,
        totalEarnings: data.totalEarnings,
        totalArticles: data.totalArticles,
        monthlyData: data.monthlyData.reverse(),
        projects: Array.from(data.projects),
        kpiMetCount: data.kpiMetCount,
        avgMonthlyEarnings: data.monthlyData.length > 0 ? Math.round(data.totalEarnings / data.monthlyData.length) : 0,
        avgArticlesPerMonth: data.monthlyData.length > 0 ? Math.round(data.totalArticles / data.monthlyData.length * 10) / 10 : 0,
      }))
      .sort((a, b) => b.totalEarnings - a.totalEarnings);

    // Calculate summary stats
    const currentMonth = monthlyData[monthlyData.length - 1];
    const lastMonth = monthlyData[monthlyData.length - 2];

    const totalAllTime = monthlyData.reduce((sum, m) => sum + m.totalSalary, 0);
    const totalArticlesAllTime = monthlyData.reduce((sum, m) => sum + m.articleCount, 0);
    const avgMonthly = totalAllTime / monthlyData.length;
    const avgCostPerArticle = totalArticlesAllTime > 0 ? Math.round(totalAllTime / totalArticlesAllTime) : 0;

    const changeFromLastMonth = lastMonth && lastMonth.totalSalary > 0
      ? ((currentMonth.totalSalary - lastMonth.totalSalary) / lastMonth.totalSalary * 100)
      : 0;

    // Growth metrics
    const firstMonth = monthlyData[0];
    const costGrowthRate = firstMonth && firstMonth.totalSalary > 0
      ? ((currentMonth.totalSalary - firstMonth.totalSalary) / firstMonth.totalSalary * 100)
      : 0;

    const teamGrowthRate = firstMonth && firstMonth.memberCount > 0
      ? ((currentMonth.memberCount - firstMonth.memberCount) / firstMonth.memberCount * 100)
      : 0;

    return NextResponse.json({
      summary: {
        currentMonth: currentMonth.totalSalary,
        lastMonth: lastMonth?.totalSalary || 0,
        changePercent: Math.round(changeFromLastMonth),
        avgMonthly: Math.round(avgMonthly),
        avgCostPerArticle,
        totalMembers: currentMonth.memberCount,
        paidMembers: currentMonth.paidCount,
        totalArticles: currentMonth.articleCount,
        totalAllTime,
        totalArticlesAllTime,
        costGrowthRate: Math.round(costGrowthRate),
        teamGrowthRate: Math.round(teamGrowthRate),
      },
      monthlyTrend: monthlyData,
      projectBreakdown,
      projectTrends,
      memberBreakdown,
    });
  } catch (error) {
    console.error('Salary Analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
