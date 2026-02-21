# Drizzle ORM + better-sqlite3 Best Practices (Next.js 14)

Date: 2026-02-21 | Versions: drizzle-orm@0.45.1, drizzle-kit@0.31.9, better-sqlite3@12.6.2, next@14.2.33

---

## 1. Schema Organization

Split by domain, export all tables from an index barrel. drizzle-kit reads glob patterns recursively.

```
src/db/schema/
├── index.ts          ← re-exports all tables
├── projects.ts
├── tasks.ts
├── monthly-targets.ts
├── keyword-rankings.ts
├── seo-results.ts
├── salary-payments.ts
├── members.ts
└── sync-logs.ts
```

**Each file:**
```ts
// src/db/schema/members.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const members = sqliteTable('members', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  email:     text('email').unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})
```

**Barrel:**
```ts
// src/db/schema/index.ts
export * from './members'
export * from './projects'
// ... etc
```

---

## 2. Database Connection (Singleton, Hot-reload Safe)

better-sqlite3 is SYNCHRONOUS — no async/await needed. Use global singleton to survive Next.js hot-reload.

```ts
// src/db/index.ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const DB_PATH = process.env.DATABASE_URL ?? 'local.db'

const globalForDb = globalThis as unknown as { _sqlite: Database.Database | undefined }

const sqlite = globalForDb._sqlite ?? new Database(DB_PATH)

if (process.env.NODE_ENV !== 'production') {
  globalForDb._sqlite = sqlite
}

// WAL mode: better concurrent reads, safe for Next.js route handlers
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
export type DB = typeof db
```

**Why global singleton:** Next.js dev mode re-imports modules on every hot-reload. Without it, you get "too many open connections" and database locks.

---

## 3. drizzle.config.ts

```ts
// drizzle.config.ts (root)
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema/index.ts',   // or glob: './src/db/schema/*.ts'
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'local.db',
  },
  verbose: true,
  strict: true,
})
```

**Migration workflow:**
```bash
# Generate SQL from schema diff
npx drizzle-kit generate

# Apply migrations (tracks applied in __drizzle_migrations table)
npx drizzle-kit migrate

# Dev shortcut (push without migration files - NOT for prod)
npx drizzle-kit push
```

**Programmatic migration at app startup** (optional, for prod):
```ts
// src/db/migrate.ts
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './index'

migrate(db, { migrationsFolder: './src/db/migrations' })
// Synchronous — runs before server handles requests
```

Call in `instrumentation.ts` (Next.js 14 app router):
```ts
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { migrate } = await import('./db/migrate')
    migrate()
  }
}
```

---

## 4. Query Patterns (Synchronous)

```ts
import { db } from '@/db'
import { members, projects, keywordRankings } from '@/db/schema'
import { eq, like, gte, lte, desc, and, sql } from 'drizzle-orm'

// SELECT
const allMembers = db.select().from(members).all()

// WHERE
const member = db.select().from(members).where(eq(members.id, 'abc')).get()

// LIKE
const results = db.select().from(projects)
  .where(like(projects.name, '%seo%')).all()

// Date comparison (stored as unix timestamp integer)
const recent = db.select().from(keywordRankings)
  .where(gte(keywordRankings.createdAt, startDate))
  .orderBy(desc(keywordRankings.createdAt))
  .all()

// JOIN
const withProject = db.select({
  rankingId: keywordRankings.id,
  projectName: projects.name,
  position: keywordRankings.position,
}).from(keywordRankings)
  .leftJoin(projects, eq(keywordRankings.projectId, projects.id))
  .all()

// Aggregation
const stats = db.select({
  projectId: keywordRankings.projectId,
  avgPosition: sql<number>`avg(${keywordRankings.position})`,
  count: sql<number>`count(*)`,
}).from(keywordRankings)
  .groupBy(keywordRankings.projectId)
  .all()

// INSERT
db.insert(members).values({ id: 'x', name: 'Alice' }).run()

// UPDATE
db.update(members).set({ name: 'Bob' }).where(eq(members.id, 'x')).run()

// DELETE
db.delete(members).where(eq(members.id, 'x')).run()

// UPSERT (onConflictDoUpdate)
db.insert(members)
  .values({ id: 'x', name: 'Alice' })
  .onConflictDoUpdate({ target: members.id, set: { name: 'Alice' } })
  .run()
```

**Key**: use `.all()` for arrays, `.get()` for single row, `.run()` for mutations.

---

## 5. Seeding

```ts
// src/db/seed.ts  (run directly: npx tsx src/db/seed.ts)
import { db } from './index'
import { members, projects } from './schema'

function seed() {
  // Wrap in transaction for atomicity + performance
  db.transaction((tx) => {
    tx.insert(members).values([
      { id: '1', name: 'Alice', email: 'alice@test.com' },
      { id: '2', name: 'Bob',   email: 'bob@test.com' },
    ]).run()

    tx.insert(projects).values([
      { id: 'p1', name: 'SEO Project Alpha', memberId: '1' },
    ]).run()
  })

  console.log('Seed complete')
}

seed()
```

**package.json script:**
```json
{ "db:seed": "tsx src/db/seed.ts" }
```

Transaction wrapping: 10-100x faster for bulk inserts, guarantees rollback on error.

---

## Summary Table

| Concern | Pattern |
|---|---|
| Schema files | 1 file/table, barrel index.ts |
| Connection | Global singleton + WAL pragma |
| Config | `dialect: 'sqlite'`, schema glob |
| Migrations | `drizzle-kit generate` + `migrate`, or `instrumentation.ts` at startup |
| Queries | Synchronous `.all()/.get()/.run()` |
| Seeding | `db.transaction()` bulk insert via tsx script |

---

## Unresolved Questions

1. Should migrations run automatically at startup (`instrumentation.ts`) or manually via CLI? Depends on deployment model — if serverless/Vercel Edge, CLI is safer.
2. SQLite file location in production: local file path vs volume mount — needs infra decision.
3. `drizzle-kit push` vs `generate+migrate`: push is faster for dev but skips migration history — decide convention.

---

Sources:
- [Drizzle ORM SQLite Docs](https://orm.drizzle.team/docs/get-started-sqlite)
- [drizzle.config.ts Reference](https://orm.drizzle.team/docs/drizzle-config-file)
- [drizzle-kit generate](https://orm.drizzle.team/docs/drizzle-kit-generate)
- [drizzle-kit migrate](https://orm.drizzle.team/docs/drizzle-kit-migrate)
