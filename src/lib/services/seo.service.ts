import { db } from '@/lib/db';
import { seoResults } from '@/lib/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// SEO Results (GET /api/seo-results)
// ---------------------------------------------------------------------------

export function getSeoResults(filters: {
  url?: string;
  urls?: string[];
  minimal?: boolean;
}) {
  // Guard empty array
  if (filters.urls && filters.urls.length === 0) return [];

  if (filters.urls && filters.urls.length > 0) {
    if (filters.minimal) {
      return db.select({
        id: seoResults.id, url: seoResults.url,
        score: seoResults.score, max_score: seoResults.max_score,
        content_score: seoResults.content_score, content_max: seoResults.content_max,
        images_score: seoResults.images_score, images_max: seoResults.images_max,
        technical_score: seoResults.technical_score, technical_max: seoResults.technical_max,
        checked_at: seoResults.checked_at,
      }).from(seoResults)
        .where(inArray(seoResults.url, filters.urls))
        .orderBy(desc(seoResults.checked_at))
        .all();
    }
    return db.select().from(seoResults)
      .where(inArray(seoResults.url, filters.urls))
      .orderBy(desc(seoResults.checked_at))
      .all();
  }

  if (filters.url) {
    return db.select().from(seoResults)
      .where(eq(seoResults.url, filters.url))
      .orderBy(desc(seoResults.checked_at))
      .all();
  }

  if (filters.minimal) {
    return db.select({
      id: seoResults.id, url: seoResults.url,
      score: seoResults.score, max_score: seoResults.max_score,
      content_score: seoResults.content_score, content_max: seoResults.content_max,
      images_score: seoResults.images_score, images_max: seoResults.images_max,
      technical_score: seoResults.technical_score, technical_max: seoResults.technical_max,
      checked_at: seoResults.checked_at,
    }).from(seoResults)
      .orderBy(desc(seoResults.checked_at))
      .all();
  }

  return db.select().from(seoResults).orderBy(desc(seoResults.checked_at)).all();
}

// ---------------------------------------------------------------------------
// Upsert SEO result (POST /api/seo-results)
// ---------------------------------------------------------------------------

export function upsertSeoResult(url: string, result: {
  score?: number;
  maxScore?: number;
  categories?: {
    content?: { score: number; maxScore: number };
    images?: { score: number; maxScore: number };
    technical?: { score: number; maxScore: number };
  };
  details?: unknown[];
  links?: { internal: unknown[]; external: unknown[] };
  keywords?: { primary: string; sub: string[] };
}) {
  const data = {
    url,
    score: result.score ?? 0,
    max_score: result.maxScore ?? 100,
    content_score: result.categories?.content?.score ?? 0,
    content_max: result.categories?.content?.maxScore ?? 0,
    images_score: result.categories?.images?.score ?? 0,
    images_max: result.categories?.images?.maxScore ?? 0,
    technical_score: result.categories?.technical?.score ?? 0,
    technical_max: result.categories?.technical?.maxScore ?? 0,
    details: result.details ?? [],
    links: result.links ?? { internal: [], external: [] },
    keywords: result.keywords ?? { primary: '', sub: [] },
    checked_at: new Date().toISOString(),
  };

  return db.insert(seoResults)
    .values(data)
    .onConflictDoUpdate({ target: seoResults.url, set: data })
    .returning().get();
}

// ---------------------------------------------------------------------------
// Batch fetch SEO results (POST /api/seo-results/batch)
// ---------------------------------------------------------------------------

export function getBatchSeoResults(urls: string[], minimal: boolean = false) {
  if (!urls.length) return [];

  if (minimal) {
    return db.select({
      id: seoResults.id, url: seoResults.url,
      score: seoResults.score, max_score: seoResults.max_score,
      content_score: seoResults.content_score, content_max: seoResults.content_max,
      images_score: seoResults.images_score, images_max: seoResults.images_max,
      technical_score: seoResults.technical_score, technical_max: seoResults.technical_max,
      checked_at: seoResults.checked_at,
    }).from(seoResults)
      .where(inArray(seoResults.url, urls))
      .all();
  }

  return db.select().from(seoResults)
    .where(inArray(seoResults.url, urls))
    .all();
}
