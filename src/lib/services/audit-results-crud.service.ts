import { db } from '@/lib/db';
import { auditResults } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { AppError } from '@/lib/api-response';

export function getAudits(projectId?: string) {
  if (projectId) {
    return db.select().from(auditResults)
      .where(eq(auditResults.project_id, projectId))
      .orderBy(desc(auditResults.created_at))
      .all();
  }
  return db.select().from(auditResults)
    .orderBy(desc(auditResults.created_at))
    .all();
}

export function getAudit(id: string) {
  const row = db.select().from(auditResults).where(eq(auditResults.id, id)).get();
  if (!row) throw new AppError('Audit not found', 404);
  return row;
}

export function createAudit(data: {
  project_id?: string;
  audit_type: string;
  audit_date: string;
  summary?: unknown;
  details?: unknown;
  raw_file?: string;
  source?: string;
}) {
  return db.insert(auditResults).values({
    project_id: data.project_id ?? null,
    audit_type: data.audit_type,
    audit_date: data.audit_date,
    summary: data.summary ?? null,
    details: data.details ?? null,
    raw_file: data.raw_file ?? null,
    source: data.source ?? 'manual',
  }).returning().get();
}

export function deleteAudit(id: string) {
  const row = db.select().from(auditResults).where(eq(auditResults.id, id)).get();
  if (!row) throw new AppError('Audit not found', 404);
  db.delete(auditResults).where(eq(auditResults.id, id)).run();
}
