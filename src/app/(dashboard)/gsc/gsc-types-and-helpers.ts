// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GscSnapshot {
  id: string;
  project_id: string;
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  top_queries?: import('./gsc-comparison-utils').GscQuery[];
  top_pages?: import('./gsc-comparison-utils').GscPage[];
  created_at: string;
}

export type TabKey = 'overview' | 'queries' | 'pages' | 'analysis';
export type QueryFilter = 'all' | 'winner' | 'loser' | 'new' | 'opportunity' | 'at_risk';
export type PageFilter = 'all' | 'winner' | 'loser' | 'new';
export type SortDir = 'asc' | 'desc';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export function fmtDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtCtr(ctr: number): string {
  return `${(ctr * 100).toFixed(2)}%`;
}

export function fmtPos(pos: number): string {
  return pos.toFixed(1);
}

export function fmtNum(n: number): string {
  return n.toLocaleString('vi-VN');
}

export function calcDelta(current: number, prev: number, invert = false): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (!prev) return { pct: 0, direction: 'flat' };
  const raw = ((current - prev) / prev) * 100;
  const pct = Math.abs(raw);
  const isPositive = invert ? raw < 0 : raw > 0;
  return { pct, direction: pct < 0.5 ? 'flat' : isPositive ? 'up' : 'down' };
}

// Short URL for display
export function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === '/' ? u.hostname : u.pathname;
  } catch {
    return url;
  }
}
