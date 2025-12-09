import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to check if task is published
const isPublished = (statusContent: string | null) => {
  if (!statusContent) return false;
  const status = statusContent.toLowerCase().trim();
  return status.includes('publish') || status.includes('4.') || status === 'done' || status === 'hoàn thành';
};

// GET: Fetch tasks with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project');
    const pic = searchParams.get('pic');
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const published = searchParams.get('published'); // New filter for published tasks

    let query = supabase
      .from('tasks')
      .select('*, project:projects(*)')
      .order('deadline', { ascending: true, nullsFirst: false });

    if (project) {
      query = query.eq('project_id', project);
    }

    if (pic) {
      query = query.eq('pic', pic);
    }

    if (status) {
      query = query.or(`status_content.ilike.%${status}%,status_outline.ilike.%${status}%`);
    }

    if (month && year) {
      query = query.eq('month', parseInt(month)).eq('year', parseInt(year));
    }

    const { data: tasks, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter published tasks if requested
    let filteredTasks = tasks || [];
    if (published === 'true') {
      filteredTasks = filteredTasks.filter(
        (t) => (t.title || t.keyword_sub) && t.link_publish && isPublished(t.status_content)
      );
    }

    return NextResponse.json({ tasks: filteredTasks });
  } catch (error) {
    console.error('Tasks API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
