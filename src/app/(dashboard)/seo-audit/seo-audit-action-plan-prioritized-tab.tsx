'use client';

import { useState, useEffect } from 'react';
import { Target, TrendingUp, AlertTriangle, CheckCircle, XCircle, Clock, Users, Zap } from 'lucide-react';
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
  details: Array<{ id: string; status: string; name: string; category: string }>;
}

type Phase = 1 | 2 | 3;
type Impact = 'high' | 'medium' | 'low';

interface Action {
  phase: Phase;
  action: string;
  who: string;
  time: string;
  impact: Impact;
  category: string;
}

const PHASE_CONFIG: Record<Phase, { label: string; timeframe: string; gradient: string; border: string; desc: string }> = {
  1: {
    label: 'Phase 1 — Nền tảng',
    timeframe: 'Tháng 1-2',
    gradient: 'from-red-500/10 to-orange-500/10',
    border: 'border-red-500/30',
    desc: 'Sửa lỗi nghiêm trọng, thiết lập nền tảng kỹ thuật vững chắc',
  },
  2: {
    label: 'Phase 2 — Tăng trưởng',
    timeframe: 'Tháng 3-4',
    gradient: 'from-yellow-500/10 to-amber-500/10',
    border: 'border-yellow-500/30',
    desc: 'Tối ưu nội dung, xây dựng topical authority, tăng organic traffic',
  },
  3: {
    label: 'Phase 3 — Scale',
    timeframe: 'Tháng 5-6',
    gradient: 'from-green-500/10 to-emerald-500/10',
    border: 'border-green-500/30',
    desc: 'Link building, E-E-A-T nâng cao, theo dõi KPI và tối ưu liên tục',
  },
};

const BASE_ACTIONS: Action[] = [
  { phase: 1, action: 'Viết meta description cho tất cả trang thiếu', who: 'Content', time: '1-2 tuần', impact: 'high', category: 'content' },
  { phase: 1, action: 'Chuẩn hóa H1: 1 H1/trang, chứa keyword chính', who: 'Content', time: '1 tuần', impact: 'high', category: 'content' },
  { phase: 1, action: 'Fix 404 broken links bằng 301 redirect', who: 'Dev', time: '3 ngày', impact: 'high', category: 'technical' },
  { phase: 1, action: 'Thêm alt text cho toàn bộ ảnh thiếu', who: 'Content', time: '1 tuần', impact: 'medium', category: 'images' },
  { phase: 1, action: 'Triển khai BreadcrumbList + Article schema', who: 'Dev', time: '1 tuần', impact: 'medium', category: 'technical' },
  { phase: 1, action: 'Rút gọn title tag ≤60 ký tự, keyword đầu tiên', who: 'Content', time: '1 tuần', impact: 'high', category: 'content' },
  { phase: 2, action: 'Xây dựng pillar page cho từng topic cluster chính', who: 'Content', time: '4 tuần', impact: 'high', category: 'content' },
  { phase: 2, action: 'Thêm internal links từ bài cũ tới bài mới (3-5 links/bài)', who: 'Content', time: '2 tuần', impact: 'medium', category: 'links' },
  { phase: 2, action: 'Tối ưu Core Web Vitals: WebP, lazy load, CDN', who: 'Dev', time: '2 tuần', impact: 'high', category: 'technical' },
  { phase: 2, action: 'Hoàn thiện schema Author + Organization', who: 'Dev', time: '3 ngày', impact: 'medium', category: 'eeat' },
  { phase: 2, action: 'Cập nhật lại 10 bài viết cũ hiệu suất thấp', who: 'Content', time: '3 tuần', impact: 'medium', category: 'content' },
  { phase: 3, action: 'Guest post 5-10 domain uy tín (DA 40+)', who: 'Marketing', time: '2 tháng', impact: 'high', category: 'links' },
  { phase: 3, action: 'Triển khai FAQ schema cho bài dạng hỏi đáp', who: 'Dev', time: '1 tuần', impact: 'medium', category: 'technical' },
  { phase: 3, action: 'Monitor E-E-A-T: Google Alerts, media mentions', who: 'Marketing', time: 'Liên tục', impact: 'medium', category: 'eeat' },
  { phase: 3, action: 'A/B test title & meta desc để tăng CTR', who: 'SEO', time: '1 tháng', impact: 'high', category: 'content' },
];

const KPI_TABLE = [
  { milestone: 'Tháng 2', metric: 'Technical Score TB', current: '—', target: '≥70%' },
  { milestone: 'Tháng 2', metric: 'Pages thiếu Meta Desc', current: '—', target: '0' },
  { milestone: 'Tháng 3', metric: 'Organic Traffic', current: '—', target: '+20%' },
  { milestone: 'Tháng 4', metric: 'Core Web Vitals Pass', current: '—', target: '≥80% URLs' },
  { milestone: 'Tháng 4', metric: 'Internal Links/page TB', current: '—', target: '≥3' },
  { milestone: 'Tháng 6', metric: 'Domain Rating (Ahrefs)', current: '—', target: '+5 DR' },
  { milestone: 'Tháng 6', metric: 'SEO Score TB', current: '—', target: '≥75/100' },
];

function ImpactTag({ impact }: { impact: Impact }) {
  const map: Record<Impact, { label: string; cls: string }> = {
    high: { label: 'Cao', cls: 'bg-success/20 text-green-400' },
    medium: { label: 'Trung bình', cls: 'bg-warning/20 text-yellow-400' },
    low: { label: 'Thấp', cls: 'bg-secondary text-[#8888a0]' },
  };
  const { label, cls } = map[impact];
  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', cls)}>{label}</span>;
}

function PhaseTag({ phase }: { phase: Phase }) {
  const cls: Record<Phase, string> = {
    1: 'bg-red-500/20 text-red-400',
    2: 'bg-yellow-500/20 text-yellow-400',
    3: 'bg-green-500/20 text-green-400',
  };
  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', cls[phase])}>P{phase}</span>;
}

export default function SEOActionPlanPrioritizedTab({ projectId }: Props) {
  const [seoResults, setSeoResults] = useState<SEOResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPhase, setFilterPhase] = useState<Phase | 0>(0);

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

  // Enrich KPI with real data
  const total = seoResults.length;
  const avgScore = total > 0 ? Math.round(seoResults.reduce((s, r) => s + r.score, 0) / total) : 0;
  const avgTechPct = total > 0
    ? Math.round(seoResults.reduce((s, r) => s + (r.technical_max > 0 ? (r.technical_score / r.technical_max) * 100 : 0), 0) / total)
    : 0;
  const missingMeta = seoResults.filter(r => r.details?.some(d => d.id === 'meta_description' && d.status !== 'pass')).length;

  const kpiWithReal = KPI_TABLE.map(k => {
    if (k.metric === 'Technical Score TB') return { ...k, current: `${avgTechPct}%` };
    if (k.metric === 'Pages thiếu Meta Desc') return { ...k, current: String(missingMeta) };
    if (k.metric === 'SEO Score TB') return { ...k, current: `${avgScore}/100` };
    return k;
  });

  const filteredActions = filterPhase === 0 ? BASE_ACTIONS : BASE_ACTIONS.filter(a => a.phase === filterPhase);

  return (
    <div className="space-y-5 overflow-y-auto pb-4">
      {/* Phase timeline cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {([1, 2, 3] as Phase[]).map(p => {
          const cfg = PHASE_CONFIG[p];
          const count = BASE_ACTIONS.filter(a => a.phase === p).length;
          return (
            <div key={p} className={cn('rounded-xl p-5 border bg-gradient-to-br', cfg.gradient, cfg.border)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm font-bold text-[var(--text-primary)]">{cfg.label}</div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-[#8888a0]">
                    <Clock className="w-3 h-3" /> {cfg.timeframe}
                  </div>
                </div>
                <span className="text-2xl font-bold text-[var(--text-primary)] opacity-20">P{p}</span>
              </div>
              <p className="text-xs text-[#8888a0] leading-relaxed">{cfg.desc}</p>
              <div className="mt-3 pt-3 border-t border-white/10 text-xs text-[#8888a0]">
                {count} hành động cụ thể
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions table with filter */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#8888a0]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Kế hoạch hành động ưu tiên</span>
          </div>
          <div className="ml-auto flex gap-1">
            {([0, 1, 2, 3] as const).map(p => (
              <button
                key={p}
                onClick={() => setFilterPhase(p as Phase | 0)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  filterPhase === p
                    ? 'bg-accent text-white'
                    : 'bg-secondary text-[#8888a0] hover:text-[var(--text-primary)]'
                )}
              >
                {p === 0 ? 'Tất cả' : `Phase ${p}`}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase w-8">#</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase w-16">Phase</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">Hành động</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase w-24">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Ai</span>
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase w-24">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Thời gian</span>
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase w-24">
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Impact</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredActions.map((a, i) => (
                <tr key={i} className={cn('border-t border-border', i % 2 === 0 ? '' : 'bg-secondary/20')}>
                  <td className="px-4 py-2.5 text-sm text-[#8888a0]">{i + 1}</td>
                  <td className="px-4 py-2.5"><PhaseTag phase={a.phase} /></td>
                  <td className="px-4 py-2.5 text-sm text-[var(--text-primary)]">{a.action}</td>
                  <td className="px-4 py-2.5 text-xs text-[#8888a0]">{a.who}</td>
                  <td className="px-4 py-2.5 text-xs text-[#8888a0]">{a.time}</td>
                  <td className="px-4 py-2.5"><ImpactTag impact={a.impact} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPI tracking table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#8888a0]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">KPI Tracking & Milestones</span>
        </div>
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">Milestone</th>
              <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">Chỉ số</th>
              <th className="px-5 py-2 text-right text-xs font-semibold text-[#8888a0] uppercase">Hiện tại</th>
              <th className="px-5 py-2 text-right text-xs font-semibold text-[#8888a0] uppercase">Mục tiêu</th>
            </tr>
          </thead>
          <tbody>
            {kpiWithReal.map((k, i) => (
              <tr key={i} className={cn('border-t border-border', i % 2 === 0 ? '' : 'bg-secondary/20')}>
                <td className="px-5 py-2.5 text-xs font-semibold text-[#8888a0]">{k.milestone}</td>
                <td className="px-5 py-2.5 text-sm text-[var(--text-primary)]">{k.metric}</td>
                <td className="px-5 py-2.5 text-right text-sm text-[#8888a0]">{k.current}</td>
                <td className="px-5 py-2.5 text-right">
                  <span className="px-2 py-0.5 bg-success/20 text-green-400 rounded-full text-xs font-medium">{k.target}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Risk assessment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-success/10 border border-success/30">
          <div className="flex items-center gap-2 font-semibold text-green-400 mb-2">
            <CheckCircle className="w-4 h-4" /> An toàn — Làm ngay
          </div>
          <ul className="text-[#8888a0] text-xs space-y-1 list-disc list-inside">
            <li>Viết meta description + alt text</li>
            <li>Chuẩn hóa H1, title tag</li>
            <li>Thêm internal links</li>
            <li>Deploy schema markup</li>
          </ul>
        </div>
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-warning/10 border border-warning/30">
          <div className="flex items-center gap-2 font-semibold text-yellow-400 mb-2">
            <AlertTriangle className="w-4 h-4" /> Thận trọng — Test trước
          </div>
          <ul className="text-[#8888a0] text-xs space-y-1 list-disc list-inside">
            <li>Redirect URLs cũ (301)</li>
            <li>Thay đổi cấu trúc URL</li>
            <li>Merge nội dung duplicate</li>
            <li>Thay đổi canonical tag hàng loạt</li>
          </ul>
        </div>
        <div className="rounded-xl p-4 text-sm leading-relaxed bg-danger/10 border border-danger/30">
          <div className="flex items-center gap-2 font-semibold text-red-400 mb-2">
            <XCircle className="w-4 h-4" /> Tránh — Rủi ro cao
          </div>
          <ul className="text-[#8888a0] text-xs space-y-1 list-disc list-inside">
            <li>noindex trang đang có traffic</li>
            <li>Xóa nội dung không backup</li>
            <li>Thay đổi hàng loạt không monitor</li>
            <li>Link building spam / PBN</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
