import { NextRequest, NextResponse } from 'next/server';
import { getAllAppConfig, upsertAppConfig } from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export function GET() {
  try {
    const configs = getAllAppConfig();
    // Return as key-value object for easier consumption
    const configMap: Record<string, string> = {};
    for (const c of configs) {
      configMap[c.key] = c.value;
    }
    return NextResponse.json({ config: configMap });
  } catch (error) {
    return handleApiError(error);
  }
}

export function PUT(request: NextRequest) {
  return request.json().then((body) => {
    try {
      const { key, value } = body;
      if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 });
      const config = upsertAppConfig(key, String(value ?? ''));
      return NextResponse.json({ config });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
