# Code Standards — SEO Manager

**Last Updated:** 2026-02-21

---

## 1. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js App Router | 14.x |
| Language | TypeScript (strict) | 5.x |
| Database | Supabase (PostgreSQL) | latest |
| Styling | Tailwind CSS + CSS variables | 3.4 |
| Charts | Recharts | latest |
| Icons | Lucide React | latest |
| Linting | ESLint (next/core-web-vitals + next/typescript) | latest |

---

## 2. TypeScript Rules

- `strict: true` in tsconfig (implicit in Next.js 14 default)
- All function parameters and return types must be explicitly typed for shared utilities
- Avoid `any` — use `unknown` + type guards
- Use `as const` for status enum arrays (see `src/types/index.ts`)

```ts
// Good
export const CONTENT_STATUSES = ['1. Doing', '4. Publish'] as const;
export type ContentStatus = typeof CONTENT_STATUSES[number];

// Bad
const STATUSES = ['1. Doing', '4. Publish'];
```

---

## 3. File & Directory Conventions

### Naming
| Type | Convention | Example |
|---|---|---|
| Page files | `page.tsx` | `app/(dashboard)/salary/page.tsx` |
| Component files | PascalCase | `LoadingSpinner.tsx` |
| Lib/util files | camelCase | `task-helpers.ts` |
| SQL files | snake_case | `create_auth_tables.sql` |
| Type files | camelCase | `auth.ts`, `index.ts` |

### Path Alias
```ts
// tsconfig.json paths
"@/*" → "./src/*"

// Usage
import { supabase } from '@/lib/supabase';
import type { Task } from '@/types';
```

---

## 4. Component Patterns

### All Dashboard Pages = Client Components
Every page in `app/(dashboard)/` starts with `'use client'` because they manage local state and do client-side fetching.

```ts
'use client';
import { useState, useEffect } from 'react';

export default function SalaryPage() {
  const [data, setData] = useState<SalaryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/salary').then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;
  // ...
}
```

### No SSR Data Fetching
Do not use `async` page components or `getServerSideProps`. All data fetches happen client-side via `fetch()` in `useEffect`.

### Shared UI Primitives
| Component | Props | Usage |
|---|---|---|
| `LoadingSpinner` | `size?`, `className?` | Inline spinner |
| `PageLoading` | — | Full-page loading state |
| `EmptyState` | `message` | Empty list placeholder |
| `ProgressBar` | `value`, `max`, `className?` | Auto-colors at 50/80/100% |
| `StatsCard` | `title`, `value`, `icon?`, `trend?` | KPI metric card |
| `StatusBadge` | `status` | Colored status label |

---

## 5. API Route Patterns

### Standard Route Shape
```ts
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  // 1. Auth check
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Role check (if needed)
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // 3. Query
  const { data, error } = await supabase.from('table').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 4. Return
  return NextResponse.json(data);
}
```

### Member Data Scoping
When role is `member`, filter data by the user's `project_ids` or `username`:
```ts
let query = supabase.from('tasks').select('*');
if (user.role === 'member') {
  query = query.in('project_id', user.project_ids);
}
```

### Error Responses
| Status | Meaning |
|---|---|
| 401 | No session / invalid token |
| 403 | Valid session but insufficient role |
| 400 | Invalid request body / params |
| 500 | DB error or unexpected server error |

Always return `{ error: string }` for errors — never expose raw error stack to client.

---

## 6. Auth Utilities (`src/lib/auth.ts`)

```ts
// Use in every API route
import { getSessionUser } from '@/lib/auth';
const user = await getSessionUser(request); // reads x-user-* headers set by middleware
// returns AuthUser | null
```

`getSessionUser()` reads headers injected by middleware — it performs a second DB lookup. This is a known issue; do not remove the DB call until middleware header trust is validated.

---

## 7. Supabase Client (`src/lib/supabase.ts`)

Single shared singleton — import from `@/lib/supabase`:
```ts
import { supabase } from '@/lib/supabase';
```

Do **not** create new `createClient()` instances in route files. Exception: middleware creates its own client (required because middleware runs in Edge context).

---

## 8. Utility Functions (`src/lib/utils.ts`)

| Function | Signature | Purpose |
|---|---|---|
| `formatCurrency` | `(amount: number) => string` | VND formatting (vi-VN locale) |
| `formatDate` | `(dateString: string \| null) => string` | DD/MM/YYYY display |
| `formatShortDate` | `(dateString: string \| null) => string` | DD/MM display |
| `isOverdue` | `(deadline: string \| null) => boolean` | Past midnight check |
| `isDueSoon` | `(deadline: string \| null) => boolean` | Within 3 days |
| `calculateSalary` | `(publishedCount: number) => SalaryResult` | Business rule calc |
| `getCurrentMonthYear` | `() => { month, year }` | Current month defaults |
| `getMonthOptions` | `() => MonthOption[]` | Last 12 months dropdown |
| `getStatusColor` | `(status: string) => string` | Tailwind class for status |
| `parseSheetDate` | `(dateStr: string) => string \| null` | Multi-format date parser |
| `cn` | `(...classes) => string` | Class name joiner |

---

## 9. Task Status Constants

Defined in `src/types/index.ts`. Always import from there — do not hardcode status strings.

```ts
import { OUTLINE_STATUSES, CONTENT_STATUSES } from '@/types';
```

**Outline statuses:**
- `'1. Doing Outline'`, `'1.1 Fixing Outline'`, `'1.2 Đã fix'`, `'2. QC Outline'`, `'3. Done QC Outline'`

**Content statuses:**
- `'1. Doing'`, `'1.1 Fixing'`, `'1.2 Đã fix'`, `'2. QC Content'`, `'3. Done QC'`, `'4. Publish'`

---

## 10. Styling Conventions

### CSS Variables (globals.css)
```css
--background: #1a1a1a         /* dark base */
--surface: #252525            /* card surface */
--accent: #d4a853             /* earthy gold — primary accent */
--success: #4caf50
--warning: #ff9800
--error: #f44336
```

### Tailwind Usage
- Use CSS variable tokens via `bg-accent`, `text-accent`, `border-accent/20` etc.
- Avoid arbitrary values where a token exists
- iOS-inspired: rounded-xl, subtle shadows, thin borders

### Recharts Standard Config
All charts use consistent dark theme:
```tsx
<CartesianGrid strokeDasharray="3 3" stroke="#333" />
<XAxis stroke="#666" tick={{ fill: '#888', fontSize: 11 }} />
<YAxis stroke="#666" tick={{ fill: '#888', fontSize: 11 }} />
<Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
```

---

## 11. Linting

Run before committing:
```bash
npm run lint
```

Config: `eslint.config.mjs` using `next/core-web-vitals` + `next/typescript`.

Common suppressions (use sparingly):
```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
```

---

## 12. Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>  # used in middleware + admin operations
```

`NEXT_PUBLIC_` prefix exposes value to browser bundle. Anon key exposure is acceptable only if Supabase RLS is properly configured.

**Missing:** `.env.example` does not include these keys — known tech debt.

---

## 13. What Not to Do

- Do not add Redux, Zustand, or global state management — use local `useState`
- Do not use SWR or React Query — plain `fetch` in `useEffect`
- Do not create new Supabase client instances in route files
- Do not use `getServerSideProps` or `async` page components
- Do not hardcode status strings — import from `@/types`
- Do not skip the auth check at the top of API routes
- Do not return raw error objects/stacks to clients
