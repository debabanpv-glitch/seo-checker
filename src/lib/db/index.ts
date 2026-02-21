import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH
  ?? path.join(process.cwd(), 'data', 'seo-manager.db');

declare global {
  // eslint-disable-next-line no-var
  var _db: ReturnType<typeof drizzle> | undefined;
}

function createDb() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
}

export const db = globalThis._db ?? (globalThis._db = createDb());
