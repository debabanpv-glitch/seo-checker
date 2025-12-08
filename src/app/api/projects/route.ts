import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch all projects with stats
export async function GET() {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get current month/year
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Fetch task counts for each project
    const projectsWithStats = await Promise.all(
      (projects || []).map(async (project) => {
        // Get all tasks for this project this month
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, status_content')
          .eq('project_id', project.id)
          .eq('month', currentMonth)
          .eq('year', currentYear);

        const taskList = tasks || [];
        const published = taskList.filter((t) => t.status_content === '4. Publish').length;

        // Get total tasks
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);

        return {
          ...project,
          actual: published,
          target: project.monthly_target || 20,
          totalTasks: count || 0,
        };
      })
    );

    return NextResponse.json({ projects: projectsWithStats });
  } catch (error) {
    console.error('Projects API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, sheet_id, sheet_name, monthly_target } = body;

    if (!name || !sheet_id) {
      return NextResponse.json(
        { error: 'Tên dự án và Sheet ID là bắt buộc' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        sheet_id,
        sheet_name: sheet_name || 'Content',
        monthly_target: monthly_target || 20,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: data });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete project
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
