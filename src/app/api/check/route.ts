import { NextRequest, NextResponse } from 'next/server';
import { parseHTML } from '@/lib/parser';
import { runSEOCheck } from '@/lib/seo-checker';
import { SEOCheckRequest, SEOCheckResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: SEOCheckRequest = await request.json();
    const { url, keywords, brandName } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL là bắt buộc' },
        { status: 400 }
      );
    }

    if (!keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Cần ít nhất 1 từ khóa' },
        { status: 400 }
      );
    }

    // Fetch the URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOChecker/1.0; +https://banpham.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Không thể truy cập URL: ${response.status} ${response.statusText}` },
        { status: 400 }
      );
    }

    const html = await response.text();

    // Parse HTML
    const pageData = parseHTML(html, url);

    // Run SEO checks
    const modules = runSEOCheck(pageData, keywords, brandName);

    // Calculate total score
    const totalScore = modules.reduce((sum, m) => sum + m.score, 0);
    const maxScore = modules.reduce((sum, m) => sum + m.maxScore, 0);

    const result: SEOCheckResult = {
      url,
      title: pageData.title,
      wordCount: pageData.wordCount,
      articleType: pageData.articleType,
      totalScore,
      maxScore,
      modules,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('SEO Check Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Có lỗi xảy ra khi kiểm tra SEO' },
      { status: 500 }
    );
  }
}
