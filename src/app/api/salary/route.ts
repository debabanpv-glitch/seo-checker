import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculateSalary } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Helper to check if task is published - support multiple formats
const isPublished = (statusContent: string | null) => {
  if (!statusContent) return false;
  const status = statusContent.toLowerCase().trim();
  return status.includes('publish') || status.includes('4.') || status === 'done' || status === 'hoàn thành';
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const projectId = searchParams.get('project') || ''; // Filter by project

    // Calculate date range for the selected month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

    // Fetch all tasks for the month with project info
    // Filter by publish_date instead of month/year fields for accuracy
    let query = supabase
      .from('tasks')
      .select('*, project:projects(*)')
      .gte('publish_date', startDate)
      .lte('publish_date', endDate);

    // Apply project filter if specified
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: tasks, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter published tasks using flexible check
    const publishedTasks = (tasks || []).filter(
      (t) => (t.title || t.keyword_sub) && isPublished(t.status_content)
    );

    // Group by PIC and collect task details
    const picData = new Map<string, {
      count: number;
      tasks: Array<{
        id: string;
        title: string;
        project: string;
        publish_date: string | null;
        link: string | null;
      }>;
    }>();

    publishedTasks.forEach((task) => {
      const pic = task.pic || 'Unknown';
      const existing = picData.get(pic) || { count: 0, tasks: [] };
      existing.count += 1;
      existing.tasks.push({
        id: task.id,
        title: task.title || task.keyword_sub || '',
        project: task.project?.name || '',
        publish_date: task.publish_date,
        link: task.link_publish,
      });
      picData.set(pic, existing);
    });

    // Calculate salary for each PIC
    const salaryData = Array.from(picData.entries())
      .filter(([name]) => name !== 'Unknown')
      .map(([name, data]) => {
        const salary = calculateSalary(data.count);
        return {
          name,
          publishedCount: data.count,
          tasks: data.tasks.sort((a, b) => {
            // Sort by publish_date descending
            if (!a.publish_date) return 1;
            if (!b.publish_date) return -1;
            return new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime();
          }),
          ...salary,
        };
      })
      .sort((a, b) => b.total - a.total);

    // Get list of projects for filter dropdown
    const { data: projects } = await supabase.from('projects').select('id, name');

    return NextResponse.json({
      salaryData,
      projects: projects || [],
      meta: {
        month,
        year,
        projectId,
        totalPublished: publishedTasks.length,
      },
    });
  } catch (error) {
    console.error('Salary API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
