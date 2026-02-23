// Types and helpers for the backlinks page

export interface Backlink {
  id: string;
  project_id: string | null;
  keyword: string;
  anchor_text_before: string;
  anchor_text_after: string;
  target_url: string;
  source_url: string;
  source_domain: string;
  dofollow: boolean;
  order_name: string;
  ads_id: number | null;
  start_date: string | null;
  end_date: string | null;
  status: 'unknown' | 'alive' | 'dead' | 'error';
  last_checked_at: string | null;
  http_status: number | null;
  anchor_found: boolean;
  link_found: boolean;
  check_error: string | null;
  created_at: string;
}

export interface CheckSummary {
  total: number;
  alive: number;
  dead: number;
  errors: number;
  unchecked: number;
  anchorMissing: number;
}

export interface BacklinkStats {
  totalBacklinks: number;
  uniqueDomains: number;
  uniqueKeywords: number;
  dofollowCount: number;
  nofollowCount: number;
  keywordSummary: KeywordSummary[];
  domainSummary: DomainSummary[];
  expiringSoon: number;
}

export interface KeywordSummary {
  keyword: string;
  backlink_count: number;
  domain_count: number;
  target_url: string;
}

export interface DomainSummary {
  domain: string;
  count: number;
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
}

export type ViewTab = 'overview' | 'keywords' | 'domains' | 'expiring';

/** Check if a backlink is expiring within N days */
export function isExpiringSoon(endDate: string | null, days = 30): boolean {
  if (!endDate) return false;
  const now = new Date();
  const end = new Date(endDate);
  const diff = (end.getTime() - now.getTime()) / 86400000;
  return diff >= 0 && diff <= days;
}

/** Check if a backlink has expired */
export function isExpired(endDate: string | null): boolean {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}

/** Format date to Vietnamese short format */
export function fmtDate(d: string | null): string {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Truncate string with ellipsis */
export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}
