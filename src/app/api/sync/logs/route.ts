import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: logs, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        return NextResponse.json({ logs: [], lastSync: null });
      }
      throw error;
    }

    const lastSync = logs?.[0] || null;

    return NextResponse.json({
      logs: logs || [],
      lastSync,
    });
  } catch (error) {
    console.error('Failed to fetch sync logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync logs', logs: [], lastSync: null },
      { status: 500 }
    );
  }
}
