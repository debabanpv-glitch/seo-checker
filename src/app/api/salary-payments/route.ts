import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Fetch payment status for a month
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const { data, error } = await supabase
      .from('salary_payments')
      .select('*')
      .eq('month', month)
      .eq('year', year);

    if (error) {
      console.error('Error fetching salary payments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ payments: data || [] });
  } catch (error) {
    console.error('Salary payments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Mark member as paid for a month
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { member_name, month, year, amount, paid_by, note } = body;

    if (!member_name || !month || !year) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upsert: insert or update if exists
    const { data, error } = await supabase
      .from('salary_payments')
      .upsert(
        {
          member_name,
          month,
          year,
          amount: amount || 0,
          paid_by: paid_by || null,
          note: note || null,
          paid_at: new Date().toISOString(),
        },
        {
          onConflict: 'member_name,month,year',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving salary payment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, payment: data });
  } catch (error) {
    console.error('Salary payment POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove payment record (mark as unpaid)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const member_name = searchParams.get('member_name');
    const month = parseInt(searchParams.get('month') || '0');
    const year = parseInt(searchParams.get('year') || '0');

    if (!member_name || !month || !year) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const { error } = await supabase
      .from('salary_payments')
      .delete()
      .eq('member_name', member_name)
      .eq('month', month)
      .eq('year', year);

    if (error) {
      console.error('Error deleting salary payment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Payment record removed' });
  } catch (error) {
    console.error('Salary payment DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
