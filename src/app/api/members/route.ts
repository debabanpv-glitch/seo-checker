import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const viewType = searchParams.get('view') || 'month'; // 'month', 'week', 'day'

    // Fetch all tasks for the month
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('month', month)
      .eq('year', year);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch member infos
    const { data: memberInfos } = await supabase
      .from('members')
      .select('*');

    // Filter tasks based on view type
    const now = new Date();
    const filterTasks = (taskList: typeof tasks) => {
      if (!taskList) return [];

      if (viewType === 'day') {
        // Today only - filter by publish_date or deadline
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return taskList.filter((t) => {
          const taskDate = t.publish_date ? new Date(t.publish_date) : null;
          if (!taskDate) return false;
          return taskDate >= today && taskDate < tomorrow;
        });
      } else if (viewType === 'week') {
        // This week only
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        return taskList.filter((t) => {
          const taskDate = t.publish_date ? new Date(t.publish_date) : null;
          if (!taskDate) return false;
          return taskDate >= startOfWeek && taskDate < endOfWeek;
        });
      }
      return taskList; // 'month' - return all
    };

    const filteredTasks = filterTasks(tasks);

    // Group by PIC
    const memberMap = new Map<string, {
      name: string;
      totalThisMonth: number;
      published: number;
      inProgress: number;
      onTime: number;
      late: number;
    }>();

    // For day/week view, use filteredTasks for stats but tasks for totals
    const tasksForStats = viewType === 'month' ? (tasks || []) : filteredTasks;

    tasksForStats.forEach((task) => {
      const pic = task.pic || 'Unknown';

      if (!memberMap.has(pic)) {
        memberMap.set(pic, {
          name: pic,
          totalThisMonth: 0,
          published: 0,
          inProgress: 0,
          onTime: 0,
          late: 0,
        });
      }

      const member = memberMap.get(pic)!;
      member.totalThisMonth++;

      if (task.status_content === '4. Publish') {
        member.published++;
        // Check if published on time
        if (task.publish_date && task.deadline) {
          if (new Date(task.publish_date) <= new Date(task.deadline)) {
            member.onTime++;
          } else {
            member.late++;
          }
        } else {
          member.onTime++; // Assume on time if no dates
        }
      } else if (task.status_content && task.status_content !== '3. Done QC') {
        member.inProgress++;
      }
    });

    // Convert to array and calculate on-time rate
    const members = Array.from(memberMap.values())
      .map((member) => ({
        ...member,
        onTimeRate: member.published > 0
          ? Math.round((member.onTime / member.published) * 100)
          : 0,
      }))
      .filter((m) => m.name !== 'Unknown')
      .sort((a, b) => b.published - a.published);

    return NextResponse.json({
      members,
      memberInfos: memberInfos || [],
    });
  } catch (error) {
    console.error('Members API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, role, projects, start_date } = body;

    const { data, error } = await supabase
      .from('members')
      .insert({
        name,
        role: role || 'Content Writer',
        projects: projects || [],
        start_date: start_date || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ member: data });
  } catch (error) {
    console.error('Create member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, role, projects, start_date } = body;

    if (!id) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('members')
      .update({
        name,
        role,
        projects,
        start_date,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ member: data });
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
