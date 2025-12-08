import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Fetch all tasks for the month
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('month', month)
      .eq('year', year);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by PIC
    const memberMap = new Map<string, {
      name: string;
      totalThisMonth: number;
      published: number;
      inProgress: number;
      onTime: number;
      late: number;
    }>();

    (tasks || []).forEach((task) => {
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

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Members API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
