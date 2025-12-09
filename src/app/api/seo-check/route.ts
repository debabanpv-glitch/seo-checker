import { NextRequest, NextResponse } from 'next/server';

// SEO Check Result Interface
interface SEOCheckResult {
  url: string;
  success: boolean;
  error?: string;
  score: number;
  checks: {
    title: {
      exists: boolean;
      content: string;
      length: number;
      hasKeyword: boolean;
      score: number;
      issues: string[];
    };
    metaDescription: {
      exists: boolean;
      content: string;
      length: number;
      hasKeyword: boolean;
      score: number;
      issues: string[];
    };
    headings: {
      h1Count: number;
      h1Content: string[];
      h2Count: number;
      h3Count: number;
      hasKeywordInH1: boolean;
      score: number;
      issues: string[];
    };
    images: {
      total: number;
      withAlt: number;
      withoutAlt: number;
      altWithKeyword: number;
      score: number;
      issues: string[];
    };
    content: {
      wordCount: number;
      keywordCount: number;
      keywordDensity: number;
      subKeywordCount: number;
      score: number;
      issues: string[];
    };
    links: {
      internal: number;
      external: number;
      total: number;
      score: number;
      issues: string[];
    };
    technical: {
      hasCanonical: boolean;
      hasViewport: boolean;
      hasCharset: boolean;
      score: number;
      issues: string[];
    };
  };
}

// Helper to extract text content
function extractText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper to count keyword occurrences (case-insensitive, whole word)
function countKeyword(text: string, keyword: string): number {
  if (!keyword || !text) return 0;
  const regex = new RegExp(keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

// Helper to check if text contains keyword
function hasKeyword(text: string, keyword: string): boolean {
  if (!keyword || !text) return false;
  return text.toLowerCase().includes(keyword.toLowerCase());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, keyword, subKeyword } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch the page
    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEOChecker/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      html = await response.text();
    } catch (fetchError) {
      return NextResponse.json({
        url,
        success: false,
        error: `Không thể truy cập URL: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        score: 0,
        checks: null,
      });
    }

    const result: SEOCheckResult = {
      url,
      success: true,
      score: 0,
      checks: {
        title: { exists: false, content: '', length: 0, hasKeyword: false, score: 0, issues: [] },
        metaDescription: { exists: false, content: '', length: 0, hasKeyword: false, score: 0, issues: [] },
        headings: { h1Count: 0, h1Content: [], h2Count: 0, h3Count: 0, hasKeywordInH1: false, score: 0, issues: [] },
        images: { total: 0, withAlt: 0, withoutAlt: 0, altWithKeyword: 0, score: 0, issues: [] },
        content: { wordCount: 0, keywordCount: 0, keywordDensity: 0, subKeywordCount: 0, score: 0, issues: [] },
        links: { internal: 0, external: 0, total: 0, score: 0, issues: [] },
        technical: { hasCanonical: false, hasViewport: false, hasCharset: false, score: 0, issues: [] },
      },
    };

    // 1. Check Title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      result.checks.title.exists = true;
      result.checks.title.content = titleMatch[1].trim();
      result.checks.title.length = titleMatch[1].trim().length;
      result.checks.title.hasKeyword = hasKeyword(titleMatch[1], keyword);

      // Score title (max 15)
      let titleScore = 0;
      if (result.checks.title.exists) titleScore += 5;
      if (result.checks.title.length >= 30 && result.checks.title.length <= 60) {
        titleScore += 5;
      } else if (result.checks.title.length > 0) {
        titleScore += 2;
        if (result.checks.title.length < 30) {
          result.checks.title.issues.push('Title quá ngắn (< 30 ký tự)');
        } else {
          result.checks.title.issues.push('Title quá dài (> 60 ký tự)');
        }
      }
      if (result.checks.title.hasKeyword) titleScore += 5;
      else if (keyword) result.checks.title.issues.push('Title không chứa keyword chính');
      result.checks.title.score = titleScore;
    } else {
      result.checks.title.issues.push('Không tìm thấy thẻ title');
    }

    // 2. Check Meta Description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    if (metaDescMatch) {
      result.checks.metaDescription.exists = true;
      result.checks.metaDescription.content = metaDescMatch[1].trim();
      result.checks.metaDescription.length = metaDescMatch[1].trim().length;
      result.checks.metaDescription.hasKeyword = hasKeyword(metaDescMatch[1], keyword);

      // Score meta description (max 15)
      let metaScore = 0;
      if (result.checks.metaDescription.exists) metaScore += 5;
      if (result.checks.metaDescription.length >= 120 && result.checks.metaDescription.length <= 160) {
        metaScore += 5;
      } else if (result.checks.metaDescription.length > 0) {
        metaScore += 2;
        if (result.checks.metaDescription.length < 120) {
          result.checks.metaDescription.issues.push('Meta description quá ngắn (< 120 ký tự)');
        } else {
          result.checks.metaDescription.issues.push('Meta description quá dài (> 160 ký tự)');
        }
      }
      if (result.checks.metaDescription.hasKeyword) metaScore += 5;
      else if (keyword) result.checks.metaDescription.issues.push('Meta description không chứa keyword');
      result.checks.metaDescription.score = metaScore;
    } else {
      result.checks.metaDescription.issues.push('Không tìm thấy meta description');
    }

    // 3. Check Headings
    const h1Matches = html.match(/<h1[^>]*>([^<]*)<\/h1>/gi) || [];
    const h2Matches = html.match(/<h2[^>]*>/gi) || [];
    const h3Matches = html.match(/<h3[^>]*>/gi) || [];

    result.checks.headings.h1Count = h1Matches.length;
    result.checks.headings.h1Content = h1Matches.map(h => h.replace(/<[^>]+>/g, '').trim());
    result.checks.headings.h2Count = h2Matches.length;
    result.checks.headings.h3Count = h3Matches.length;
    result.checks.headings.hasKeywordInH1 = result.checks.headings.h1Content.some(h => hasKeyword(h, keyword));

    // Score headings (max 15)
    let headingScore = 0;
    if (result.checks.headings.h1Count === 1) {
      headingScore += 5;
    } else if (result.checks.headings.h1Count === 0) {
      result.checks.headings.issues.push('Không có thẻ H1');
    } else {
      headingScore += 2;
      result.checks.headings.issues.push(`Có ${result.checks.headings.h1Count} thẻ H1 (nên chỉ có 1)`);
    }
    if (result.checks.headings.h2Count >= 2) headingScore += 5;
    else if (result.checks.headings.h2Count > 0) {
      headingScore += 2;
      result.checks.headings.issues.push('Nên có ít nhất 2 thẻ H2');
    } else {
      result.checks.headings.issues.push('Không có thẻ H2');
    }
    if (result.checks.headings.hasKeywordInH1) headingScore += 5;
    else if (keyword) result.checks.headings.issues.push('H1 không chứa keyword');
    result.checks.headings.score = headingScore;

    // 4. Check Images
    const imgMatches = html.match(/<img[^>]*>/gi) || [];
    result.checks.images.total = imgMatches.length;

    imgMatches.forEach(img => {
      const altMatch = img.match(/alt=["']([^"']*)["']/i);
      if (altMatch && altMatch[1].trim()) {
        result.checks.images.withAlt++;
        if (hasKeyword(altMatch[1], keyword)) {
          result.checks.images.altWithKeyword++;
        }
      } else {
        result.checks.images.withoutAlt++;
      }
    });

    // Score images (max 10)
    let imageScore = 0;
    if (result.checks.images.total > 0) {
      const altRatio = result.checks.images.withAlt / result.checks.images.total;
      if (altRatio >= 0.9) imageScore += 5;
      else if (altRatio >= 0.5) {
        imageScore += 3;
        result.checks.images.issues.push(`${result.checks.images.withoutAlt} ảnh thiếu alt text`);
      } else {
        imageScore += 1;
        result.checks.images.issues.push(`${result.checks.images.withoutAlt} ảnh thiếu alt text`);
      }
      if (result.checks.images.altWithKeyword > 0) imageScore += 5;
      else if (keyword) result.checks.images.issues.push('Không có alt chứa keyword');
    } else {
      imageScore += 5; // No images is okay
      result.checks.images.issues.push('Không có hình ảnh (nên thêm ảnh minh họa)');
    }
    result.checks.images.score = imageScore;

    // 5. Check Content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyText = bodyMatch ? extractText(bodyMatch[1]) : extractText(html);
    const words = bodyText.split(/\s+/).filter(w => w.length > 0);

    result.checks.content.wordCount = words.length;
    result.checks.content.keywordCount = countKeyword(bodyText, keyword);
    result.checks.content.keywordDensity = words.length > 0
      ? Math.round((result.checks.content.keywordCount / words.length) * 1000) / 10
      : 0;
    result.checks.content.subKeywordCount = countKeyword(bodyText, subKeyword);

    // Score content (max 20)
    let contentScore = 0;
    if (result.checks.content.wordCount >= 1500) {
      contentScore += 10;
    } else if (result.checks.content.wordCount >= 800) {
      contentScore += 7;
    } else if (result.checks.content.wordCount >= 300) {
      contentScore += 4;
      result.checks.content.issues.push('Nội dung ngắn (< 800 từ)');
    } else {
      contentScore += 1;
      result.checks.content.issues.push('Nội dung quá ngắn (< 300 từ)');
    }

    if (result.checks.content.keywordDensity >= 0.5 && result.checks.content.keywordDensity <= 2.5) {
      contentScore += 5;
    } else if (result.checks.content.keywordDensity > 0) {
      contentScore += 2;
      if (result.checks.content.keywordDensity < 0.5) {
        result.checks.content.issues.push('Mật độ keyword thấp (< 0.5%)');
      } else {
        result.checks.content.issues.push('Mật độ keyword cao (> 2.5%) - có thể spam');
      }
    } else if (keyword) {
      result.checks.content.issues.push('Không tìm thấy keyword trong nội dung');
    }

    if (result.checks.content.subKeywordCount > 0) {
      contentScore += 5;
    } else if (subKeyword) {
      result.checks.content.issues.push('Không tìm thấy keyword phụ trong nội dung');
    } else {
      contentScore += 5; // No sub keyword provided
    }
    result.checks.content.score = contentScore;

    // 6. Check Links
    const linkMatches = html.match(/<a[^>]*href=["']([^"']*)["'][^>]*>/gi) || [];
    const urlObj = new URL(url);

    linkMatches.forEach(link => {
      const hrefMatch = link.match(/href=["']([^"']*)["']/i);
      if (hrefMatch) {
        const href = hrefMatch[1];
        if (href.startsWith('http')) {
          try {
            const linkUrl = new URL(href);
            if (linkUrl.hostname === urlObj.hostname) {
              result.checks.links.internal++;
            } else {
              result.checks.links.external++;
            }
          } catch {
            result.checks.links.internal++;
          }
        } else if (href.startsWith('/') || href.startsWith('#')) {
          result.checks.links.internal++;
        }
      }
    });
    result.checks.links.total = result.checks.links.internal + result.checks.links.external;

    // Score links (max 10)
    let linkScore = 0;
    if (result.checks.links.internal >= 3) linkScore += 5;
    else if (result.checks.links.internal > 0) {
      linkScore += 2;
      result.checks.links.issues.push('Nên có ít nhất 3 internal links');
    } else {
      result.checks.links.issues.push('Không có internal links');
    }
    if (result.checks.links.external >= 1 && result.checks.links.external <= 5) {
      linkScore += 5;
    } else if (result.checks.links.external > 5) {
      linkScore += 3;
      result.checks.links.issues.push('Quá nhiều external links (> 5)');
    } else {
      linkScore += 2;
      result.checks.links.issues.push('Nên có 1-5 external links (nguồn tham khảo)');
    }
    result.checks.links.score = linkScore;

    // 7. Check Technical
    result.checks.technical.hasCanonical = /<link[^>]*rel=["']canonical["']/i.test(html);
    result.checks.technical.hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);
    result.checks.technical.hasCharset = /<meta[^>]*charset/i.test(html);

    // Score technical (max 15)
    let techScore = 0;
    if (result.checks.technical.hasCanonical) techScore += 5;
    else result.checks.technical.issues.push('Thiếu canonical tag');
    if (result.checks.technical.hasViewport) techScore += 5;
    else result.checks.technical.issues.push('Thiếu viewport meta (mobile)');
    if (result.checks.technical.hasCharset) techScore += 5;
    else result.checks.technical.issues.push('Thiếu charset declaration');
    result.checks.technical.score = techScore;

    // Calculate total score (max 100)
    result.score = result.checks.title.score +
                   result.checks.metaDescription.score +
                   result.checks.headings.score +
                   result.checks.images.score +
                   result.checks.content.score +
                   result.checks.links.score +
                   result.checks.technical.score;

    return NextResponse.json(result);
  } catch (error) {
    console.error('SEO Check error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
