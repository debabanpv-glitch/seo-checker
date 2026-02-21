import { db } from '@/lib/db';
import { appConfig } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// App Config CRUD (key-value settings store)
// ---------------------------------------------------------------------------

export function getAllAppConfig() {
  return db.select().from(appConfig).all();
}

export function getAppConfig(key: string) {
  return db.select().from(appConfig).where(eq(appConfig.key, key)).get();
}

export function upsertAppConfig(key: string, value: string) {
  return db.insert(appConfig)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value, updated_at: new Date().toISOString() },
    })
    .returning().get();
}
