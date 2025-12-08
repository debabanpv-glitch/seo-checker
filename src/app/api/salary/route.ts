import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculateSalary } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Fetch all published tasks for the month
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .eq('status_content', '4. Publish');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by PIC and count published
    const picCounts = new Map<string, number>();

    (tasks || []).forEach((task) => {
      const pic = task.pic || 'Unknown';
      picCounts.set(pic, (picCounts.get(pic) || 0) + 1);
    });

    // Calculate salary for each PIC
    const salaryData = Array.from(picCounts.entries())
      .filter(([name]) => name !== 'Unknown')
      .map(([name, publishedCount]) => {
        const salary = calculateSalary(publishedCount);
        return {
          name,
          publishedCount,
          ...salary,
        };
      })
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({ salaryData });
  } catch (error) {
    console.error('Salary API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
