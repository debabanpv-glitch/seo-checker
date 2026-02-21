'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, XCircle, BarChart2 } from 'lucide-react';
import ScoreRing from '@/components/score-ring-svg-circle';
import { cn } from '@/lib/utils';

interface Props {
  projectId?: string;
}

interface SEOResult {
  id: string;
  url: string;
  score: number;
  max_score: number;
  content_score: number;
  content_max: number;
  images_score: number;
  images_max: number;
  technical_score: number;
  technical_max: number;
  details: Array<{ id: string; category: string; name: string; status: string; score: number; maxScore: number; suggestion?: string }>;
  checked_at: string;
}

interface AuditResult {
  id: string;
  audit_type: string;
  audit_date: string;
  summary: { total_urls: number; status_codes: Record<string, number>; indexability?: { indexable: number; nonIndexable: number } } | null;
}

function CategoryBar({ label, score, max, color }: { label: string; score: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-xs text-[#8888a0] shrink-0">{label}</div>
      <div className="flex-1 h-2 bg-secondary rounded-full">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="w-10 text-right text-xs font-semibold" style={{ color }}>{pct}%</div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-2xl font-bold" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
      <div className="text-xs text-[#8888a0] mt-1">{label}</div>
      {sub && <div className="text-xs text-[#8888a0] mt-0.5">{sub}</div>}
    </div>
  );
}

export default function SEOOverviewTab({ projectId }: Props) {
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

  // Compute aggregates
  const total = seoResults.length;
  const avgScore = total > 0 ? Math.round(seoResults.reduce((s, r) => s + r.score, 0) / total) : 0;
  const maxScoreVal = seoResults[0]?.max_score || 100;

  const totalContent = seoResults.reduce((s, r) => s + r.content_max, 0);
  const scoredContent = seoResults.reduce((s, r) => s + r.content_score, 0);
  const totalImages = seoResults.reduce((s, r) => s + r.images_max, 0);
  const scoredImages = seoResults.reduce((s, r) => s + r.images_score, 0);
  const totalTech = seoResults.reduce((s, r) => s + r.technical_max, 0);
  const scoredTech = seoResults.reduce((s, r) => s + r.technical_score, 0);

  const passed = seoResults.filter(r => r.score >= 70).length;
  const failed = seoResults.filter(r => r.score < 50).length;
  const warning = total - passed - failed;

  // Top issues: collect all fail/warning details across results
  const issueMap = new Map<string, { name: string; count: number; status: string }>();
  seoResults.forEach(r => {
    (r.details || []).forEach(d => {
      if (d.status !== 'pass') {
        const existing = issueMap.get(d.id);
        if (existing) existing.count++;
        else issueMap.set(d.id, { name: d.name, count: 1, status: d.status });
      }
    });
  });
  const topIssues = Array.from(issueMap.values()).sort((a, b) => b.count - a.count).slice(0, 8);

  const latestAudit = auditResults[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#8888a0] text-sm">Đang tải...</div>
      </div>
    );
  }

  if (total === 0 && auditResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <BarChart2 className="w-12 h-12 text-[#8888a0] opacity-40" />
        <p className="text-[#8888a0] text-sm">Chưa có dữ liệu SEO</p>
        <p className="text-[#8888a0] text-xs">Hãy chạy SEO Check hoặc import Crawl Data trước</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 overflow-y-auto pb-4">
      {/* Top section: score ring + category bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score Ring */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center gap-4">
          <div className="text-sm font-semibold text-[var(--text-primary)]">Điểm SEO trung bình</div>
          {total > 0 ? (
            <ScoreRing score={avgScore} maxScore={maxScoreVal} size={140} strokeWidth={12} />
          ) : (
            <div className="w-36 h-36 rounded-full border-8 border-border flex items-center justify-center">
              <span className="text-[#8888a0] text-sm">N/A</span>
            </div>
          )}
          <div className="text-xs text-[#8888a0]">Dựa trên {total} trang đã kiểm tra</div>
        </div>

        {/* Category bars */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 justify-center">
          <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">Điểm theo danh mục</div>
          <CategoryBar label="Nội dung" score={scoredContent} max={totalContent} color="#22c55e" />
          <CategoryBar label="Hình ảnh" score={scoredImages} max={totalImages} color="#3b82f6" />
          <CategoryBar label="Kỹ thuật" score={scoredTech} max={totalTech} color="#f59e0b" />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Tổng trang" value={total} color="#a78bfa" />
          <StatCard label="Đạt (≥70)" value={passed} color="#22c55e" />
          <StatCard label="Cảnh báo" value={warning} color="#f59e0b" />
          <StatCard label="Cần cải thiện" value={failed} color="#ef4444" />
        </div>
      </div>

      {/* Crawl summary from latest audit */}
      {latestAudit?.summary && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Crawl tổng quan — {latestAudit.audit_date}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--text-primary)]">{latestAudit.summary.total_urls}</div>
              <div className="text-xs text-[#8888a0]">Tổng URLs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{latestAudit.summary.indexability?.indexable ?? '—'}</div>
              <div className="text-xs text-[#8888a0]">Indexable</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--text-primary)]">{latestAudit.summary.status_codes?.['200'] ?? '—'}</div>
              <div className="text-xs text-[#8888a0]">HTTP 200</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{latestAudit.summary.status_codes?.['404'] ?? '—'}</div>
              <div className="text-xs text-[#8888a0]">HTTP 404</div>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-danger/10 border border-danger/30">
          <div className="flex items-center gap-2 font-semibold text-red-400 mb-2">
            <XCircle className="w-4 h-4" /> Cần sửa ngay
          </div>
          <p className="text-[#8888a0] text-xs">{failed} trang có điểm dưới 50. Ưu tiên kiểm tra meta, H1 và tốc độ tải.</p>
        </div>
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-warning/10 border border-warning/30">
          <div className="flex items-center gap-2 font-semibold text-yellow-400 mb-2">
            <AlertTriangle className="w-4 h-4" /> Cần cải thiện
          </div>
          <p className="text-[#8888a0] text-xs">{warning} trang cần tối ưu thêm để đạt ngưỡng 70+.</p>
        </div>
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-success/10 border border-success/30">
          <div className="flex items-center gap-2 font-semibold text-green-400 mb-2">
            <CheckCircle className="w-4 h-4" /> Đang tốt
          </div>
          <p className="text-[#8888a0] text-xs">{passed} trang đạt chuẩn SEO. Tiếp tục duy trì chất lượng nội dung.</p>
        </div>
      </div>

      {/* Top issues table */}
      {topIssues.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#8888a0]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Vấn đề phổ biến nhất</span>
          </div>
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">Vấn đề</th>
                <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">Mức độ</th>
                <th className="px-5 py-2 text-right text-xs font-semibold text-[#8888a0] uppercase">Số trang</th>
              </tr>
            </thead>
            <tbody>
              {topIssues.map((issue, i) => (
                <tr key={i} className={cn('border-t border-border', i % 2 === 0 ? '' : 'bg-secondary/20')}>
                  <td className="px-5 py-2.5 text-sm text-[var(--text-primary)]">{issue.name}</td>
                  <td className="px-5 py-2.5">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      issue.status === 'fail' ? 'bg-danger/20 text-red-400' : 'bg-warning/20 text-yellow-400'
                    )}>
                      {issue.status === 'fail' ? 'Lỗi' : 'Cảnh báo'}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right text-sm font-semibold text-[var(--text-primary)]">{issue.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
