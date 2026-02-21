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

    // Scan basePath and all immediate subdirectories (e.g. mangthanhcong/, samcotech/)
    const crawls: Array<{ folder: string; date: string; csvCount: number; path: string; project: string }> = [];
    const topEntries = fs.readdirSync(basePath, { withFileTypes: true });

    // Helper: scan a directory for crawl folders (date-named dirs with CSVs)
    const scanDir = (dir: string, projectLabel: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && /^\d{4}\.\d{2}\.\d{2}/.test(e.name)) {
          const fullPath = path.join(dir, e.name);
          const csvFiles = fs.readdirSync(fullPath).filter(f => f.endsWith('.csv'));
          const parts = e.name.split('.');
          const dateLabel = `${parts[0]}-${parts[1]}-${parts[2]}`;
          crawls.push({
            folder: e.name,
            date: dateLabel,
            csvCount: csvFiles.length,
            path: fullPath,
            project: projectLabel,
          });
        }
      }
    };

    // Scan top-level for crawl folders
    scanDir(basePath, '');

    // Scan subdirectories (project folders like mangthanhcong/, samcotech/)
    for (const e of topEntries) {
      if (e.isDirectory() && !/^\d{4}\.\d{2}\.\d{2}/.test(e.name) && !e.name.startsWith('.')) {
        scanDir(path.join(basePath, e.name), e.name);
      }
    }

    crawls.sort((a, b) => b.folder.localeCompare(a.folder));

    return NextResponse.json({ crawls, basePath });
  } catch (error) {
    return handleApiError(error);
  }
}
