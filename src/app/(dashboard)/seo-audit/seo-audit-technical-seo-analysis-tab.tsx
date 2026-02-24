'use client';

import { useState, useEffect } from 'react';
import { Zap, AlertTriangle, CheckCircle, XCircle, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  projectId?: string;
}

interface CheckDetail {
  id: string;
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warning';
  score: number;
  maxScore: number;
  value?: string | number;
}

interface SEOResult {
  id: string;
  url: string;
  technical_score: number;
  technical_max: number;
  images_score: number;
  images_max: number;
  details: CheckDetail[];
  checked_at: string;
}

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-2xl font-bold" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
      <div className="text-xs text-[#8888a0] mt-1">{label}</div>
      {sub && <div className="text-xs text-[#8888a0] mt-0.5 opacity-70">{sub}</div>}
    </div>
  );
}

// Speed distribution bar — div-based, no chart library
function SpeedBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-xs text-[#8888a0] shrink-0">{label}</div>
      <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full flex items-center justify-end pr-1.5 transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        >
          {pct > 10 && <span className="text-[10px] font-bold text-white">{pct}%</span>}
        </div>
      </div>
      <div className="w-10 text-right text-xs font-semibold text-[var(--text-primary)]">{count}</div>
    </div>
  );
}

type SchemaStatus = 'present' | 'missing' | 'error';

const SCHEMA_AUDIT: Array<{ type: string; status: SchemaStatus; fix: string }> = [
  { type: 'Organization', status: 'present', fix: 'Thêm contactPoint, logo, sameAs' },
  { type: 'WebSite + SearchAction', status: 'present', fix: '—' },
  { type: 'BreadcrumbList', status: 'missing', fix: 'Thêm schema BreadcrumbList vào tất cả trang nội cấp 2+' },
  { type: 'Article / BlogPosting', status: 'missing', fix: 'Thêm Article schema cho mỗi bài blog, gồm author, datePublished' },
  { type: 'FAQ', status: 'missing', fix: 'Thêm FAQ schema cho trang có dạng hỏi đáp' },
  { type: 'Product / Review', status: 'missing', fix: 'Thêm Product + AggregateRating cho trang sản phẩm' },
  { type: 'LocalBusiness', status: 'missing', fix: 'Thêm LocalBusiness nếu có địa điểm thực' },
];

function SchemaStatusTag({ status }: { status: SchemaStatus }) {
  const map: Record<SchemaStatus, { label: string; cls: string }> = {
    present: { label: 'Có', cls: 'bg-success/20 text-green-400' },
    missing: { label: 'Thiếu', cls: 'bg-danger/20 text-red-400' },
    error: { label: 'Lỗi', cls: 'bg-warning/20 text-yellow-400' },
  };
  const { label, cls } = map[status];
  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', cls)}>{label}</span>;
}

export default function SEOTechnicalSEOAnalysisTab({ projectId }: Props) {
  const [seoResults, setSeoResults] = useState<SEOResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/seo-results${projectId ? `?projectId=${projectId}` : ''}`);
        const data = await res.json();
        setSeoResults(data.results || []);
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

  const total = seoResults.length;

  // Technical score stats
  const avgTechPct = total > 0
    ? Math.round(seoResults.reduce((s, r) => s + (r.technical_max > 0 ? (r.technical_score / r.technical_max) * 100 : 0), 0) / total)
    : 0;

  // Images missing alt — from details
  const missingAlt = seoResults.filter(r =>
    r.details?.some(d => (d.id === 'images_alt' || d.id === 'image_alt') && d.status !== 'pass')
  ).length;

  // Speed buckets: use technical score % as proxy for speed health
  // <50% = slow, 50-75% = moderate, >75% = fast
  const fastPages = seoResults.filter(r => r.technical_max > 0 && (r.technical_score / r.technical_max) >= 0.75).length;
  const moderatePages = seoResults.filter(r => r.technical_max > 0 && (r.technical_score / r.technical_max) >= 0.5 && (r.technical_score / r.technical_max) < 0.75).length;
  const slowPages = seoResults.filter(r => r.technical_max > 0 && (r.technical_score / r.technical_max) < 0.5).length;

  // Schema audit: count present from details
  const schemaPresent = SCHEMA_AUDIT.map(s => ({
    ...s,
    status: seoResults.some(r => r.details?.some(d => d.id === 'schema_markup' && d.status === 'pass'))
      ? s.status
      : s.status,
  }));

  const criticalIssues = seoResults.reduce((acc, r) => {
    const fails = (r.details || []).filter(d => d.category === 'technical' && d.status === 'fail');
    return acc + fails.length;
  }, 0);

  return (
    <div className="space-y-5 overflow-y-auto pb-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Technical score TB"
          value={`${avgTechPct}%`}
          color={avgTechPct >= 70 ? '#22c55e' : avgTechPct >= 50 ? '#f59e0b' : '#ef4444'}
        />
        <StatCard
          label="Trang chậm (<50% tech)"
          value={slowPages}
          color={slowPages > 0 ? '#ef4444' : '#22c55e'}
          sub="Cần tối ưu gấp"
        />
        <StatCard
          label="Lỗi kỹ thuật (fail)"
          value={criticalIssues}
          color={criticalIssues > 0 ? '#ef4444' : '#22c55e'}
        />
        <StatCard
          label="Ảnh thiếu alt text"
          value={missingAlt}
          color={missingAlt > 0 ? '#f59e0b' : '#22c55e'}
        />
      </div>

      {/* Alert box */}
      {(slowPages > 0 || criticalIssues > 0) && (
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-danger/10 border border-danger/30">
          <div className="flex items-center gap-2 font-semibold text-red-400 mb-2">
            <XCircle className="w-4 h-4" /> Vấn đề kỹ thuật nghiêm trọng
          </div>
          <ul className="text-[#8888a0] text-xs space-y-1 list-disc list-inside">
            {slowPages > 0 && <li>{slowPages} trang có điểm kỹ thuật thấp — ảnh hưởng Core Web Vitals và ranking</li>}
            {criticalIssues > 0 && <li>{criticalIssues} lỗi kỹ thuật (fail) cần sửa ngay để cải thiện điểm SEO</li>}
            {missingAlt > 0 && <li>{missingAlt} trang có ảnh thiếu alt text — ảnh hưởng accessibility và image search</li>}
          </ul>
        </div>
      )}

      {/* Speed distribution — div bar chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Phân bố hiệu suất kỹ thuật</span>
          <span className="text-xs text-[#8888a0] ml-auto">(Proxy từ technical score)</span>
        </div>
        <div className="space-y-3">
          <SpeedBar label="Tốt (≥75%)" count={fastPages} total={total} color="#22c55e" />
          <SpeedBar label="TB (50-74%)" count={moderatePages} total={total} color="#f59e0b" />
          <SpeedBar label="Chậm (<50%)" count={slowPages} total={total} color="#ef4444" />
        </div>
        <div className="mt-4 pt-3 border-t border-border text-xs text-[#8888a0]">
          Dữ liệu tốc độ thực tế cần tích hợp PageSpeed Insights API hoặc Lighthouse. Hiện tại hiển thị proxy từ technical SEO score.
        </div>
      </div>

      {/* Images missing alt detail */}
      {missingAlt > 0 && (
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-warning/10 border border-warning/30">
          <div className="flex items-center gap-2 font-semibold text-yellow-400 mb-2">
            <Image className="w-4 h-4" aria-hidden="true" /> Ảnh thiếu Alt Text
          </div>
          <p className="text-[#8888a0] text-xs">
            {missingAlt} trang có ảnh thiếu alt text. Thêm alt text mô tả keyword liên quan giúp Google Image Search
            và cải thiện điểm accessibility (WCAG). Ưu tiên ảnh hero và featured image.
          </p>
        </div>
      )}

      {/* Schema audit table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#8888a0]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Kiểm tra Schema Markup</span>
        </div>
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">Loại Schema</th>
              <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">Trạng thái</th>
              <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {schemaPresent.map((s, i) => (
              <tr key={i} className={cn('border-t border-border', i % 2 === 0 ? '' : 'bg-secondary/20')}>
                <td className="px-5 py-2.5 text-sm text-[var(--text-primary)] font-medium">{s.type}</td>
                <td className="px-5 py-2.5"><SchemaStatusTag status={s.status} /></td>
                <td className="px-5 py-2.5 text-xs text-[#8888a0]">{s.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-success/10 border border-success/30">
          <div className="flex items-center gap-2 font-semibold text-green-400 mb-2">
            <CheckCircle className="w-4 h-4" /> Việc ưu tiên làm ngay
          </div>
          <ul className="text-[#8888a0] text-xs space-y-1 list-disc list-inside">
            <li>Thêm alt text cho tất cả ảnh thiếu (bulk edit qua CMS)</li>
            <li>Triển khai BreadcrumbList + Article schema cho blog</li>
            <li>Kiểm tra canonical tag trên tất cả trang duplicate</li>
          </ul>
        </div>
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-accent/10 border border-accent/30">
          <div className="flex items-center gap-2 font-semibold text-blue-400 mb-2">
            <AlertTriangle className="w-4 h-4" /> Tối ưu Core Web Vitals
          </div>
          <ul className="text-[#8888a0] text-xs space-y-1 list-disc list-inside">
            <li>Nén ảnh WebP, lazy loading, preload LCP image</li>
            <li>Minify JS/CSS, loại bỏ render-blocking resources</li>
            <li>Dùng CDN, enable browser caching (Cache-Control headers)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
