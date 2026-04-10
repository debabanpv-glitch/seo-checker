// ---------------------------------------------------------------------------
// WordPress Alt Text Batch Fixer Service
// Scans WP media library + post content for images missing alt text,
// generates alt text from filename/title/post context, batch updates via API
// ---------------------------------------------------------------------------

import { WordPressAPI, WPMedia, WPPost } from './wordpress-rest-api-v2-client.service';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AltTextCandidate {
  type: 'media' | 'inline'; // media = WP media library, inline = <img> in post HTML
  mediaId?: number;
  postId?: number;
  postTitle?: string;
  imageUrl: string;
  currentAlt: string;
  suggestedAlt: string;
  source: string; // how alt was generated: 'filename' | 'title' | 'post_context' | 'caption'
}

export interface ScanResult {
  totalMedia: number;
  missingAltMedia: number;
  totalPosts: number;
  postsWithMissingAlt: number;
  inlineImgsMissingAlt: number;
  candidates: AltTextCandidate[];
}

export interface BatchFixResult {
  total: number;
  fixed: number;
  failed: number;
  skipped: number;
  errors: { mediaId?: number; postId?: number; error: string }[];
}

// ── Alt Text Generation ────────────────────────────────────────────────────

/** Generate alt text from image filename — strip extensions, hyphens, numbers */
function altFromFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() ?? '';
    // Remove extension, size suffixes (e.g., -300x200), and clean up
    const cleaned = filename
      .replace(/\.[^.]+$/, '')           // remove extension
      .replace(/-\d+x\d+$/, '')          // remove WP size suffix
      .replace(/[-_]+/g, ' ')            // hyphens/underscores → spaces
      .replace(/\b\d{5,}\b/g, '')        // remove long number sequences
      .trim();
    if (cleaned.length < 3) return '';
    // Capitalize first letter
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  } catch {
    return '';
  }
}

/** Generate alt text from WP media title */
function altFromTitle(title: string): string {
  if (!title || title.length < 3) return '';
  // WP titles are usually cleaned-up filenames — capitalize properly
  const cleaned = title.replace(/[-_]+/g, ' ').trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** Generate best alt text for a media item */
function generateMediaAlt(media: WPMedia): { alt: string; source: string } {
  // Priority: caption > title > filename
  const caption = media.caption?.rendered?.replace(/<[^>]*>/g, '').trim() ?? '';
  if (caption.length > 5) return { alt: caption, source: 'caption' };

  const title = media.title?.rendered?.replace(/<[^>]*>/g, '').trim() ?? '';
  const titleAlt = altFromTitle(title);
  if (titleAlt.length > 5) return { alt: titleAlt, source: 'title' };

  const filenameAlt = altFromFilename(media.source_url);
  if (filenameAlt.length > 3) return { alt: filenameAlt, source: 'filename' };

  return { alt: title || 'Hình ảnh', source: 'title' };
}

/** Generate alt for inline image using post context + filename */
function generateInlineAlt(imgSrc: string, postTitle: string): { alt: string; source: string } {
  const filenameAlt = altFromFilename(imgSrc);
  if (filenameAlt.length > 5) {
    return { alt: filenameAlt, source: 'filename' };
  }
  // Fallback: use post title as context
  if (postTitle) {
    return { alt: `Hình ảnh - ${postTitle}`, source: 'post_context' };
  }
  return { alt: 'Hình ảnh minh họa', source: 'post_context' };
}

// ── Extract inline images from HTML ────────────────────────────────────────

/** Find <img> tags without alt text in HTML string */
function findImgsMissingAlt(html: string): string[] {
  const imgRegex = /<img\s[^>]*?>/gi;
  const results: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];
    // Check if alt is missing or empty
    const altMatch = tag.match(/\balt\s*=\s*["']([^"']*)["']/i);
    if (!altMatch || altMatch[1].trim() === '') {
      // Extract src
      const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      if (srcMatch) results.push(srcMatch[1]);
    }
  }
  return results;
}

/** Add/fix alt attributes in HTML for given images */
export function fixInlineAlts(html: string, fixes: Map<string, string>): string {
  let result = html;
  for (const [src, alt] of fixes) {
    const escapedSrc = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedAlt = alt.replace(/"/g, '&quot;');

    // Case 1: img has empty alt="" → fill it
    const emptyAltRegex = new RegExp(
      `(<img\\s[^>]*?src=["']${escapedSrc}["'][^>]*?)\\balt=["']\\s*["']`,
      'gi'
    );
    result = result.replace(emptyAltRegex, `$1alt="${escapedAlt}"`);

    // Case 2: img has no alt attribute → add it after src
    const noAltRegex = new RegExp(
      `(<img\\s[^>]*?src=["']${escapedSrc}["'])(?![^>]*\\balt=)`,
      'gi'
    );
    result = result.replace(noAltRegex, `$1 alt="${escapedAlt}"`);
  }
  return result;
}

// ── Scan ───────────────────────────────────────────────────────────────────

/** Scan WP site for all images missing alt text */
export async function scanMissingAltTexts(wp: WordPressAPI): Promise<ScanResult> {
  const candidates: AltTextCandidate[] = [];

  // 1. Scan media library
  const allMedia = await wp.getAllMedia();
  const missingAltMedia = allMedia.filter(m =>
    !m.alt_text || m.alt_text.trim() === ''
  );

  for (const media of missingAltMedia) {
    const { alt, source } = generateMediaAlt(media);
    candidates.push({
      type: 'media',
      mediaId: media.id,
      postId: media.post ?? undefined,
      imageUrl: media.source_url,
      currentAlt: '',
      suggestedAlt: alt,
      source,
    });
  }

  // 2. Scan post content for inline images
  let totalPosts = 0;
  let postsWithMissingAlt = 0;
  let inlineImgsMissingAlt = 0;

  // Fetch posts in pages (published only)
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    let posts: WPPost[];
    try {
      posts = await wp.getPosts({ per_page: 50, page, status: 'publish' });
    } catch {
      break; // no more pages (WP returns 400 for page beyond total)
    }
    if (posts.length === 0) break;
    totalPosts += posts.length;

    for (const post of posts) {
      const content = post.content?.rendered ?? '';
      const missingImgs = findImgsMissingAlt(content);
      if (missingImgs.length > 0) {
        postsWithMissingAlt++;
        inlineImgsMissingAlt += missingImgs.length;
        const postTitle = post.title?.rendered?.replace(/<[^>]*>/g, '') ?? '';
        for (const imgSrc of missingImgs) {
          const { alt, source } = generateInlineAlt(imgSrc, postTitle);
          candidates.push({
            type: 'inline',
            postId: post.id,
            postTitle,
            imageUrl: imgSrc,
            currentAlt: '',
            suggestedAlt: alt,
            source,
          });
        }
      }
    }

    page++;
    if (posts.length < 50) hasMore = false;
  }

  return {
    totalMedia: allMedia.length,
    missingAltMedia: missingAltMedia.length,
    totalPosts,
    postsWithMissingAlt,
    inlineImgsMissingAlt,
    candidates,
  };
}

// ── Batch Fix ──────────────────────────────────────────────────────────────

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 300;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Apply alt text fixes — media library items + inline in post content */
export async function batchFixAltTexts(
  wp: WordPressAPI,
  candidates: AltTextCandidate[],
): Promise<BatchFixResult> {
  const result: BatchFixResult = { total: candidates.length, fixed: 0, failed: 0, skipped: 0, errors: [] };

  // Split into media updates and inline updates
  const mediaUpdates = candidates.filter(c => c.type === 'media' && c.mediaId);
  const inlineUpdates = candidates.filter(c => c.type === 'inline' && c.postId);

  // 1. Fix media library alt texts
  for (let i = 0; i < mediaUpdates.length; i += BATCH_SIZE) {
    const batch = mediaUpdates.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(c => wp.updateMediaAltText(c.mediaId!, c.suggestedAlt))
    );

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === 'fulfilled') {
        result.fixed++;
      } else {
        result.failed++;
        result.errors.push({
          mediaId: batch[j].mediaId,
          error: (results[j] as PromiseRejectedResult).reason?.message ?? 'Unknown error',
        });
      }
    }

    if (i + BATCH_SIZE < mediaUpdates.length) await delay(BATCH_DELAY_MS);
  }

  // 2. Fix inline images in post content — group by postId
  const postFixMap = new Map<number, Map<string, string>>();
  for (const c of inlineUpdates) {
    if (!c.postId) continue;
    if (!postFixMap.has(c.postId)) postFixMap.set(c.postId, new Map());
    postFixMap.get(c.postId)!.set(c.imageUrl, c.suggestedAlt);
  }

  const postIds = Array.from(postFixMap.keys());
  for (let i = 0; i < postIds.length; i += BATCH_SIZE) {
    const batch = postIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async postId => {
        // Fetch current post content (raw)
        const post = await wp.getPost(postId);
        const rawContent = post.content?.rendered ?? '';
        const fixes = postFixMap.get(postId)!;
        const fixedContent = fixInlineAlts(rawContent, fixes);

        if (fixedContent !== rawContent) {
          await wp.updatePost(postId, { content: fixedContent });
          return fixes.size;
        }
        return 0;
      })
    );

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === 'fulfilled') {
        const count = (results[j] as PromiseFulfilledResult<number>).value;
        result.fixed += count;
        if (count === 0) result.skipped += postFixMap.get(batch[j])!.size;
      } else {
        const fixes = postFixMap.get(batch[j])!;
        result.failed += fixes.size;
        result.errors.push({
          postId: batch[j],
          error: (results[j] as PromiseRejectedResult).reason?.message ?? 'Unknown error',
        });
      }
    }

    if (i + BATCH_SIZE < postIds.length) await delay(BATCH_DELAY_MS);
  }

  return result;
}
