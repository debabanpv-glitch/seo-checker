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

    // Helper: safely read & parse a CSV file from crawl folder
    const readCSV = (filename: string) => {
      const fp = path.join(folderPath, filename);
      if (!fs.existsSync(fp)) return [];
      return parseCSV(fs.readFileSync(fp, 'utf-8'));
    };

    // --- Parse all key CSVs ---
    const responseCodes = readCSV('response_codes_all.csv');
    const pageTitles = readCSV('page_titles_all.csv');
    const metaDescs = readCSV('meta_description_all.csv');
    const h1s = readCSV('h1_all.csv');
    const imgsMissingAlt = readCSV('images_missing_alt_text.csv');
    const canonicals = readCSV('canonicals_all.csv');

    // --- Build summary from internal_all.csv ---
    const statusCodes: Record<string, number> = {};
    const contentTypes: Record<string, number> = {};
    const indexability = { indexable: 0, nonIndexable: 0 };

    rows.forEach(row => {
      const code = row['Status Code'] || 'unknown';
      statusCodes[code] = (statusCodes[code] || 0) + 1;
      const ct = row['Content Type']?.split(';')[0]?.trim() || 'unknown';
      contentTypes[ct] = (contentTypes[ct] || 0) + 1;
      if (row['Indexability'] === 'Indexable') indexability.indexable++;
      else indexability.nonIndexable++;
    });

    // --- Page titles analysis ---
    const titleIssues = {
      total: pageTitles.length,
      missing: pageTitles.filter(r => !r['Title 1']?.trim()).length,
      duplicate: pageTitles.filter(r => parseInt(r['Occurrences'] || '0') > 1).length,
      tooLong: pageTitles.filter(r => parseInt(r['Title 1 Length'] || '0') > 60).length,
      tooShort: pageTitles.filter(r => {
        const len = parseInt(r['Title 1 Length'] || '0');
        return len > 0 && len < 30;
      }).length,
    };

    // --- Meta description analysis ---
    const metaIssues = {
      total: metaDescs.length,
      missing: metaDescs.filter(r => !r['Meta Description 1']?.trim()).length,
      duplicate: metaDescs.filter(r => parseInt(r['Occurrences'] || '0') > 1).length,
      tooLong: metaDescs.filter(r => parseInt(r['Meta Description 1 Length'] || '0') > 155).length,
      tooShort: metaDescs.filter(r => {
        const len = parseInt(r['Meta Description 1 Length'] || '0');
        return len > 0 && len < 70;
      }).length,
    };

    // --- H1 analysis ---
    const h1Issues = {
      total: h1s.length,
      missing: h1s.filter(r => !r['H1-1']?.trim()).length,
      duplicate: h1s.filter(r => parseInt(r['Occurrences'] || '0') > 1).length,
      tooLong: h1s.filter(r => parseInt(r['H1-1 Length'] || '0') > 70).length,
    };

    // --- Images missing alt text ---
    const imageIssues = {
      missingAlt: imgsMissingAlt.length,
    };

    // --- Canonical analysis ---
    const canonicalIssues = {
      total: canonicals.length,
      missing: canonicals.filter(r => !r['Canonical Link Element 1']?.trim()).length,
      selfReferencing: canonicals.filter(r => r['Address'] === r['Canonical Link Element 1']).length,
    };

    // --- Response codes from response_codes_all.csv (includes external) ---
    const responseCodeSummary: Record<string, number> = {};
    responseCodes.forEach(r => {
      const code = r['Status Code'] || 'unknown';
      responseCodeSummary[code] = (responseCodeSummary[code] || 0) + 1;
    });

    // --- Compute SEO score (0-100) ---
    const htmlPages = rows.filter(r => (r['Content Type'] || '').includes('text/html'));
    const totalPages = htmlPages.length || 1;
    const penalties: number[] = [];
    // Title issues penalty (max 15)
    penalties.push(Math.min(15, ((titleIssues.missing + titleIssues.tooLong) / totalPages) * 30));
    // Meta desc penalty (max 15)
    penalties.push(Math.min(15, ((metaIssues.missing + metaIssues.tooLong) / totalPages) * 30));
    // H1 penalty (max 15)
    penalties.push(Math.min(15, ((h1Issues.missing + h1Issues.tooLong) / totalPages) * 30));
    // 4xx/5xx penalty (max 20)
    const errorPages = Object.entries(statusCodes)
      .filter(([k]) => k.startsWith('4') || k.startsWith('5'))
      .reduce((s, [, v]) => s + v, 0);
    penalties.push(Math.min(20, (errorPages / rows.length) * 50));
    // Non-indexable penalty (max 10)
    penalties.push(Math.min(10, (indexability.nonIndexable / totalPages) * 20));
    // Images missing alt penalty (max 10)
    penalties.push(Math.min(10, (imageIssues.missingAlt / Math.max(rows.length, 1)) * 25));
    // Canonical issues penalty (max 15)
    penalties.push(Math.min(15, (canonicalIssues.missing / totalPages) * 30));

    const totalPenalty = penalties.reduce((a, b) => a + b, 0);
    const seoScore = Math.max(0, Math.round(100 - totalPenalty));

    // Parse date from folder name
    const folderName = folder.includes('/') ? folder.split('/').pop()! : folder;
    const parts = folderName.split('.');
    const auditDate = `${parts[0]}-${parts[1]}-${parts[2]}`;

    // Save to DB
    const audit = createAudit({
      project_id: project_id || null,
      audit_type: 'screaming_frog',
      audit_date: auditDate,
      summary: {
        total_urls: rows.length,
        status_codes: statusCodes,
        content_types: contentTypes,
        indexability,
        response_codes_all: responseCodeSummary,
        title_issues: titleIssues,
        meta_issues: metaIssues,
        h1_issues: h1Issues,
        image_issues: imageIssues,
        canonical_issues: canonicalIssues,
        seo_score: seoScore,
      },
      details: rows.slice(0, 500),
      raw_file: folderPath,
      source: 'folder_import',
    });

    return NextResponse.json({ audit, imported: rows.length });
  } catch (error) {
    return handleApiError(error);
  }
}
