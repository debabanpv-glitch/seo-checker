import type { Config } from 'drizzle-kit';

export default {
  dialect: 'sqlite',
  schema: './src/lib/db/schema/index.ts',
  out: './src/lib/db/migrations',
  dbCredentials: {
    url: './data/seo-manager.db',
  },
} satisfies Config;
