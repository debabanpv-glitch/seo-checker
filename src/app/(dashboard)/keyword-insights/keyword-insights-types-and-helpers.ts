// Types and helpers for /keyword-insights page

export interface KeywordInsight {
  keyword: string;
  url: string;
  currentPosition: number;
  previousPosition: number | null;
  change: number | null;
  history: { date: string; position: number }[];
  ranking_tier: string | null;
  keyword_type: string | null;
  is_tracked: boolean;
  gscClicks: number;
  gscImpressions: number;
  gscCtr: number;
  gscPosition: number;
}

export interface ExpertInsight {
  type: 'opportunity' | 'risk' | 'success' | 'action';
  title: string;
  detail: string;
  keywords: string[];
}

export interface InsightsSummary {
  total: number;
  improved: number;
  declined: number;
  stable: number;
  newToTop10: number;
  exitTop10: number;
  trackedTotal: number;
  trackedInTop10: number;
  totalClicks: number;
  totalImpressions: number;
}

export interface InsightsResponse {
  meta: {
    projectId: string;
    latestDate: string | null;
    previousDate: string | null;
    checkDates: string[];
  };
  summary: InsightsSummary;
  tiers: {
    top5: KeywordInsight[];
    top10: KeywordInsight[];
    top15: KeywordInsight[];
    top30: KeywordInsight[];
    beyond30: KeywordInsight[];
  };
  movers: {
    surging: KeywordInsight[];
    dropping: KeywordInsight[];
  };
  boundary: KeywordInsight[];
  tracked: KeywordInsight[];
  expertInsights: ExpertInsight[];
}

export type SectionTab = 'tiers' | 'movers' | 'boundary' | 'tracked';

export const TIER_CONFIG = [
  { key: 'top5' as const, label: 'Top 5', range: [1, 5], color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  { key: 'top10' as const, label: 'Top 10', range: [6, 10], color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  { key: 'top15' as const, label: 'Top 15', range: [11, 15], color: 'text-sky-400', bg: 'bg-sky-500/20', border: 'border-sky-500/30' },
  { key: 'top30' as const, label: 'Top 30', range: [16, 30], color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  { key: 'beyond30' as const, label: 'Ngoai Top 30', range: [31, 999], color: 'text-[#666680]', bg: 'bg-[#666680]/20', border: 'border-[#666680]/30' },
] as const;

export function posColor(pos: number): string {
  if (pos <= 3) return 'text-emerald-400';
  if (pos <= 5) return 'text-emerald-300';
  if (pos <= 10) return 'text-blue-400';
  if (pos <= 15) return 'text-sky-400';
  if (pos <= 30) return 'text-amber-400';
  return 'text-[#666680]';
}

export function changeBadge(change: number | null): { text: string; cls: string } {
  if (change === null || change === 0) return { text: '—', cls: 'text-[#666680]' };
  if (change > 0) return { text: `+${change}`, cls: 'text-emerald-400' };
  return { text: `${change}`, cls: 'text-red-400' };
}

export function fmtNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}
