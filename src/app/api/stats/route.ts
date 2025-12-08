import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    const stats = {
      total: validTasks.length,
      published: validTasks.filter((t) => t.status_content === '4. Publish').length,
      inProgress: validTasks.filter((t) =>
        t.status_content &&
        !['4. Publish', '3. Done QC', ''].includes(t.status_content)
      ).length,
      overdue: validTasks.filter((t) => {
        if (!t.deadline || t.status_content === '4. Publish') return false;
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
      const published = projectTasks.filter((t) => t.status_content === '4. Publish').length;

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
        t.status_content !== '4. Publish'
    );

    // Get tasks by status for bottleneck display
    const qcContentTasks = activeTasks.filter((t) =>
      t.status_content && t.status_content.includes('QC')
    );
    const qcOutlineTasks = activeTasks.filter((t) =>
      t.status_outline && t.status_outline.includes('QC')
    );
    const waitPublishTasks = activeTasks.filter((t) =>
      t.status_content === '3. Done QC' || t.status_content === '3. Done'
    );
    const doingContentTasks = activeTasks.filter((t) =>
      t.status_content === '1. Doing' ||
      t.status_content === '1. Doing Content' ||
      t.status_content?.includes('Doing')
    );

    const bottleneck = {
      content: {
        doingOutline: activeTasks.filter((t) =>
          t.status_outline === '1. Doing Outline'
        ).length,
        fixingOutline: activeTasks.filter((t) =>
          t.status_outline && (t.status_outline.includes('Fixing') || t.status_outline.includes('fix'))
        ).length,
        doingContent: doingContentTasks.length,
        fixingContent: activeTasks.filter((t) =>
          t.status_content && (t.status_content.includes('Fixing') || t.status_content.includes('fix'))
        ).length,
      },
      seo: {
        qcOutline: qcOutlineTasks.length,
        qcContent: qcContentTasks.length,
        waitPublish: waitPublishTasks.length,
      },
      // Include task details for popup
      tasks: {
        qcContent: qcContentTasks.slice(0, 10).map((t) => ({
          id: t.id,
          title: t.title || t.keyword_sub,
          pic: t.pic,
          project: t.project?.name,
          link: t.link_publish || t.content_file,
        })),
        qcOutline: qcOutlineTasks.slice(0, 10).map((t) => ({
          id: t.id,
          title: t.title || t.keyword_sub,
          pic: t.pic,
          project: t.project?.name,
        })),
        waitPublish: waitPublishTasks.slice(0, 10).map((t) => ({
          id: t.id,
          title: t.title || t.keyword_sub,
          pic: t.pic,
          project: t.project?.name,
          link: t.link_publish || t.content_file,
        })),
        doingContent: doingContentTasks.slice(0, 10).map((t) => ({
          id: t.id,
          title: t.title || t.keyword_sub,
          pic: t.pic,
          project: t.project?.name,
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
      publish_date: t.publish_date,
      deadline: t.deadline,
      link_publish: t.link_publish,
      project: t.project,
    }));

    return NextResponse.json({
      stats,
      projectStats,
      bottleneck,
      alerts,
      recentTasks,
      allTasks: allTasksWithProject,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
