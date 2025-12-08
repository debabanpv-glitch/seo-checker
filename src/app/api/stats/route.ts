import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'month';

    // Calculate date range based on filter
    const now = new Date();
    let startDate: Date | null = null;

    switch (filter) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = null;
    }

    // Fetch all tasks
    let query = supabase.from('tasks').select('*, project:projects(*)');

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const taskList = tasks || [];

    // Calculate stats
    const stats = {
      total: taskList.length,
      published: taskList.filter((t) => t.status_content === '4. Publish').length,
      inProgress: taskList.filter((t) =>
        t.status_content &&
        !['4. Publish', '3. Done QC'].includes(t.status_content)
      ).length,
      overdue: taskList.filter((t) => {
        if (!t.deadline || t.status_content === '4. Publish') return false;
        return new Date(t.deadline) < new Date();
      }).length,
    };

    // Fetch project stats
    const { data: projects } = await supabase.from('projects').select('*');

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const projectStats = (projects || []).map((project) => {
      const projectTasks = taskList.filter(
        (t) =>
          t.project_id === project.id &&
          t.month === currentMonth &&
          t.year === currentYear
      );
      const published = projectTasks.filter((t) => t.status_content === '4. Publish').length;

      return {
        ...project,
        actual: published,
        target: project.monthly_target || 20,
      };
    });

    // Calculate bottleneck
    const bottleneck = {
      content: {
        doingOutline: taskList.filter((t) => t.status_outline === '1. Doing Outline').length,
        fixingOutline: taskList.filter((t) =>
          ['1.1 Fixing Outline', '1.2 Đã fix'].includes(t.status_outline)
        ).length,
        doingContent: taskList.filter((t) => t.status_content === '1. Doing').length,
        fixingContent: taskList.filter((t) =>
          ['1.1 Fixing', '1.2 Đã fix'].includes(t.status_content)
        ).length,
      },
      seo: {
        qcOutline: taskList.filter((t) => t.status_outline === '2. QC Outline').length,
        qcContent: taskList.filter((t) => t.status_content === '2. QC Content').length,
        waitPublish: taskList.filter((t) => t.status_content === '3. Done QC').length,
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
    } else if (contentTotal > seoTotal) {
      bottleneck.biggest = `Content đang giữ ${contentTotal} bài`;
    } else if (seoTotal > 0) {
      bottleneck.biggest = `SEO đang giữ ${seoTotal} bài`;
    }

    // Get alerts (overdue and due soon tasks)
    const alerts = taskList
      .filter((t) => {
        if (!t.deadline || t.status_content === '4. Publish') return false;
        const deadline = new Date(t.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 10);

    // Get recent tasks
    const recentTasks = taskList
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
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
