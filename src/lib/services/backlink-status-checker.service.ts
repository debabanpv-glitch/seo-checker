import { db } from '@/lib/db';
import { backlinks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// ── Types ────────────────────────────────────────────────────────────────

export interface BacklinkCheckResult {
  id: string;
  source_url: string;
  status: 'alive' | 'dead' | 'error';
  http_status: number | null;
  anchor_found: boolean;
  link_found: boolean;
  error?: string;
}

export interface BatchCheckProgress {
  total: number;
  checked: number;
  alive: number;
  dead: number;
  errors: number;
}

// ── Single backlink check ────────────────────────────────────────────────

/** Fetch source_url, check if target_url link + keyword anchor exist in HTML */
export async function checkSingleBacklink(backlink: {
  id: string;
  source_url: string;
  target_url: string;
  keyword: string;
}): Promise<BacklinkCheckResult> {
  const result: BacklinkCheckResult = {
    id: backlink.id,
    source_url: backlink.source_url,
    status: 'error',
    http_status: null,
    anchor_found: false,
    link_found: false,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(backlink.source_url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOManager/1.0; +https://seo-manager.local)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    result.http_status = res.status;

    if (res.status >= 400) {
      result.status = 'dead';
      // Save to DB
      saveCheckResult(result);
      return result;
    }

    const html = await res.text();
    const htmlLower = html.toLowerCase();

    // Check if target_url link exists in HTML (href="...")
    const targetDomain = extractDomain(backlink.target_url);
    const targetPath = extractPath(backlink.target_url);
    result.link_found = htmlLower.includes(backlink.target_url.toLowerCase()) ||
      (!!targetDomain && !!targetPath && htmlLower.includes(targetDomain.toLowerCase()) && htmlLower.includes(targetPath.toLowerCase()));

    // Check if keyword anchor text exists near a link
    const kwLower = backlink.keyword.toLowerCase();
    result.anchor_found = htmlLower.includes(kwLower);

    // Determine status: alive if link is found (anchor is bonus info)
    result.status = result.link_found ? 'alive' : 'dead';
  } catch (e) {
    result.status = 'error';
    result.error = e instanceof Error ? e.message : String(e);
  }

  saveCheckResult(result);
  return result;
}

// ── Batch check ──────────────────────────────────────────────────────────

/** Check multiple backlinks with concurrency limit and delay to avoid rate limiting */
export async function checkBacklinksBatch(
  projectId?: string,
  concurrency = 3,
  delayMs = 500,
): Promise<BatchCheckProgress> {
  const items = projectId
    ? db.select().from(backlinks).where(eq(backlinks.project_id, projectId)).all()
    : db.select().from(backlinks).all();

  // Deduplicate by source_url — many backlinks share same source page
  const uniqueUrls = new Map<string, typeof items>();
  for (const item of items) {
    if (!uniqueUrls.has(item.source_url)) uniqueUrls.set(item.source_url, []);
    uniqueUrls.get(item.source_url)!.push(item);
  }

  const progress: BatchCheckProgress = {
    total: uniqueUrls.size,
    checked: 0,
    alive: 0,
    dead: 0,
    errors: 0,
  };

  const urlEntries = Array.from(uniqueUrls.entries());

  // Process in batches of concurrency
  for (let i = 0; i < urlEntries.length; i += concurrency) {
    const batch = urlEntries.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(async ([, group]) => {
        // Check the first backlink in group, apply result to all with same source_url
        const first = group[0];
        const result = await checkSingleBacklinkWithoutSave({
          source_url: first.source_url,
          target_url: first.target_url,
          keyword: first.keyword,
        });

        // Save result for all backlinks with this source_url
        const now = new Date().toISOString();
        for (const item of group) {
          // Re-check anchor for each keyword (different keywords on same page)
          const kwFound = result.html
            ? result.html.toLowerCase().includes(item.keyword.toLowerCase())
            : false;

          db.update(backlinks).set({
            status: result.link_found ? 'alive' : (result.http_status && result.http_status >= 400 ? 'dead' : 'dead'),
            http_status: result.http_status,
            link_found: result.link_found,
            anchor_found: kwFound,
            last_checked_at: now,
            check_error: result.error ?? null,
          }).where(eq(backlinks.id, item.id)).run();
        }

        return result;
      }),
    );

    for (const r of results) {
      progress.checked++;
      if (r.status === 'fulfilled') {
        if (r.value.link_found) progress.alive++;
        else progress.dead++;
      } else {
        progress.errors++;
      }
    }

    // Delay between batches to be polite
    if (i + concurrency < urlEntries.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return progress;
}

// ── Internal helpers ─────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return ''; }
}

function extractPath(url: string): string {
  try { return new URL(url).pathname; } catch { return ''; }
}

function saveCheckResult(result: BacklinkCheckResult) {
  const now = new Date().toISOString();
  db.update(backlinks).set({
    status: result.status,
    http_status: result.http_status,
    anchor_found: result.anchor_found,
    link_found: result.link_found,
    last_checked_at: now,
    check_error: result.error ?? null,
  }).where(eq(backlinks.id, result.id)).run();
}

/** Check without saving — returns raw HTML for batch re-use */
async function checkSingleBacklinkWithoutSave(backlink: {
  source_url: string;
  target_url: string;
  keyword: string;
}): Promise<{ http_status: number | null; link_found: boolean; anchor_found: boolean; html: string | null; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(backlink.source_url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOManager/1.0; +https://seo-manager.local)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (res.status >= 400) {
      return { http_status: res.status, link_found: false, anchor_found: false, html: null };
    }

    const html = await res.text();
    const htmlLower = html.toLowerCase();

    const targetDomain = extractDomain(backlink.target_url);
    const targetPath = extractPath(backlink.target_url);
    const link_found = htmlLower.includes(backlink.target_url.toLowerCase()) ||
      (!!targetDomain && !!targetPath && htmlLower.includes(targetDomain.toLowerCase()) && htmlLower.includes(targetPath.toLowerCase()));

    const anchor_found = htmlLower.includes(backlink.keyword.toLowerCase());

    return { http_status: res.status, link_found, anchor_found, html };
  } catch (e) {
    return {
      http_status: null,
      link_found: false,
      anchor_found: false,
      html: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ── Get check summary stats ──────────────────────────────────────────────

export function getBacklinkCheckSummary(projectId?: string) {
  const items = projectId
    ? db.select().from(backlinks).where(eq(backlinks.project_id, projectId)).all()
    : db.select().from(backlinks).all();

  const total = items.length;
  const alive = items.filter((b) => b.status === 'alive').length;
  const dead = items.filter((b) => b.status === 'dead').length;
  const errors = items.filter((b) => b.status === 'error').length;
  const unchecked = items.filter((b) => b.status === 'unknown').length;
  const anchorMissing = items.filter((b) => b.status === 'alive' && !b.anchor_found).length;

  return { total, alive, dead, errors, unchecked, anchorMissing };
}
