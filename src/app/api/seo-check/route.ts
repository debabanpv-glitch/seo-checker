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

    // Extract H1 early (used in both content and technical checks)
    const h1Matches = bodyHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];

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

    // 11. H1 chứa keyword
    const h1Contents = h1Matches.map(h => extractText(h));
    const h1HasKeyword = h1Contents.some(h => hasKeyword(h, keyword));
    details.push({
      id: 'h1-keyword',
      category: 'content',
      name: 'H1 chứa keyword',
      description: 'Thẻ H1 phải chứa keyword chính',
      status: h1HasKeyword ? 'pass' : 'fail',
      score: h1HasKeyword ? 3 : 0,
      maxScore: 3,
      value: h1Contents.length > 0 ? h1Contents[0].substring(0, 80) + (h1Contents[0].length > 80 ? '...' : '') : 'Không có H1',
      suggestion: !h1HasKeyword ? `Thêm keyword "${keyword}" vào thẻ H1` : undefined,
    });

    // 12. Cấu trúc heading H3
    const h3Matches = bodyHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi) || [];
    details.push({
      id: 'h3-structure',
      category: 'content',
      name: 'Cấu trúc heading H3',
      description: 'Có ít nhất 2 thẻ H3 để tạo cấu trúc nội dung',
      status: h3Matches.length >= 2 ? 'pass' : h3Matches.length === 1 ? 'warning' : 'fail',
      score: h3Matches.length >= 2 ? 2 : h3Matches.length === 1 ? 1 : 0,
      maxScore: 2,
      value: `${h3Matches.length} H3`,
      suggestion: h3Matches.length < 2 ? 'Thêm thẻ H3 để chia nhỏ nội dung trong mỗi mục' : undefined,
    });

    // 13. Keyword in đậm
    const boldMatches = bodyHtml.match(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi) || [];
    const boldHasKeyword = boldMatches.some(b => hasKeyword(extractText(b), keyword));
    details.push({
      id: 'bold-keyword',
      category: 'content',
      name: 'Keyword in đậm',
      description: 'Keyword xuất hiện trong thẻ <strong> hoặc <b>',
      status: boldHasKeyword ? 'pass' : 'warning',
      score: boldHasKeyword ? 2 : 0,
      maxScore: 2,
      value: boldHasKeyword ? 'Có keyword in đậm' : 'Không có keyword in đậm',
      suggestion: !boldHasKeyword ? `In đậm keyword "${keyword}" ít nhất 1 lần trong bài` : undefined,
    });

    // 14. Table of Contents
    const hasToc = /id=["'][^"']*toc[^"']*["']/i.test(bodyHtml) ||
      /class=["'][^"']*(?:toc|table-of-content|muc-luc)[^"']*["']/i.test(bodyHtml);
    details.push({
      id: 'toc',
      category: 'content',
      name: 'Table of Contents',
      description: 'Có mục lục để điều hướng bài viết',
      status: hasToc ? 'pass' : 'warning',
      score: hasToc ? 2 : 0,
      maxScore: 2,
      value: hasToc ? 'Có mục lục' : 'Không có mục lục',
      suggestion: !hasToc ? 'Thêm mục lục (id="toc" hoặc class="toc") để tăng UX và SEO' : undefined,
    });

    // 15. FAQ Section
    const hasFaqSchema = /"@type"\s*:\s*"FAQPage"/i.test(html);
    const hasFaqHeading = /<h[2-4][^>]*>[^<]*(?:faq|câu hỏi thường gặp)[^<]*<\/h[2-4]>/i.test(bodyHtml);
    const hasFaq = hasFaqSchema || hasFaqHeading;
    details.push({
      id: 'faq',
      category: 'content',
      name: 'FAQ Section',
      description: 'Có phần FAQ (schema FAQPage hoặc heading FAQ)',
      status: hasFaq ? 'pass' : 'warning',
      score: hasFaq ? 2 : 0,
      maxScore: 2,
      value: hasFaqSchema ? 'Có FAQ schema' : hasFaqHeading ? 'Có FAQ heading' : 'Không có FAQ',
      suggestion: !hasFaq ? 'Thêm phần "Câu hỏi thường gặp" với FAQ schema để tăng khả năng xuất hiện rich snippet' : undefined,
    });

    // 16. IRU - Answer-first (Đoạn mở bài trả lời trực tiếp câu hỏi)
    // IRU = Information Response Unit: kết luận TRƯỚC, chi tiết SAU
    const firstParaWords = countWords(firstPara);
    const firstParaHasKeyword = hasKeyword(firstPara, keyword);
    // Heuristic: good IRU = đoạn mở bài ngắn (≤60 words), chứa keyword, không bắt đầu bằng câu hỏi
    const startsWithQuestion = /^(?:bạn có|bạn đã|liệu|tại sao|vì sao|làm sao|làm thế nào|có bao giờ|what|how|why|do you|have you|are you)/i.test(firstPara);
    const iruScore = (firstParaWords > 0 && firstParaWords <= 60 && firstParaHasKeyword && !startsWithQuestion) ? 3
      : (firstParaWords > 0 && firstParaWords <= 80 && firstParaHasKeyword) ? 2
      : (firstParaWords > 0 && firstParaHasKeyword) ? 1 : 0;
    details.push({
      id: 'iru-answer-first',
      category: 'content',
      name: 'IRU: Answer-first',
      description: 'Đoạn mở bài trả lời trực tiếp, ngắn gọn (≤60 từ), chứa keyword — theo mô hình IRU',
      status: iruScore >= 3 ? 'pass' : iruScore >= 1 ? 'warning' : 'fail',
      score: iruScore,
      maxScore: 3,
      value: `${firstParaWords} từ, ${firstParaHasKeyword ? 'có' : 'thiếu'} keyword${startsWithQuestion ? ', bắt đầu bằng câu hỏi' : ''}`,
      suggestion: iruScore < 3 ? 'Viết đoạn mở bài ngắn gọn (≤60 từ), trả lời trực tiếp câu hỏi chính, chứa keyword — kết luận TRƯỚC, chi tiết SAU' : undefined,
    });

    // 17. Cấu trúc đoạn văn ngắn (≤4 câu mỗi đoạn)
    const paragraphs = bodyHtml.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
    const longParagraphs = paragraphs.filter(p => {
      const text = extractText(p);
      const sentences = text.split(/[.!?。]\s+/).filter(s => s.trim().length > 5);
      return sentences.length > 4;
    });
    const shortParaRatio = paragraphs.length > 0 ? (paragraphs.length - longParagraphs.length) / paragraphs.length : 0;
    details.push({
      id: 'paragraph-structure',
      category: 'content',
      name: 'Đoạn văn ngắn gọn',
      description: 'Đoạn văn ≤4 câu, dễ đọc trên mobile',
      status: shortParaRatio >= 0.8 ? 'pass' : shortParaRatio >= 0.5 ? 'warning' : 'fail',
      score: shortParaRatio >= 0.8 ? 2 : shortParaRatio >= 0.5 ? 1 : 0,
      maxScore: 2,
      value: `${longParagraphs.length}/${paragraphs.length} đoạn quá dài`,
      suggestion: longParagraphs.length > 0 ? `Chia nhỏ ${longParagraphs.length} đoạn văn dài thành ≤4 câu mỗi đoạn` : undefined,
    });

    // 18. Danh sách (ul/ol) — cải thiện readability & featured snippet
    const ulMatches = bodyHtml.match(/<ul[^>]*>/gi) || [];
    const olMatches = bodyHtml.match(/<ol[^>]*>/gi) || [];
    const totalLists = ulMatches.length + olMatches.length;
    details.push({
      id: 'lists',
      category: 'content',
      name: 'Danh sách (ul/ol)',
      description: 'Có ít nhất 1 danh sách để tăng readability và featured snippet',
      status: totalLists >= 2 ? 'pass' : totalLists >= 1 ? 'warning' : 'fail',
      score: totalLists >= 2 ? 2 : totalLists >= 1 ? 1 : 0,
      maxScore: 2,
      value: `${totalLists} danh sách (${ulMatches.length} ul, ${olMatches.length} ol)`,
      suggestion: totalLists === 0 ? 'Thêm bullet list hoặc numbered list để tăng khả năng xuất hiện featured snippet' : undefined,
    });

    // 19. CTA (Call-to-Action) presence
    const ctaPatterns = [
      /(?:đăng ký|liên hệ|mua ngay|tải ngay|dùng thử|xem thêm|tìm hiểu thêm|bắt đầu|nhận ngay)/i,
      /(?:sign up|contact|buy now|download|try free|learn more|get started|subscribe)/i,
    ];
    const hasCta = ctaPatterns.some(p => p.test(bodyHtml));
    // Also check for CTA buttons/links
    const ctaButtons = bodyHtml.match(/<(?:a|button)[^>]*class=["'][^"']*(?:btn|button|cta)[^"']*["'][^>]*>/gi) || [];
    details.push({
      id: 'cta',
      category: 'content',
      name: 'Call-to-Action',
      description: 'Có CTA rõ ràng để chuyển đổi người đọc',
      status: hasCta || ctaButtons.length > 0 ? 'pass' : 'warning',
      score: hasCta || ctaButtons.length > 0 ? 2 : 0,
      maxScore: 2,
      value: ctaButtons.length > 0 ? `${ctaButtons.length} CTA button` : hasCta ? 'Có CTA text' : 'Không có CTA',
      suggestion: !hasCta && ctaButtons.length === 0 ? 'Thêm CTA rõ ràng (nút hoặc link) để hướng dẫn hành động tiếp theo' : undefined,
    });

    // 20. Content freshness (datePublished/dateModified schema)
    const hasDatePublished = /datePublished/i.test(html);
    const hasDateModified = /dateModified/i.test(html);
    details.push({
      id: 'content-freshness',
      category: 'content',
      name: 'Content freshness',
      description: 'Có datePublished/dateModified trong schema để Google nhận diện trang mới',
      status: hasDatePublished && hasDateModified ? 'pass' : hasDatePublished ? 'warning' : 'fail',
      score: hasDatePublished && hasDateModified ? 2 : hasDatePublished ? 1 : 0,
      maxScore: 2,
      value: `${hasDatePublished ? 'datePublished ✓' : 'datePublished ✗'}, ${hasDateModified ? 'dateModified ✓' : 'dateModified ✗'}`,
      suggestion: !hasDatePublished ? 'Thêm datePublished và dateModified vào schema Article' : !hasDateModified ? 'Thêm dateModified để hiển thị ngày cập nhật' : undefined,
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

    // Lazy loading
    const imagesWithLazy = imgMatches.filter(img => /loading=["']lazy["']/i.test(img)).length;
    details.push({
      id: 'image-lazy',
      category: 'images',
      name: 'Lazy loading',
      description: 'Ảnh nên có loading="lazy" để tăng tốc độ tải',
      status: imgMatches.length === 0 || imagesWithLazy === imgMatches.length ? 'pass' : imagesWithLazy > 0 ? 'warning' : 'fail',
      score: imgMatches.length === 0 ? 2 : imagesWithLazy === imgMatches.length ? 2 : imagesWithLazy > 0 ? 1 : 0,
      maxScore: 2,
      value: imgMatches.length === 0 ? 'Không có ảnh' : `${imagesWithLazy}/${imgMatches.length} ảnh có lazy loading`,
      suggestion: imgMatches.length > 0 && imagesWithLazy < imgMatches.length ? 'Thêm loading="lazy" cho tất cả ảnh' : undefined,
    });

    // Next-gen image format (WebP/AVIF)
    const sourceMatches = bodyHtml.match(/<source[^>]*>/gi) || [];
    const allImgElements = [...imgMatches, ...sourceMatches];
    const imagesWithNextGen = allImgElements.filter(el => /\.(?:webp|avif)(?:[?#"'\s]|$)/i.test(el)).length;
    details.push({
      id: 'image-format',
      category: 'images',
      name: 'Next-gen format (WebP/AVIF)',
      description: 'Sử dụng WebP hoặc AVIF để giảm dung lượng ảnh',
      status: imgMatches.length === 0 || imagesWithNextGen > 0 ? 'pass' : 'warning',
      score: imgMatches.length === 0 || imagesWithNextGen > 0 ? 2 : 0,
      maxScore: 2,
      value: imgMatches.length === 0 ? 'Không có ảnh' : imagesWithNextGen > 0 ? `${imagesWithNextGen} ảnh dùng WebP/AVIF` : 'Không dùng WebP/AVIF',
      suggestion: imgMatches.length > 0 && imagesWithNextGen === 0 ? 'Chuyển ảnh sang định dạng WebP hoặc AVIF để tối ưu tốc độ' : undefined,
    });

    // Image file names (descriptive vs IMG_1234)
    const badImageNames = imgMatches.filter(img => {
      const srcMatch = img.match(/src=["']([^"']*)["']/i);
      if (!srcMatch) return false;
      const fileName = srcMatch[1].split('/').pop()?.split('?')[0] || '';
      return /^(?:img|image|photo|pic|screenshot|screen|untitled|dsc|dcim)[-_]?\d*/i.test(fileName) ||
        /^\d+\.\w+$/.test(fileName);
    });
    details.push({
      id: 'image-filenames',
      category: 'images',
      name: 'Tên file ảnh mô tả',
      description: 'Tên file ảnh nên mô tả nội dung (không dùng IMG_1234)',
      status: imgMatches.length === 0 || badImageNames.length === 0 ? 'pass' : badImageNames.length <= 2 ? 'warning' : 'fail',
      score: imgMatches.length === 0 || badImageNames.length === 0 ? 2 : badImageNames.length <= 2 ? 1 : 0,
      maxScore: 2,
      value: imgMatches.length === 0 ? 'Không có ảnh' : badImageNames.length === 0 ? 'Tất cả tên file OK' : `${badImageNames.length} ảnh có tên không mô tả`,
      suggestion: badImageNames.length > 0 ? 'Đổi tên file ảnh thành mô tả (vd: "seo-audit-checklist.webp" thay vì "IMG_1234.jpg")' : undefined,
    });

    // Image dimensions (width/height attributes for CLS)
    const imagesWithDimensions = imgMatches.filter(img =>
      /width=/i.test(img) && /height=/i.test(img)
    ).length;
    details.push({
      id: 'image-dimensions',
      category: 'images',
      name: 'Width/Height attributes',
      description: 'Ảnh có width/height để tránh CLS (layout shift)',
      status: imgMatches.length === 0 || imagesWithDimensions === imgMatches.length ? 'pass' : imagesWithDimensions > imgMatches.length / 2 ? 'warning' : 'fail',
      score: imgMatches.length === 0 || imagesWithDimensions === imgMatches.length ? 2 : imagesWithDimensions > imgMatches.length / 2 ? 1 : 0,
      maxScore: 2,
      value: imgMatches.length === 0 ? 'Không có ảnh' : `${imagesWithDimensions}/${imgMatches.length} ảnh có width/height`,
      suggestion: imagesWithDimensions < imgMatches.length ? 'Thêm width và height cho ảnh để tránh Cumulative Layout Shift (CLS)' : undefined,
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

    // Open Graph tags
    const hasOgTitle = /<meta[^>]*property=["']og:title["']/i.test(html);
    const hasOgDescription = /<meta[^>]*property=["']og:description["']/i.test(html);
    const hasOgImage = /<meta[^>]*property=["']og:image["']/i.test(html);
    const ogCount = [hasOgTitle, hasOgDescription, hasOgImage].filter(Boolean).length;
    details.push({
      id: 'og-tags',
      category: 'technical',
      name: 'Open Graph',
      description: 'Có đủ 3 thẻ og:title, og:description, og:image',
      status: ogCount === 3 ? 'pass' : ogCount > 0 ? 'warning' : 'fail',
      score: ogCount === 3 ? 3 : ogCount > 0 ? 1 : 0,
      maxScore: 3,
      value: `${ogCount}/3 OG tags (${[hasOgTitle && 'title', hasOgDescription && 'description', hasOgImage && 'image'].filter(Boolean).join(', ') || 'không có'})`,
      suggestion: ogCount < 3 ? `Thiếu: ${[!hasOgTitle && 'og:title', !hasOgDescription && 'og:description', !hasOgImage && 'og:image'].filter(Boolean).join(', ')}` : undefined,
    });

    // Schema.org JSON-LD
    const schemaMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
    details.push({
      id: 'schema',
      category: 'technical',
      name: 'Schema.org',
      description: 'Có structured data JSON-LD',
      status: schemaMatches.length > 0 ? 'pass' : 'fail',
      score: schemaMatches.length > 0 ? 3 : 0,
      maxScore: 3,
      value: schemaMatches.length > 0 ? `${schemaMatches.length} JSON-LD block` : 'Không có schema',
      suggestion: schemaMatches.length === 0 ? 'Thêm structured data JSON-LD (Article, BreadcrumbList, FAQPage...)' : undefined,
    });

    // URL chứa keyword
    const urlPath = urlObj.pathname.toLowerCase();
    const keywordLower = keyword ? keyword.toLowerCase() : '';
    const urlHasKeyword = keywordLower ? urlPath.includes(keywordLower) : false;
    details.push({
      id: 'url-keyword',
      category: 'technical',
      name: 'URL chứa keyword',
      description: 'Slug URL nên chứa keyword chính',
      status: urlHasKeyword ? 'pass' : keywordLower ? 'warning' : 'pass',
      score: urlHasKeyword ? 2 : keywordLower ? 0 : 2,
      maxScore: 2,
      value: urlObj.pathname || '/',
      suggestion: keywordLower && !urlHasKeyword ? `Đặt keyword "${keyword}" vào slug URL` : undefined,
    });

    // HTTPS
    const isHttps = urlObj.protocol === 'https:';
    details.push({
      id: 'https',
      category: 'technical',
      name: 'HTTPS',
      description: 'Trang web sử dụng HTTPS',
      status: isHttps ? 'pass' : 'fail',
      score: isHttps ? 2 : 0,
      maxScore: 2,
      value: isHttps ? 'HTTPS' : 'HTTP (không an toàn)',
      suggestion: !isHttps ? 'Chuyển sang HTTPS để bảo mật và tăng thứ hạng SEO' : undefined,
    });

    // Robots meta
    const robotsMetaMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']robots["']/i);
    const robotsContent = robotsMetaMatch ? robotsMetaMatch[1].toLowerCase() : '';
    const hasNoindex = robotsContent.includes('noindex');
    details.push({
      id: 'robots',
      category: 'technical',
      name: 'Robots meta',
      description: 'Không có noindex (trang phải được index)',
      status: hasNoindex ? 'fail' : 'pass',
      score: hasNoindex ? 0 : 1,
      maxScore: 1,
      value: robotsContent || 'Không có (mặc định index,follow)',
      suggestion: hasNoindex ? 'Xóa hoặc sửa robots meta tag, tránh noindex nếu muốn trang được index' : undefined,
    });

    // Language tag
    const hasLang = /<html[^>]*lang=/i.test(html);
    details.push({
      id: 'lang',
      category: 'technical',
      name: 'Language tag',
      description: 'Thẻ <html> có thuộc tính lang',
      status: hasLang ? 'pass' : 'fail',
      score: hasLang ? 1 : 0,
      maxScore: 1,
      value: hasLang ? 'Có lang attribute' : 'Không có lang attribute',
      suggestion: !hasLang ? 'Thêm lang attribute vào thẻ <html> (ví dụ: lang="vi")' : undefined,
    });

    // Breadcrumb
    const hasBreadcrumbSchema = /"@type"\s*:\s*"BreadcrumbList"/i.test(html);
    const hasBreadcrumbClass = /class=["'][^"']*breadcrumb[^"']*["']/i.test(bodyHtml) ||
      /aria-label=["']breadcrumb["']/i.test(bodyHtml);
    const hasBreadcrumb = hasBreadcrumbSchema || hasBreadcrumbClass;
    details.push({
      id: 'breadcrumb',
      category: 'technical',
      name: 'Breadcrumb',
      description: 'Có breadcrumb schema hoặc nav breadcrumb',
      status: hasBreadcrumb ? 'pass' : 'warning',
      score: hasBreadcrumb ? 2 : 0,
      maxScore: 2,
      value: hasBreadcrumbSchema ? 'Có breadcrumb schema' : hasBreadcrumbClass ? 'Có breadcrumb nav' : 'Không có breadcrumb',
      suggestion: !hasBreadcrumb ? 'Thêm breadcrumb với BreadcrumbList schema để cải thiện rich snippet' : undefined,
    });

    // Favicon
    const hasFavicon = /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i.test(html);
    details.push({
      id: 'favicon',
      category: 'technical',
      name: 'Favicon',
      description: 'Có favicon cho tab trình duyệt',
      status: hasFavicon ? 'pass' : 'fail',
      score: hasFavicon ? 1 : 0,
      maxScore: 1,
      value: hasFavicon ? 'Có favicon' : 'Không có favicon',
      suggestion: !hasFavicon ? 'Thêm favicon (link rel="icon") để tăng nhận diện thương hiệu trên tab' : undefined,
    });

    // E-E-A-T signals (Author info)
    const hasAuthorSchema = /["']author["']\s*:/i.test(html);
    const hasAuthorMeta = /<meta[^>]*name=["']author["']/i.test(html);
    const hasAuthorByline = /class=["'][^"']*(?:author|byline|writer)[^"']*["']/i.test(bodyHtml);
    const hasAuthor = hasAuthorSchema || hasAuthorMeta || hasAuthorByline;
    details.push({
      id: 'eeat-author',
      category: 'technical',
      name: 'E-E-A-T: Tác giả',
      description: 'Có thông tin tác giả (schema, meta, hoặc byline) để tăng E-E-A-T',
      status: hasAuthor ? 'pass' : 'warning',
      score: hasAuthor ? 2 : 0,
      maxScore: 2,
      value: hasAuthorSchema ? 'Có author schema' : hasAuthorMeta ? 'Có author meta' : hasAuthorByline ? 'Có author byline' : 'Không có thông tin tác giả',
      suggestion: !hasAuthor ? 'Thêm thông tin tác giả (author schema, meta author, hoặc byline) để tăng E-E-A-T' : undefined,
    });

    // Twitter Card
    const hasTwitterCard = /<meta[^>]*(?:name|property)=["']twitter:card["']/i.test(html);
    const hasTwitterTitle = /<meta[^>]*(?:name|property)=["']twitter:title["']/i.test(html);
    details.push({
      id: 'twitter-card',
      category: 'technical',
      name: 'Twitter Card',
      description: 'Có twitter:card meta tag cho chia sẻ mạng xã hội',
      status: hasTwitterCard && hasTwitterTitle ? 'pass' : hasTwitterCard ? 'warning' : 'warning',
      score: hasTwitterCard && hasTwitterTitle ? 1 : hasTwitterCard ? 1 : 0,
      maxScore: 1,
      value: hasTwitterCard ? 'Có Twitter Card' : 'Không có Twitter Card',
      suggestion: !hasTwitterCard ? 'Thêm twitter:card meta tag để tối ưu hiển thị khi chia sẻ trên X/Twitter' : undefined,
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
