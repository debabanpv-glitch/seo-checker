'use client';

import { useState, useEffect } from 'react';
import { FileText, AlertTriangle, XCircle, CheckCircle, ExternalLink } from 'lucide-react';
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
  suggestion?: string;
}

interface SEOResult {
  id: string;
  url: string;
  score: number;
  content_score: number;
  content_max: number;
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

// Topical authority heatmap clusters (template data enriched with real counts)
const TOPIC_CLUSTERS = [
  { topic: 'SEO Kỹ thuật', subtopics: ['Core Web Vitals', 'Schema Markup', 'Robots.txt', 'Sitemap'] },
  { topic: 'Marketing Nội dung', subtopics: ['Chiến lược Blog', 'Bài chuyên sâu', 'Infographic', 'Kịch bản Video'] },
  { topic: 'SEO On-Page', subtopics: ['Thẻ Title', 'Meta Desc', 'H1/H2', 'Mật độ từ khóa'] },
  { topic: 'Xây liên kết', subtopics: ['Guest Post', 'Broken Link', 'Trang tài nguyên', 'Digital PR'] },
];

type CoverageLevel = 'good' | 'partial' | 'missing';

function HeatCell({ label, level }: { label: string; level: CoverageLevel }) {
  const cls: Record<CoverageLevel, string> = {
    good: 'bg-success/20 text-green-400',
    partial: 'bg-warning/20 text-yellow-400',
    missing: 'bg-danger/20 text-red-400',
  };
  return (
    <div className={cn('rounded-lg p-3 text-center text-xs font-semibold', cls[level])}>
      {label}
    </div>
  );
}

export default function SEOContentQualityAnalysisTab({ projectId }: Props) {
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

  // Aggregate content issues from details
  const getIssueCount = (checkId: string) =>
    seoResults.filter(r => r.details?.some(d => d.id === checkId && d.status !== 'pass')).length;

  const missingMeta = getIssueCount('meta_description');
  const shortMeta = seoResults.filter(r =>
    r.details?.some(d => d.id === 'meta_description' && d.status === 'warning')
  ).length;
  const duplicateH1 = getIssueCount('h1_unique');
  const titleTooLong = getIssueCount('title_length');
  const missingH2 = getIssueCount('h2_exists');
  const total = seoResults.length;

  // URLs that may be crawl budget waste (low content score < 40%)
  const lowContentPages = seoResults
    .filter(r => r.content_max > 0 && (r.content_score / r.content_max) < 0.4)
    .sort((a, b) => (a.content_score / a.content_max) - (b.content_score / b.content_max))
    .slice(0, 10);

  // Heatmap: assign coverage based on real data availability (template with partial real signal)
  const getClusterCoverage = (subtopic: string): CoverageLevel => {
    const map: Record<string, CoverageLevel> = {
      'Core Web Vitals': 'partial', 'Schema Markup': 'partial', 'Robots.txt': 'good', 'Sitemap': 'good',
      'Chiến lược Blog': 'good', 'Bài chuyên sâu': 'partial', 'Infographic': 'missing', 'Kịch bản Video': 'missing',
      'Thẻ Title': total > 0 ? (titleTooLong === 0 ? 'good' : 'partial') : 'missing',
      'Meta Desc': total > 0 ? (missingMeta === 0 ? 'good' : 'partial') : 'missing',
      'H1/H2': total > 0 ? (duplicateH1 === 0 && missingH2 === 0 ? 'good' : 'partial') : 'missing',
      'Mật độ từ khóa': 'partial',
      'Guest Post': 'missing', 'Broken Link': 'partial', 'Trang tài nguyên': 'missing', 'Digital PR': 'missing',
    };
    return map[subtopic] ?? 'missing';
  };

  return (
    <div className="space-y-5 overflow-y-auto pb-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Thiếu Meta Desc" value={missingMeta} color={missingMeta > 0 ? '#ef4444' : '#22c55e'} />
        <StatCard label="Meta Desc ngắn" value={shortMeta} color={shortMeta > 0 ? '#f59e0b' : '#22c55e'} />
        <StatCard label="H1 trùng lặp" value={duplicateH1} color={duplicateH1 > 0 ? '#ef4444' : '#22c55e'} />
        <StatCard label="Title quá dài" value={titleTooLong} color={titleTooLong > 0 ? '#f59e0b' : '#22c55e'} />
        <StatCard label="Thiếu H2" value={missingH2} color={missingH2 > 0 ? '#f59e0b' : '#22c55e'} />
        <StatCard label="Tổng trang" value={total} color="#a78bfa" />
      </div>

      {/* Alert summary */}
      {(missingMeta > 0 || duplicateH1 > 0 || titleTooLong > 0) && (
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-danger/10 border border-danger/30">
          <div className="flex items-center gap-2 font-semibold text-red-400 mb-2">
            <XCircle className="w-4 h-4" /> Vấn đề nội dung cần ưu tiên sửa
          </div>
          <ul className="text-[#8888a0] text-xs space-y-1 list-disc list-inside">
            {missingMeta > 0 && <li>{missingMeta} trang thiếu meta description — ảnh hưởng CTR trực tiếp</li>}
            {duplicateH1 > 0 && <li>{duplicateH1} trang có H1 trùng lặp — gây nhầm lẫn về topical relevance</li>}
            {titleTooLong > 0 && <li>{titleTooLong} trang có title quá dài — bị cắt trên SERP</li>}
          </ul>
        </div>
      )}

      {/* Crawl budget waste table */}
      {lowContentPages.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Trang nội dung yếu — Tiêu tốn crawl budget ({lowContentPages.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">#</th>
                  <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">URL</th>
                  <th className="px-5 py-2 text-right text-xs font-semibold text-[#8888a0] uppercase">Điểm nội dung</th>
                  <th className="px-5 py-2 text-right text-xs font-semibold text-[#8888a0] uppercase">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>
                {lowContentPages.map((r, i) => {
                  const pct = r.content_max > 0 ? Math.round((r.content_score / r.content_max) * 100) : 0;
                  return (
                    <tr key={r.id} className={cn('border-t border-border', i % 2 === 0 ? '' : 'bg-secondary/20')}>
                      <td className="px-5 py-2.5 text-sm text-[#8888a0]">{i + 1}</td>
                      <td className="px-5 py-2.5">
                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:underline flex items-center gap-1 truncate max-w-xs">
                          {r.url} <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                      <td className="px-5 py-2.5 text-right text-sm text-[var(--text-primary)]">
                        {r.content_score}/{r.content_max}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          pct < 30 ? 'bg-danger/20 text-red-400' : 'bg-warning/20 text-yellow-400'
                        )}>
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Topical authority heatmap */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-[#8888a0]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Cụm chủ đề chuyên sâu</span>
          <span className="text-xs text-[#8888a0] ml-auto">
            <span className="inline-block w-2 h-2 rounded bg-green-400/40 mr-1" />Tốt
            <span className="inline-block w-2 h-2 rounded bg-yellow-400/40 mr-1 ml-2" />Một phần
            <span className="inline-block w-2 h-2 rounded bg-red-400/40 mr-1 ml-2" />Thiếu
          </span>
        </div>
        <div className="space-y-4">
          {TOPIC_CLUSTERS.map(cluster => (
            <div key={cluster.topic}>
              <div className="text-xs font-semibold text-[#8888a0] uppercase mb-2">{cluster.topic}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {cluster.subtopics.map(sub => (
                  <HeatCell key={sub} label={sub} level={getClusterCoverage(sub)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-success/10 border border-success/30">
          <div className="flex items-center gap-2 font-semibold text-green-400 mb-2">
            <CheckCircle className="w-4 h-4" /> Việc ưu tiên làm ngay
          </div>
          <ul className="text-[#8888a0] text-xs space-y-1 list-disc list-inside">
            <li>Viết meta description 150-160 ký tự cho tất cả trang thiếu</li>
            <li>Chuẩn hóa H1: 1 H1/trang, chứa keyword chính</li>
            <li>Rút gọn title về 50-60 ký tự, đặt keyword đầu tiên</li>
          </ul>
        </div>
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-accent/10 border border-accent/30">
          <div className="flex items-center gap-2 font-semibold text-blue-400 mb-2">
            <FileText className="w-4 h-4" /> Chiến lược dài hạn
          </div>
          <ul className="text-[#8888a0] text-xs space-y-1 list-disc list-inside">
            <li>Xây dựng pillar page + cluster content cho từng topic chính</li>
            <li>Cập nhật bài viết cũ định kỳ 6 tháng/lần</li>
            <li>Thêm FAQ schema cho bài viết dạng hỏi đáp</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
