import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { WordPressAPI } from '@/lib/services/wordpress-rest-api-v2-client.service';
import { getAppConfig } from '@/lib/services/app-config-crud.service';
import {
  scanMissingAltTexts,
  batchFixAltTexts,
  type AltTextCandidate,
} from '@/lib/services/wordpress-alt-text-batch-fixer.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min for large sites

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

function createWpClient(projectId?: string | null) {
  const { siteUrl, username, appPassword } = resolveWpCredentials(projectId);
  if (!siteUrl || !username || !appPassword) {
    throw new Error('WordPress chưa cấu hình. Vào Settings → Cấu hình để thiết lập.');
  }
  return new WordPressAPI(siteUrl, username, appPassword);
}

// ---------------------------------------------------------------------------
// GET — scan for missing alt texts (preview before fixing)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const wp = createWpClient(projectId);

    const scanResult = await scanMissingAltTexts(wp);
    return NextResponse.json(scanResult);
  } catch (error) {
    return handleApiError(error);
  }
}

// ---------------------------------------------------------------------------
// POST — apply alt text fixes
// action=scan: re-scan and return candidates
// action=fix: apply provided candidates (or all from scan)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, project_id, candidates: providedCandidates } = body as {
      action: 'scan' | 'fix';
      project_id?: string;
      candidates?: AltTextCandidate[];
    };

    const wp = createWpClient(project_id);

    if (action === 'scan') {
      const scanResult = await scanMissingAltTexts(wp);
      return NextResponse.json(scanResult);
    }

    if (action === 'fix') {
      let toFix: AltTextCandidate[];

      if (providedCandidates && providedCandidates.length > 0) {
        // User provided specific candidates (possibly edited)
        toFix = providedCandidates;
      } else {
        // Fix all — scan first then fix
        const scanResult = await scanMissingAltTexts(wp);
        toFix = scanResult.candidates;
      }

      if (toFix.length === 0) {
        return NextResponse.json({ message: 'Không có ảnh nào cần fix', total: 0, fixed: 0, failed: 0 });
      }

      const result = await batchFixAltTexts(wp, toFix);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
