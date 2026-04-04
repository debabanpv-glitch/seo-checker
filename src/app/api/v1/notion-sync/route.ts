import { NextRequest, NextResponse } from 'next/server';
import {
  upsertNotionTasks,
  upsertNotionContent,
  upsertNotionBacklinks,
  upsertNotionKeywords,
  upsertNotionCompetitors,
  getActivitiesBySource,
} from '@/lib/services';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

const VALID_TABLES = ['tasks', 'content', 'backlinks', 'keywords', 'competitors'] as const;
type NotionTable = typeof VALID_TABLES[number];

const upsertMap: Record<NotionTable, (data: any[]) => { inserted: number; updated: number }> = {
  tasks: upsertNotionTasks,
  content: upsertNotionContent,
  backlinks: upsertNotionBacklinks,
  keywords: upsertNotionKeywords,
  competitors: upsertNotionCompetitors,
};

export function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const action = sp.get('action');

    if (action === 'status') {
      const activities = getActivitiesBySource('notion', 20);
      return NextResponse.json({ activities });
    }

    return NextResponse.json({
      message: 'Notion Sync API',
      endpoints: {
        'POST /': 'Upsert data — body: { table, data[] }',
        'GET /?action=status': 'Recent sync activities',
      },
      valid_tables: VALID_TABLES,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, data } = body;

    if (!table || !VALID_TABLES.includes(table)) {
      return NextResponse.json(
        { error: `table must be one of: ${VALID_TABLES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'data must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate each item has notion_page_id
    const missing = data.findIndex((d: any) => !d.notion_page_id);
    if (missing >= 0) {
      return NextResponse.json(
        { error: `Item at index ${missing} missing notion_page_id` },
        { status: 400 }
      );
    }

    const result = upsertMap[table as NotionTable](data);
    return NextResponse.json({ success: true, table, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
