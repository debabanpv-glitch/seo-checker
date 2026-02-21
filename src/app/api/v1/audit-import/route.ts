import { NextRequest, NextResponse } from 'next/server';
import { getAudits, createAudit, deleteAudit } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const projectId = sp.get('project_id') ?? undefined;
    return NextResponse.json({ audits: getAudits(projectId) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.audit_type || !body.audit_date) {
      return NextResponse.json({ error: 'audit_type and audit_date are required' }, { status: 400 });
    }
    const audit = createAudit(body);
    return NextResponse.json({ audit });
  } catch (error) {
    return handleApiError(error);
  }
}

export function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    deleteAudit(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
