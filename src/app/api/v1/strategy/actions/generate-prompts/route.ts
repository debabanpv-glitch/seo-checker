import { NextRequest, NextResponse } from 'next/server';
import { getActions, updateAction } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';
import { generateDefaultAiPrompt } from '@/lib/utils/strategy-execution-prompt-builder';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, overwrite = false } = body as { project_id: string; overwrite?: boolean };

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const allActions = getActions(undefined, project_id);

    let updated = 0;
    let skipped = 0;

    for (const action of allActions) {
      if (!overwrite && action.ai_prompt) {
        skipped++;
        continue;
      }

      const prompt = generateDefaultAiPrompt({
        title: action.title,
        description: action.description ?? undefined,
        category: action.category ?? undefined,
        priority: action.priority ?? undefined,
        platform_type: action.platform_type ?? undefined,
      });

      updateAction(action.id, { ai_prompt: prompt });
      updated++;
    }

    return NextResponse.json({ updated, skipped });
  } catch (error) {
    return handleApiError(error);
  }
}
