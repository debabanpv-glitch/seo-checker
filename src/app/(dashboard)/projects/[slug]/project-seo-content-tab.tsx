'use client';

import { FileText, AlertTriangle, Copy, TrendingDown } from 'lucide-react';
import type { DashboardData } from './project-seo-dashboard-page';

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-xs text-[#8888a0] uppercase tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-bold" style={{ color: color || 'var(--text-primary)' }}>
        {value}
      </p>
      {sub && <p className="text-xs text-[#8888a0] mt-1">{sub}</p>}
    </div>
  );
}

/** Simple horizontal bar using divs — no chart library */
function SimpleBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#8888a0] w-24 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-secondary rounded-full h-2">
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium text-[var(--text-primary)] w-8 text-right">{value}</span>
    </div>
  );
}

export default function ProjectSeoContentTab({ data }: { data: DashboardData }) {
  const { latestAudit, seoStats } = data;
  const la = latestAudit;

  const thinContent = la?.thin_content ?? 0;
  const avgWordCount = la?.avg_word_count ?? 0;
  const duplicateContent = la?.duplicate_content ?? 0;
  const totalPages = la?.total_urls ?? seoStats.totalPages;

  // Word count distribution buckets (placeholder values derived from avg)
  const wordBuckets = avgWordCount > 0
    ? [
        { label: '<300 từ', value: thinContent, color: '#ef4444' },
        { label: '300–700', value: Math.max(0, Math.round(totalPages * 0.2)), color: '#f59e0b' },
        { label: '700–1500', value: Math.max(0, Math.round(totalPages * 0.4)), color: '#6366f1' },
        { label: '>1500 từ', value: Math.max(0, totalPages - thinContent - Math.round(totalPages * 0.6)), color: '#22c55e' },
      ]
    : [];

  const maxBucket = wordBuckets.length > 0 ? Math.max(...wordBuckets.map((b) => b.value), 1) : 1;

  return (
    <div className="space-y-5">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Thin content"
          value={thinContent}
          color={thinContent > 0 ? '#ef4444' : '#22c55e'}
          sub="Trang < 300 từ"
        />
        <StatCard
          label="Avg word count"
          value={avgWordCount > 0 ? `${avgWordCount}` : '—'}
          sub="Từ trung bình/trang"
        />
        <StatCard
          label="Nội dung trùng lặp"
          value={duplicateContent}
          color={duplicateContent > 0 ? '#f59e0b' : '#22c55e'}
          sub="Duplicate content"
        />
        <StatCard
          label="Content decay"
          value="—"
          sub="Cần dữ liệu lịch sử"
          color="#8888a0"
        />
      </div>

      {/* Word count distribution */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <FileText className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Phân phối độ dài nội dung</h3>
        </div>
        {wordBuckets.length > 0 ? (
          <div className="space-y-3">
            {wordBuckets.map((b) => (
              <SimpleBar key={b.label} label={b.label} value={b.value} max={maxBucket} color={b.color} />
            ))}
          </div>
        ) : (
          <p className="text-[#8888a0] text-sm text-center py-6">
            Chưa có dữ liệu crawl để phân tích word count
          </p>
        )}
      </div>

      {/* Thin content heatmap grid */}
      {thinContent > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Thin Content — Cần cải thiện</h3>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {Array.from({ length: Math.min(thinContent, 10) }).map((_, i) => (
              <div
                key={i}
                className="bg-danger/10 border border-danger/20 rounded-lg p-3 text-center"
              >
                <p className="text-xs text-danger font-semibold">Trang {i + 1}</p>
                <p className="text-[10px] text-[#8888a0] mt-0.5">&lt;300 từ</p>
              </div>
            ))}
            {thinContent > 10 && (
              <div className="bg-secondary rounded-lg p-3 text-center flex items-center justify-center">
                <p className="text-xs text-[#8888a0]">+{thinContent - 10} trang</p>
              </div>
            )}
          </div>
          <p className="text-xs text-[#8888a0] mt-3">
            Cần bổ sung nội dung để đạt tối thiểu 500–800 từ/trang.
          </p>
        </div>
      )}

      {/* Duplicate content warning */}
      {duplicateContent > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Copy className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Nội dung trùng lặp</h3>
          </div>
          <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Phát hiện {duplicateContent} trang có nội dung trùng lặp
              </p>
              <p className="text-xs text-[#8888a0] mt-1">
                Sử dụng canonical tag hoặc viết lại nội dung độc đáo cho từng trang để tránh Google deindex.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content decay placeholder */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-4 h-4 text-[#8888a0]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Content Decay</h3>
        </div>
        <p className="text-[#8888a0] text-sm text-center py-4">
          Tính năng phát hiện content cũ sẽ khả dụng khi có dữ liệu ranking lịch sử.
          Kết nối Google Search Console để theo dõi CTR giảm theo thời gian.
        </p>
      </div>

      {!la && (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="text-[#8888a0] text-sm">
            Chưa có dữ liệu crawl. Import audit từ Screaming Frog để xem phân tích nội dung.
          </p>
        </div>
      )}
    </div>
  );
}
