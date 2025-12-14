import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isPublished, isDoneQC } from '@/lib/task-helpers';

export const dynamic = 'force-dynamic';

// GET: Fetch all projects with stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch monthly targets
    const { data: monthlyTargets } = await supabase
      .from('monthly_targets')
      .select('*')
      .eq('month', month)
      .eq('year', year);

    // Fetch task counts for each project
    const projectsWithStats = await Promise.all(
      (projects || []).map(async (project) => {
        // Get all tasks for this project this month - include publish_date for accurate counting
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, status_content, status_outline, deadline, pic, publish_date, link_publish')
          .eq('project_id', project.id)
          .eq('month', month)
          .eq('year', year);

        const taskList = tasks || [];

        // Count published tasks - check both status_content AND publish_date
        const published = taskList.filter((t) => isPublished(t)).length;

        // In progress = has status but not published and not done QC
        const inProgress = taskList.filter((t) =>
          t.status_content &&
          !isPublished(t) &&
          !isDoneQC(t.status_content)
        ).length;

        // Done QC but not published yet
        const doneQC = taskList.filter((t) =>
          isDoneQC(t.status_content) && !isPublished(t)
        ).length;

        // Overdue = has deadline, not published, and deadline passed
        const overdue = taskList.filter((t) => {
          if (!t.deadline || isPublished(t)) return false;
          return new Date(t.deadline) < new Date();
        }).length;

        // Get unique PICs for this project
        const pics = [...new Set(taskList.map((t) => t.pic).filter(Boolean))];

        // Get total tasks (all time)
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);

        // Get monthly target from monthly_targets table or fall back to project default
        const monthlyTarget = monthlyTargets?.find((t) => t.project_id === project.id);
        const target = monthlyTarget?.target || project.monthly_target || 20;

        return {
          ...project,
          actual: published,
          target,
          totalTasks: count || 0,
          thisMonthTotal: taskList.length,
          inProgress,
          doneQC,
          overdue,
          pics,
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
    const { name, sheet_id, sheet_name, monthly_target, ranking_sheet_url, crawl_sheet_url } = body;

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
        ranking_sheet_url: ranking_sheet_url || null,
        crawl_sheet_url: crawl_sheet_url || null,
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

// PUT: Update project
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, sheet_id, sheet_name, monthly_target, ranking_sheet_url, crawl_sheet_url } = body;

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('projects')
      .update({
        name,
        sheet_id,
        sheet_name,
        monthly_target,
        ranking_sheet_url,
        crawl_sheet_url,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: data });
  } catch (error) {
    console.error('Update project error:', error);
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
