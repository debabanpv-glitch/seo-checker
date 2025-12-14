import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Create fresh client every time
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query all tasks
    const { data: allTasks, error } = await supabase
      .from('tasks')
      .select('id, title, keyword_sub, publish_date, month, year');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Count stats
    const total = allTasks?.length || 0;
    const withPubDate = allTasks?.filter((t) => t.publish_date).length || 0;

    // Filter Dec 2025
    const dec2025 = allTasks?.filter((t) => t.month === 12 && t.year === 2025) || [];
    const dec2025Total = dec2025.length;
    const dec2025WithPubDate = dec2025.filter((t) => t.publish_date).length;

    // Valid tasks
    const validDec2025 = dec2025.filter((t) => t.title || t.keyword_sub);
    const validWithPubDate = validDec2025.filter((t) => t.publish_date).length;

    // Sample tasks with publish_date
    const sample = dec2025
      .filter((t) => t.publish_date)
      .slice(0, 10)
      .map((t) => ({
        id: t.id.substring(0, 8),
        title: (t.title || t.keyword_sub || '').substring(0, 30),
        publish_date: t.publish_date,
      }));

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      total,
      withPubDate,
      dec2025: {
        total: dec2025Total,
        withPubDate: dec2025WithPubDate,
        validTotal: validDec2025.length,
        validWithPubDate,
      },
      sample,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
