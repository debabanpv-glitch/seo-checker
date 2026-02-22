import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { WordPressAPI } from '@/lib/services/wordpress-rest-api-v2-client.service';
import { getAppConfig } from '@/lib/services/app-config-crud.service';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveWpCredentials(projectId?: string | null) {
  const prefix = projectId ? `wp_${projectId}_` : 'wp_';
  const siteUrl =
    getAppConfig(`${prefix}site_url`)?.value ?? getAppConfig('wp_site_url')?.value ?? null;
  const username =
    getAppConfig(`${prefix}username`)?.value ?? getAppConfig('wp_username')?.value ?? null;
  const appPassword =
    getAppConfig(`${prefix}app_password`)?.value ?? getAppConfig('wp_app_password')?.value ?? null;
  return { siteUrl, username, appPassword };
}

// ---------------------------------------------------------------------------
// GET — read operations (posts / pages / categories / test)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') ?? 'posts';
    const projectId = searchParams.get('project_id');

    const { siteUrl, username, appPassword } = resolveWpCredentials(projectId);

    if (!siteUrl || !username || !appPassword) {
      return NextResponse.json(
        { error: 'WordPress chưa cấu hình. Vào Settings → Cấu hình để thiết lập.' },
        { status: 400 },
      );
    }

    const wp = new WordPressAPI(siteUrl, username, appPassword);

    switch (action) {
      case 'posts': {
        const perPage = parseInt(searchParams.get('per_page') ?? '10', 10);
        const posts = await wp.getPosts({ per_page: perPage });
        return NextResponse.json({ posts });
      }
      case 'pages': {
        const pages = await wp.getPages({ per_page: 20 });
        return NextResponse.json({ pages });
      }
      case 'categories': {
        const categories = await wp.getCategories();
        return NextResponse.json({ categories });
      }
      case 'test': {
        const ok = await wp.testConnection();
        return NextResponse.json({ connected: ok, siteUrl });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

// ---------------------------------------------------------------------------
// POST — write operations (create_post / update_post / update_seo)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, project_id, ...data } = body as Record<string, unknown> & { action: string; project_id?: string };

    const { siteUrl, username, appPassword } = resolveWpCredentials(project_id);

    if (!siteUrl || !username || !appPassword) {
      return NextResponse.json({ error: 'WordPress chưa cấu hình' }, { status: 400 });
    }

    const wp = new WordPressAPI(siteUrl, username, appPassword);

    switch (action) {
      case 'create_post': {
        const post = await wp.createPost(data as Parameters<typeof wp.createPost>[0]);
        return NextResponse.json({ post });
      }
      case 'update_post': {
        const { post_id, ...updateData } = data as { post_id: number } & Parameters<typeof wp.updatePost>[1];
        const post = await wp.updatePost(post_id, updateData);
        return NextResponse.json({ post });
      }
      case 'update_seo': {
        const { post_id, ...meta } = data as { post_id: number } & Parameters<typeof wp.updateSeoMeta>[1];
        const post = await wp.updateSeoMeta(post_id, meta);
        return NextResponse.json({ post });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
