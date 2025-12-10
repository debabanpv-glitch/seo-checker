import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch keyword rankings with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const keyword = searchParams.get('keyword');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '1000');

    let query = supabase
      .from('keyword_rankings')
      .select('*')
      .order('date', { ascending: false })
      .order('keyword', { ascending: true })
      .limit(limit);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (keyword) {
      query = query.ilike('keyword', `%${keyword}%`);
    }

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching keyword rankings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rankings: data || [] });
  } catch (error) {
    console.error('Keyword rankings API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete ranking records
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const projectId = searchParams.get('projectId');
    const keyword = searchParams.get('keyword');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    // Delete all records
    if (deleteAll) {
      const { error } = await supabase
        .from('keyword_rankings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (workaround)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Đã xóa tất cả dữ liệu keyword ranking!' });
    }

    // Delete by project only
    if (projectId && !keyword) {
      const { error } = await supabase
        .from('keyword_rankings')
        .delete()
        .eq('project_id', projectId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Đã xóa dữ liệu keyword ranking của dự án!' });
    }

    if (id) {
      // Delete single record
      const { error } = await supabase.from('keyword_rankings').delete().eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Deleted 1 record' });
    }

    if (projectId && keyword) {
      // Delete all records for a keyword in a project
      const { error, count } = await supabase
        .from('keyword_rankings')
        .delete()
        .eq('project_id', projectId)
        .eq('keyword', keyword);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: `Deleted ${count || 0} records` });
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (error) {
    console.error('Delete keyword ranking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
