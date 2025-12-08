import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'month';

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Fetch all tasks with project info
    const { data: allTasks, error } = await supabase
      .from('tasks')
      .select('*, project:projects(*)');

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter tasks based on date filter using month/year fields in data
    let taskList = allTasks || [];

    switch (filter) {
      case 'today':
        // Tasks có deadline hôm nay hoặc được cập nhật hôm nay
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        taskList = taskList.filter((t) => {
          if (t.deadline) {
            const deadline = new Date(t.deadline);
            deadline.setHours(0, 0, 0, 0);
            return deadline.getTime() === today.getTime();
          }
          return false;
        });
        break;
      case 'week':
        // Tasks trong tuần này
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        taskList = taskList.filter((t) => {
          if (t.deadline) {
            const deadline = new Date(t.deadline);
            return deadline >= startOfWeek && deadline < endOfWeek;
          }
          return false;
        });
        break;
      case 'month':
        // Tasks của tháng hiện tại (dựa vào field month và year)
        taskList = taskList.filter(
          (t) => t.month === currentMonth && t.year === currentYear
        );
        break;
      default:
        // 'all' - giữ nguyên tất cả
        break;
    }

    // Calculate stats
    const stats = {
      total: taskList.length,
      published: taskList.filter((t) => t.status_content === '4. Publish').length,
      inProgress: taskList.filter((t) =>
        t.status_content &&
        !['4. Publish', '3. Done QC', ''].includes(t.status_content)
      ).length,
      overdue: taskList.filter((t) => {
        if (!t.deadline || t.status_content === '4. Publish') return false;
        return new Date(t.deadline) < new Date();
      }).length,
    };

    // Fetch all projects
    const { data: projects } = await supabase.from('projects').select('*');

    // Fetch monthly targets
    const { data: monthlyTargets } = await supabase
      .from('monthly_targets')
      .select('*')
      .eq('month', currentMonth)
      .eq('year', currentYear);

    // Calculate project stats for current month
    const projectStats = (projects || []).map((project) => {
      // Lấy tất cả tasks của project trong tháng hiện tại
      const projectTasks = (allTasks || []).filter(
        (t) =>
          t.project_id === project.id &&
          t.month === currentMonth &&
          t.year === currentYear
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

    // Calculate bottleneck from ALL tasks (not filtered)
    const activeTasks = (allTasks || []).filter(
      (t) => t.status_content && t.status_content !== '4. Publish'
    );

    const bottleneck = {
      content: {
        doingOutline: activeTasks.filter((t) => t.status_outline === '1. Doing Outline').length,
        fixingOutline: activeTasks.filter((t) =>
          t.status_outline && (t.status_outline.includes('Fixing') || t.status_outline.includes('fix'))
        ).length,
        doingContent: activeTasks.filter((t) =>
          t.status_content === '1. Doing' || t.status_content === '1. Doing Content'
        ).length,
        fixingContent: activeTasks.filter((t) =>
          t.status_content && (t.status_content.includes('Fixing') || t.status_content.includes('fix'))
        ).length,
      },
      seo: {
        qcOutline: activeTasks.filter((t) =>
          t.status_outline && t.status_outline.includes('QC')
        ).length,
        qcContent: activeTasks.filter((t) =>
          t.status_content && t.status_content.includes('QC')
        ).length,
        waitPublish: activeTasks.filter((t) =>
          t.status_content === '3. Done QC' || t.status_content === '3. Done'
        ).length,
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

    // Get alerts (overdue and due soon tasks) - only active tasks
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
    const recentTasks = taskList
      .filter((t) => t.title || t.keyword_sub || t.parent_keyword) // Chỉ lấy tasks có data
      .sort((a, b) => {
        // Ưu tiên sort theo publish_date, rồi deadline, rồi updated_at
        const dateA = a.publish_date || a.deadline || a.updated_at;
        const dateB = b.publish_date || b.deadline || b.updated_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 10);

    return NextResponse.json({
      stats,
      projectStats,
      bottleneck,
      alerts,
      recentTasks,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
