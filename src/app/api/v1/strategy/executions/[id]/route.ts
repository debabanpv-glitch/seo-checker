import { NextRequest, NextResponse } from 'next/server';
import { completeExecutionLog } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// PUT /api/v1/strategy/executions/[id]
// Body: { status: 'success' | 'failed', result_text?, error? }
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    if (!body.status || !['success', 'failed'].includes(body.status)) {
      return NextResponse.json(
        { error: 'status must be "success" or "failed"' },
        { status: 400 },
      );
    }
    const log = completeExecutionLog(params.id, {
      status: body.status,
      result_text: body.result_text,
      error: body.error,
    });
    return NextResponse.json({ log });
  } catch (error) {
    return handleApiError(error);
  }
}
