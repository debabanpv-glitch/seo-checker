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
    const months = parseInt(searchParams.get('months') || '6'); // Number of months to analyze

    // Get data for the last N months
    const now = new Date();
    const monthlyData = [];
    const projectTotals = new Map<string, { name: string; total: number; count: number }>();

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

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
      const projectCounts = new Map<string, { name: string; count: number }>();

      publishedTasks.forEach((task) => {
        const pic = task.pic || 'Unknown';
        if (pic !== 'Unknown') {
          picCounts.set(pic, (picCounts.get(pic) || 0) + 1);
        }

        // Track project costs
        const projectId = task.project_id || 'unknown';
        const projectName = task.project?.name || 'Không xác định';
        const existing = projectCounts.get(projectId) || { name: projectName, count: 0 };
        existing.count += 1;
        projectCounts.set(projectId, existing);
      });

      // Calculate total salary for this month
      let totalSalary = 0;
      let totalPaid = 0;
      const memberCount = picCounts.size;

      picCounts.forEach((count) => {
        const salary = calculateSalary(count);
        totalSalary += salary.total;
      });

      // Get payment info for this month
      const { data: payments } = await supabase
        .from('salary_payments')
        .select('*')
        .eq('month', month)
        .eq('year', year);

      totalPaid = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const paidCount = (payments || []).length;

      // Add project totals (only for current/recent months for chart)
      if (i < 3) {
        projectCounts.forEach((data, projectId) => {
          const existing = projectTotals.get(projectId) || { name: data.name, total: 0, count: 0 };
          // Calculate project cost based on article count
          const articleCost = data.count * 125000; // Base cost per article
          existing.total += articleCost;
          existing.count += data.count;
          projectTotals.set(projectId, existing);
        });
      }

      monthlyData.push({
        month,
        year,
        label: `T${month}/${year}`,
        shortLabel: `T${month}`,
        totalSalary,
        totalPaid,
        memberCount,
        paidCount,
        articleCount: publishedTasks.length,
        isPaid: paidCount >= memberCount && memberCount > 0,
      });
    }

    // Sort monthly data chronologically (oldest first for charts)
    monthlyData.reverse();

    // Convert project totals to array and sort
    const projectBreakdown = Array.from(projectTotals.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        total: data.total,
        count: data.count,
      }))
      .sort((a, b) => b.total - a.total);

    // Calculate summary stats
    const currentMonth = monthlyData[monthlyData.length - 1];
    const lastMonth = monthlyData[monthlyData.length - 2];

    const totalAllTime = monthlyData.reduce((sum, m) => sum + m.totalSalary, 0);
    const avgMonthly = totalAllTime / monthlyData.length;

    const changeFromLastMonth = lastMonth
      ? ((currentMonth.totalSalary - lastMonth.totalSalary) / lastMonth.totalSalary * 100)
      : 0;

    return NextResponse.json({
      summary: {
        currentMonth: currentMonth.totalSalary,
        lastMonth: lastMonth?.totalSalary || 0,
        changePercent: Math.round(changeFromLastMonth),
        avgMonthly: Math.round(avgMonthly),
        totalMembers: currentMonth.memberCount,
        paidMembers: currentMonth.paidCount,
        totalArticles: currentMonth.articleCount,
      },
      monthlyTrend: monthlyData,
      projectBreakdown,
    });
  } catch (error) {
    console.error('Salary Analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
