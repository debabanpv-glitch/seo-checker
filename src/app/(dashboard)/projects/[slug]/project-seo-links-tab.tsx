'use client';

import { Link2, AlertTriangle, FileX, ExternalLink } from 'lucide-react';
import type { DashboardData } from './project-seo-dashboard-page';

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      {icon && <div className="mb-3">{icon}</div>}
      <p className="text-xs text-[#8888a0] uppercase tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-bold" style={{ color: color || 'var(--text-primary)' }}>
        {value}
      </p>
      {sub && <p className="text-xs text-[#8888a0] mt-1">{sub}</p>}
    </div>
  );
}

export default function ProjectSeoLinksTab({ data }: { data: DashboardData }) {
  const { latestAudit } = data;
  const la = latestAudit;

  const totalInternalLinks = la?.internal_links ?? 0;
  const avgLinksPerPage =
    la && la.total_urls > 0 ? Math.round(totalInternalLinks / la.total_urls) : 0;
  const orphanPages = la?.orphan_pages ?? 0;
  const brokenLinks = la?.broken_links ?? 0;

  return (
    <div className="space-y-5">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Tổng internal links"
          value={totalInternalLinks}
          color="#6366f1"
          icon={<Link2 className="w-5 h-5 text-accent" />}
        />
        <StatCard
          label="Avg links / trang"
          value={avgLinksPerPage}
          sub="Internal links trung bình"
        />
        <StatCard
          label="Orphan pages"
          value={orphanPages}
          color={orphanPages > 0 ? '#f59e0b' : '#22c55e'}
          sub="Trang không có inlink"
          icon={<FileX className="w-5 h-5 text-warning" />}
        />
        <StatCard
          label="Broken links"
          value={brokenLinks}
          color={brokenLinks > 0 ? '#ef4444' : '#22c55e'}
          sub="Links 4xx / lỗi"
          icon={<AlertTriangle className="w-5 h-5 text-danger" />}
        />
      </div>

      {/* Link health summary */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Tình trạng Internal Links</h3>
        {la ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-[#8888a0]">Tổng trang crawled</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">{la.total_urls}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-[#8888a0]">Trang indexable</span>
              <span className="text-sm font-medium text-success">{la.indexable}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-[#8888a0]">Orphan pages</span>
              <span className={`text-sm font-medium ${orphanPages > 0 ? 'text-warning' : 'text-success'}`}>
                {orphanPages}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[#8888a0]">Broken links (4xx)</span>
              <span className={`text-sm font-medium ${brokenLinks > 0 ? 'text-danger' : 'text-success'}`}>
                {brokenLinks}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[#8888a0] text-sm text-center py-6">Chưa có dữ liệu crawl</p>
        )}
      </div>

      {/* Audit history link health */}
      {data.auditHistory.length > 1 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Lịch sử Crawl — Link Health</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Ngày audit</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Tổng trang</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">4xx</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">3xx</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Orphan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.auditHistory.map((audit) => (
                  <tr key={audit.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{audit.audit_date}</td>
                    <td className="px-4 py-3 text-center text-sm text-[#8888a0]">{audit.total_urls}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-medium ${audit.status_4xx > 0 ? 'text-danger' : 'text-success'}`}>
                        {audit.status_4xx}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-medium ${audit.status_3xx > 0 ? 'text-warning' : 'text-[#8888a0]'}`}>
                        {audit.status_3xx}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-medium ${audit.orphan_pages > 0 ? 'text-warning' : 'text-success'}`}>
                        {audit.orphan_pages}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Link suggestions placeholder */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ExternalLink className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Gợi ý cải thiện Internal Links</h3>
        </div>
        <div className="space-y-3">
          {orphanPages > 0 && (
            <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Có {orphanPages} trang orphan</p>
                <p className="text-xs text-[#8888a0] mt-0.5">
                  Thêm internal links đến các trang này từ nội dung liên quan để cải thiện crawlability.
                </p>
              </div>
            </div>
          )}
          {brokenLinks > 0 && (
            <div className="flex items-start gap-3 p-3 bg-danger/10 rounded-lg border border-danger/20">
              <AlertTriangle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Có {brokenLinks} broken links</p>
                <p className="text-xs text-[#8888a0] mt-0.5">
                  Kiểm tra và sửa hoặc xóa các links bị hỏng để tránh ảnh hưởng UX và SEO.
                </p>
              </div>
            </div>
          )}
          {avgLinksPerPage < 3 && la && (
            <div className="flex items-start gap-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
              <Link2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Internal links/trang thấp ({avgLinksPerPage})</p>
                <p className="text-xs text-[#8888a0] mt-0.5">
                  Nên có ít nhất 3-5 internal links mỗi trang để phân phối link juice hiệu quả.
                </p>
              </div>
            </div>
          )}
          {!la && (
            <p className="text-[#8888a0] text-sm text-center py-4">Import crawl data để nhận gợi ý cụ thể</p>
          )}
        </div>
      </div>
    </div>
  );
}
