import { NextRequest, NextResponse } from 'next/server';
import { getPayments, upsertPayment, deletePayment } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const month = parseInt(sp.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(sp.get('year') || String(new Date().getFullYear()));
    return NextResponse.json({ payments: getPayments(month, year) });
  } catch (error) {
    return handleApiError(error);
  }
}

export function POST(request: NextRequest) {
  return request.json().then((body) => {
    try {
      const { member_name, month, year, amount } = body;
      if (!member_name || !month || !year) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      const payment = upsertPayment(member_name, month, year, amount || 0);
      return NextResponse.json({ success: true, payment });
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export function DELETE(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const member_name = sp.get('member_name');
    const month = parseInt(sp.get('month') || '0');
    const year = parseInt(sp.get('year') || '0');
    if (!member_name || !month || !year) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    deletePayment(member_name, month, year);
    return NextResponse.json({ success: true, message: 'Payment record removed' });
  } catch (error) {
    return handleApiError(error);
  }
}
