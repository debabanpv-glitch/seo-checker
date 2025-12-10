import { NextRequest, NextResponse } from 'next/server';

interface CheckDetail {
  id: string;
  category: 'content' | 'images' | 'technical';
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'warning';
  score: number;
  maxScore: number;
  value?: string | number;
  suggestion?: string;
}

interface LinkInfo {
  url: string;
  text: string;
  isDoFollow: boolean;
  isDuplicate?: boolean;
}

// Helper functions
function extractText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countKeyword(text: string, keyword: string): number {
  if (!keyword || !text) return 0;
  const regex = new RegExp(keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function hasKeyword(text: string, keyword: string): boolean {
  if (!keyword || !text) return false;
  return text.toLowerCase().includes(keyword.toLowerCase());
}

function getFirstParagraph(html: string): string {
  // Get content after first heading or beginning
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                       html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                       html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

  const content = articleMatch ? articleMatch[1] : html;
  const pMatch = content.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  return pMatch ? extractText(pMatch[1]) : '';
}

function getLastParagraphs(html: string): string {
  const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  const last3 = paragraphs.slice(-3);
  return last3.map(p => extractText(p)).join(' ');
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function checkHasConclusion(html: string): boolean {
  const conclusionPatterns = [
    /tóm lại/i, /lời kết/i, /kết luận/i, /tổng kết/i,
    /conclusion/i, /summary/i, /in conclusion/i
  ];
  return conclusionPatterns.some(p => p.test(html));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, keyword, subKeywords } = body;
    // Support both single subKeyword (legacy) and subKeywords array
    const subKeywordList: string[] = Array.isArray(subKeywords)
      ? subKeywords
      : (body.subKeyword ? [body.subKeyword] : []);

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch the page
    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(15000),
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
        maxScore: 100,
        categories: {},
        details: [],
      });
    }

    const details: CheckDetail[] = [];

    // Extract common data
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : html;
    const bodyText = extractText(bodyHtml);
    const wordCount = countWords(bodyText);
    const firstPara = getFirstParagraph(bodyHtml);
    const lastParas = getLastParagraphs(bodyHtml);
    const urlObj = new URL(url);

    // ==================== CONTENT CHECKS ====================

    // 1. Meta Title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const titleContent = titleMatch ? titleMatch[1].trim() : '';
    const titleLength = titleContent.length;

    details.push({
      id: 'title-length',
      category: 'content',
      name: 'Độ dài Title',
      description: 'Title 60-70 ký tự',
      status: titleLength >= 60 && titleLength <= 70 ? 'pass' : titleLength >= 50 && titleLength <= 80 ? 'warning' : 'fail',
      score: titleLength >= 60 && titleLength <= 70 ? 3 : titleLength >= 50 && titleLength <= 80 ? 2 : 0,
      maxScore: 3,
      value: `${titleLength} ký tự`,
      suggestion: titleLength < 60 ? 'Title quá ngắn, thêm chi tiết' : titleLength > 70 ? 'Title quá dài, rút gọn lại' : undefined,
    });

    details.push({
      id: 'title-keyword',
      category: 'content',
      name: 'Title chứa keyword',
      description: 'Title phải chứa keyword chính',
      status: hasKeyword(titleContent, keyword) ? 'pass' : 'fail',
      score: hasKeyword(titleContent, keyword) ? 3 : 0,
      maxScore: 3,
      value: titleContent.substring(0, 60) + (titleContent.length > 60 ? '...' : ''),
      suggestion: !hasKeyword(titleContent, keyword) ? `Thêm keyword "${keyword}" vào title` : undefined,
    });

    // 2. Meta Description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : '';
    const metaDescLength = metaDesc.length;

    details.push({
      id: 'meta-desc-length',
      category: 'content',
      name: 'Độ dài Meta Description',
      description: 'Tối đa 160 ký tự',
      status: metaDescLength > 0 && metaDescLength <= 160 ? 'pass' : metaDescLength === 0 ? 'fail' : 'warning',
      score: metaDescLength > 0 && metaDescLength <= 160 ? 2 : metaDescLength > 160 ? 1 : 0,
      maxScore: 2,
      value: `${metaDescLength} ký tự`,
      suggestion: metaDescLength === 0 ? 'Thiếu meta description' : metaDescLength > 160 ? 'Meta description quá dài' : undefined,
    });

    // Check if any sub keyword exists in meta description
    const subKwInMetaDesc = subKeywordList.some(kw => hasKeyword(metaDesc, kw));
    const matchedSubKw = subKeywordList.filter(kw => hasKeyword(metaDesc, kw));

    details.push({
      id: 'meta-desc-keyword',
      category: 'content',
      name: 'Meta Description chứa keyword',
      description: 'Chứa keyword chính (bắt buộc) và keyword phụ (ưu tiên)',
      status: hasKeyword(metaDesc, keyword) && subKwInMetaDesc ? 'pass' : hasKeyword(metaDesc, keyword) ? 'warning' : 'fail',
      score: hasKeyword(metaDesc, keyword) && subKwInMetaDesc ? 3 : hasKeyword(metaDesc, keyword) ? 2 : 0,
      maxScore: 3,
      value: hasKeyword(metaDesc, keyword)
        ? (subKwInMetaDesc ? `Có keyword chính + ${matchedSubKw.length} keyword phụ` : 'Chỉ có keyword chính')
        : 'Thiếu keyword',
      suggestion: !hasKeyword(metaDesc, keyword)
        ? `Thêm keyword "${keyword}" vào meta description`
        : !subKwInMetaDesc && subKeywordList.length > 0
        ? `Nên thêm 1 trong các keyword phụ: ${subKeywordList.slice(0, 3).join(', ')}${subKeywordList.length > 3 ? '...' : ''}`
        : undefined,
    });

    // 3. Sapo/Mở bài
    const sapoHasKeyword = hasKeyword(firstPara, keyword);
    details.push({
      id: 'sapo-keyword',
      category: 'content',
      name: 'Sapo chứa keyword',
      description: 'Đoạn mở bài chứa keyword chính',
      status: sapoHasKeyword ? 'pass' : 'fail',
      score: sapoHasKeyword ? 3 : 0,
      maxScore: 3,
      value: firstPara.substring(0, 100) + '...',
      suggestion: !sapoHasKeyword ? 'Thêm keyword vào đoạn mở bài và in đậm' : undefined,
    });

    // 4. Keyword đầu và cuối bài
    const kwInFirst = hasKeyword(firstPara, keyword);
    const kwInLast = hasKeyword(lastParas, keyword);
    details.push({
      id: 'keyword-position',
      category: 'content',
      name: 'Keyword đầu và cuối bài',
      description: 'Keyword xuất hiện đầu và cuối bài',
      status: kwInFirst && kwInLast ? 'pass' : kwInFirst || kwInLast ? 'warning' : 'fail',
      score: kwInFirst && kwInLast ? 3 : kwInFirst || kwInLast ? 1 : 0,
      maxScore: 3,
      value: `Đầu: ${kwInFirst ? 'Có' : 'Không'}, Cuối: ${kwInLast ? 'Có' : 'Không'}`,
      suggestion: !kwInFirst ? 'Thêm keyword vào đầu bài' : !kwInLast ? 'Thêm keyword vào cuối bài' : undefined,
    });

    // 5. Keyword phụ - check tất cả các keyword phụ
    const subKwResults = subKeywordList.map(kw => ({
      keyword: kw,
      count: countKeyword(bodyText, kw),
    }));
    const totalSubKwCount = subKwResults.reduce((sum, r) => sum + r.count, 0);
    const foundSubKw = subKwResults.filter(r => r.count > 0);
    const missingSubKw = subKwResults.filter(r => r.count === 0);

    details.push({
      id: 'sub-keyword',
      category: 'content',
      name: 'Keyword phụ trong bài',
      description: `Kiểm tra ${subKeywordList.length} keyword phụ`,
      status: foundSubKw.length === subKeywordList.length ? 'pass'
        : foundSubKw.length > 0 ? 'warning'
        : subKeywordList.length === 0 ? 'pass' : 'fail',
      score: subKeywordList.length === 0 ? 2
        : foundSubKw.length === subKeywordList.length ? 2
        : foundSubKw.length > 0 ? 1 : 0,
      maxScore: 2,
      value: subKeywordList.length === 0 ? 'Không có keyword phụ'
        : `${foundSubKw.length}/${subKeywordList.length} keyword (${totalSubKwCount} lần)`,
      suggestion: missingSubKw.length > 0
        ? `Thiếu: ${missingSubKw.slice(0, 3).map(r => r.keyword).join(', ')}${missingSubKw.length > 3 ? '...' : ''}`
        : undefined,
    });

    // 6. Headings H2 - check với keyword chính và tất cả keyword phụ
    const h2Matches = bodyHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || [];
    const h2Contents = h2Matches.map(h => extractText(h));
    const h2WithKw = h2Contents.filter(h =>
      hasKeyword(h, keyword) || subKeywordList.some(kw => hasKeyword(h, kw))
    ).length;

    details.push({
      id: 'h2-keyword',
      category: 'content',
      name: 'H2 chứa keyword',
      description: 'Ít nhất 2 H2 chứa keyword chính hoặc phụ',
      status: h2WithKw >= 2 ? 'pass' : h2WithKw >= 1 ? 'warning' : 'fail',
      score: h2WithKw >= 2 ? 3 : h2WithKw >= 1 ? 1 : 0,
      maxScore: 3,
      value: `${h2WithKw}/${h2Contents.length} H2 có keyword`,
      suggestion: h2WithKw < 2 ? 'Thêm keyword vào các thẻ H2' : undefined,
    });

    // 7. Heading ngắn gọn
    const longHeadings = h2Contents.filter(h => h.length > 60).length;
    details.push({
      id: 'heading-length',
      category: 'content',
      name: 'Heading ngắn gọn',
      description: 'Heading không dài dòng',
      status: longHeadings === 0 ? 'pass' : 'warning',
      score: longHeadings === 0 ? 2 : 1,
      maxScore: 2,
      value: longHeadings === 0 ? 'Tất cả heading ngắn gọn' : `${longHeadings} heading quá dài`,
      suggestion: longHeadings > 0 ? 'Rút gọn các heading dài' : undefined,
    });

    // 8. Word count
    details.push({
      id: 'word-count',
      category: 'content',
      name: 'Độ dài bài viết',
      description: 'Ít nhất 1200 chữ',
      status: wordCount >= 1200 ? 'pass' : wordCount >= 800 ? 'warning' : 'fail',
      score: wordCount >= 1200 ? 5 : wordCount >= 800 ? 3 : 1,
      maxScore: 5,
      value: `${wordCount} từ`,
      suggestion: wordCount < 1200 ? `Cần thêm ${1200 - wordCount} từ nữa` : undefined,
    });

    // 9. Kết bài
    const hasConclusion = checkHasConclusion(bodyHtml);
    details.push({
      id: 'conclusion',
      category: 'content',
      name: 'Có phần Kết bài',
      description: 'Có heading "Tóm lại" hoặc "Lời kết"',
      status: hasConclusion ? 'pass' : 'fail',
      score: hasConclusion ? 2 : 0,
      maxScore: 2,
      value: hasConclusion ? 'Có' : 'Không',
      suggestion: !hasConclusion ? 'Thêm phần "Tóm lại" hoặc "Lời kết" cuối bài' : undefined,
    });

    // 10. Keyword density
    const keywordCount = countKeyword(bodyText, keyword);
    const density = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;
    details.push({
      id: 'keyword-density',
      category: 'content',
      name: 'Mật độ keyword',
      description: 'Mật độ hợp lý 0.5-2.5%',
      status: density >= 0.5 && density <= 2.5 ? 'pass' : density > 0 ? 'warning' : 'fail',
      score: density >= 0.5 && density <= 2.5 ? 3 : density > 0 ? 1 : 0,
      maxScore: 3,
      value: `${density.toFixed(2)}% (${keywordCount} lần)`,
      suggestion: density < 0.5 ? 'Tăng mật độ keyword' : density > 2.5 ? 'Giảm mật độ keyword, tránh spam' : undefined,
    });

    // ==================== IMAGE CHECKS ====================

    const imgMatches = bodyHtml.match(/<img[^>]*>/gi) || [];
    let imagesWithAlt = 0;
    let imagesWithKwAlt = 0;

    imgMatches.forEach((img) => {
      const altMatch = img.match(/alt=["']([^"']*)["']/i);

      if (altMatch && altMatch[1].trim()) {
        imagesWithAlt++;
        if (hasKeyword(altMatch[1], keyword)) {
          imagesWithKwAlt++;
        }
      }
    });

    details.push({
      id: 'image-alt',
      category: 'images',
      name: 'Ảnh có Alt text',
      description: 'Tất cả ảnh phải có alt text',
      status: imgMatches.length === 0 || imagesWithAlt === imgMatches.length ? 'pass' : imagesWithAlt > imgMatches.length / 2 ? 'warning' : 'fail',
      score: imgMatches.length === 0 ? 3 : imagesWithAlt === imgMatches.length ? 3 : Math.round((imagesWithAlt / imgMatches.length) * 3),
      maxScore: 3,
      value: `${imagesWithAlt}/${imgMatches.length} ảnh có alt`,
      suggestion: imagesWithAlt < imgMatches.length ? 'Thêm alt text cho tất cả ảnh' : undefined,
    });

    details.push({
      id: 'image-alt-keyword',
      category: 'images',
      name: 'Alt chứa keyword',
      description: 'Alt text nên match với heading/keyword',
      status: imagesWithKwAlt > 0 ? 'pass' : imgMatches.length === 0 ? 'pass' : 'warning',
      score: imagesWithKwAlt > 0 ? 2 : imgMatches.length === 0 ? 2 : 0,
      maxScore: 2,
      value: `${imagesWithKwAlt} ảnh có keyword trong alt`,
      suggestion: imagesWithKwAlt === 0 && imgMatches.length > 0 ? 'Thêm keyword vào alt text của ảnh' : undefined,
    });

    details.push({
      id: 'image-count',
      category: 'images',
      name: 'Số lượng ảnh',
      description: 'Mỗi heading nên có ảnh minh họa',
      status: imgMatches.length >= h2Contents.length ? 'pass' : imgMatches.length >= h2Contents.length / 2 ? 'warning' : 'fail',
      score: imgMatches.length >= h2Contents.length ? 3 : imgMatches.length >= h2Contents.length / 2 ? 2 : 1,
      maxScore: 3,
      value: `${imgMatches.length} ảnh / ${h2Contents.length} H2`,
      suggestion: imgMatches.length < h2Contents.length ? 'Thêm ảnh minh họa cho các heading' : undefined,
    });

    // ==================== TECHNICAL CHECKS ====================

    // Canonical
    const hasCanonical = /<link[^>]*rel=["']canonical["']/i.test(html);
    details.push({
      id: 'canonical',
      category: 'technical',
      name: 'Canonical Tag',
      description: 'Có thẻ canonical',
      status: hasCanonical ? 'pass' : 'fail',
      score: hasCanonical ? 2 : 0,
      maxScore: 2,
      value: hasCanonical ? 'Có' : 'Không',
      suggestion: !hasCanonical ? 'Thêm canonical tag' : undefined,
    });

    // Viewport
    const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);
    details.push({
      id: 'viewport',
      category: 'technical',
      name: 'Mobile Viewport',
      description: 'Có thẻ viewport cho mobile',
      status: hasViewport ? 'pass' : 'fail',
      score: hasViewport ? 2 : 0,
      maxScore: 2,
      value: hasViewport ? 'Có' : 'Không',
      suggestion: !hasViewport ? 'Thêm viewport meta tag' : undefined,
    });

    // Internal links - extract detailed info
    const linkMatches = bodyHtml.match(/<a[^>]*href=["'][^"']*["'][^>]*>[\s\S]*?<\/a>/gi) || [];
    const internalLinksList: LinkInfo[] = [];
    const externalLinksList: LinkInfo[] = [];
    const seenInternalUrls = new Set<string>();
    const seenExternalUrls = new Set<string>();

    linkMatches.forEach(link => {
      const hrefMatch = link.match(/href=["']([^"']*)["']/i);
      const textContent = extractText(link);
      const hasNoFollow = /rel=["'][^"']*nofollow[^"']*["']/i.test(link);
      const isDoFollow = !hasNoFollow;

      if (hrefMatch) {
        const href = hrefMatch[1];
        if (href.startsWith('http')) {
          try {
            const linkUrl = new URL(href);
            const normalizedUrl = linkUrl.href.replace(/\/$/, ''); // Remove trailing slash for comparison

            if (linkUrl.hostname === urlObj.hostname) {
              const isDuplicate = seenInternalUrls.has(normalizedUrl);
              seenInternalUrls.add(normalizedUrl);
              internalLinksList.push({
                url: href,
                text: textContent.substring(0, 100) || href,
                isDoFollow,
                isDuplicate,
              });
            } else {
              const isDuplicate = seenExternalUrls.has(normalizedUrl);
              seenExternalUrls.add(normalizedUrl);
              externalLinksList.push({
                url: href,
                text: textContent.substring(0, 100) || href,
                isDoFollow,
                isDuplicate,
              });
            }
          } catch {
            // Invalid URL, treat as internal
            const isDuplicate = seenInternalUrls.has(href);
            seenInternalUrls.add(href);
            internalLinksList.push({
              url: href,
              text: textContent.substring(0, 100) || href,
              isDoFollow,
              isDuplicate,
            });
          }
        } else if (href.startsWith('/') || href.startsWith('#')) {
          const fullUrl = href.startsWith('#') ? href : urlObj.origin + href;
          const isDuplicate = seenInternalUrls.has(fullUrl);
          seenInternalUrls.add(fullUrl);
          internalLinksList.push({
            url: fullUrl,
            text: textContent.substring(0, 100) || href,
            isDoFollow,
            isDuplicate,
          });
        }
      }
    });

    const internalLinks = internalLinksList.length;
    const externalLinks = externalLinksList.length;
    const internalDuplicates = internalLinksList.filter(l => l.isDuplicate).length;
    const externalDuplicates = externalLinksList.filter(l => l.isDuplicate).length;

    const internalDoFollow = internalLinksList.filter(l => l.isDoFollow).length;
    const internalNoFollow = internalLinksList.filter(l => !l.isDoFollow).length;
    const externalDoFollow = externalLinksList.filter(l => l.isDoFollow).length;
    const externalNoFollow = externalLinksList.filter(l => !l.isDoFollow).length;

    details.push({
      id: 'internal-links',
      category: 'technical',
      name: 'Internal Links',
      description: 'Có ít nhất 3 internal links',
      status: internalLinks >= 3 ? 'pass' : internalLinks > 0 ? 'warning' : 'fail',
      score: internalLinks >= 3 ? 3 : internalLinks > 0 ? 1 : 0,
      maxScore: 3,
      value: `${internalLinks} links (${internalDoFollow} dofollow, ${internalNoFollow} nofollow${internalDuplicates > 0 ? `, ${internalDuplicates} trùng` : ''})`,
      suggestion: internalLinks < 3 ? 'Thêm internal links đến các bài viết liên quan' : undefined,
    });

    details.push({
      id: 'external-links',
      category: 'technical',
      name: 'External Links',
      description: 'Có 1-5 external links (nguồn tham khảo)',
      status: externalLinks >= 1 && externalLinks <= 5 ? 'pass' : externalLinks === 0 ? 'warning' : 'warning',
      score: externalLinks >= 1 && externalLinks <= 5 ? 2 : 1,
      maxScore: 2,
      value: `${externalLinks} links (${externalDoFollow} dofollow, ${externalNoFollow} nofollow${externalDuplicates > 0 ? `, ${externalDuplicates} trùng` : ''})`,
      suggestion: externalLinks === 0 ? 'Thêm external links đến nguồn uy tín' : externalLinks > 5 ? 'Giảm số external links' : undefined,
    });

    // H1 check
    const h1Matches = bodyHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    details.push({
      id: 'h1-count',
      category: 'technical',
      name: 'Thẻ H1',
      description: 'Chỉ có 1 thẻ H1',
      status: h1Matches.length === 1 ? 'pass' : 'fail',
      score: h1Matches.length === 1 ? 2 : 0,
      maxScore: 2,
      value: `${h1Matches.length} H1`,
      suggestion: h1Matches.length === 0 ? 'Thiếu thẻ H1' : h1Matches.length > 1 ? 'Chỉ nên có 1 thẻ H1' : undefined,
    });

    // Calculate scores by category
    const contentChecks = details.filter(d => d.category === 'content');
    const imageChecks = details.filter(d => d.category === 'images');
    const technicalChecks = details.filter(d => d.category === 'technical');

    const categories = {
      content: {
        name: 'Nội dung',
        score: contentChecks.reduce((sum, c) => sum + c.score, 0),
        maxScore: contentChecks.reduce((sum, c) => sum + c.maxScore, 0),
        passed: contentChecks.filter(c => c.status === 'pass').length,
        total: contentChecks.length,
      },
      images: {
        name: 'Hình ảnh',
        score: imageChecks.reduce((sum, c) => sum + c.score, 0),
        maxScore: imageChecks.reduce((sum, c) => sum + c.maxScore, 0),
        passed: imageChecks.filter(c => c.status === 'pass').length,
        total: imageChecks.length,
      },
      technical: {
        name: 'Kỹ thuật',
        score: technicalChecks.reduce((sum, c) => sum + c.score, 0),
        maxScore: technicalChecks.reduce((sum, c) => sum + c.maxScore, 0),
        passed: technicalChecks.filter(c => c.status === 'pass').length,
        total: technicalChecks.length,
      },
    };

    const totalScore = details.reduce((sum, c) => sum + c.score, 0);
    const maxScore = details.reduce((sum, c) => sum + c.maxScore, 0);

    return NextResponse.json({
      url,
      success: true,
      score: Math.round((totalScore / maxScore) * 100),
      maxScore: 100,
      categories,
      details,
      // Additional link details for display
      links: {
        internal: internalLinksList,
        external: externalLinksList,
      },
      // Pass back keywords for display
      keywords: {
        primary: keyword,
        sub: subKeywordList,
      },
    });
  } catch (error) {
    console.error('SEO Check error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
