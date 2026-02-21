'use client';

import { useState, useEffect } from 'react';
import { Link2, AlertTriangle, XCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  projectId?: string;
}

interface LinkInfo {
  url: string;
  text: string;
  isDoFollow: boolean;
  isDuplicate?: boolean;
}

interface SEOResult {
  id: string;
  url: string;
  links?: { internal: LinkInfo[]; external: LinkInfo[] };
  checked_at: string;
}

interface AuditResult {
  id: string;
  audit_date: string;
  summary: {
    total_urls: number;
    status_codes: Record<string, number>;
    indexability?: { indexable: number; nonIndexable: number };
  } | null;
}

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2 text-[#8888a0]">{icon}</div>
      <div className="text-2xl font-bold" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
      <div className="text-xs text-[#8888a0] mt-1">{label}</div>
    </div>
  );
}

export default function SEOInternalLinksAnalysisTab({ projectId }: Props) {
  const [seoResults, setSeoResults] = useState<SEOResult[]>([]);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [seoRes, auditRes] = await Promise.all([
          fetch(`/api/v1/seo-results${projectId ? `?projectId=${projectId}` : ''}`),
          fetch(`/api/v1/audit-import${projectId ? `?projectId=${projectId}` : ''}`),
        ]);
        const seoData = await seoRes.json();
        const auditData = await auditRes.json();
        setSeoResults(seoData.results || []);
        setAuditResults(auditData.results || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="text-[#8888a0] text-sm">Đang tải...</div></div>;
  }

  // Aggregate link data from seo_results
  const resultsWithLinks = seoResults.filter(r => r.links);
  const allInternalLinks = resultsWithLinks.flatMap(r => r.links!.internal);
  const allExternalLinks = resultsWithLinks.flatMap(r => r.links!.external);

  const duplicateInternalLinks = allInternalLinks.filter(l => l.isDuplicate);
  const noFollowInternal = allInternalLinks.filter(l => !l.isDoFollow);

  // Pages with too many internal links (>100)
  const pagesWithManyLinks = resultsWithLinks
    .filter(r => (r.links!.internal.length + r.links!.external.length) > 100)
    .sort((a, b) => (b.links!.internal.length + b.links!.external.length) - (a.links!.internal.length + a.links!.external.length))
    .slice(0, 10);

  // Broken links estimate from crawl data
  const latestAudit = auditResults[0];
  const brokenCount = latestAudit?.summary?.status_codes?.['404'] ?? 0;
  const redirectCount = (latestAudit?.summary?.status_codes?.['301'] ?? 0) + (latestAudit?.summary?.status_codes?.['302'] ?? 0);

  // Orphan pages: pages in seo_results with 0 internal links pointing TO them
  const linkedUrls = new Set(allInternalLinks.map(l => l.url));
  const orphanPages = seoResults.filter(r => !linkedUrls.has(r.url));

  const hasData = resultsWithLinks.length > 0 || auditResults.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Link2 className="w-12 h-12 text-[#8888a0] opacity-40" />
        <p className="text-[#8888a0] text-sm">Chưa có dữ liệu link</p>
        <p className="text-[#8888a0] text-xs">Chạy SEO Check để thu thập dữ liệu internal links</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 overflow-y-auto pb-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Trang mồ côi (Orphan)"
          value={orphanPages.length}
          color={orphanPages.length > 0 ? '#ef4444' : '#22c55e'}
          icon={<XCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Broken Links (404)"
          value={brokenCount}
          color={brokenCount > 0 ? '#ef4444' : '#22c55e'}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <StatCard
          label="Redirects (3xx)"
          value={redirectCount}
          color={redirectCount > 0 ? '#f59e0b' : '#22c55e'}
          icon={<ArrowRight className="w-4 h-4" />}
        />
        <StatCard
          label="Link trùng lặp"
          value={duplicateInternalLinks.length}
          color={duplicateInternalLinks.length > 0 ? '#f59e0b' : '#22c55e'}
          icon={<Link2 className="w-4 h-4" />}
        />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-[var(--text-primary)]">{allInternalLinks.length}</div>
          <div className="text-xs text-[#8888a0] mt-1">Tổng Internal Links</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-[var(--text-primary)]">{allExternalLinks.length}</div>
          <div className="text-xs text-[#8888a0] mt-1">Tổng External Links</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-green-400">{allInternalLinks.filter(l => l.isDoFollow).length}</div>
          <div className="text-xs text-[#8888a0] mt-1">DoFollow Internal</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-red-400">{noFollowInternal.length}</div>
          <div className="text-xs text-[#8888a0] mt-1">NoFollow Internal</div>
        </div>
      </div>

      {/* Alert box */}
      {(brokenCount > 0 || orphanPages.length > 0) && (
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-danger/10 border border-danger/30">
          <div className="flex items-center gap-2 font-semibold text-red-400 mb-2">
            <XCircle className="w-4 h-4" /> Vấn đề nghiêm trọng cần xử lý
          </div>
          <ul className="text-[#8888a0] text-xs space-y-1 list-disc list-inside">
            {brokenCount > 0 && <li>{brokenCount} broken links (404) đang làm mất PageRank và UX</li>}
            {orphanPages.length > 0 && <li>{orphanPages.length} trang mồ côi không được link tới — Google khó crawl</li>}
            {duplicateInternalLinks.length > 0 && <li>{duplicateInternalLinks.length} link trùng lặp làm loãng link equity</li>}
          </ul>
        </div>
      )}

      {/* Orphan pages table */}
      {orphanPages.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Trang mồ côi ({orphanPages.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">#</th>
                  <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">URL</th>
                  <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">Kiểm tra lúc</th>
                </tr>
              </thead>
              <tbody>
                {orphanPages.slice(0, 15).map((r, i) => (
                  <tr key={r.id} className={cn('border-t border-border', i % 2 === 0 ? '' : 'bg-secondary/20')}>
                    <td className="px-5 py-2.5 text-sm text-[#8888a0]">{i + 1}</td>
                    <td className="px-5 py-2.5">
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:underline flex items-center gap-1 truncate max-w-xs">
                        {r.url} <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-[#8888a0]">{r.checked_at?.slice(0, 10) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pages with too many links */}
      {pagesWithManyLinks.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Trang có quá nhiều links (&gt;100)</span>
          </div>
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">URL</th>
                <th className="px-5 py-2 text-right text-xs font-semibold text-[#8888a0] uppercase">Internal</th>
                <th className="px-5 py-2 text-right text-xs font-semibold text-[#8888a0] uppercase">External</th>
                <th className="px-5 py-2 text-right text-xs font-semibold text-[#8888a0] uppercase">Tổng</th>
              </tr>
            </thead>
            <tbody>
              {pagesWithManyLinks.map((r, i) => (
                <tr key={r.id} className={cn('border-t border-border', i % 2 === 0 ? '' : 'bg-secondary/20')}>
                  <td className="px-5 py-2.5">
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:underline flex items-center gap-1 truncate max-w-xs">
                      {r.url} <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </td>
                  <td className="px-5 py-2.5 text-right text-sm text-[var(--text-primary)]">{r.links!.internal.length}</td>
                  <td className="px-5 py-2.5 text-right text-sm text-[var(--text-primary)]">{r.links!.external.length}</td>
                  <td className="px-5 py-2.5 text-right text-sm font-semibold text-yellow-400">
                    {r.links!.internal.length + r.links!.external.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recommendations */}
      <div className="rounded-xl p-4 text-sm leading-relaxed bg-warning/10 border border-warning/30">
        <div className="flex items-center gap-2 font-semibold text-yellow-400 mb-2">
          <AlertTriangle className="w-4 h-4" /> Khuyến nghị tối ưu Internal Links
        </div>
        <ul className="text-[#8888a0] text-xs space-y-1.5 list-disc list-inside">
          <li>Mỗi trang nên có 3-5 internal links chất lượng, anchor text mô tả rõ ràng</li>
          <li>Dùng link equity flow từ trang high-authority sang trang mới hoặc quan trọng</li>
          <li>Tránh link chéo quá nhiều (silo structure giúp Google hiểu topical authority)</li>
          <li>Fix 404 ngay lập tức bằng 301 redirect hoặc tạo lại nội dung</li>
          <li>Dùng tool crawl (Screaming Frog) định kỳ để phát hiện broken links mới</li>
        </ul>
      </div>
    </div>
  );
}
