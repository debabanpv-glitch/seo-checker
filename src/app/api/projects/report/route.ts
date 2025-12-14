import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Helper to check if task is published - check both status_content AND publish_date
const isPublished = (task: { status_content?: string | null; publish_date?: string | null }) => {
  // If has publish_date, consider it published
  if (task.publish_date) return true;

  if (!task.status_content) return false;
  const status = task.status_content.toLowerCase().trim();
  return status.includes('publish') || status.includes('4.') || status === 'done' || status === 'hoàn thành';
};

// Helper to check if task is done QC (waiting publish)
const isDoneQC = (statusContent: string | null) => {
  if (!statusContent) return false;
  const status = statusContent.toLowerCase().trim();
  return status.includes('done qc') || status.includes('3.') || status.includes('chờ publish');
};

// Get weeks in a month
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const selectedMonth = parseInt(searchParams.get('month') || String(now.getMonth() + 1));
    const selectedYear = parseInt(searchParams.get('year') || String(now.getFullYear()));

    // Calculate previous month
    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = selectedYear - 1;
    }

    // Fetch all projects
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*');

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 500 });
    }

    // Fetch tasks for current month
    const { data: currentMonthTasks, error: taskError } = await supabase
      .from('tasks')
      .select('*, project:projects(*)')
      .eq('month', selectedMonth)
      .eq('year', selectedYear);

    if (taskError) {
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    // Fetch tasks for previous month (for comparison)
    const { data: prevMonthTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('month', prevMonth)
      .eq('year', prevYear);

    // Fetch monthly targets for current month
    const { data: monthlyTargets } = await supabase
      .from('monthly_targets')
      .select('*')
      .eq('month', selectedMonth)
      .eq('year', selectedYear);

    // Calculate days remaining in month
    const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0);
    const today = new Date();
    const isCurrentMonth = selectedMonth === (today.getMonth() + 1) && selectedYear === today.getFullYear();
    const daysRemaining = isCurrentMonth
      ? Math.max(0, lastDayOfMonth.getDate() - today.getDate())
      : selectedMonth > (today.getMonth() + 1) || selectedYear > today.getFullYear()
      ? lastDayOfMonth.getDate()
      : 0;

    // Days elapsed in month
    const daysElapsed = isCurrentMonth
      ? today.getDate()
      : selectedMonth < (today.getMonth() + 1) || selectedYear < today.getFullYear()
      ? lastDayOfMonth.getDate()
      : 0;

    // Weeks elapsed
    const weeksElapsed = Math.max(1, Math.ceil(daysElapsed / 7));

    // Get weeks in selected month
    const weeksInMonth = getWeeksInMonth(selectedYear, selectedMonth);
    const currentWeekInMonth = isCurrentMonth ? Math.ceil(today.getDate() / 7) : 0;

    // Build project reports
    const projectReports = (projects || []).map((project) => {
      // Get tasks for this project - current month
      const projectTasks = (currentMonthTasks || []).filter(
        (t) => t.project_id === project.id && (t.title || t.keyword_sub)
      );

      // Get tasks for this project - previous month
      const prevProjectTasks = (prevMonthTasks || []).filter(
        (t) => t.project_id === project.id && (t.title || t.keyword_sub)
      );

      // Get target
      const monthlyTarget = monthlyTargets?.find((mt) => mt.project_id === project.id);
      const target = monthlyTarget?.target || project.monthly_target || 20;

      // Count stats - current month
      const published = projectTasks.filter((t) => isPublished(t)).length;
      const doneQC = projectTasks.filter((t) => isDoneQC(t.status_content) && !isPublished(t)).length;
      const inProgress = projectTasks.filter((t) =>
        t.status_content && !isPublished(t) && !isDoneQC(t.status_content)
      ).length;
      const overdue = projectTasks.filter((t) => {
        if (!t.deadline || isPublished(t)) return false;
        return new Date(t.deadline) < new Date();
      }).length;

      // Count stats - previous month
      const prevPublished = prevProjectTasks.filter((t) => isPublished(t)).length;

      // Calculate month-over-month change
      const momChange = prevPublished > 0
        ? Math.round(((published - prevPublished) / prevPublished) * 100)
        : published > 0 ? 100 : 0;

      // Calculate weekly breakdown
      const weeklyTarget = Math.ceil(target / weeksInMonth.length);
      const weeklyBreakdown = weeksInMonth.map((week) => {
        const tasksInWeek = projectTasks.filter((t) => {
          if (!t.publish_date || !isPublished(t)) return false;
          const pubDate = new Date(t.publish_date);
          return pubDate >= week.start && pubDate <= week.end;
        });

        return {
          weekNum: week.weekNum,
          count: tasksInWeek.length,
          target: weeklyTarget,
          isCurrent: week.weekNum === currentWeekInMonth,
        };
      });

      // Calculate rates
      const weeklyRate = weeksElapsed > 0 ? published / weeksElapsed : 0;
      const remaining = target - published;
      const weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7));
      const requiredRate = remaining > 0 ? remaining / weeksRemaining : 0;

      // Project total at end of month
      const projectedTotal = Math.round(published + (weeklyRate * weeksRemaining));

      // Determine trend (compare to required rate)
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (weeklyRate > requiredRate * 1.1) trend = 'up';
      else if (weeklyRate < requiredRate * 0.8) trend = 'down';

      // Determine health
      let health: 'good' | 'warning' | 'danger' = 'good';
      const progress = target > 0 ? (published / target) * 100 : 0;
      const expectedProgress = (daysElapsed / lastDayOfMonth.getDate()) * 100;

      if (progress < expectedProgress * 0.6 || overdue > 3) {
        health = 'danger';
      } else if (progress < expectedProgress * 0.85 || overdue > 0) {
        health = 'warning';
      }

      // Determine bottleneck for this project
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
      if (doneQC > 3) {
        bottleneck = `${doneQC} bài chờ publish`;
      } else if (qcContentCount > 3) {
        bottleneck = `${qcContentCount} bài chờ QC`;
      } else if (doingCount > 5) {
        bottleneck = `${doingCount} bài đang viết`;
      } else if (fixingCount > 2) {
        bottleneck = `${fixingCount} bài đang sửa`;
      }

      // Get unique PICs
      const pics = [...new Set(projectTasks.map((t) => t.pic).filter(Boolean))] as string[];

      // Top performer
      const picCounts: Record<string, number> = {};
      projectTasks
        .filter((t) => isPublished(t))
        .forEach((t) => {
          if (t.pic) {
            picCounts[t.pic] = (picCounts[t.pic] || 0) + 1;
          }
        });

      const topPerformer = Object.entries(picCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }))[0] || null;

      return {
        id: project.id,
        name: project.name,
        sheet_id: project.sheet_id,
        sheet_name: project.sheet_name,
        // Stats
        target,
        published,
        inProgress,
        doneQC,
        overdue,
        // Weekly breakdown
        weeklyBreakdown,
        weeklyTarget,
        // Comparison
        prevPublished,
        momChange,
        // Analysis
        weeklyRate,
        requiredRate,
        daysRemaining,
        projectedTotal,
        trend,
        health,
        bottleneck,
        // Team
        pics,
        topPerformer,
      };
    });

    // Sort by health (danger first, then warning, then good)
    projectReports.sort((a, b) => {
      const healthOrder = { danger: 0, warning: 1, good: 2 };
      return healthOrder[a.health] - healthOrder[b.health];
    });

    return NextResponse.json({
      projects: projectReports,
      meta: {
        selectedMonth,
        selectedYear,
        prevMonth,
        prevYear,
        isCurrentMonth,
        weeksInMonth: weeksInMonth.length,
        currentWeekInMonth,
      },
    });
  } catch (error) {
    console.error('Project report API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
