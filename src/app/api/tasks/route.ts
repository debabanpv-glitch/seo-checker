import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch tasks with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project');
    const pic = searchParams.get('pic');
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

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

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error) {
    console.error('Tasks API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
