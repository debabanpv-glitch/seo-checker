'use client';

import ScoreRing, { getScoreColor } from '@/components/score-ring-svg-circle';
import type { DashboardData } from './project-seo-dashboard-page';

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}

function StatCard({ label, value, sub, color }: StatCardProps) {
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

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore: number;
}

function ScoreBar({ label, score, maxScore }: ScoreBarProps) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const color = getScoreColor(pct);
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[#8888a0] w-28 shrink-0">{label}</span>
      <div className="flex-1 bg-secondary rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-medium w-10 text-right" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'bg-danger/20 text-danger',
  warning: 'bg-warning/20 text-warning',
  info: 'bg-accent/20 text-accent',
};

export default function ProjectSeoOverviewTab({ data }: { data: DashboardData }) {
  const { latestAudit, seoStats } = data;

  const overallPct =
    seoStats.totalPages > 0
      ? Math.round(seoStats.avgScore)
      : 0;

  const la = latestAudit;

  return (
    <div className="space-y-5">
      {/* Score + Category Bars */}
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row gap-8 items-center">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <ScoreRing score={overallPct} size={160} strokeWidth={14} label="SEO Score" />
          <p className="text-xs text-[#8888a0]">
            {seoStats.totalPages > 0
              ? `${seoStats.totalPages} trang đã kiểm tra`
              : 'Chưa có dữ liệu SEO Check'}
          </p>
        </div>
        <div className="flex-1 w-full space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Điểm theo danh mục</h3>
          <ScoreBar label="Nội dung" score={seoStats.avgContentScore} maxScore={100} />
          <ScoreBar label="Kỹ thuật" score={seoStats.avgTechnicalScore} maxScore={100} />
          <ScoreBar label="Hình ảnh" score={seoStats.avgImagesScore} maxScore={100} />
          <div className="pt-2 flex gap-4 text-xs text-[#8888a0]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success inline-block" />
              Tốt: {seoStats.scoreDistribution.good}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-warning inline-block" />
              TB: {seoStats.scoreDistribution.average}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-danger inline-block" />
              Kém: {seoStats.scoreDistribution.poor}
            </span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Tổng trang"
          value={la?.total_urls ?? 0}
          sub={la?.audit_date ? `Crawl: ${la.audit_date}` : 'Chưa có crawl'}
        />
        <StatCard
          label="200 OK"
          value={la?.status_200 ?? 0}
          color="#22c55e"
          sub={la ? `${la.total_urls > 0 ? Math.round((la.status_200 / la.total_urls) * 100) : 0}% tổng` : undefined}
        />
        <StatCard
          label="3xx Redirect"
          value={la?.status_3xx ?? 0}
          color="#f59e0b"
        />
        <StatCard
          label="4xx Lỗi"
          value={la?.status_4xx ?? 0}
          color="#ef4444"
        />
        <StatCard
          label="Tốc độ TB"
          value={la?.avg_response_ms ? `${la.avg_response_ms}ms` : '—'}
          sub="Avg response time"
        />
      </div>

      {/* Top Issues */}
      {seoStats.topIssues.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Vấn đề phổ biến nhất</h3>
          <div className="space-y-3">
            {seoStats.topIssues.map((issue, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_COLOR[issue.severity] || SEVERITY_COLOR.info}`}
                  >
                    {issue.severity === 'critical' ? 'Critical' : issue.severity === 'warning' ? 'Warning' : 'Info'}
                  </span>
                  <span className="text-sm text-[var(--text-primary)]">{issue.type}</span>
                </div>
                <span className="text-sm font-medium text-[#8888a0]">{issue.count} trang</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state if no data */}
      {!la && seoStats.totalPages === 0 && (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="text-[#8888a0] text-sm">
            Chưa có dữ liệu audit. Chạy Screaming Frog và import crawl để xem thống kê.
          </p>
        </div>
      )}
    </div>
  );
}
