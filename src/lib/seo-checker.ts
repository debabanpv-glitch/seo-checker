import { PageData, Module, Check, CheckStatus, ArticleType } from '@/types';
import {
  POWER_WORDS,
  CTA_WORDS,
  STOP_WORDS,
  GEO_KEYWORDS,
  CONCLUSION_HEADINGS,
  PAA_PATTERNS,
  TRUSTED_DOMAINS,
  BAD_ANCHOR_TEXTS,
  WORD_COUNT_REQUIREMENTS,
  LIST_HEADING_PATTERNS,
} from './constants';
import {
  toSlug,
  calculateSimilarity,
  countKeywordOccurrences,
  getFirst100Words,
  getLast200Words,
  getFirstNWords,
} from './parser';

export function runSEOCheck(
  pageData: PageData,
  keywords: string[],
  brandName: string
): Module[] {
  const mainKeyword = keywords[0] || '';
  const secondaryKeywords = keywords.slice(1);

  const modules: Module[] = [
    checkTitleTag(pageData, mainKeyword),
    checkMetaDescription(pageData, mainKeyword),
    checkURL(pageData, mainKeyword),
    checkHeadingStructure(pageData, mainKeyword, secondaryKeywords),
    checkContent(pageData, mainKeyword, secondaryKeywords),
    checkSapo(pageData, mainKeyword, brandName),
    checkConclusion(pageData),
    checkImages(pageData, mainKeyword),
    checkInternalLinks(pageData),
    checkExternalLinks(pageData),
    checkEEAT(pageData),
    checkSchemaMarkup(pageData),
    checkBrand(pageData, brandName),
    checkLocalSEO(pageData),
    checkTechnicalOnpage(pageData),
    checkAIOptimization(pageData, mainKeyword),
    checkFreshness(pageData),
    checkFeaturedSnippet(pageData),
  ];

  return modules;
}

function createCheck(
  id: string,
  name: string,
  passed: boolean,
  current: string | number,
  expected: string,
  suggestion: string,
  maxScore: number,
  partialPass: boolean = false
): Check {
  let status: CheckStatus;
  let score: number;

  if (passed) {
    status = 'pass';
    score = maxScore;
  } else if (partialPass) {
    status = 'warning';
    score = Math.floor(maxScore / 2);
  } else {
    status = 'fail';
    score = 0;
  }

  return { id, name, status, current, expected, suggestion, score, maxScore };
}

// Module 1: Title Tag (8 points)
function checkTitleTag(pageData: PageData, keyword: string): Module {
  const { title, h1 } = pageData;
  const checks: Check[] = [];

  // 1.1 Length 50-60 chars (2 points)
  const titleLength = title.length;
  checks.push(
    createCheck(
      '1.1',
      'Độ dài Title 50-60 ký tự',
      titleLength >= 50 && titleLength <= 60,
      titleLength,
      '50-60 ký tự',
      titleLength < 50
        ? `Thêm ${50 - titleLength} ký tự vào title`
        : titleLength > 60
          ? `Giảm ${titleLength - 60} ký tự khỏi title`
          : 'Độ dài title hoàn hảo',
      2,
      titleLength >= 40 && titleLength <= 70
    )
  );

  // 1.2 Contains main keyword (2 points)
  const titleLower = title.toLowerCase();
  const keywordLower = keyword.toLowerCase();
  const hasKeyword = titleLower.includes(keywordLower);
  checks.push(
    createCheck(
      '1.2',
      'Chứa từ khóa chính',
      hasKeyword,
      hasKeyword ? 'Có' : 'Không',
      'Có từ khóa chính',
      hasKeyword ? 'Title đã chứa từ khóa chính' : `Thêm "${keyword}" vào title`,
      2
    )
  );

  // 1.3 Keyword in first 10 chars (1 point)
  const first10 = title.slice(0, 10).toLowerCase();
  const keywordInFirst10 = first10.includes(keywordLower.slice(0, 5));
  checks.push(
    createCheck(
      '1.3',
      'Từ khóa trong 10 ký tự đầu',
      keywordInFirst10,
      keywordInFirst10 ? 'Có' : 'Không',
      'Từ khóa ở đầu title',
      keywordInFirst10
        ? 'Từ khóa đã ở vị trí tốt'
        : 'Đưa từ khóa lên đầu title để tăng CTR',
      1
    )
  );

  // 1.4 Match H1 >= 70% (1 point)
  const h1Text = h1[0] || '';
  const similarity = calculateSimilarity(title, h1Text);
  checks.push(
    createCheck(
      '1.4',
      'Khớp H1 ≥70%',
      similarity >= 0.7,
      `${Math.round(similarity * 100)}%`,
      '≥70%',
      similarity >= 0.7
        ? 'Title và H1 đã khớp tốt'
        : 'Title và H1 nên có nội dung tương tự để SEO tốt hơn',
      1,
      similarity >= 0.5
    )
  );

  // 1.5 Has power words (1 point)
  const hasPowerWord = POWER_WORDS.some((word) =>
    titleLower.includes(word.toLowerCase())
  );
  checks.push(
    createCheck(
      '1.5',
      'Có power words',
      hasPowerWord,
      hasPowerWord ? 'Có' : 'Không',
      'Có power words: Top, Best, Hướng dẫn...',
      hasPowerWord
        ? 'Title đã có power word tốt'
        : 'Thêm power words như: Top, Hướng dẫn, Best, 2025...',
      1
    )
  );

  // 1.6 No keyword repetition (1 point)
  const keywordCount = countKeywordOccurrences(title, keyword);
  checks.push(
    createCheck(
      '1.6',
      'Không lặp keyword',
      keywordCount <= 1,
      `${keywordCount} lần`,
      'Tối đa 1 lần',
      keywordCount <= 1
        ? 'Không có lặp keyword'
        : 'Bỏ bớt từ khóa lặp trong title',
      1
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return { id: 'title', name: 'Title Tag', score: totalScore, maxScore, checks };
}

// Module 2: Meta Description (6 points)
function checkMetaDescription(pageData: PageData, keyword: string): Module {
  const { metaDescription, title } = pageData;
  const checks: Check[] = [];

  // 2.1 Exists (1 point)
  const exists = metaDescription.length > 0;
  checks.push(
    createCheck(
      '2.1',
      'Tồn tại Meta Description',
      exists,
      exists ? 'Có' : 'Không',
      'Có meta description',
      exists ? 'Đã có meta description' : 'Thêm meta description cho trang',
      1
    )
  );

  // 2.2 Length 120-160 chars (1 point)
  const length = metaDescription.length;
  checks.push(
    createCheck(
      '2.2',
      'Độ dài 120-160 ký tự',
      length >= 120 && length <= 160,
      length,
      '120-160 ký tự',
      length < 120
        ? `Thêm ${120 - length} ký tự`
        : length > 160
          ? `Giảm ${length - 160} ký tự`
          : 'Độ dài hoàn hảo',
      1,
      length >= 100 && length <= 180
    )
  );

  // 2.3 Contains keyword (2 points)
  const hasKeyword = metaDescription.toLowerCase().includes(keyword.toLowerCase());
  checks.push(
    createCheck(
      '2.3',
      'Chứa từ khóa chính',
      hasKeyword,
      hasKeyword ? 'Có' : 'Không',
      'Có từ khóa chính',
      hasKeyword
        ? 'Meta description đã chứa từ khóa'
        : `Thêm "${keyword}" vào meta description`,
      2
    )
  );

  // 2.4 Has CTA (1 point)
  const hasCTA = CTA_WORDS.some((cta) =>
    metaDescription.toLowerCase().includes(cta.toLowerCase())
  );
  checks.push(
    createCheck(
      '2.4',
      'Có CTA (Call to Action)',
      hasCTA,
      hasCTA ? 'Có' : 'Không',
      'Có CTA: Xem ngay, Tìm hiểu...',
      hasCTA
        ? 'Meta description đã có CTA'
        : 'Thêm CTA như: Xem ngay, Tìm hiểu, Khám phá...',
      1
    )
  );

  // 2.5 Not same as title (1 point)
  const similarity = calculateSimilarity(metaDescription, title);
  checks.push(
    createCheck(
      '2.5',
      'Không trùng Title',
      similarity < 0.8,
      `${Math.round(similarity * 100)}% giống`,
      '<80% giống title',
      similarity < 0.8
        ? 'Meta description độc lập với title'
        : 'Meta description nên khác biệt với title để mô tả chi tiết hơn',
      1
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return {
    id: 'meta-description',
    name: 'Meta Description',
    score: totalScore,
    maxScore,
    checks,
  };
}

// Module 3: URL/Slug (4 points)
function checkURL(pageData: PageData, keyword: string): Module {
  const { url } = pageData;
  const checks: Check[] = [];

  let slug = '';
  try {
    const urlObj = new URL(url);
    slug = urlObj.pathname.split('/').pop() || '';
  } catch {
    slug = url.split('/').pop() || '';
  }

  // 3.1 Length <= 60 chars (1 point)
  const slugLength = slug.length;
  checks.push(
    createCheck(
      '3.1',
      'Độ dài Slug ≤60 ký tự',
      slugLength <= 60,
      slugLength,
      '≤60 ký tự',
      slugLength <= 60
        ? 'Độ dài slug phù hợp'
        : `Rút ngắn slug đi ${slugLength - 60} ký tự`,
      1,
      slugLength <= 75
    )
  );

  // 3.2 Contains keyword (2 points)
  const keywordSlug = toSlug(keyword);
  const slugLower = slug.toLowerCase();
  const hasKeyword =
    slugLower.includes(keywordSlug) ||
    keywordSlug.split('-').every((word) => slugLower.includes(word));
  checks.push(
    createCheck(
      '3.2',
      'Chứa từ khóa (dạng slug)',
      hasKeyword,
      hasKeyword ? 'Có' : 'Không',
      `Chứa: ${keywordSlug}`,
      hasKeyword
        ? 'Slug đã chứa từ khóa'
        : `Thêm "${keywordSlug}" vào slug`,
      2,
      keywordSlug.split('-').some((word) => slugLower.includes(word))
    )
  );

  // 3.3 No stop words (1 point)
  const stopWordsInSlug = STOP_WORDS.filter((sw) =>
    slugLower.includes(sw.toLowerCase())
  );
  checks.push(
    createCheck(
      '3.3',
      'Không có stop words',
      stopWordsInSlug.length === 0,
      stopWordsInSlug.length === 0 ? 'Không có' : stopWordsInSlug.join(', '),
      'Không có: và, của, để...',
      stopWordsInSlug.length === 0
        ? 'Slug sạch stop words'
        : `Loại bỏ stop words: ${stopWordsInSlug.join(', ')}`,
      1
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return { id: 'url', name: 'URL/Slug', score: totalScore, maxScore, checks };
}

// Module 4: Heading Structure (8 points)
function checkHeadingStructure(
  pageData: PageData,
  keyword: string,
  secondaryKeywords: string[]
): Module {
  const { h1, h2, h3 } = pageData;
  const checks: Check[] = [];
  const keywordLower = keyword.toLowerCase();

  // 4.1 Exactly 1 H1 (2 points)
  checks.push(
    createCheck(
      '4.1',
      'Đúng 1 H1',
      h1.length === 1,
      h1.length,
      '1 H1',
      h1.length === 1
        ? 'Đúng 1 H1'
        : h1.length === 0
          ? 'Thêm 1 thẻ H1'
          : `Chỉ giữ 1 H1, xóa ${h1.length - 1} H1 thừa`,
      2
    )
  );

  // 4.2 H1 contains keyword (2 points)
  const h1HasKeyword = h1.some((heading) =>
    heading.toLowerCase().includes(keywordLower)
  );
  checks.push(
    createCheck(
      '4.2',
      'H1 chứa từ khóa',
      h1HasKeyword,
      h1HasKeyword ? 'Có' : 'Không',
      'Có từ khóa trong H1',
      h1HasKeyword
        ? 'H1 đã chứa từ khóa'
        : `Thêm "${keyword}" vào H1`,
      2
    )
  );

  // 4.3 At least 2 H2 (1 point)
  checks.push(
    createCheck(
      '4.3',
      'Có ≥2 H2',
      h2.length >= 2,
      h2.length,
      '≥2 H2',
      h2.length >= 2
        ? 'Đủ số lượng H2'
        : `Thêm ${2 - h2.length} thẻ H2`,
      1,
      h2.length >= 1
    )
  );

  // 4.4 At least 1 H2 contains keyword/variant (2 points)
  const allKeywords = [keyword, ...secondaryKeywords].map((k) => k.toLowerCase());
  const h2HasKeyword = h2.some((heading) =>
    allKeywords.some((kw) => heading.toLowerCase().includes(kw))
  );
  checks.push(
    createCheck(
      '4.4',
      '≥1 H2 chứa từ khóa/biến thể',
      h2HasKeyword,
      h2HasKeyword ? 'Có' : 'Không',
      'Có từ khóa trong ≥1 H2',
      h2HasKeyword
        ? 'H2 đã chứa từ khóa'
        : 'Thêm từ khóa hoặc biến thể vào ít nhất 1 H2',
      2
    )
  );

  // 4.5 Proper hierarchy H1→H2→H3 (1 point)
  let properHierarchy = true;
  if (h1.length === 0 && (h2.length > 0 || h3.length > 0)) {
    properHierarchy = false;
  }
  if (h2.length === 0 && h3.length > 0) {
    properHierarchy = false;
  }

  checks.push(
    createCheck(
      '4.5',
      'Cấu trúc heading đúng thứ tự',
      properHierarchy,
      properHierarchy ? 'Đúng' : 'Sai',
      'H1 → H2 → H3',
      properHierarchy
        ? 'Cấu trúc heading hợp lệ'
        : 'Sửa lại thứ tự heading: H1 trước, rồi H2, rồi H3',
      1
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return {
    id: 'heading-structure',
    name: 'Heading Structure',
    score: totalScore,
    maxScore,
    checks,
  };
}

// Module 5: Content (16 points)
function checkContent(
  pageData: PageData,
  keyword: string,
  secondaryKeywords: string[]
): Module {
  const { bodyText, wordCount, articleType, paragraphs, lists } = pageData;
  const checks: Check[] = [];
  const keywordLower = keyword.toLowerCase();

  // 5.1 Word count by article type (3 points)
  const requiredWords = WORD_COUNT_REQUIREMENTS[articleType];
  const wordCountPass = wordCount >= requiredWords;
  checks.push(
    createCheck(
      '5.1',
      `Độ dài bài viết (${articleType})`,
      wordCountPass,
      wordCount,
      `≥${requiredWords} từ`,
      wordCountPass
        ? 'Độ dài bài viết đạt chuẩn'
        : `Thêm ${requiredWords - wordCount} từ`,
      3,
      wordCount >= requiredWords * 0.7
    )
  );

  // 5.2 Keyword coverage (2 points)
  const keywordDensity = (countKeywordOccurrences(bodyText, keyword) / wordCount) * 100;
  const optimalDensity = keywordDensity >= 0.5 && keywordDensity <= 2.5;
  checks.push(
    createCheck(
      '5.2',
      'Mật độ từ khóa tự nhiên (0.5-2.5%)',
      optimalDensity,
      `${keywordDensity.toFixed(2)}%`,
      '0.5-2.5%',
      optimalDensity
        ? 'Mật độ từ khóa tối ưu'
        : keywordDensity < 0.5
          ? 'Thêm từ khóa vào nội dung'
          : 'Giảm bớt từ khóa, tránh keyword stuffing',
      2,
      keywordDensity >= 0.3 && keywordDensity <= 3
    )
  );

  // 5.3 Keyword in first 100 words (2 points)
  const first100 = getFirst100Words(bodyText).toLowerCase();
  const keywordInFirst100 = first100.includes(keywordLower);
  checks.push(
    createCheck(
      '5.3',
      'Từ khóa trong 100 từ đầu',
      keywordInFirst100,
      keywordInFirst100 ? 'Có' : 'Không',
      'Có từ khóa trong 100 từ đầu',
      keywordInFirst100
        ? 'Từ khóa xuất hiện sớm trong bài'
        : 'Thêm từ khóa vào phần mở đầu bài viết',
      2
    )
  );

  // 5.4 Keyword in last 200 words (1 point)
  const last200 = getLast200Words(bodyText).toLowerCase();
  const keywordInLast200 = last200.includes(keywordLower);
  checks.push(
    createCheck(
      '5.4',
      'Từ khóa trong 200 từ cuối',
      keywordInLast200,
      keywordInLast200 ? 'Có' : 'Không',
      'Có từ khóa trong 200 từ cuối',
      keywordInLast200
        ? 'Từ khóa xuất hiện ở cuối bài'
        : 'Thêm từ khóa vào phần kết bài',
      1
    )
  );

  // 5.5 Secondary keywords coverage >= 70% (2 points)
  let secondaryCount = 0;
  if (secondaryKeywords.length > 0) {
    secondaryKeywords.forEach((kw) => {
      if (bodyText.toLowerCase().includes(kw.toLowerCase())) {
        secondaryCount++;
      }
    });
    const coverage = (secondaryCount / secondaryKeywords.length) * 100;
    checks.push(
      createCheck(
        '5.5',
        '≥70% từ khóa phụ xuất hiện',
        coverage >= 70,
        `${Math.round(coverage)}% (${secondaryCount}/${secondaryKeywords.length})`,
        '≥70%',
        coverage >= 70
          ? 'Đủ từ khóa phụ'
          : `Thêm các từ khóa phụ còn thiếu: ${secondaryKeywords
              .filter((kw) => !bodyText.toLowerCase().includes(kw.toLowerCase()))
              .join(', ')}`,
        2,
        coverage >= 50
      )
    );
  } else {
    checks.push(
      createCheck(
        '5.5',
        '≥70% từ khóa phụ xuất hiện',
        true,
        'N/A',
        '≥70%',
        'Không có từ khóa phụ để kiểm tra',
        2
      )
    );
  }

  // 5.6 Paragraph length <= 100 words (2 points)
  const longParagraphs = paragraphs.filter(
    (p) => p.split(/\s+/).length > 100
  ).length;
  const paragraphPass = longParagraphs === 0;
  checks.push(
    createCheck(
      '5.6',
      'Đoạn văn ≤100 từ',
      paragraphPass,
      longParagraphs === 0 ? 'Tất cả đạt' : `${longParagraphs} đoạn dài`,
      'Tất cả đoạn ≤100 từ',
      paragraphPass
        ? 'Các đoạn văn ngắn gọn'
        : `Chia nhỏ ${longParagraphs} đoạn dài thành các đoạn ngắn hơn`,
      2,
      longParagraphs <= 2
    )
  );

  // 5.7 Has bullet points (1 point)
  const hasBullets = lists.length > 0;
  checks.push(
    createCheck(
      '5.7',
      'Có bullet points/list',
      hasBullets,
      hasBullets ? `${lists.length} danh sách` : 'Không có',
      'Có ≥1 danh sách',
      hasBullets
        ? 'Bài viết có sử dụng danh sách'
        : 'Thêm danh sách bullet points để dễ đọc hơn',
      1
    )
  );

  // 5.8 Has >= 2 specific numbers (2 points)
  const numberPattern = /\d+(\.\d+)?(%|%|\s*(triệu|tỷ|nghìn|km|m|kg|g|năm|tháng|ngày|giờ|phút))?/gi;
  const numbers = bodyText.match(numberPattern) || [];
  const uniqueNumbers = [...new Set(numbers)].length;
  checks.push(
    createCheck(
      '5.8',
      'Có ≥2 số liệu cụ thể',
      uniqueNumbers >= 2,
      uniqueNumbers,
      '≥2 số liệu',
      uniqueNumbers >= 2
        ? 'Bài viết có số liệu cụ thể'
        : 'Thêm số liệu cụ thể để tăng độ tin cậy',
      2,
      uniqueNumbers >= 1
    )
  );

  // 5.9 Readability (1 point)
  const sentences = bodyText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const longSentences = sentences.filter((s) => s.split(/\s+/).length > 25).length;
  const longSentenceRatio = sentences.length > 0 ? longSentences / sentences.length : 0;
  checks.push(
    createCheck(
      '5.9',
      'Readability: ≤20% câu dài >25 từ',
      longSentenceRatio <= 0.2,
      `${Math.round(longSentenceRatio * 100)}%`,
      '≤20%',
      longSentenceRatio <= 0.2
        ? 'Câu văn dễ đọc'
        : 'Chia nhỏ các câu dài thành câu ngắn hơn',
      1,
      longSentenceRatio <= 0.3
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return { id: 'content', name: 'Nội dung', score: totalScore, maxScore, checks };
}

// Module 6: Sapo/Opening (5 points)
function checkSapo(pageData: PageData, keyword: string, brandName: string): Module {
  const { paragraphs, bodyText } = pageData;
  const checks: Check[] = [];
  const keywordLower = keyword.toLowerCase();
  const brandLower = brandName.toLowerCase();

  const sapo = paragraphs[0] || '';
  const sapoWords = sapo.split(/\s+/).filter((w) => w.length > 0);

  // 6.1 Length 50-100 words (2 points)
  const sapoLength = sapoWords.length;
  checks.push(
    createCheck(
      '6.1',
      'Độ dài Sapo 50-100 từ',
      sapoLength >= 50 && sapoLength <= 100,
      sapoLength,
      '50-100 từ',
      sapoLength >= 50 && sapoLength <= 100
        ? 'Độ dài sapo phù hợp'
        : sapoLength < 50
          ? 'Mở rộng sapo thêm chi tiết'
          : 'Rút ngắn sapo cho súc tích hơn',
      2,
      sapoLength >= 30 && sapoLength <= 120
    )
  );

  // 6.2 Contains main keyword (2 points)
  const sapoHasKeyword = sapo.toLowerCase().includes(keywordLower);
  checks.push(
    createCheck(
      '6.2',
      'Sapo chứa từ khóa chính',
      sapoHasKeyword,
      sapoHasKeyword ? 'Có' : 'Không',
      'Có từ khóa chính',
      sapoHasKeyword
        ? 'Sapo đã chứa từ khóa'
        : 'Thêm từ khóa chính vào đoạn mở đầu',
      2
    )
  );

  // 6.3 Bold keyword/brand (1 point)
  const first500 = getFirstNWords(bodyText, 100);
  const hasBoldKeyword =
    first500.includes(`<strong>${keyword}`) ||
    first500.includes(`<b>${keyword}`) ||
    first500.includes(`<strong>${brandName}`) ||
    first500.includes(`<b>${brandName}`);

  // Check from HTML for bold text
  const htmlFirst = pageData.html.slice(0, 2000).toLowerCase();
  const hasBold =
    hasBoldKeyword ||
    (htmlFirst.includes('<strong>') &&
     (htmlFirst.includes(keywordLower) || htmlFirst.includes(brandLower)));

  checks.push(
    createCheck(
      '6.3',
      'In đậm từ khóa/brand',
      hasBold,
      hasBold ? 'Có' : 'Không',
      'Có in đậm',
      hasBold
        ? 'Đã in đậm từ khóa/brand'
        : 'In đậm từ khóa hoặc tên thương hiệu trong sapo',
      1
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return { id: 'sapo', name: 'Sapo/Mở bài', score: totalScore, maxScore, checks };
}

// Module 7: Conclusion (3 points)
function checkConclusion(pageData: PageData): Module {
  const { h2, h3, paragraphs, bodyText } = pageData;
  const checks: Check[] = [];

  // 7.1 Has conclusion heading (1 point)
  const allHeadings = [...h2, ...h3].map((h) => h.toLowerCase());
  const hasConclusionHeading = allHeadings.some((h) =>
    CONCLUSION_HEADINGS.some((ch) => h.includes(ch))
  );
  checks.push(
    createCheck(
      '7.1',
      'Có heading kết luận',
      hasConclusionHeading,
      hasConclusionHeading ? 'Có' : 'Không',
      'Có: Tóm lại, Kết luận...',
      hasConclusionHeading
        ? 'Có heading kết luận'
        : 'Thêm heading "Tóm lại" hoặc "Kết luận"',
      1
    )
  );

  // 7.2 Has CTA at end (2 points)
  const last500 = getLast200Words(bodyText).toLowerCase();
  const lastParagraph = paragraphs[paragraphs.length - 1]?.toLowerCase() || '';
  const hasCTA = CTA_WORDS.some(
    (cta) => last500.includes(cta) || lastParagraph.includes(cta)
  );
  checks.push(
    createCheck(
      '7.2',
      'Có CTA cuối bài',
      hasCTA,
      hasCTA ? 'Có' : 'Không',
      'Có CTA: Xem ngay, Liên hệ...',
      hasCTA
        ? 'Có CTA cuối bài'
        : 'Thêm lời kêu gọi hành động ở cuối bài',
      2
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return { id: 'conclusion', name: 'Kết bài', score: totalScore, maxScore, checks };
}

// Module 8: Images (9 points)
function checkImages(pageData: PageData, keyword: string): Module {
  const { images, ogImage, wordCount } = pageData;
  const checks: Check[] = [];
  const keywordLower = keyword.toLowerCase();

  // 8.1 Has og:image (1 point)
  checks.push(
    createCheck(
      '8.1',
      'Có og:image',
      !!ogImage,
      ogImage ? 'Có' : 'Không',
      'Có og:image',
      ogImage
        ? 'Đã có og:image'
        : 'Thêm og:image cho chia sẻ mạng xã hội',
      1
    )
  );

  // 8.2 Image count >= 1 per 500 words (1 point)
  const requiredImages = Math.max(1, Math.floor(wordCount / 500));
  const hasEnoughImages = images.length >= requiredImages;
  checks.push(
    createCheck(
      '8.2',
      'Số lượng ≥1 ảnh/500 từ',
      hasEnoughImages,
      `${images.length} ảnh`,
      `≥${requiredImages} ảnh`,
      hasEnoughImages
        ? 'Đủ số lượng hình ảnh'
        : `Thêm ${requiredImages - images.length} hình ảnh`,
      1,
      images.length >= Math.floor(requiredImages * 0.5)
    )
  );

  // 8.3 100% images have alt >= 10 chars (2 points)
  const imagesWithGoodAlt = images.filter((img) => img.alt.length >= 10);
  const altPercentage = images.length > 0 ? (imagesWithGoodAlt.length / images.length) * 100 : 100;
  checks.push(
    createCheck(
      '8.3',
      '100% ảnh có alt ≥10 ký tự',
      altPercentage === 100,
      `${Math.round(altPercentage)}%`,
      '100%',
      altPercentage === 100
        ? 'Tất cả ảnh có alt text đầy đủ'
        : `Thêm alt text cho ${images.length - imagesWithGoodAlt.length} ảnh`,
      2,
      altPercentage >= 70
    )
  );

  // 8.4 >= 1 image has keyword in alt (2 points)
  const imagesWithKeywordAlt = images.filter((img) =>
    img.alt.toLowerCase().includes(keywordLower)
  );
  checks.push(
    createCheck(
      '8.4',
      '≥1 ảnh có từ khóa trong alt',
      imagesWithKeywordAlt.length >= 1,
      imagesWithKeywordAlt.length,
      '≥1 ảnh',
      imagesWithKeywordAlt.length >= 1
        ? 'Có ảnh chứa từ khóa trong alt'
        : 'Thêm từ khóa vào alt text của ít nhất 1 ảnh',
      2
    )
  );

  // 8.5 >= 50% images have caption (1 point)
  const imagesWithCaption = images.filter((img) => img.caption);
  const captionPercentage = images.length > 0 ? (imagesWithCaption.length / images.length) * 100 : 100;
  checks.push(
    createCheck(
      '8.5',
      '≥50% ảnh có caption',
      captionPercentage >= 50,
      `${Math.round(captionPercentage)}%`,
      '≥50%',
      captionPercentage >= 50
        ? 'Đủ ảnh có caption'
        : 'Thêm caption cho các hình ảnh',
      1,
      captionPercentage >= 30
    )
  );

  // 8.6 Lazy loading (1 point)
  const hasLazyLoading = images.some((img) => img.hasLazyLoading);
  checks.push(
    createCheck(
      '8.6',
      'Có Lazy Loading',
      hasLazyLoading,
      hasLazyLoading ? 'Có' : 'Không',
      'Có lazy loading',
      hasLazyLoading
        ? 'Đã có lazy loading'
        : 'Thêm loading="lazy" cho hình ảnh',
      1
    )
  );

  // 8.7 Filename not IMG_xxx, DSC_xxx (1 point)
  const badFilenames = images.filter((img) => {
    const filename = img.src.split('/').pop()?.toLowerCase() || '';
    return /^(img_|dsc_|image|photo|picture|\d+)\d*/i.test(filename);
  });
  checks.push(
    createCheck(
      '8.7',
      'Tên file có ý nghĩa',
      badFilenames.length === 0,
      badFilenames.length === 0 ? 'Tất cả tốt' : `${badFilenames.length} ảnh tên xấu`,
      'Không có IMG_xxx, DSC_xxx',
      badFilenames.length === 0
        ? 'Tên file ảnh đều có ý nghĩa'
        : 'Đổi tên file ảnh thành tên mô tả nội dung',
      1
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return { id: 'images', name: 'Hình ảnh', score: totalScore, maxScore, checks };
}

// Module 9: Internal Links (5 points)
function checkInternalLinks(pageData: PageData): Module {
  const { internalLinks, wordCount } = pageData;
  const checks: Check[] = [];

  // 9.1 Link count >= 3 per 1000 words (2 points)
  const requiredLinks = Math.max(3, Math.floor((wordCount / 1000) * 3));
  const hasEnoughLinks = internalLinks.length >= requiredLinks;
  checks.push(
    createCheck(
      '9.1',
      'Số lượng ≥3 links/1000 từ',
      hasEnoughLinks,
      internalLinks.length,
      `≥${requiredLinks} links`,
      hasEnoughLinks
        ? 'Đủ internal links'
        : `Thêm ${requiredLinks - internalLinks.length} internal links`,
      2,
      internalLinks.length >= Math.floor(requiredLinks * 0.5)
    )
  );

  // 9.2 Has link in first 300 words (1 point)
  const linksInFirst300 = internalLinks.filter((l) => l.position <= 300);
  checks.push(
    createCheck(
      '9.2',
      'Có link trong 300 từ đầu',
      linksInFirst300.length > 0,
      linksInFirst300.length > 0 ? 'Có' : 'Không',
      'Có ≥1 link',
      linksInFirst300.length > 0
        ? 'Có link ở đầu bài'
        : 'Thêm internal link vào phần đầu bài viết',
      1
    )
  );

  // 9.3 Diverse anchor text >= 70% (2 points)
  const anchors = internalLinks.map((l) => l.text.toLowerCase());
  const uniqueAnchors = [...new Set(anchors)];
  const diversityRatio = anchors.length > 0 ? (uniqueAnchors.length / anchors.length) * 100 : 100;

  const badAnchors = internalLinks.filter((l) =>
    BAD_ANCHOR_TEXTS.some((bad) => l.text.toLowerCase().includes(bad))
  );

  const diverseAndGood = diversityRatio >= 70 && badAnchors.length === 0;
  checks.push(
    createCheck(
      '9.3',
      'Anchor text đa dạng ≥70%',
      diverseAndGood,
      `${Math.round(diversityRatio)}% đa dạng`,
      '≥70%, không "click đây"',
      diverseAndGood
        ? 'Anchor text đa dạng và tự nhiên'
        : badAnchors.length > 0
          ? 'Thay anchor text "click đây" bằng mô tả có ý nghĩa'
          : 'Đa dạng hóa anchor text',
      2,
      diversityRatio >= 50
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return { id: 'internal-links', name: 'Link nội bộ', score: totalScore, maxScore, checks };
}

// Module 10: External Links (4 points)
function checkExternalLinks(pageData: PageData): Module {
  const { externalLinks } = pageData;
  const checks: Check[] = [];

  // 10.1 Has >= 1 external link (1 point)
  checks.push(
    createCheck(
      '10.1',
      'Có ≥1 external link',
      externalLinks.length >= 1,
      externalLinks.length,
      '≥1 link',
      externalLinks.length >= 1
        ? 'Có external link'
        : 'Thêm external link đến nguồn uy tín',
      1
    )
  );

  // 10.2 Trusted sources (2 points)
  const trustedLinks = externalLinks.filter((l) =>
    TRUSTED_DOMAINS.some((domain) => l.href.includes(domain))
  );
  checks.push(
    createCheck(
      '10.2',
      'Nguồn uy tín: .gov, .edu, báo lớn',
      trustedLinks.length >= 1,
      trustedLinks.length,
      '≥1 nguồn uy tín',
      trustedLinks.length >= 1
        ? 'Có link đến nguồn uy tín'
        : 'Thêm link đến nguồn uy tín như Wikipedia, báo lớn, .gov, .edu',
      2
    )
  );

  // 10.3 All have target="_blank" (1 point)
  const linksWithTarget = externalLinks.filter((l) => l.target === '_blank');
  const allHaveTarget = externalLinks.length === 0 || linksWithTarget.length === externalLinks.length;
  checks.push(
    createCheck(
      '10.3',
      'Tất cả có target="_blank"',
      allHaveTarget,
      allHaveTarget ? 'Tất cả' : `${linksWithTarget.length}/${externalLinks.length}`,
      '100%',
      allHaveTarget
        ? 'Tất cả external links mở tab mới'
        : 'Thêm target="_blank" cho các external links',
      1
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return { id: 'external-links', name: 'Link ngoài', score: totalScore, maxScore, checks };
}

// Module 11: E-E-A-T (6 points)
function checkEEAT(pageData: PageData): Module {
  const { author, authorLink, publishDate, modifiedDate } = pageData;
  const checks: Check[] = [];

  // 11.1 Has author name (2 points)
  checks.push(
    createCheck(
      '11.1',
      'Có tên tác giả',
      !!author,
      author || 'Không có',
      'Có tên tác giả',
      author
        ? 'Có thông tin tác giả'
        : 'Thêm tên tác giả vào bài viết',
      2
    )
  );

  // 11.2 Has author link (1 point)
  checks.push(
    createCheck(
      '11.2',
      'Có link tác giả',
      !!authorLink,
      authorLink ? 'Có' : 'Không',
      'Có link profile tác giả',
      authorLink
        ? 'Có link đến profile tác giả'
        : 'Thêm link đến trang tác giả',
      1
    )
  );

  // 11.3 Has publish date (2 points)
  checks.push(
    createCheck(
      '11.3',
      'Có ngày xuất bản',
      !!publishDate,
      publishDate || 'Không có',
      'Có ngày xuất bản',
      publishDate
        ? 'Có ngày xuất bản'
        : 'Thêm ngày xuất bản bài viết',
      2
    )
  );

  // 11.4 Has modified date (1 point)
  checks.push(
    createCheck(
      '11.4',
      'Có ngày cập nhật',
      !!modifiedDate,
      modifiedDate || 'Không có',
      'Có ngày cập nhật',
      modifiedDate
        ? 'Có ngày cập nhật'
        : 'Thêm ngày cập nhật gần nhất',
      1
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return { id: 'eeat', name: 'E-E-A-T', score: totalScore, maxScore, checks };
}

// Module 12: Schema Markup (8 points)
function checkSchemaMarkup(pageData: PageData): Module {
  const { schemas, articleType } = pageData;
  const checks: Check[] = [];

  // 12.1 Has Article Schema (2 points)
  const articleSchema = schemas.find((s) =>
    ['Article', 'NewsArticle', 'BlogPosting'].includes(s.type)
  );
  checks.push(
    createCheck(
      '12.1',
      'Có Article Schema',
      !!articleSchema,
      articleSchema ? articleSchema.type : 'Không có',
      'Có Article/BlogPosting',
      articleSchema
        ? 'Có Article Schema'
        : 'Thêm Article Schema JSON-LD',
      2
    )
  );

  // 12.2 Article has required fields (2 points)
  const requiredFields = ['headline', 'author', 'datePublished', 'image'];
  const presentFields = articleSchema
    ? requiredFields.filter((f) => articleSchema.data[f])
    : [];
  const hasAllFields = presentFields.length === requiredFields.length;
  checks.push(
    createCheck(
      '12.2',
      'Article đủ fields quan trọng',
      hasAllFields,
      `${presentFields.length}/${requiredFields.length}`,
      'headline, author, datePublished, image',
      hasAllFields
        ? 'Article Schema đầy đủ'
        : `Thêm fields: ${requiredFields.filter((f) => !presentFields.includes(f)).join(', ')}`,
      2,
      presentFields.length >= 2
    )
  );

  // 12.3 Has BreadcrumbList (1 point)
  const hasBreadcrumb = schemas.some((s) => s.type === 'BreadcrumbList');
  checks.push(
    createCheck(
      '12.3',
      'Có BreadcrumbList Schema',
      hasBreadcrumb,
      hasBreadcrumb ? 'Có' : 'Không',
      'Có BreadcrumbList',
      hasBreadcrumb
        ? 'Có BreadcrumbList Schema'
        : 'Thêm BreadcrumbList Schema',
      1
    )
  );

  // 12.4 Schema by article type (2 points)
  const typeSchemaMap: Record<ArticleType, string[]> = {
    faq: ['FAQPage'],
    guide: ['HowTo'],
    food: ['Recipe'],
    review: ['Review'],
    product: ['Product'],
    video: ['VideoObject'],
    destination: ['Place', 'TouristDestination'],
    news: ['NewsArticle'],
    article: ['Article', 'BlogPosting'],
  };

  const expectedSchemas = typeSchemaMap[articleType] || [];
  const hasTypeSchema = schemas.some((s) =>
    expectedSchemas.includes(s.type)
  );
  checks.push(
    createCheck(
      '12.4',
      `Schema theo loại bài (${articleType})`,
      hasTypeSchema,
      hasTypeSchema ? 'Có' : 'Không',
      expectedSchemas.join(' hoặc '),
      hasTypeSchema
        ? 'Có schema phù hợp loại bài'
        : `Thêm ${expectedSchemas[0]} Schema`,
      2
    )
  );

  // 12.5 Valid JSON-LD (1 point)
  const hasSchemas = schemas.length > 0;
  checks.push(
    createCheck(
      '12.5',
      'Schema JSON-LD hợp lệ',
      hasSchemas,
      hasSchemas ? 'Có' : 'Không có schema',
      'JSON-LD hợp lệ',
      hasSchemas
        ? 'JSON-LD hợp lệ'
        : 'Thêm schema JSON-LD',
      1
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return { id: 'schema', name: 'Schema Markup', score: totalScore, maxScore, checks };
}

// Module 13: Brand (3 points)
function checkBrand(pageData: PageData, brandName: string): Module {
  const { bodyText } = pageData;
  const checks: Check[] = [];
  const brandLower = brandName.toLowerCase();

  // 13.1 Brand appears in content (2 points)
  const brandCount = countKeywordOccurrences(bodyText, brandName);
  checks.push(
    createCheck(
      '13.1',
      'Brand xuất hiện trong bài',
      brandCount >= 1,
      brandCount,
      '≥1 lần',
      brandCount >= 1
        ? 'Brand đã xuất hiện trong bài'
        : `Thêm tên thương hiệu "${brandName}" vào bài viết`,
      2
    )
  );

  // 13.2 Correct spelling (1 point)
  const bodyLower = bodyText.toLowerCase();
  const hasExactSpelling = bodyLower.includes(brandLower);
  checks.push(
    createCheck(
      '13.2',
      'Viết đúng chính tả brand',
      hasExactSpelling || brandCount === 0,
      hasExactSpelling ? 'Đúng' : 'Không tìm thấy',
      `"${brandName}"`,
      hasExactSpelling
        ? 'Brand viết đúng chính tả'
        : `Đảm bảo viết đúng "${brandName}"`,
      1
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return { id: 'brand', name: 'Brand', score: totalScore, maxScore, checks };
}

// Module 14: Local SEO (6 points) - Only for destination/food
function checkLocalSEO(pageData: PageData): Module {
  const { bodyText, articleType, internalLinks, externalLinks } = pageData;
  const checks: Check[] = [];

  const isLocalType = ['destination', 'food'].includes(articleType);

  // 14.1 Geo keywords (2 points)
  const hasGeoKeywords = GEO_KEYWORDS.some((kw) =>
    bodyText.toLowerCase().includes(kw)
  );
  checks.push(
    createCheck(
      '14.1',
      'Có geo keywords: tại, ở, quận...',
      !isLocalType || hasGeoKeywords,
      hasGeoKeywords ? 'Có' : 'Không',
      isLocalType ? 'Có từ khóa địa lý' : 'N/A (không phải local content)',
      hasGeoKeywords || !isLocalType
        ? isLocalType ? 'Có từ khóa địa lý' : 'Không yêu cầu cho loại bài này'
        : 'Thêm từ khóa địa lý: tại, ở, quận, đường...',
      2
    )
  );

  // 14.2 Specific address (2 points)
  const addressPattern = /(\d+\s*(\/\d+)?\s*(đường|phố|ngõ|hẻm)|số\s*\d+)/i;
  const hasAddress = addressPattern.test(bodyText);
  checks.push(
    createCheck(
      '14.2',
      'Có địa chỉ cụ thể',
      !isLocalType || hasAddress,
      hasAddress ? 'Có' : 'Không',
      isLocalType ? 'Có địa chỉ số' : 'N/A',
      hasAddress || !isLocalType
        ? isLocalType ? 'Có địa chỉ cụ thể' : 'Không yêu cầu'
        : 'Thêm địa chỉ cụ thể với số nhà, đường',
      2
    )
  );

  // 14.3 Phone number (1 point)
  const phonePattern = /(\+84|0)\d{9,10}/;
  const hasPhone = phonePattern.test(bodyText);
  checks.push(
    createCheck(
      '14.3',
      'Có số điện thoại',
      !isLocalType || hasPhone,
      hasPhone ? 'Có' : 'Không',
      isLocalType ? 'Có số điện thoại' : 'N/A',
      hasPhone || !isLocalType
        ? isLocalType ? 'Có số điện thoại' : 'Không yêu cầu'
        : 'Thêm số điện thoại liên hệ',
      1
    )
  );

  // 14.4 Google Maps link (1 point)
  const allLinks = [...internalLinks, ...externalLinks];
  const hasMapLink = allLinks.some((l) =>
    l.href.includes('google.com/maps') || l.href.includes('goo.gl/maps')
  );
  checks.push(
    createCheck(
      '14.4',
      'Có Google Maps link',
      !isLocalType || hasMapLink,
      hasMapLink ? 'Có' : 'Không',
      isLocalType ? 'Có link Maps' : 'N/A',
      hasMapLink || !isLocalType
        ? isLocalType ? 'Có link Google Maps' : 'Không yêu cầu'
        : 'Thêm link Google Maps đến địa điểm',
      1
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return { id: 'local-seo', name: 'Local SEO', score: totalScore, maxScore, checks };
}

// Module 15: Technical Onpage (4 points)
function checkTechnicalOnpage(pageData: PageData): Module {
  const { canonical, ogTitle, ogDescription, ogImage, twitterCard } = pageData;
  const checks: Check[] = [];

  // 15.1 Has canonical URL (2 points)
  checks.push(
    createCheck(
      '15.1',
      'Có Canonical URL',
      !!canonical,
      canonical || 'Không có',
      'Có canonical',
      canonical
        ? 'Có canonical URL'
        : 'Thêm thẻ canonical để tránh duplicate content',
      2
    )
  );

  // 15.2 Open Graph complete (1 point)
  const hasOG = !!ogTitle && !!ogDescription && !!ogImage;
  checks.push(
    createCheck(
      '15.2',
      'Open Graph đầy đủ',
      hasOG,
      hasOG ? 'Đầy đủ' : 'Thiếu',
      'og:title, og:description, og:image',
      hasOG
        ? 'Open Graph đầy đủ'
        : `Thêm: ${[!ogTitle && 'og:title', !ogDescription && 'og:description', !ogImage && 'og:image'].filter(Boolean).join(', ')}`,
      1
    )
  );

  // 15.3 Twitter Cards (1 point)
  checks.push(
    createCheck(
      '15.3',
      'Có Twitter Cards',
      !!twitterCard,
      twitterCard || 'Không có',
      'Có twitter:card',
      twitterCard
        ? 'Có Twitter Cards'
        : 'Thêm Twitter Cards meta tags',
      1
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return { id: 'technical', name: 'Technical Onpage', score: totalScore, maxScore, checks };
}

// Module 16: AI Optimization (7 points)
function checkAIOptimization(pageData: PageData, keyword: string): Module {
  const { bodyText, h2, h3, lists } = pageData;
  const checks: Check[] = [];
  const keywordLower = keyword.toLowerCase();

  // 16.1 Definition box in first 60 words (2 points)
  const first60 = getFirstNWords(bodyText, 60).toLowerCase();
  const definitionPattern = new RegExp(`${keywordLower}\\s+(là|được định nghĩa|có nghĩa)`, 'i');
  const hasDefinition = definitionPattern.test(first60) || first60.includes(`${keywordLower} là`);
  checks.push(
    createCheck(
      '16.1',
      'Definition box trong 60 từ đầu',
      hasDefinition,
      hasDefinition ? 'Có' : 'Không',
      '"[Keyword] là..."',
      hasDefinition
        ? 'Có definition box'
        : `Thêm định nghĩa "${keyword} là..." trong 60 từ đầu`,
      2
    )
  );

  // 16.2 FAQ section >= 3 questions (2 points)
  const allHeadings = [...h2, ...h3];
  const questionHeadings = allHeadings.filter((h) =>
    h.includes('?') || PAA_PATTERNS.some((p) => h.toLowerCase().includes(p))
  );
  checks.push(
    createCheck(
      '16.2',
      'FAQ section ≥3 câu hỏi H2/H3',
      questionHeadings.length >= 3,
      questionHeadings.length,
      '≥3 câu hỏi',
      questionHeadings.length >= 3
        ? 'Có đủ FAQ section'
        : 'Thêm FAQ với các câu hỏi phổ biến về chủ đề',
      2,
      questionHeadings.length >= 1
    )
  );

  // 16.3 Numbers with source citation (1 point)
  const sourcePattern = /(theo|nguồn|source|data from|số liệu từ)/i;
  const hasCitation = sourcePattern.test(bodyText);
  checks.push(
    createCheck(
      '16.3',
      'Số liệu có trích nguồn',
      hasCitation,
      hasCitation ? 'Có' : 'Không',
      'Có trích nguồn',
      hasCitation
        ? 'Có trích dẫn nguồn'
        : 'Thêm nguồn cho các số liệu thống kê',
      1
    )
  );

  // 16.4 Has numbered list (1 point)
  const hasOrderedList = lists.some((l) => l.type === 'ol');
  checks.push(
    createCheck(
      '16.4',
      'Có danh sách đánh số',
      hasOrderedList,
      hasOrderedList ? 'Có' : 'Không',
      'Có ordered list',
      hasOrderedList
        ? 'Có danh sách đánh số'
        : 'Thêm danh sách đánh số cho các bước/tips',
      1
    )
  );

  // 16.5 PAA-ready questions (1 point)
  const paaQuestions = allHeadings.filter((h) =>
    PAA_PATTERNS.some((p) => h.toLowerCase().includes(p))
  );
  checks.push(
    createCheck(
      '16.5',
      'Câu hỏi PAA-ready',
      paaQuestions.length >= 1,
      paaQuestions.length,
      '≥1 câu hỏi',
      paaQuestions.length >= 1
        ? 'Có câu hỏi dạng PAA'
        : 'Thêm heading dạng: "Làm sao...", "Tại sao...", "...là gì?"',
      1
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return { id: 'ai-optimization', name: 'AI Optimization', score: totalScore, maxScore, checks };
}

// Module 17: Freshness (4 points)
function checkFreshness(pageData: PageData): Module {
  const { publishDate, modifiedDate, title, h1, h2 } = pageData;
  const checks: Check[] = [];

  // 17.1 Has publish date (2 points)
  checks.push(
    createCheck(
      '17.1',
      'Có ngày xuất bản',
      !!publishDate,
      publishDate || 'Không có',
      'Có datePublished',
      publishDate
        ? 'Có ngày xuất bản'
        : 'Thêm ngày xuất bản bài viết',
      2
    )
  );

  // 17.2 Has modified date (1 point)
  checks.push(
    createCheck(
      '17.2',
      'Có ngày cập nhật',
      !!modifiedDate,
      modifiedDate || 'Không có',
      'Có dateModified',
      modifiedDate
        ? 'Có ngày cập nhật'
        : 'Thêm ngày cập nhật gần nhất',
      1
    )
  );

  // 17.3 Year in title/heading (1 point)
  const currentYear = new Date().getFullYear();
  const allText = [title, ...h1, ...h2].join(' ');
  const hasYear = allText.includes(String(currentYear)) || allText.includes(String(currentYear - 1));
  checks.push(
    createCheck(
      '17.3',
      `Có năm [${currentYear}] trong title/heading`,
      hasYear,
      hasYear ? 'Có' : 'Không',
      `Có ${currentYear}`,
      hasYear
        ? 'Có năm hiện tại'
        : `Thêm năm ${currentYear} vào title hoặc heading`,
      1
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return { id: 'freshness', name: 'Freshness', score: totalScore, maxScore, checks };
}

// Module 18: Featured Snippet (5 points)
function checkFeaturedSnippet(pageData: PageData): Module {
  const { paragraphs, h2, h3, wordCount, lists } = pageData;
  const checks: Check[] = [];

  // 18.1 Has 40-60 word paragraph (direct answer) (2 points)
  const snippetParagraphs = paragraphs.filter((p) => {
    const words = p.split(/\s+/).length;
    return words >= 40 && words <= 60;
  });
  checks.push(
    createCheck(
      '18.1',
      'Có đoạn 40-60 từ (Featured Snippet)',
      snippetParagraphs.length >= 1,
      snippetParagraphs.length,
      '≥1 đoạn',
      snippetParagraphs.length >= 1
        ? 'Có đoạn phù hợp featured snippet'
        : 'Thêm 1 đoạn 40-60 từ trả lời trực tiếp câu hỏi chính',
      2,
      paragraphs.some((p) => {
        const words = p.split(/\s+/).length;
        return words >= 30 && words <= 80;
      })
    )
  );

  // 18.2 Has list heading (2 points)
  const allHeadings = [...h2, ...h3];
  const listHeadings = allHeadings.filter((h) =>
    LIST_HEADING_PATTERNS.some((pattern) => pattern.test(h))
  );
  checks.push(
    createCheck(
      '18.2',
      'Có list heading: Top X, Các bước...',
      listHeadings.length >= 1,
      listHeadings.length,
      '≥1 heading',
      listHeadings.length >= 1
        ? 'Có heading dạng list'
        : 'Thêm heading như "Top 10...", "Các bước...", "Những điều..."',
      2
    )
  );

  // 18.3 Table of Contents for > 2000 words (1 point)
  const needsTOC = wordCount > 2000;
  const hasTOC = lists.some((l) => l.items.length >= 3 && l.items.some((item) =>
    allHeadings.some((h) => item.toLowerCase().includes(h.toLowerCase().slice(0, 20)))
  ));

  checks.push(
    createCheck(
      '18.3',
      'Table of Contents (bài >2000 từ)',
      !needsTOC || hasTOC,
      needsTOC ? (hasTOC ? 'Có' : 'Không') : 'N/A',
      needsTOC ? 'Có TOC' : 'Không yêu cầu',
      !needsTOC
        ? 'Bài viết chưa cần TOC'
        : hasTOC
          ? 'Có Table of Contents'
          : 'Thêm Table of Contents cho bài viết dài',
      1
    )
  );

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);

  return { id: 'featured-snippet', name: 'Featured Snippet', score: totalScore, maxScore, checks };
}
