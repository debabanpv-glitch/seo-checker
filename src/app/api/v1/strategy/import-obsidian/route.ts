import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { getAppConfig } from '@/lib/services';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface ParsedAction {
  title: string;
  category: string;
  priority: string;
  owner?: string;
  points?: number;
}

interface ParsedPhase {
  name: string;
  description: string;
  timeline: string;
  order: number;
  actions: ParsedAction[];
}

/** Map Obsidian content categories to app SEO 2026 categories */
function mapCategory(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('technical') || lower.includes('crawl') || lower.includes('cwv') || lower.includes('core web')) return 'technical_seo';
  if (lower.includes('tool') || lower.includes('setup') || lower.includes('gsc') || lower.includes('ga4')) return 'technical_seo';
  if (lower.includes('content') && lower.includes('geo')) return 'geo';
  if (lower.includes('content') || lower.includes('topic cluster') || lower.includes('blog')) return 'content';
  if (lower.includes('on-page') || lower.includes('on_page') || lower.includes('meta') || lower.includes('schema')) return 'on_page';
  if (lower.includes('off-page') || lower.includes('link') || lower.includes('backlink')) return 'off_page';
  if (lower.includes('geo') || lower.includes('ai search') || lower.includes('ai vis')) return 'geo';
  if (lower.includes('aio') || lower.includes('ai tool') || lower.includes('ai opt')) return 'aio';
  if (lower.includes('aeo') || lower.includes('answer') || lower.includes('authority') || lower.includes('brand')) return 'aeo';
  if (lower.includes('e-e-a-t') || lower.includes('eeat') || lower.includes('trust')) return 'eeat';
  if (lower.includes('competitor') || lower.includes('analysis')) return 'technical_seo';
  if (lower.includes('strategy') || lower.includes('plan') || lower.includes('kpi')) return 'content';
  return 'technical_seo';
}

/** Map priority from points or keywords */
function mapPriority(text: string, points?: number): string {
  if (points && points >= 4) return 'critical';
  if (points && points >= 3) return 'high';
  if (text.toLowerCase().includes('critical') || text.toLowerCase().includes('khẩn')) return 'critical';
  if (text.toLowerCase().includes('high') || text.toLowerCase().includes('cao')) return 'high';
  if (text.toLowerCase().includes('low') || text.toLowerCase().includes('thấp')) return 'low';
  return 'medium';
}

/** Parse a Phase markdown file from Obsidian vault into structured data */
function parsePhaseFile(content: string, filename: string, order: number): ParsedPhase {
  const lines = content.split('\n');

  // Extract phase name from first heading - handle "PHASE 1: FOO - BAR" and "PHASE 4: OFF-PAGE & AUTHORITY"
  const nameMatch = content.match(/^#\s+.*?PHASE\s+\d+:\s*(.*?)(?:\s*[-–—]\s+HƯỚNG|$)/im);
  let name = nameMatch?.[1]?.trim() || filename.replace(/\.md$/, '').replace(/-/g, ' ');
  // Clean trailing pipes/whitespace from ASCII art
  name = name.replace(/\s*\|.*$/, '').trim();
  // Fallback: use filename for better names
  const PHASE_NAMES: Record<string, string> = {
    'Phase-1-Foundation': 'Foundation & Audit',
    'Phase-2-Technical': 'Technical & On-Page',
    'Phase-3-Content-GEO': 'Content & GEO',
    'Phase-4-Authority': 'Off-Page & Authority',
    'Phase-5-Scale': 'Scale & Optimize',
  };
  const baseName = filename.replace(/\.md$/, '');
  if (PHASE_NAMES[baseName]) name = PHASE_NAMES[baseName];

  // Extract timeline from ASCII art pattern "Timeline: THÁNG X" or from overview table
  const timelineMatch = content.match(/Timeline:\s*(THÁNG\s+[\d-]+)/im);
  let timeline = timelineMatch?.[1]?.trim() || '';
  // Clean trailing pipes
  timeline = timeline.replace(/\s*\|.*$/, '').trim();

  // Extract description from TOM TAT section
  const descMatch = content.match(/Phase\s+\d+\s+Overview[\s\S]*?```[\s\S]*?```/im);
  const description = descMatch
    ? `Phase ${order} - ${name}. ${timeline}`
    : `Phase ${order} - ${name}`;

  // Parse tasks from markdown tables
  const actions: ParsedAction[] = [];
  const taskTableRegex = /\|\s*[\d.]+\s*\|\s*(.*?)\s*\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*[☐☑✓✗]\s*\|/g;
  let match;

  while ((match = taskTableRegex.exec(content)) !== null) {
    const title = match[1].trim();
    const points = parseInt(match[2], 10);
    const owner = match[3].trim();

    if (title && title.length > 3) {
      actions.push({
        title,
        category: mapCategory(title),
        priority: mapPriority(title, points),
        owner: owner || undefined,
        points,
      });
    }
  }

  // Also parse checklist items (□ patterns) if no table items found
  if (actions.length === 0) {
    const checklistRegex = /[□☐]\s+(.*?)$/gm;
    while ((match = checklistRegex.exec(content)) !== null) {
      const title = match[1].trim();
      if (title && title.length > 5 && !title.startsWith('├') && !title.startsWith('└')) {
        actions.push({
          title,
          category: mapCategory(title),
          priority: 'medium',
        });
      }
    }
  }

  return { name, description, timeline, order, actions };
}

/** GET: Scan Obsidian vault and return parsed phases + actions for preview */
export function GET() {
  try {
    const configRow = getAppConfig('obsidian_seo_path');
    const basePath = configRow?.value ||
      '/Users/puchinpham/Library/Mobile Documents/iCloud~md~obsidian/Documents/Em/Learn (Học Tập)/SEO Learning 2026/';

    const implPath = path.join(basePath, '08_Project_Implementation');

    if (!fs.existsSync(implPath)) {
      return NextResponse.json({
        phases: [],
        error: `Không tìm thấy thư mục: ${implPath}`,
        basePath,
      });
    }

    // Read Phase files
    const phaseFiles = fs.readdirSync(implPath)
      .filter(f => f.startsWith('Phase-') && f.endsWith('.md'))
      .sort();

    const phases: ParsedPhase[] = phaseFiles.map((filename, idx) => {
      const filePath = path.join(implPath, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      return parsePhaseFile(content, filename, idx + 1);
    });

    // Hardcoded roadmap timelines as fallback (from Obsidian Roadmap.md)
    const ROADMAP_TIMELINES: Record<number, string> = {
      1: 'Month 1',
      2: 'Month 2-3',
      3: 'Month 4-6',
      4: 'Month 7-9',
      5: 'Month 10-12',
    };

    // Enrich phases with roadmap timeline info
    phases.forEach((p, idx) => {
      if (!p.timeline || p.timeline.includes('TIMELINE')) {
        p.timeline = ROADMAP_TIMELINES[idx + 1] || p.timeline;
      }
    });

    const totalActions = phases.reduce((sum, p) => sum + p.actions.length, 0);

    return NextResponse.json({
      phases,
      totalActions,
      basePath,
      implPath,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST: Import selected phases + actions into the database */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, phases: phasesToImport } = body as {
      project_id: string;
      phases: Array<{
        name: string;
        description: string;
        timeline: string;
        order: number;
        selected: boolean;
        actions: Array<{
          title: string;
          category: string;
          priority: string;
          owner?: string;
          selected: boolean;
        }>;
      }>;
    };

    if (!project_id || !phasesToImport?.length) {
      return NextResponse.json(
        { error: 'project_id and phases are required' },
        { status: 400 }
      );
    }

    // Dynamic import to avoid circular deps
    const { createPhase, createAction } = await import('@/lib/services');

    const imported = { phases: 0, actions: 0 };

    for (const phaseData of phasesToImport) {
      if (!phaseData.selected) continue;

      // Calculate date range from timeline (e.g., "Month 1" -> dates from now)
      const now = new Date();
      let startDate = new Date(now);
      let endDate = new Date(now);

      const monthMatch = phaseData.timeline.match(/Month\s+(\d+)(?:\s*-\s*(\d+))?/i);
      if (monthMatch) {
        const startMonth = parseInt(monthMatch[1], 10) - 1;
        const endMonth = monthMatch[2] ? parseInt(monthMatch[2], 10) - 1 : startMonth;
        startDate.setMonth(now.getMonth() + startMonth);
        endDate.setMonth(now.getMonth() + endMonth + 1);
        endDate.setDate(0); // last day of end month
      }

      const phase = createPhase({
        project_id,
        name: `Phase ${phaseData.order} - ${phaseData.name}`,
        description: phaseData.description,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: phaseData.order === 1 ? 'in_progress' : 'planned',
        priority: phaseData.order,
      });

      imported.phases++;

      // Create actions for this phase
      const selectedActions = phaseData.actions.filter(a => a.selected);
      for (const actionData of selectedActions) {
        createAction({
          phase_id: phase.id,
          project_id,
          title: actionData.title,
          category: actionData.category,
          priority: actionData.priority,
          assigned_to: actionData.owner || undefined,
          status: 'todo',
        });
        imported.actions++;
      }
    }

    return NextResponse.json({ success: true, imported });
  } catch (error) {
    return handleApiError(error);
  }
}
