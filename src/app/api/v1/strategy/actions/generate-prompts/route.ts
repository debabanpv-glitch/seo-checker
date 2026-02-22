import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema/projects';
import { strategyPhases, strategyActions } from '@/lib/db/schema/strategy';
import { eq } from 'drizzle-orm';
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

    // Get project info for context
    const project = db.select().from(projects).where(eq(projects.id, project_id)).get();
    const projectContext = {
      projectName: project?.name,
      projectDomain: project?.domain || project?.website || undefined,
    };

    // Get all phases for this project
    const phases = db.select().from(strategyPhases).where(eq(strategyPhases.project_id, project_id)).all();
    const phaseMap = new Map(phases.map(p => [p.id, p]));

    // Get all actions for this project
    const allActions = db.select().from(strategyActions).where(eq(strategyActions.project_id, project_id)).all();

    let updated = 0;
    let skipped = 0;

    for (const action of allActions) {
      if (!overwrite && action.ai_prompt) {
        skipped++;
        continue;
      }

      const phase = phaseMap.get(action.phase_id);

      const prompt = generateDefaultAiPrompt(
        {
          title: action.title,
          description: action.description ?? undefined,
          category: action.category ?? undefined,
          priority: action.priority ?? undefined,
          platform_type: action.platform_type ?? undefined,
        },
        {
          ...projectContext,
          phaseName: phase?.name,
          phaseDescription: phase?.description ?? undefined,
        },
      );

      db.update(strategyActions)
        .set({ ai_prompt: prompt, updated_at: new Date().toISOString() })
        .where(eq(strategyActions.id, action.id))
        .run();
      updated++;
    }

    return NextResponse.json({ updated, skipped });
  } catch (error) {
    return handleApiError(error);
  }
}
