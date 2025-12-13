import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Lấy tất cả monthly targets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    let query = supabase
      .from('monthly_targets')
      .select('*, projects(name)')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Targets API error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ targets: data || [] });
  } catch (error) {
    console.error('Targets API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Tạo hoặc cập nhật monthly target
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, month, year, target } = body;

    if (!projectId || !month || !year || target === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, month, year, target' },
        { status: 400 }
      );
    }

    // Upsert: update nếu tồn tại, insert nếu chưa có
    const { data, error } = await supabase
      .from('monthly_targets')
      .upsert(
        {
          project_id: projectId,
          month: parseInt(month),
          year: parseInt(year),
          target: parseInt(target),
        },
        {
          onConflict: 'project_id,month,year',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Targets API error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, target: data });
  } catch (error) {
    console.error('Targets API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Xóa monthly target
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing target id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('monthly_targets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Targets API error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Targets API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
