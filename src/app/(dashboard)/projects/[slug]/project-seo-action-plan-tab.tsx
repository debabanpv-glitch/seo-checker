'use client';

import { ClipboardList, CheckCircle2, Circle, Target, TrendingUp } from 'lucide-react';
import type { DashboardData } from './project-seo-dashboard-page';

const PRIORITY_COLOR: Record<string, string> = {
  high: 'bg-danger/20 text-danger border-danger/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  low: 'bg-success/20 text-success border-success/30',
};

const PRIORITY_LABEL: Record<string, string> = {
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

interface ActionItem {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  done?: boolean;
}

interface Phase {
  label: string;
  duration: string;
  color: string;
  bgColor: string;
  items: ActionItem[];
}

interface KpiTarget {
  metric: string;
  current: string;
  target: string;
  timeline: string;
}

interface CategoryRow {
  category: string;
  priority: 'high' | 'medium' | 'low';
  tasks: number;
  impact: string;
}

function buildPhases(data: DashboardData): Phase[] {
  const { latestAudit, seoStats } = data;
  const la = latestAudit;

  const phase1Items: ActionItem[] = [];
  if (la?.status_4xx && la.status_4xx > 0) {
    phase1Items.push({
      title: `Sửa ${la.status_4xx} lỗi 404`,
      description: 'Fix hoặc redirect các URL 4xx để tránh mất link equity',
      priority: 'high',
      category: 'Kỹ thuật',
    });
  }
  if (la?.redirect_chains && la.redirect_chains > 0) {
    phase1Items.push({
      title: `Giải quyết ${la.redirect_chains} redirect chain`,
      description: 'Rút gọn chuỗi redirect về 1 hop để tối ưu tốc độ',
      priority: 'high',
      category: 'Kỹ thuật',
    });
  }
  if (la?.thin_content && la.thin_content > 0) {
    phase1Items.push({
      title: `Bổ sung ${la.thin_content} trang thin content`,
      description: 'Tăng độ dài nội dung lên tối thiểu 500 từ/trang',
      priority: 'high',
      category: 'Nội dung',
    });
  }
  if (seoStats.scoreDistribution.poor > 0) {
    phase1Items.push({
      title: `Tối ưu ${seoStats.scoreDistribution.poor} trang SEO score thấp`,
      description: 'Cải thiện meta tags, H1, alt text cho các trang dưới 60 điểm',
      priority: 'high',
      category: 'On-page SEO',
    });
  }
  // Default if no data
  if (phase1Items.length === 0) {
    phase1Items.push(
      { title: 'Audit kỹ thuật toàn site', description: 'Chạy Screaming Frog và import kết quả', priority: 'high', category: 'Kỹ thuật' },
      { title: 'Fix lỗi crawl & redirect', description: 'Ưu tiên xử lý 4xx và redirect chains', priority: 'high', category: 'Kỹ thuật' }
    );
  }

  const phase2Items: ActionItem[] = [
    {
      title: 'Xây dựng topic clusters',
      description: 'Tạo pillar pages và cluster content cho các chủ đề chính',
      priority: 'medium',
      category: 'Content Strategy',
    },
    {
      title: la?.orphan_pages && la.orphan_pages > 0
        ? `Thêm internal links cho ${la.orphan_pages} orphan pages`
        : 'Cải thiện cấu trúc internal links',
      description: 'Đảm bảo mọi trang đều có ít nhất 3 inbound internal links',
      priority: 'medium',
      category: 'Internal Links',
    },
    {
      title: 'Thêm schema markup',
      description: 'Triển khai Article, BreadcrumbList, FAQPage schema',
      priority: 'medium',
      category: 'Structured Data',
    },
    {
      title: 'Tối ưu Core Web Vitals',
      description: 'Cải thiện LCP, CLS, FID để đạt ngưỡng "Good"',
      priority: 'medium',
      category: 'Hiệu năng',
    },
  ];

  const phase3Items: ActionItem[] = [
    {
      title: 'Phân tích content decay',
      description: 'Cập nhật bài viết cũ có traffic giảm, bổ sung thông tin mới',
      priority: 'low',
      category: 'Nội dung',
    },
    {
      title: 'Mở rộng từ khóa long-tail',
      description: 'Nghiên cứu và tạo content cho các từ khóa dài chưa được cover',
      priority: 'low',
      category: 'Keyword Research',
    },
    {
      title: 'Link building outreach',
      description: 'Xây dựng backlinks chất lượng từ các domain liên quan',
      priority: 'low',
      category: 'Off-page SEO',
    },
    {
      title: 'Tối ưu tỷ lệ chuyển đổi (CRO)',
      description: 'A/B test CTA, cải thiện UX cho các revenue pages',
      priority: 'low',
      category: 'CRO',
    },
  ];

  return [
    {
      label: 'Phase 1: Fix Critical',
      duration: 'Tuần 1–2',
      color: '#ef4444',
      bgColor: 'bg-danger/10 border-danger/20',
      items: phase1Items,
    },
    {
      label: 'Phase 2: Content Build',
      duration: 'Tuần 3–6',
      color: '#f59e0b',
      bgColor: 'bg-warning/10 border-warning/20',
      items: phase2Items,
    },
    {
      label: 'Phase 3: Scale',
      duration: 'Tháng 2–3',
      color: '#22c55e',
      bgColor: 'bg-success/10 border-success/20',
      items: phase3Items,
    },
  ];
}

function buildKpiTargets(data: DashboardData): KpiTarget[] {
  const { latestAudit, seoStats } = data;
  const la = latestAudit;
  return [
    {
      metric: 'SEO Score TB',
      current: seoStats.avgScore > 0 ? `${seoStats.avgScore}` : '—',
      target: '≥ 80',
      timeline: '3 tháng',
    },
    {
      metric: 'Trang 4xx',
      current: la ? `${la.status_4xx}` : '—',
      target: '0',
      timeline: '2 tuần',
    },
    {
      metric: 'Orphan pages',
      current: la ? `${la.orphan_pages}` : '—',
      target: '0',
      timeline: '1 tháng',
    },
    {
      metric: 'Avg response time',
      current: la?.avg_response_ms ? `${la.avg_response_ms}ms` : '—',
      target: '< 500ms',
      timeline: '1 tháng',
    },
    {
      metric: 'Thin content',
      current: la ? `${la.thin_content}` : '—',
      target: '0',
      timeline: '6 tuần',
    },
  ];
}

const CATEGORY_ROWS: CategoryRow[] = [
  { category: 'Kỹ thuật', priority: 'high', tasks: 3, impact: 'Rất cao' },
  { category: 'On-page SEO', priority: 'high', tasks: 4, impact: 'Cao' },
  { category: 'Nội dung', priority: 'medium', tasks: 5, impact: 'Cao' },
  { category: 'Internal Links', priority: 'medium', tasks: 2, impact: 'Trung bình' },
  { category: 'Structured Data', priority: 'medium', tasks: 2, impact: 'Trung bình' },
  { category: 'Off-page SEO', priority: 'low', tasks: 3, impact: 'Trung bình' },
];

export default function ProjectSeoActionPlanTab({ data }: { data: DashboardData }) {
  const phases = buildPhases(data);
  const kpiTargets = buildKpiTargets(data);

  return (
    <div className="space-y-5">
      {/* Phase Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {phases.map((phase) => (
          <div key={phase.label} className={`bg-card border rounded-xl p-5 ${phase.bgColor}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{phase.label}</h3>
              <span className="text-xs text-[#8888a0] bg-secondary px-2 py-0.5 rounded-full">
                {phase.duration}
              </span>
            </div>
            <div className="space-y-2">
              {phase.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Circle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: phase.color }} />
                  <div>
                    <p className="text-xs font-medium text-[var(--text-primary)]">{item.title}</p>
                    <p className="text-[10px] text-[#8888a0] mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* All action items flat list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Danh sách hành động chi tiết</h3>
        </div>
        <div className="divide-y divide-border">
          {phases.flatMap((phase) =>
            phase.items.map((item, i) => (
              <div key={`${phase.label}-${i}`} className="flex items-start gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-border mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${PRIORITY_COLOR[item.priority]}`}>
                      {PRIORITY_LABEL[item.priority]}
                    </span>
                    <span className="text-[10px] text-[#8888a0] bg-secondary px-1.5 py-0.5 rounded">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#8888a0] mt-0.5">{item.description}</p>
                </div>
                <span className="text-[10px] text-[#8888a0] shrink-0">{phase.duration}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Category priority table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Target className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Ưu tiên theo danh mục</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Danh mục</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-24">Ưu tiên</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-20">Tasks</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CATEGORY_ROWS.map((row) => (
                <tr key={row.category} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{row.category}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLOR[row.priority]}`}>
                      {PRIORITY_LABEL[row.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-[#8888a0]">{row.tasks}</td>
                  <td className="px-4 py-3 text-sm text-[#8888a0]">{row.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPI Targets */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-success" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">KPI Targets</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider">Chỉ số</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-28">Hiện tại</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-28">Mục tiêu</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#8888a0] uppercase tracking-wider w-28">Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {kpiTargets.map((row) => (
                <tr key={row.metric} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{row.metric}</td>
                  <td className="px-4 py-3 text-center text-sm text-[#8888a0]">{row.current}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-medium text-success">{row.target}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-[#8888a0]">{row.timeline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
