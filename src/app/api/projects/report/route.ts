import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to check if task is published
const isPublished = (statusContent: string | null) => {
  if (!statusContent) return false;
  const status = statusContent.toLowerCase().trim();
  return status.includes('publish') || status.includes('4.') || status === 'done' || status === 'hoàn thành';
};

// Helper to check if task is done QC (waiting publish)
const isDoneQC = (statusContent: string | null) => {
  if (!statusContent) return false;
  const status = statusContent.toLowerCase().trim();
  return status.includes('done qc') || status.includes('3.') || status.includes('chờ publish');
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const selectedMonth = parseInt(searchParams.get('month') || String(now.getMonth() + 1));
    const selectedYear = parseInt(searchParams.get('year') || String(now.getFullYear()));

    // Fetch all projects
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*');

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 500 });
    }

    // Fetch all tasks with project info
    const { data: allTasks, error: taskError } = await supabase
      .from('tasks')
      .select('*, project:projects(*)')
      .eq('month', selectedMonth)
      .eq('year', selectedYear);

    if (taskError) {
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    // Fetch monthly targets
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

    // Build project reports
    const projectReports = (projects || []).map((project) => {
      // Get tasks for this project
      const projectTasks = (allTasks || []).filter(
        (t) => t.project_id === project.id && (t.title || t.keyword_sub)
      );

      // Get target
      const monthlyTarget = monthlyTargets?.find((mt) => mt.project_id === project.id);
      const target = monthlyTarget?.target || project.monthly_target || 20;

      // Count stats
      const published = projectTasks.filter((t) => isPublished(t.status_content)).length;
      const doneQC = projectTasks.filter((t) => isDoneQC(t.status_content)).length;
      const inProgress = projectTasks.filter((t) =>
        t.status_content && !isPublished(t.status_content) && !isDoneQC(t.status_content)
      ).length;
      const overdue = projectTasks.filter((t) => {
        if (!t.deadline || isPublished(t.status_content)) return false;
        return new Date(t.deadline) < new Date();
      }).length;

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
        t.status_content && t.status_content.toLowerCase().includes('qc') && !isPublished(t.status_content)
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
        .filter((t) => isPublished(t.status_content))
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

    return NextResponse.json({ projects: projectReports });
  } catch (error) {
    console.error('Project report API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
