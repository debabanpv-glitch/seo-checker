import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Get date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Parallel fetch all data
    const [
      tasksRes,
      membersRes,
      projectsRes,
      paymentsRes,
      keywordRankingsRes,
      seoResultsRes,
    ] = await Promise.all([
      // Tasks for this month
      supabase
        .from('tasks')
        .select('*, project:projects(id, name)')
        .or(`deadline.gte.${startStr},publish_date.gte.${startStr}`)
        .or(`deadline.lte.${endStr},publish_date.lte.${endStr}`),

      // Members info
      supabase.from('members').select('*'),

      // Projects
      supabase.from('projects').select('*'),

      // Salary payments for this month
      supabase
        .from('salary_payments')
        .select('*')
        .eq('month', month)
        .eq('year', year),

      // Latest keyword rankings (for overview)
      supabase
        .from('keyword_rankings')
        .select('*')
        .order('date', { ascending: false })
        .limit(1000),

      // SEO results (for overview)
      supabase
        .from('seo_results')
        .select('score, max_score, url')
        .order('checked_at', { ascending: false })
        .limit(500),
    ]);

    const tasks = tasksRes.data || [];
    const members = membersRes.data || [];
    const projects = projectsRes.data || [];
    const payments = paymentsRes.data || [];
    const rankings = keywordRankingsRes.data || [];
    const seoResults = seoResultsRes.data || [];

    // Calculate task stats
    const publishedTasks = tasks.filter(t =>
      t.status_content?.includes('4. Publish') ||
      t.status_content?.includes('4.Publish')
    );
    const inProgressTasks = tasks.filter(t =>
      t.status_content &&
      !t.status_content.includes('4. Publish') &&
      !t.status_content.includes('4.Publish')
    );
    const overdueTasks = tasks.filter(t => {
      if (!t.deadline) return false;
      if (t.status_content?.includes('4. Publish')) return false;
      return new Date(t.deadline) < new Date();
    });
    const dueSoonTasks = tasks.filter(t => {
      if (!t.deadline) return false;
      if (t.status_content?.includes('4. Publish')) return false;
      const deadline = new Date(t.deadline);
      const now = new Date();
      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
      return deadline >= now && deadline <= threeDaysLater;
    });

    // Calculate salary stats
    const BASE_RATE = 125000;
    const KPI_THRESHOLD = 20;
    const KPI_BONUS = 500000;

    const memberSalaries = members.map(member => {
      const memberPublished = publishedTasks.filter(t => t.pic === member.name).length;
      const baseSalary = memberPublished * BASE_RATE;
      const kpiBonus = memberPublished >= KPI_THRESHOLD ? KPI_BONUS : 0;
      const total = baseSalary + kpiBonus;
      const isPaid = payments.some(p => p.member_name === member.name);

      return {
        name: member.name,
        published: memberPublished,
        salary: total,
        isPaid,
        isKpiMet: memberPublished >= KPI_THRESHOLD,
      };
    }).filter(m => m.published > 0);

    const totalSalary = memberSalaries.reduce((sum, m) => sum + m.salary, 0);
    const paidSalary = memberSalaries.filter(m => m.isPaid).reduce((sum, m) => sum + m.salary, 0);
    const unpaidSalary = totalSalary - paidSalary;
    const paidCount = memberSalaries.filter(m => m.isPaid).length;
    const unpaidCount = memberSalaries.filter(m => !m.isPaid).length;

    // Calculate SEO/Keyword stats
    const latestDate = rankings.length > 0 ? rankings[0].date : null;
    const latestRankings = latestDate
      ? rankings.filter(r => r.date === latestDate)
      : [];

    const keywordStats = {
      total: latestRankings.length,
      top3: latestRankings.filter(r => r.position <= 3).length,
      top10: latestRankings.filter(r => r.position <= 10).length,
      top20: latestRankings.filter(r => r.position <= 20).length,
      top30: latestRankings.filter(r => r.position <= 30).length,
    };

    // Calculate declining keywords (compare with previous check)
    const dates = [...new Set(rankings.map(r => r.date))].sort().reverse();
    const previousDate = dates[1];
    const previousRankings = previousDate
      ? rankings.filter(r => r.date === previousDate)
      : [];

    const decliningKeywords = latestRankings
      .map(current => {
        const previous = previousRankings.find(p => p.keyword === current.keyword);
        if (!previous) return null;
        const change = previous.position - current.position;
        if (change < -5) { // Declined by more than 5 positions
          return {
            keyword: current.keyword,
            currentPosition: current.position,
            previousPosition: previous.position,
            change,
          };
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 10);

    // Calculate SEO audit stats
    const seoStats = {
      total: seoResults.length,
      passed: seoResults.filter(r => r.score >= 70).length,
      failed: seoResults.filter(r => r.score < 70).length,
      avgScore: seoResults.length > 0
        ? Math.round(seoResults.reduce((sum, r) => sum + r.score, 0) / seoResults.length)
        : 0,
    };

    // Build alerts
    const alerts: Array<{
      type: 'danger' | 'warning' | 'info';
      title: string;
      message: string;
      count?: number;
      link?: string;
    }> = [];

    if (overdueTasks.length > 0) {
      alerts.push({
        type: 'danger',
        title: 'Task trễ deadline',
        message: `${overdueTasks.length} task đang trễ deadline, cần xử lý ngay`,
        count: overdueTasks.length,
        link: '/tasks',
      });
    }

    if (unpaidCount > 0) {
      alerts.push({
        type: 'warning',
        title: 'Lương chưa thanh toán',
        message: `${unpaidCount} người chưa được thanh toán (${formatCurrency(unpaidSalary)})`,
        count: unpaidCount,
        link: '/salary',
      });
    }

    if (decliningKeywords.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Keyword giảm mạnh',
        message: `${decliningKeywords.length} keyword giảm hơn 5 vị trí`,
        count: decliningKeywords.length,
        link: '/keyword-ranking',
      });
    }

    if (dueSoonTasks.length > 0) {
      alerts.push({
        type: 'info',
        title: 'Sắp đến deadline',
        message: `${dueSoonTasks.length} task sẽ đến hạn trong 3 ngày tới`,
        count: dueSoonTasks.length,
        link: '/tasks',
      });
    }

    // Project stats
    const projectStats = projects.map(project => {
      const projectTasks = tasks.filter(t => t.project_id === project.id);
      const published = projectTasks.filter(t =>
        t.status_content?.includes('4. Publish')
      ).length;
      const inProgress = projectTasks.filter(t =>
        t.status_content && !t.status_content.includes('4. Publish')
      ).length;
      const overdue = projectTasks.filter(t => {
        if (!t.deadline || t.status_content?.includes('4. Publish')) return false;
        return new Date(t.deadline) < new Date();
      }).length;

      return {
        id: project.id,
        name: project.name,
        target: project.target || 0,
        published,
        inProgress,
        overdue,
        progress: project.target ? Math.round((published / project.target) * 100) : 0,
      };
    });

    // Top performers
    const topPerformers = memberSalaries
      .sort((a, b) => b.published - a.published)
      .slice(0, 5);

    return NextResponse.json({
      // Task stats
      tasks: {
        total: publishedTasks.length + inProgressTasks.length,
        published: publishedTasks.length,
        inProgress: inProgressTasks.length,
        overdue: overdueTasks.length,
        dueSoon: dueSoonTasks.length,
      },

      // Financial stats
      finance: {
        totalSalary,
        paidSalary,
        unpaidSalary,
        paidCount,
        unpaidCount,
        totalMembers: memberSalaries.length,
      },

      // SEO stats
      seo: {
        keywords: keywordStats,
        audit: seoStats,
        decliningKeywords,
      },

      // Alerts
      alerts,

      // Project overview
      projects: projectStats,

      // Top performers
      topPerformers,

      // Meta
      meta: {
        month,
        year,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 });
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}
