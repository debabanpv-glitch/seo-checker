'use client';

import { Lightbulb, FileText, Link2, DollarSign, Zap, AlertTriangle } from 'lucide-react';
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

const PRIORITY_COLOR: Record<string, string> = {
  high: 'bg-danger/20 text-danger',
  medium: 'bg-warning/20 text-warning',
  low: 'bg-success/20 text-success',
};

interface OpportunityRow {
  title: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  effort: string;
  impact: string;
}

interface RevenueRow {
  page: string;
  issue: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
}

export default function ProjectSeoOpportunitiesTab({ data }: { data: DashboardData }) {
  const { latestAudit, seoStats } = data;
  const la = latestAudit;

  // Derive opportunity count from actual data
  const thinContent = la?.thin_content ?? 0;
  const orphanPages = la?.orphan_pages ?? 0;
  const brokenLinks = la?.broken_links ?? 0;
  const poorPages = seoStats.scoreDistribution.poor;

  const quickWins = (brokenLinks > 0 ? 1 : 0) + (orphanPages > 0 ? 1 : 0) + (thinContent > 0 ? 1 : 0);

  // Build dynamic opportunity rows from real data
  const contentOpportunities: OpportunityRow[] = [];
  if (thinContent > 0) {
    contentOpportunities.push({
      title: `Bổ sung nội dung ${thinContent} trang thin content`,
      type: 'Nội dung',
      priority: thinContent > 10 ? 'high' : 'medium',
      effort: 'Trung bình',
      impact: 'Cao',
    });
  }
  if (poorPages > 0) {
    contentOpportunities.push({
      title: `Cải thiện ${poorPages} trang SEO score thấp (<60)`,
      type: 'SEO Score',
      priority: poorPages > 5 ? 'high' : 'medium',
      effort: 'Cao',
      impact: 'Cao',
    });
  }
  if (orphanPages > 0) {
    contentOpportunities.push({
      title: `Thêm internal links cho ${orphanPages} orphan pages`,
      type: 'Internal Links',
      priority: 'medium',
      effort: 'Thấp',
      impact: 'Trung bình',
    });
  }
  if (brokenLinks > 0) {
    contentOpportunities.push({
      title: `Sửa ${brokenLinks} broken links (4xx)`,
      type: 'Kỹ thuật',
      priority: 'high',
      effort: 'Thấp',
      impact: 'Cao',
    });
  }
  // Placeholder items when no data
  if (contentOpportunities.length === 0) {
    contentOpportunities.push(
      {
        title: 'Nghiên cứu từ khóa dài (long-tail) trong ngành',
        type: 'Nội dung',
        priority: 'medium',
        effort: 'Trung bình',
        impact: 'Cao',
      },
      {
        title: 'Tối ưu meta title & description cho trang chính',
        type: 'On-page SEO',
        priority: 'high',
        effort: 'Thấp',
        impact: 'Trung bình',
      },
      {
        title: 'Xây dựng topic cluster cho các chủ đề chính',
        type: 'Content Strategy',
        priority: 'medium',
        effort: 'Cao',
        impact: 'Cao',
      }
    );
  }

  // Revenue pages (placeholder structure)
  const revenuePages: RevenueRow[] = la
    ? [
        {
          page: 'Trang chủ',
          issue: la.status_4xx > 0 ? `${la.status_4xx} broken links` : 'Tốc độ chậm',
          priority: 'high',
          action: 'Sửa ngay',
        },
        {
          page: 'Trang dịch vụ/sản phẩm',
          issue: 'Thiếu schema markup',
          priority: 'medium',
          action: 'Thêm structured data',
        },
        {
          page: 'Landing pages',
          issue: thinContent > 0 ? 'Thin content' : 'Tối ưu CTA',
          priority: thinContent > 0 ? 'high' : 'low',
          action: thinContent > 0 ? 'Bổ sung nội dung' : 'A/B test CTA',
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Gợi ý bài mới"
          value="—"
          sub="Cần dữ liệu keyword research"
          color="#8888a0"
          icon={<FileText className="w-5 h-5 text-accent" />}
        />
        <StatCard
          label="Gợi ý link mới"
          value={orphanPages}
          sub="Trang cần thêm inlinks"
          color={orphanPages > 0 ? '#f59e0b' : '#22c55e'}
          icon={<Link2 className="w-5 h-5 text-warning" />}
        />
        <StatCard
          label="Revenue pages"
          value={poorPages}
          sub="Trang quan trọng cần fix"
          color={poorPages > 0 ? '#ef4444' : '#22c55e'}
          icon={<DollarSign className="w-5 h-5 text-danger" />}
        />
        <StatCard
          label="Quick Wins"
          value={quickWins}
          sub="Việc dễ làm, impact cao"
          color={quickWins > 0 ? '#22c55e' : '#8888a0'}
          icon={<Zap className="w-5 h-5 text-success" />}
        />
      </div>

      {/* Content opportunities table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cơ hội tối ưu</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Cơ hội</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-32">Loại</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-24">Ưu tiên</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-24">Effort</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-24">Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contentOpportunities.map((row, i) => (
                <tr key={i} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{row.title}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#8888a0]">{row.type}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLOR[row.priority]}`}>
                      {row.priority === 'high' ? 'Cao' : row.priority === 'medium' ? 'TB' : 'Thấp'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-[#8888a0]">{row.effort}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-medium text-[var(--text-primary)]">{row.impact}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue pages priority */}
      {revenuePages.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-danger" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Revenue Pages — Ưu tiên Fix</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Trang</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Vấn đề</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-24">Ưu tiên</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {revenuePages.map((row, i) => (
                  <tr key={i} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{row.page}</td>
                    <td className="px-4 py-3 text-sm text-[#8888a0]">{row.issue}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLOR[row.priority]}`}>
                        {row.priority === 'high' ? 'Cao' : row.priority === 'medium' ? 'TB' : 'Thấp'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!la && revenuePages.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start gap-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
            <AlertTriangle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
            <p className="text-sm text-[#8888a0]">
              Import crawl data và kết nối keyword tracking để nhận phân tích cơ hội chi tiết.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
