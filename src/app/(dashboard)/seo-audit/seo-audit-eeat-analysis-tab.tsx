'use client';

import { useState } from 'react';
import { Shield, Star, BookOpen, Award, TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  projectId?: string;
}

interface EEATDimension {
  id: string;
  label: string;
  icon: React.ReactNode;
  score: number;
  color: string;
  factors: Array<{
    factor: string;
    status: 'good' | 'warning' | 'missing';
    issue: string;
    fix: string;
  }>;
}

const EEAT_DIMENSIONS: EEATDimension[] = [
  {
    id: 'experience',
    label: 'Experience',
    icon: <Star className="w-5 h-5" />,
    score: 60,
    color: '#f59e0b',
    factors: [
      { factor: 'Ảnh thực tế / case study', status: 'warning', issue: 'Thiếu ảnh minh chứng thực tế', fix: 'Thêm ảnh chụp màn hình, video demo hoặc case study thực tế' },
      { factor: 'Ngày cập nhật nội dung', status: 'good', issue: '—', fix: '—' },
      { factor: 'Review / đánh giá người dùng', status: 'missing', issue: 'Chưa có review thực tế', fix: 'Tích hợp schema Review hoặc section "Người dùng nói gì"' },
      { factor: 'Thông tin tác giả có kinh nghiệm', status: 'warning', issue: 'Bio tác giả chưa rõ kinh nghiệm', fix: 'Thêm thông tin kinh nghiệm thực tế vào bio tác giả' },
    ],
  },
  {
    id: 'expertise',
    label: 'Expertise',
    icon: <BookOpen className="w-5 h-5" />,
    score: 70,
    color: '#3b82f6',
    factors: [
      { factor: 'Schema Author + credentials', status: 'warning', issue: 'Schema Author chưa đầy đủ credentials', fix: 'Thêm trường sameAs, jobTitle, knowsAbout vào schema Author' },
      { factor: 'Độ sâu nội dung (>1500 từ)', status: 'good', issue: '—', fix: '—' },
      { factor: 'Trích dẫn nghiên cứu / nguồn uy tín', status: 'missing', issue: 'Thiếu trích dẫn từ nguồn uy tín', fix: 'Thêm link đến nghiên cứu học thuật, báo chính thống' },
      { factor: 'Thuật ngữ chuyên ngành chính xác', status: 'good', issue: '—', fix: '—' },
    ],
  },
  {
    id: 'authoritativeness',
    label: 'Authoritativeness',
    icon: <Award className="w-5 h-5" />,
    score: 55,
    color: '#8b5cf6',
    factors: [
      { factor: 'Backlinks từ domain uy tín', status: 'warning', issue: 'Cần thêm backlinks chất lượng', fix: 'Guest post trên các trang ngành, PR outreach' },
      { factor: 'Được trích dẫn bởi site khác', status: 'missing', issue: 'Chưa đo lường được', fix: 'Monitor mentions với Google Alerts, Ahrefs' },
      { factor: 'Social proof / media mentions', status: 'warning', issue: 'Thiếu social proof', fix: 'Thêm section "Xuất hiện trên" với logo media' },
      { factor: 'Wikipedia / Knowledge Panel', status: 'missing', issue: 'Chưa có Knowledge Panel', fix: 'Xây dựng entity trên Wikidata, tối ưu Google Business' },
    ],
  },
  {
    id: 'trustworthiness',
    label: 'Trustworthiness',
    icon: <Shield className="w-5 h-5" />,
    score: 75,
    color: '#22c55e',
    factors: [
      { factor: 'HTTPS + bảo mật', status: 'good', issue: '—', fix: '—' },
      { factor: 'Trang About / Contact rõ ràng', status: 'good', issue: '—', fix: '—' },
      { factor: 'Privacy Policy + Terms', status: 'good', issue: '—', fix: '—' },
      { factor: 'Schema Organization đầy đủ', status: 'warning', issue: 'Schema Organization thiếu trường url, logo', fix: 'Thêm url, logo, contactPoint vào schema Organization' },
    ],
  },
];

function StatusTag({ status }: { status: 'good' | 'warning' | 'missing' }) {
  const map = {
    good: { label: 'Tốt', cls: 'bg-success/20 text-green-400' },
    warning: { label: 'Cần cải thiện', cls: 'bg-warning/20 text-yellow-400' },
    missing: { label: 'Thiếu', cls: 'bg-danger/20 text-red-400' },
  };
  const { label, cls } = map[status];
  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', cls)}>{label}</span>;
}

export default function SEOEEATAnalysisTab({ projectId }: Props) {
  void projectId; // reserved for future API filtering
  const [activeDimension, setActiveDimension] = useState<string>('experience');

  const dimension = EEAT_DIMENSIONS.find(d => d.id === activeDimension)!;
  const overallScore = Math.round(EEAT_DIMENSIONS.reduce((s, d) => s + d.score, 0) / EEAT_DIMENSIONS.length);

  return (
    <div className="space-y-5 overflow-y-auto pb-4">
      {/* Info banner */}
      <div className="rounded-xl p-4 text-sm leading-relaxed bg-accent/10 border border-accent/30 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <span className="text-[#8888a0]">
          E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) là framework đánh giá chất lượng nội dung theo Google Quality Rater Guidelines.
          Dữ liệu bên dưới là checklist template — cần audit thủ công hoặc tích hợp thêm công cụ để có dữ liệu thực tế.
        </span>
      </div>

      {/* Dimension score cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {EEAT_DIMENSIONS.map(d => (
          <button
            key={d.id}
            onClick={() => setActiveDimension(d.id)}
            className={cn(
              'bg-card border rounded-xl p-5 text-left transition-all',
              activeDimension === d.id ? 'border-2 shadow-md' : 'border-border hover:border-opacity-60',
            )}
            style={activeDimension === d.id ? { borderColor: d.color } : undefined}
          >
            <div className="flex items-center gap-2 mb-3" style={{ color: d.color }}>
              {d.icon}
              <span className="text-sm font-semibold">{d.label}</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: d.color }}>{d.score}</div>
            <div className="text-xs text-[#8888a0] mt-1">/ 100</div>
            {/* Mini progress bar */}
            <div className="mt-3 h-1.5 bg-secondary rounded-full">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.score}%`, backgroundColor: d.color }} />
            </div>
          </button>
        ))}
      </div>

      {/* Overall score */}
      <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-5">
        <div className="flex flex-col items-center">
          <div className="text-4xl font-bold text-[var(--text-primary)]">{overallScore}</div>
          <div className="text-xs text-[#8888a0] mt-1">Điểm tổng hợp</div>
        </div>
        <div className="flex-1 h-3 bg-secondary rounded-full">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${overallScore}%`,
              backgroundColor: overallScore >= 70 ? '#22c55e' : overallScore >= 50 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
        <div className="text-sm text-[#8888a0] w-32 text-right">
          {overallScore >= 70 ? 'Tốt — duy trì' : overallScore >= 50 ? 'Cần cải thiện thêm' : 'Ưu tiên cải thiện ngay'}
        </div>
      </div>

      {/* Detail table for selected dimension */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2" style={{ color: dimension.color }}>
          {dimension.icon}
          <span className="text-sm font-semibold text-[var(--text-primary)]">{dimension.label} — Chi tiết</span>
        </div>
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">Yếu tố</th>
              <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">Trạng thái</th>
              <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">Vấn đề</th>
              <th className="px-5 py-2 text-left text-xs font-semibold text-[#8888a0] uppercase">Cách sửa</th>
            </tr>
          </thead>
          <tbody>
            {dimension.factors.map((f, i) => (
              <tr key={i} className={cn('border-t border-border', i % 2 === 0 ? '' : 'bg-secondary/20')}>
                <td className="px-5 py-3 text-sm text-[var(--text-primary)] font-medium">{f.factor}</td>
                <td className="px-5 py-3"><StatusTag status={f.status} /></td>
                <td className="px-5 py-3 text-xs text-[#8888a0]">{f.issue}</td>
                <td className="px-5 py-3 text-xs text-[#8888a0]">{f.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Roadmap */}
      <div className="rounded-xl p-4 text-sm leading-relaxed bg-accent/10 border border-accent/30">
        <div className="flex items-center gap-2 font-semibold text-blue-400 mb-3">
          <TrendingUp className="w-4 h-4" /> Lộ trình cải thiện E-E-A-T
        </div>
        <div className="space-y-2 text-[#8888a0] text-xs">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
            <span><strong className="text-[var(--text-primary)]">Tháng 1:</strong> Hoàn thiện schema Author + Organization, thêm trang About chi tiết, tích hợp Review schema</span>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
            <span><strong className="text-[var(--text-primary)]">Tháng 2-3:</strong> Guest post 5-10 domain uy tín, thêm case study thực tế, trích dẫn nghiên cứu</span>
          </div>
          <div className="flex items-start gap-2">
            <Star className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
            <span><strong className="text-[var(--text-primary)]">Tháng 4-6:</strong> Xây dựng entity trên Wikidata, tăng media mentions, monitor và đo lường E-E-A-T</span>
          </div>
        </div>
      </div>
    </div>
  );
}
