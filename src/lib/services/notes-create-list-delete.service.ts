import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { AppError } from '@/lib/api-response';

// ---------------------------------------------------------------------------
// Notes CRUD
// ---------------------------------------------------------------------------

export function getNotes(projectId?: string) {
  if (projectId) {
    return db.select().from(notes)
      .where(eq(notes.project_id, projectId))
      .orderBy(desc(notes.created_at))
      .all();
  }
  return db.select().from(notes).orderBy(desc(notes.created_at)).all();
}

export function createNote(data: {
  project_id?: string;
  title: string;
  content?: string;
  tags?: string[];
  source?: string;
}) {
  return db.insert(notes).values({
    project_id: data.project_id ?? null,
    title: data.title,
    content: data.content ?? null,
    tags: data.tags ?? [],
    source: data.source ?? 'manual',
  }).returning().get();
}

export function deleteNote(id: string) {
  const existing = db.select().from(notes).where(eq(notes.id, id)).get();
  if (!existing) throw new AppError('Note not found', 404);
  db.delete(notes).where(eq(notes.id, id)).run();
}
