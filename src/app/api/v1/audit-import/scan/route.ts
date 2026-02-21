import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { getAppConfig } from '@/lib/services';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/** Scan Screaming Frog data folder, return list of crawl folders with date + file count */
export function GET() {
  try {
    const configRow = getAppConfig('screaming_frog_path');
    const basePath = configRow?.value || '/Users/puchinpham/Developer/SEO/';

    if (!fs.existsSync(basePath)) {
      return NextResponse.json({ crawls: [], error: `Folder not found: ${basePath}` });
    }

    const entries = fs.readdirSync(basePath, { withFileTypes: true });
    const crawls = entries
      .filter(e => e.isDirectory() && /^\d{4}\.\d{2}\.\d{2}/.test(e.name))
      .map(e => {
        const fullPath = path.join(basePath, e.name);
        const csvFiles = fs.readdirSync(fullPath).filter(f => f.endsWith('.csv'));
        // Parse date from folder name like "2026.02.14.22.40.07"
        const parts = e.name.split('.');
        const dateLabel = `${parts[0]}-${parts[1]}-${parts[2]}`;
        return {
          folder: e.name,
          date: dateLabel,
          csvCount: csvFiles.length,
          path: fullPath,
        };
      })
      .sort((a, b) => b.folder.localeCompare(a.folder)); // newest first

    return NextResponse.json({ crawls, basePath });
  } catch (error) {
    return handleApiError(error);
  }
}
