import { NextRequest, NextResponse } from 'next/server';
import { Module, Check } from '@/types';

interface AISuggestionRequestBody {
  result: {
    title: string;
    url: string;
    wordCount: number;
    articleType: string;
    totalScore: number;
    maxScore: number;
    modules: Module[];
  };
  keywords: string[];
  brandName: string;
  geminiApiKey?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AISuggestionRequestBody = await request.json();
    const { result, keywords, brandName, geminiApiKey } = body;

    // Use API key from request body first, then fallback to env variable
    const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Vui lòng nhập Gemini API Key để sử dụng tính năng AI Suggestions' },
        { status: 400 }
      );
    }

    // Prepare the analysis prompt
    const failedChecks = getFailedChecks(result.modules);
    const warningChecks = getWarningChecks(result.modules);

    const prompt = buildPrompt(result, failedChecks, warningChecks, keywords, brandName);

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API Error:', errorData);

      // Check for specific error types
      if (response.status === 400) {
        return NextResponse.json(
          { error: 'API Key không hợp lệ. Vui lòng kiểm tra lại Gemini API Key.' },
          { status: 400 }
        );
      }
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Đã vượt quá giới hạn request. Vui lòng thử lại sau.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'Không thể gọi Gemini API. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      return NextResponse.json(
        { error: 'Không nhận được phản hồi từ AI. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ suggestion: text });
  } catch (error) {
    console.error('AI Suggestion Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Có lỗi xảy ra' },
      { status: 500 }
    );
  }
}

function getFailedChecks(modules: Module[]): { module: string; check: Check }[] {
  const failed: { module: string; check: Check }[] = [];
  modules.forEach(module => {
    module.checks.forEach(check => {
      if (check.status === 'fail') {
        failed.push({ module: module.name, check });
      }
    });
  });
  return failed;
}

function getWarningChecks(modules: Module[]): { module: string; check: Check }[] {
  const warnings: { module: string; check: Check }[] = [];
  modules.forEach(module => {
    module.checks.forEach(check => {
      if (check.status === 'warning') {
        warnings.push({ module: module.name, check });
      }
    });
  });
  return warnings;
}

function buildPrompt(
  result: { title: string; url: string; wordCount: number; articleType: string; totalScore: number; maxScore: number },
  failedChecks: { module: string; check: Check }[],
  warningChecks: { module: string; check: Check }[],
  keywords: string[],
  brandName: string
): string {
  const mainKeyword = keywords[0];
  const secondaryKeywords = keywords.slice(1);

  return `Bạn là chuyên gia SEO Onpage. Phân tích kết quả kiểm tra SEO và đưa ra đề xuất cải thiện chi tiết.

## THÔNG TIN BÀI VIẾT:
- URL: ${result.url}
- Title: ${result.title}
- Số từ: ${result.wordCount}
- Loại bài: ${result.articleType}
- Điểm SEO: ${result.totalScore}/${result.maxScore} (${Math.round((result.totalScore / result.maxScore) * 100)}%)

## TỪ KHÓA:
- Từ khóa chính: ${mainKeyword}
- Từ khóa phụ: ${secondaryKeywords.join(', ') || 'Không có'}
- Thương hiệu: ${brandName}

## CÁC LỖI CẦN SỬA (FAIL):
${failedChecks.map((f, i) => `${i + 1}. [${f.module}] ${f.check.name}
   - Hiện tại: ${f.check.current}
   - Yêu cầu: ${f.check.expected}
   - Gợi ý: ${f.check.suggestion}`).join('\n\n')}

## CÁC CẢNH BÁO (WARNING):
${warningChecks.map((w, i) => `${i + 1}. [${w.module}] ${w.check.name}
   - Hiện tại: ${w.check.current}
   - Yêu cầu: ${w.check.expected}`).join('\n\n')}

## YÊU CẦU:
Hãy đưa ra đề xuất cải thiện theo định dạng sau (viết bằng tiếng Việt, dễ hiểu):

### 1. TOP 5 VẤN ĐỀ CẤP BÁCH
Bảng markdown với cột: STT | Vấn đề | Mức độ | Giải pháp

### 2. ĐỀ XUẤT CẤU TRÚC HEADING
Gợi ý cấu trúc heading H1, H2, H3 tối ưu cho bài viết với từ khóa "${mainKeyword}"

### 3. ĐỀ XUẤT HÌNH ẢNH
- Gợi ý 3-5 loại hình ảnh nên có
- Mẫu alt text tối ưu cho từng ảnh

### 4. ĐỀ XUẤT INTERNAL LINKS
Gợi ý 3-5 anchor text và loại bài viết nên link đến

### 5. SCHEMA JSON-LD
Code schema JSON-LD phù hợp cho loại bài "${result.articleType}" với từ khóa "${mainKeyword}"

### 6. CHECKLIST SỬA LỖI
Danh sách checkbox các việc cần làm theo thứ tự ưu tiên

Hãy viết chi tiết, thực tế và có thể áp dụng ngay.`;
}
