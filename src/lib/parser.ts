import * as cheerio from 'cheerio';
import {
  PageData,
  ImageData,
  LinkData,
  SchemaData,
  ListData,
  ArticleType,
} from '@/types';
import { ARTICLE_TYPE_PATTERNS } from './constants';

export function parseHTML(html: string, url: string): PageData {
  const $ = cheerio.load(html);
  const baseUrl = new URL(url);

  // Get title
  const title = $('title').text().trim();

  // Get meta description
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    '';

  // Get headings
  const h1 = $('h1')
    .map((_, el) => $(el).text().trim())
    .get();
  const h2 = $('h2')
    .map((_, el) => $(el).text().trim())
    .get();
  const h3 = $('h3')
    .map((_, el) => $(el).text().trim())
    .get();
  const h4 = $('h4')
    .map((_, el) => $(el).text().trim())
    .get();
  const h5 = $('h5')
    .map((_, el) => $(el).text().trim())
    .get();
  const h6 = $('h6')
    .map((_, el) => $(el).text().trim())
    .get();

  // Get paragraphs
  const paragraphs = $('article p, .content p, .entry-content p, main p, .post-content p, p')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((p) => p.length > 0);

  // Get main content area, remove unwanted elements
  let $contentArea = $('article, .content, .entry-content, main, .post-content').first();
  if ($contentArea.length === 0) {
    $contentArea = $('body');
  }

  // Clone to avoid modifying original DOM
  const $cleanContent = $contentArea.clone();

  // Remove navigation, sidebar, footer, ads, comments, scripts
  $cleanContent.find([
    'nav', 'header', 'footer', 'aside',
    '.sidebar', '.navigation', '.menu', '.nav',
    '.header', '.footer', '.comments', '.comment',
    '.advertisement', '.ads', '.social-share',
    '.related-posts', '.widget', '.breadcrumb',
    'script', 'style', 'noscript', 'iframe'
  ].join(', ')).remove();

  // Get body text from cleaned content
  const bodyText = $cleanContent
    .text()
    .replace(/\s+/g, ' ')
    .trim();

  // Word count - count words separated by spaces
  const wordCount = bodyText
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  // Get images
  const images: ImageData[] = [];
  $('img').each((_, el) => {
    const $img = $(el);
    const src = $img.attr('src') || $img.attr('data-src') || '';
    const alt = $img.attr('alt') || '';
    const $figure = $img.closest('figure');
    const caption = $figure.find('figcaption').text().trim() || null;
    const hasLazyLoading =
      $img.attr('loading') === 'lazy' ||
      !!$img.attr('data-src') ||
      !!$img.attr('data-lazy');

    if (src) {
      images.push({ src, alt, caption, hasLazyLoading });
    }
  });

  // Get links
  const internalLinks: LinkData[] = [];
  const externalLinks: LinkData[] = [];
  let wordPosition = 0;

  $('a[href]').each((_, el) => {
    const $link = $(el);
    const href = $link.attr('href') || '';
    const text = $link.text().trim();
    const target = $link.attr('target') || null;

    // Calculate word position (approximate)
    const textBefore = $link.prevAll().text() + $link.parent().prevAll().text();
    wordPosition = textBefore.split(/\s+/).length;

    if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
      return;
    }

    const linkData: LinkData = { href, text, target, position: wordPosition };

    try {
      const linkUrl = new URL(href, url);
      if (linkUrl.hostname === baseUrl.hostname) {
        internalLinks.push(linkData);
      } else {
        externalLinks.push(linkData);
      }
    } catch {
      if (href.startsWith('/')) {
        internalLinks.push(linkData);
      }
    }
  });

  // Get canonical
  const canonical = $('link[rel="canonical"]').attr('href') || null;

  // Get Open Graph
  const ogTitle = $('meta[property="og:title"]').attr('content') || null;
  const ogDescription = $('meta[property="og:description"]').attr('content') || null;
  const ogImage = $('meta[property="og:image"]').attr('content') || null;

  // Get Twitter Card
  const twitterCard = $('meta[name="twitter:card"]').attr('content') || null;
  const twitterTitle = $('meta[name="twitter:title"]').attr('content') || null;
  const twitterDescription = $('meta[name="twitter:description"]').attr('content') || null;

  // Get Schema
  const schemas: SchemaData[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html();
      if (content) {
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (item['@type']) {
              schemas.push({ type: item['@type'], data: item });
            }
          });
        } else if (data['@graph']) {
          data['@graph'].forEach((item: Record<string, unknown>) => {
            if (item['@type']) {
              schemas.push({ type: item['@type'] as string, data: item });
            }
          });
        } else if (data['@type']) {
          schemas.push({ type: data['@type'], data });
        }
      }
    } catch {
      // Invalid JSON
    }
  });

  // Get author info
  const author =
    $('[rel="author"]').text().trim() ||
    $('[class*="author"] [class*="name"]').first().text().trim() ||
    $('[class*="author-name"]').first().text().trim() ||
    $('meta[name="author"]').attr('content') ||
    (schemas.find((s) => s.data.author)?.data.author as { name?: string })?.name ||
    null;

  const authorLink =
    $('[rel="author"]').attr('href') ||
    $('[class*="author"] a').first().attr('href') ||
    null;

  // Get dates
  const publishDate =
    $('time[datetime]').first().attr('datetime') ||
    $('meta[property="article:published_time"]').attr('content') ||
    $('[class*="publish"]').first().text().trim() ||
    schemas.find((s) => s.data.datePublished)?.data.datePublished as string ||
    null;

  const modifiedDate =
    $('meta[property="article:modified_time"]').attr('content') ||
    $('[class*="update"], [class*="modified"]').first().text().trim() ||
    schemas.find((s) => s.data.dateModified)?.data.dateModified as string ||
    null;

  // Check lazy loading
  const hasLazyLoading = images.some((img) => img.hasLazyLoading);

  // Get lists
  const lists: ListData[] = [];
  $('ul, ol').each((_, el) => {
    const $list = $(el);
    const type = el.tagName.toLowerCase() as 'ul' | 'ol';
    const items = $list
      .find('> li')
      .map((_, li) => $(li).text().trim())
      .get();
    if (items.length > 0) {
      lists.push({ type, items });
    }
  });

  // Count tables
  const tables = $('table').length;

  // Detect article type
  const articleType = detectArticleType(url, bodyText, h1, h2);

  return {
    url,
    html,
    title,
    metaDescription,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    paragraphs,
    images,
    internalLinks,
    externalLinks,
    bodyText,
    wordCount,
    articleType,
    canonical,
    ogTitle,
    ogDescription,
    ogImage,
    twitterCard,
    twitterTitle,
    twitterDescription,
    schemas,
    author,
    authorLink,
    publishDate,
    modifiedDate,
    hasLazyLoading,
    lists,
    tables,
  };
}

function detectArticleType(
  url: string,
  bodyText: string,
  h1: string[],
  h2: string[]
): ArticleType {
  const urlLower = url.toLowerCase();
  const textLower = bodyText.toLowerCase();
  const headingsLower = [...h1, ...h2].join(' ').toLowerCase();

  for (const [type, patterns] of Object.entries(ARTICLE_TYPE_PATTERNS)) {
    if (type === 'article') continue;

    for (const pattern of patterns) {
      if (
        urlLower.includes(pattern) ||
        headingsLower.includes(pattern) ||
        textLower.slice(0, 500).includes(pattern)
      ) {
        return type as ArticleType;
      }
    }
  }

  return 'article';
}

export function normalizeKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim();
}

export function toSlug(text: string): string {
  return normalizeKeyword(text)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;

  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));

  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  return intersection / union;
}

export function countKeywordOccurrences(text: string, keyword: string): number {
  const normalizedText = text.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase();

  const regex = new RegExp(escapeRegex(normalizedKeyword), 'gi');
  const matches = normalizedText.match(regex);
  return matches ? matches.length : 0;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getFirst100Words(text: string): string {
  return text.split(/\s+/).slice(0, 100).join(' ');
}

export function getLast200Words(text: string): string {
  const words = text.split(/\s+/);
  return words.slice(-200).join(' ');
}

export function getFirstNWords(text: string, n: number): string {
  return text.split(/\s+/).slice(0, n).join(' ');
}
