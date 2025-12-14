import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get month and year from query params
    const now = new Date();
    const selectedMonth = parseInt(searchParams.get('month') || String(now.getMonth() + 1));
    const selectedYear = parseInt(searchParams.get('year') || String(now.getFullYear()));

    // Fetch all tasks with project info
    const { data: allTasks, error } = await supabase
      .from('tasks')
      .select('*, project:projects(*)');

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter tasks for selected month/year
    const taskList = (allTasks || []).filter(
      (t) => t.month === selectedMonth && t.year === selectedYear
    );

    // Calculate stats - only count tasks with actual content
    const validTasks = taskList.filter((t) => t.title || t.keyword_sub || t.parent_keyword);

    // Helper to check if task is published - support multiple formats AND publish_date
    const isPublished = (task: { status_content?: string | null; publish_date?: string | null }) => {
      // If has publish_date, consider it published
      if (task.publish_date) return true;

      if (!task.status_content) return false;
      const status = task.status_content.toLowerCase().trim();
      return status.includes('publish') || status.includes('4.') || status === 'done' || status === 'hoàn thành';
    };

    // Helper to check if task is done QC
    const isDoneQC = (statusContent: string | null) => {
      if (!statusContent) return false;
      const status = statusContent.toLowerCase().trim();
      return status.includes('done qc') || status.includes('3.') || status.includes('chờ publish');
    };

    const stats = {
      total: validTasks.length,
      published: validTasks.filter((t) => isPublished(t)).length,
      inProgress: validTasks.filter((t) =>
        t.status_content &&
        !isPublished(t) &&
        !isDoneQC(t.status_content)
      ).length,
      overdue: validTasks.filter((t) => {
        if (!t.deadline || isPublished(t)) return false;
        return new Date(t.deadline) < new Date();
      }).length,
    };

    // Fetch all projects
    const { data: projects } = await supabase.from('projects').select('*');

    // Fetch monthly targets for selected month
    const { data: monthlyTargets } = await supabase
      .from('monthly_targets')
      .select('*')
      .eq('month', selectedMonth)
      .eq('year', selectedYear);

    // Calculate project stats for selected month
    const projectStats = (projects || []).map((project) => {
      // Lấy tất cả tasks của project trong tháng được chọn
      const projectTasks = taskList.filter(
        (t) => t.project_id === project.id && (t.title || t.keyword_sub)
      );
      const published = projectTasks.filter((t) => isPublished(t)).length;

      // Lấy target từ monthly_targets, nếu không có thì dùng default từ project
      const monthlyTarget = monthlyTargets?.find((mt) => mt.project_id === project.id);
      const target = monthlyTarget?.target || project.monthly_target || 20;

      return {
        id: project.id,
        name: project.name,
        actual: published,
        target: target,
      };
    });

    // Calculate bottleneck from current active tasks (not published)
    const activeTasks = (allTasks || []).filter(
      (t) =>
        (t.title || t.keyword_sub) &&
        t.status_content &&
        !isPublished(t)
    );

    // Get tasks by status for bottleneck display
    const qcContentTasks = activeTasks.filter((t) =>
      t.status_content && t.status_content.toLowerCase().includes('qc')
    );
    const qcOutlineTasks = activeTasks.filter((t) =>
      t.status_outline && t.status_outline.toLowerCase().includes('qc')
    );
    const waitPublishTasks = activeTasks.filter((t) => isDoneQC(t.status_content));
    const doingContentTasks = activeTasks.filter((t) =>
      t.status_content && t.status_content.toLowerCase().includes('doing')
    );

    // Get fixing tasks for workflow display
    const fixingOutlineTasks = activeTasks.filter((t) =>
      t.status_outline && t.status_outline.toLowerCase().includes('fix')
    );
    const fixingContentTasks = activeTasks.filter((t) =>
      t.status_content && t.status_content.toLowerCase().includes('fix')
    );
    const doingOutlineTasks = activeTasks.filter((t) =>
      t.status_outline && t.status_outline.toLowerCase().includes('doing')
    );

    const bottleneck = {
      content: {
        doingOutline: doingOutlineTasks.length,
        fixingOutline: fixingOutlineTasks.length,
        doingContent: doingContentTasks.length,
        fixingContent: fixingContentTasks.length,
      },
      seo: {
        qcOutline: qcOutlineTasks.length,
        qcContent: qcContentTasks.length,
        waitPublish: waitPublishTasks.length,
      },
      // Include task details for popup with deadline
      tasks: {
        qcContent: qcContentTasks.slice(0, 10).map((t) => ({
          id: t.id,
          title: t.title || t.keyword_sub,
          pic: t.pic,
          project: t.project?.name,
          link: t.link_publish || t.content_file,
          deadline: t.deadline,
        })),
        qcOutline: qcOutlineTasks.slice(0, 10).map((t) => ({
          id: t.id,
          title: t.title || t.keyword_sub,
          pic: t.pic,
          project: t.project?.name,
          deadline: t.deadline,
        })),
        waitPublish: waitPublishTasks.slice(0, 10).map((t) => ({
          id: t.id,
          title: t.title || t.keyword_sub,
          pic: t.pic,
          project: t.project?.name,
          link: t.link_publish || t.content_file,
          deadline: t.deadline,
        })),
        doingContent: doingContentTasks.slice(0, 10).map((t) => ({
          id: t.id,
          title: t.title || t.keyword_sub,
          pic: t.pic,
          project: t.project?.name,
          deadline: t.deadline,
        })),
        fixingOutline: fixingOutlineTasks.slice(0, 10).map((t) => ({
          id: t.id,
          title: t.title || t.keyword_sub,
          pic: t.pic,
          project: t.project?.name,
          deadline: t.deadline,
        })),
        fixingContent: fixingContentTasks.slice(0, 10).map((t) => ({
          id: t.id,
          title: t.title || t.keyword_sub,
          pic: t.pic,
          project: t.project?.name,
          deadline: t.deadline,
        })),
        doingOutline: doingOutlineTasks.slice(0, 10).map((t) => ({
          id: t.id,
          title: t.title || t.keyword_sub,
          pic: t.pic,
          project: t.project?.name,
          deadline: t.deadline,
        })),
      },
      biggest: '',
    };

    // Determine biggest bottleneck
    const contentTotal = Object.values(bottleneck.content).reduce((a, b) => a + b, 0);
    const seoTotal = Object.values(bottleneck.seo).reduce((a, b) => a + b, 0);

    if (bottleneck.content.doingContent > 5) {
      bottleneck.biggest = `Content viết bài (${bottleneck.content.doingContent} bài)`;
    } else if (bottleneck.seo.qcContent > 3) {
      bottleneck.biggest = `SEO QC content (${bottleneck.seo.qcContent} bài)`;
    } else if (contentTotal > seoTotal && contentTotal > 0) {
      bottleneck.biggest = `Content đang giữ ${contentTotal} bài`;
    } else if (seoTotal > 0) {
      bottleneck.biggest = `SEO đang giữ ${seoTotal} bài`;
    } else {
      bottleneck.biggest = 'Không có nghẽn';
    }

    // Get alerts (overdue and due soon tasks) - only active tasks with content
    const alerts = activeTasks
      .filter((t) => {
        if (!t.deadline) return false;
        const deadline = new Date(t.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 3; // Sắp đến hạn trong 3 ngày hoặc đã trễ
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 10);

    // Get recent tasks with actual data
    const recentTasks = validTasks
      .sort((a, b) => {
        // Ưu tiên sort theo publish_date, rồi deadline
        const dateA = a.publish_date || a.deadline || a.updated_at;
        const dateB = b.publish_date || b.deadline || b.updated_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 10);

    // Return all tasks for chart (with project info)
    const allTasksWithProject = validTasks.map((t) => ({
      id: t.id,
      title: t.title,
      keyword_sub: t.keyword_sub,
      pic: t.pic,
      status_content: t.status_content,
      status_outline: t.status_outline,
      publish_date: t.publish_date,
      deadline: t.deadline,
      link_publish: t.link_publish,
      content_file: t.content_file,
      project: t.project,
    }));

    // Get overdue tasks from PREVIOUS months (not the selected month)
    // These are tasks that have deadline < today, not published, from months before selected month
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueFromPreviousMonths = (allTasks || [])
      .filter((t) => {
        // Must have content
        if (!(t.title || t.keyword_sub)) return false;
        // Must not be published
        if (isPublished(t)) return false;
        // Must have deadline
        if (!t.deadline) return false;
        // Deadline must be in the past
        const deadline = new Date(t.deadline);
        if (deadline >= today) return false;
        // Must be from a month BEFORE the selected month
        // If viewing Dec 2025, show overdue from Nov 2025, Oct 2025, etc.
        const taskMonth = t.month;
        const taskYear = t.year;
        if (taskYear > selectedYear) return false;
        if (taskYear === selectedYear && taskMonth >= selectedMonth) return false;
        return true;
      })
      .map((t) => ({
        id: t.id,
        title: t.title,
        keyword_sub: t.keyword_sub,
        pic: t.pic,
        status_content: t.status_content,
        status_outline: t.status_outline,
        deadline: t.deadline,
        link_publish: t.link_publish,
        content_file: t.content_file,
        project: t.project,
        month: t.month,
        year: t.year,
      }))
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

    return NextResponse.json({
      stats,
      projectStats,
      bottleneck,
      alerts,
      recentTasks,
      allTasks: allTasksWithProject,
      overdueFromPreviousMonths, // Tasks overdue from previous months
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
