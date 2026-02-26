// ---------------------------------------------------------------------------
// WordPress Content Stats — fetch post counts and recent posts per project
// Uses WP REST API credentials stored in app_config (wp_{projectId}_*)
// ---------------------------------------------------------------------------

import { getAppConfig } from './app-config-crud.service';
import { WordPressAPI, type WPPost } from './wordpress-rest-api-v2-client.service';

export interface WPPostSummary {
  id: number;
  title: string;
  date: string;
  slug: string;
  status: string;
}

export interface WPContentStats {
  configured: boolean;
  siteUrl: string | null;
  totalPublished: number;
  totalDrafts: number;
  postsThisMonth: number;
  postsLastMonth: number;
  latestPosts: WPPostSummary[];
  drafts: WPPostSummary[];
}

function getWpClient(projectId: string): { wp: WordPressAPI; siteUrl: string } | null {
  const siteUrl = getAppConfig(`wp_${projectId}_site_url`)?.value;
  const username = getAppConfig(`wp_${projectId}_username`)?.value;
  const appPassword = getAppConfig(`wp_${projectId}_app_password`)?.value;
  if (!siteUrl || !username || !appPassword) return null;
  return { wp: new WordPressAPI(siteUrl, username, appPassword), siteUrl };
}

function mapPost(p: WPPost): WPPostSummary {
  return {
    id: p.id,
    title: p.title.rendered.replace(/<[^>]*>/g, '').substring(0, 60),
    date: p.date.substring(0, 10),
    slug: p.slug,
    status: p.status,
  };
}

const EMPTY: WPContentStats = { configured: false, siteUrl: null, totalPublished: 0, totalDrafts: 0, postsThisMonth: 0, postsLastMonth: 0, latestPosts: [], drafts: [] };

export async function getWPContentStats(projectId: string): Promise<WPContentStats> {
  const client = getWpClient(projectId);
  if (!client) return EMPTY;

  try {
    // Fetch published + drafts in parallel
    const [published, drafts] = await Promise.all([
      client.wp.getPosts({ per_page: 100, status: 'publish' }),
      client.wp.getPosts({ per_page: 50, status: 'draft' }),
    ]);

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    return {
      configured: true,
      siteUrl: client.siteUrl,
      totalPublished: published.length,
      totalDrafts: drafts.length,
      postsThisMonth: published.filter(p => p.date.startsWith(thisMonth)).length,
      postsLastMonth: published.filter(p => p.date.startsWith(lastMonth)).length,
      latestPosts: published.slice(0, 3).map(mapPost),
      drafts: drafts.map(mapPost),
    };
  } catch {
    return { ...EMPTY, siteUrl: client.siteUrl };
  }
}
