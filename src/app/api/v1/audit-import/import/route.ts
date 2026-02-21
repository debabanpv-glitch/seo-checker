import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { createAudit, getAppConfig } from '@/lib/services';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/** Parse a simple CSV (handles quoted fields with commas) */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  // Remove BOM
  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const headers = splitCSVLine(headerLine);
  return lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

/** Import a crawl folder: parse key CSVs and save to DB */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { folder, project_id } = body;
    if (!folder) return NextResponse.json({ error: 'folder is required' }, { status: 400 });

    const configRow = getAppConfig('screaming_frog_path');
    const basePath = configRow?.value || '/Users/puchinpham/Developer/SEO/';
    const folderPath = path.join(basePath, folder);

    if (!fs.existsSync(folderPath)) {
      return NextResponse.json({ error: `Folder not found: ${folderPath}` }, { status: 404 });
    }

    // Parse key CSV: internal_all.csv (main crawl data)
    const mainFile = path.join(folderPath, 'internal_all.csv');
    if (!fs.existsSync(mainFile)) {
      return NextResponse.json({ error: 'internal_all.csv not found in folder' }, { status: 404 });
    }

    const csvText = fs.readFileSync(mainFile, 'utf-8');
    const rows = parseCSV(csvText);

    // Build summary
    const statusCodes: Record<string, number> = {};
    const contentTypes: Record<string, number> = {};
    const indexability: Record<string, number> = { indexable: 0, nonIndexable: 0 };

    rows.forEach(row => {
      const code = row['Status Code'] || 'unknown';
      statusCodes[code] = (statusCodes[code] || 0) + 1;

      const ct = row['Content Type']?.split(';')[0]?.trim() || 'unknown';
      contentTypes[ct] = (contentTypes[ct] || 0) + 1;

      if (row['Indexability'] === 'Indexable') indexability.indexable++;
      else indexability.nonIndexable++;
    });

    // Parse date from folder name
    const parts = folder.split('.');
    const auditDate = `${parts[0]}-${parts[1]}-${parts[2]}`;

    // Save — store summary + first 500 rows as details (to avoid huge DB entries)
    const audit = createAudit({
      project_id: project_id || null,
      audit_type: 'screaming_frog',
      audit_date: auditDate,
      summary: { total_urls: rows.length, status_codes: statusCodes, content_types: contentTypes, indexability },
      details: rows.slice(0, 500),
      raw_file: folderPath,
      source: 'folder_import',
    });

    return NextResponse.json({ audit, imported: rows.length });
  } catch (error) {
    return handleApiError(error);
  }
}
