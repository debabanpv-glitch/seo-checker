import { NextRequest, NextResponse } from 'next/server';
import { getBatchSeoResults } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export function POST(request: NextRequest) {
  return request.json().then((body) => {
    try {
      const { urls, minimal = false } = body;
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json({ results: [] });
      }
      return NextResponse.json({ results: getBatchSeoResults(urls, minimal) });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
