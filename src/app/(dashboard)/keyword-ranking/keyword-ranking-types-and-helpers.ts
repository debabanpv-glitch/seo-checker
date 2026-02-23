// ---------------------------------------------------------------------------
// Keyword Ranking — Types & Helper Functions
// ---------------------------------------------------------------------------

import { Project } from '@/types';

export interface KeywordRanking {
  id: string;
  keyword: string;
  url: string;
  position: number;
  date: string;
  project_id: string | null;
  ranking_tier?: string | null;
  keyword_type?: string | null;
}

export interface KeywordTrend {
  keyword: string;
  url: string;
  currentPosition: number;
  previousPosition: number | null;
  change: number | null;
  history: { date: string; position: number }[];
  ranking_tier?: string | null;
  keyword_type?: string | null;
  // GSC traffic data (merged from top_queries)
  gscClicks?: number;
  gscImpressions?: number;
  gscCtr?: number;
  gscPosition?: number;
}

export interface SheetConfig {
  url: string;
  project_id: string;
  label: string;
}

export interface GscSnapshot {
  id: string;
  project_id: string;
  date: string;
  period: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  top_queries: string | null;
  top_pages: string | null;
}

export interface TopQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export type ViewTab = 'all' | 'cam_ket' | 'blog' | 'opportunity' | 'declining' | 'gsc_only';

// Build a map of keyword -> GSC traffic from top_queries JSON
export function buildGscQueryMap(snapshots: GscSnapshot[]): Map<string, TopQuery> {
  const map = new Map<string, TopQuery>();
  if (snapshots.length === 0) return map;
  const latest = snapshots[0];
  try {
    const raw = latest.top_queries;
    if (!raw) return map;
    const queries: TopQuery[] = typeof raw === 'string' ? JSON.parse(raw) : (raw as TopQuery[]);
    if (!Array.isArray(queries)) return map;
    for (const q of queries) {
      map.set(q.query.toLowerCase().trim(), q);
    }
  } catch { /* ignore */ }
  return map;
}

// Position color by ranking tier
export const posColor = (pos: number) => {
  if (pos <= 3) return 'text-emerald-400';
  if (pos <= 10) return 'text-accent';
  if (pos <= 20) return 'text-sky-400';
  if (pos <= 30) return 'text-amber-400';
  return 'text-[#666680]';
};

// Position background + border by ranking tier
export const posBg = (pos: number) => {
  if (pos <= 3) return 'bg-emerald-400/10 border-emerald-400/20';
  if (pos <= 10) return 'bg-accent/10 border-accent/20';
  if (pos <= 20) return 'bg-sky-400/10 border-sky-400/20';
  if (pos <= 30) return 'bg-amber-400/10 border-amber-400/20';
  return 'bg-[#666680]/10 border-[#666680]/20';
};
