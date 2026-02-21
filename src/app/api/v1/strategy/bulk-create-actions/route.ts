import { NextRequest, NextResponse } from 'next/server';
import { createAction } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/** POST: Bulk create multiple actions for a phase */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phase_id, project_id, actions } = body as {
      phase_id: string;
      project_id?: string;
      actions: Array<{
        title: string;
        description?: string;
        category?: string;
        priority?: string;
        assigned_to?: string;
        due_date?: string;
      }>;
    };

    if (!phase_id || !actions?.length) {
      return NextResponse.json(
        { error: 'phase_id and actions array are required' },
        { status: 400 },
      );
    }

    const created = actions.map((a) =>
      createAction({
        phase_id,
        project_id: project_id ?? undefined,
        title: a.title,
        description: a.description,
        category: a.category,
        priority: a.priority ?? 'medium',
        assigned_to: a.assigned_to,
        due_date: a.due_date,
      }),
    );

    return NextResponse.json({ actions: created, count: created.length });
  } catch (error) {
    return handleApiError(error);
  }
}
