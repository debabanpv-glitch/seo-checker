import { NextRequest, NextResponse } from 'next/server';
import { getSeoResults, upsertSeoResult } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const url = sp.get('url') || undefined;
    const urlsParam = sp.get('urls');
    const minimal = sp.get('minimal') === 'true';

    let urls: string[] | undefined;
    if (urlsParam) {
      try { urls = JSON.parse(urlsParam); } catch { /* ignore */ }
    }

    const results = getSeoResults({ url, urls, minimal });
    return NextResponse.json({ results });
  } catch (error) {
    return handleApiError(error);
  }
}

export function POST(request: NextRequest) {
  return request.json().then((body) => {
    try {
      const { url, result } = body;
      if (!url || !result) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      const saved = upsertSeoResult(url, result);
      return NextResponse.json({ success: true, result: saved });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
