import { db } from '@/lib/db';
import { strategyPhases, strategyActions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { AppError } from '@/lib/api-response';

// ---------------------------------------------------------------------------
// Phase helpers
// ---------------------------------------------------------------------------

function calcPhaseProgress(phaseId: string): number {
  const actions = db.select().from(strategyActions).where(eq(strategyActions.phase_id, phaseId)).all();
  if (actions.length === 0) return 0;
  const done = actions.filter((a) => a.status === 'done').length;
  return Math.round((done / actions.length) * 100);
}

// ---------------------------------------------------------------------------
// Strategy Phases
// ---------------------------------------------------------------------------

export function getPhases(projectId?: string) {
  if (projectId) {
    return db.select().from(strategyPhases)
      .where(eq(strategyPhases.project_id, projectId))
      .all();
  }
  return db.select().from(strategyPhases).all();
}

export function getPhaseWithActions(phaseId: string) {
  const phase = db.select().from(strategyPhases).where(eq(strategyPhases.id, phaseId)).get();
  if (!phase) throw new AppError('Phase not found', 404);
  const actions = db.select().from(strategyActions)
    .where(eq(strategyActions.phase_id, phaseId))
    .all();
  return { ...phase, actions };
}

export function createPhase(data: {
  project_id: string;
  name: string;
  description?: string;
  phase_type?: string;
  priority?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
  dependencies?: string[];
}) {
  return db.insert(strategyPhases).values({
    project_id: data.project_id,
    name: data.name,
    description: data.description ?? null,
    phase_type: data.phase_type ?? 'short_term',
    priority: data.priority ?? 0,
    start_date: data.start_date ?? null,
    end_date: data.end_date ?? null,
    status: data.status ?? 'planned',
    progress: 0,
    dependencies: data.dependencies ?? [],
  }).returning().get();
}

export function updatePhase(id: string, data: Partial<typeof strategyPhases.$inferInsert>) {
  const updated = db.update(strategyPhases)
    .set({ ...data, updated_at: new Date().toISOString() })
    .where(eq(strategyPhases.id, id))
    .returning().get();
  if (!updated) throw new AppError('Phase not found', 404);
  return updated;
}

export function deletePhase(id: string) {
  db.delete(strategyPhases).where(eq(strategyPhases.id, id)).run();
}

// ---------------------------------------------------------------------------
// Strategy Actions
// ---------------------------------------------------------------------------

export function getActions(phaseId?: string, projectId?: string) {
  if (phaseId && projectId) {
    return db.select().from(strategyActions)
      .where(and(eq(strategyActions.phase_id, phaseId), eq(strategyActions.project_id, projectId)))
      .all();
  }
  if (phaseId) {
    return db.select().from(strategyActions)
      .where(eq(strategyActions.phase_id, phaseId))
      .all();
  }
  if (projectId) {
    return db.select().from(strategyActions)
      .where(eq(strategyActions.project_id, projectId))
      .all();
  }
  return db.select().from(strategyActions).all();
}

export function createAction(data: {
  phase_id: string;
  project_id?: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  assigned_to?: string;
  status?: string;
  due_date?: string;
  result?: string;
  executor_type?: string;
  ai_prompt?: string;
  platform_type?: string;
  implementation_notes?: string;
}) {
  return db.insert(strategyActions).values({
    phase_id: data.phase_id,
    project_id: data.project_id ?? null,
    title: data.title,
    description: data.description ?? null,
    category: data.category ?? null,
    priority: data.priority ?? 'medium',
    assigned_to: data.assigned_to ?? null,
    status: data.status ?? 'todo',
    due_date: data.due_date ?? null,
    result: data.result ?? null,
    executor_type: data.executor_type ?? 'human',
    ai_prompt: data.ai_prompt ?? null,
    platform_type: data.platform_type ?? null,
    implementation_notes: data.implementation_notes ?? null,
  }).returning().get();
}

export function updateAction(id: string, data: Partial<typeof strategyActions.$inferInsert>) {
  const payload: Partial<typeof strategyActions.$inferInsert> = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  // Auto-set completed_date when status changes to done
  if (data.status === 'done' && !data.completed_date) {
    payload.completed_date = new Date().toISOString().split('T')[0];
  }

  const updated = db.update(strategyActions)
    .set(payload)
    .where(eq(strategyActions.id, id))
    .returning().get();
  if (!updated) throw new AppError('Action not found', 404);

  // Recalculate phase progress
  const progress = calcPhaseProgress(updated.phase_id);
  db.update(strategyPhases)
    .set({ progress, updated_at: new Date().toISOString() })
    .where(eq(strategyPhases.id, updated.phase_id))
    .run();

  return updated;
}

export function deleteAction(id: string) {
  const action = db.select().from(strategyActions).where(eq(strategyActions.id, id)).get();
  if (!action) throw new AppError('Action not found', 404);
  db.delete(strategyActions).where(eq(strategyActions.id, id)).run();

  // Recalculate phase progress after delete
  const progress = calcPhaseProgress(action.phase_id);
  db.update(strategyPhases)
    .set({ progress, updated_at: new Date().toISOString() })
    .where(eq(strategyPhases.id, action.phase_id))
    .run();
}
