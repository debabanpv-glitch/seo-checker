import { db } from '@/lib/db';
import { strategyExecutionLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/api-response';

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export function createExecutionLog(data: {
  action_id: string;
  project_id?: string;
  executor: string;
  prompt_used?: string;
  result_text?: string;
  status?: string;
}) {
  return db.insert(strategyExecutionLogs).values({
    action_id: data.action_id,
    project_id: data.project_id ?? null,
    executor: data.executor,
    prompt_used: data.prompt_used ?? null,
    result_text: data.result_text ?? null,
    status: data.status ?? 'running',
  }).returning().get();
}

// ---------------------------------------------------------------------------
// Complete (success or failed)
// ---------------------------------------------------------------------------

export function completeExecutionLog(id: string, data: {
  status: 'success' | 'failed';
  result_text?: string;
  error?: string;
}) {
  const updated = db.update(strategyExecutionLogs)
    .set({
      status: data.status,
      result_text: data.result_text ?? null,
      error: data.error ?? null,
      completed_at: new Date().toISOString(),
    })
    .where(eq(strategyExecutionLogs.id, id))
    .returning().get();
  if (!updated) throw new AppError('Execution log not found', 404);
  return updated;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function getExecutionLogsByAction(actionId: string) {
  return db.select().from(strategyExecutionLogs)
    .where(eq(strategyExecutionLogs.action_id, actionId))
    .all();
}

export function getExecutionLogsByProject(projectId: string) {
  return db.select().from(strategyExecutionLogs)
    .where(eq(strategyExecutionLogs.project_id, projectId))
    .all();
}

export function getExecutionLogById(id: string) {
  const log = db.select().from(strategyExecutionLogs)
    .where(eq(strategyExecutionLogs.id, id))
    .get();
  if (!log) throw new AppError('Execution log not found', 404);
  return log;
}
