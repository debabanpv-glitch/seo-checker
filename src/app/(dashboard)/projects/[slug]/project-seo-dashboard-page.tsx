'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  LayoutDashboard,
  Link2,
  FileText,
  Settings2,
  Lightbulb,
  ClipboardList,
  Globe,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import ProjectSeoOverviewTab from './project-seo-overview-tab';
import ProjectSeoLinksTab from './project-seo-links-tab';
import ProjectSeoContentTab from './project-seo-content-tab';
import ProjectSeoTechnicalTab from './project-seo-technical-tab';
import ProjectSeoOpportunitiesTab from './project-seo-opportunities-tab';
import ProjectSeoActionPlanTab from './project-seo-action-plan-tab';

export type TabId = 'overview' | 'links' | 'content' | 'technical' | 'opportunities' | 'action-plan';

export interface AuditSummary {
  id: string;
  audit_date: string;
  audit_type: string;
  total_urls: number;
  indexable: number;
  status_200: number;
  status_3xx: number;
  status_4xx: number;
  errors: number;
  warnings: number;
  avg_response_ms: number;
  orphan_pages: number;
  internal_links: number;
  avg_inlinks: number;
  broken_links: number;
  thin_content: number;
  avg_word_count: number;
  duplicate_content: number;
  avg_speed_score: number;
  security_headers: number;
  schema_coverage: number;
  redirect_chains: number;
}

export interface SeoStats {
  totalPages: number;
  avgScore: number;
  avgContentScore: number;
  avgTechnicalScore: number;
  avgImagesScore: number;
  topIssues: Array<{ type: string; count: number; severity: string }>;
  scoreDistribution: { good: number; average: number; poor: number };
}

export interface Project {
  id: string;
  name: string;
  slug: string | null;
  domain: string | null;
  website: string | null;
  industry: string | null;
  status: string;
}

export interface DashboardData {
  project: Project;
  latestAudit: AuditSummary | null;
  seoStats: SeoStats;
  auditHistory: AuditSummary[];
}

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Tổng quan', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'links', label: 'Liên kết', icon: <Link2 className="w-4 h-4" /> },
  { id: 'content', label: 'Nội dung', icon: <FileText className="w-4 h-4" /> },
  { id: 'technical', label: 'Kỹ thuật', icon: <Settings2 className="w-4 h-4" /> },
  { id: 'opportunities', label: 'Cơ hội', icon: <Lightbulb className="w-4 h-4" /> },
  { id: 'action-plan', label: 'Kế hoạch', icon: <ClipboardList className="w-4 h-4" /> },
];

export default function ProjectSeoDashboardPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    fetch(`/api/v1/projects/${slug}/seo-dashboard`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Không thể tải dữ liệu'))
      .finally(() => setIsLoading(false));
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#8888a0]">
        <div className="animate-pulse">Đang tải dữ liệu SEO...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-danger text-sm">{error || 'Không tìm thấy dự án'}</p>
        <Link href="/projects" className="text-accent text-sm hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>
      </div>
    );
  }

  const { project } = data;
  const displayDomain = project.domain || project.website || '';

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-[#8888a0] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
            <Globe className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{project.name}</h1>
            {displayDomain && (
              <p className="text-[#8888a0] text-sm">{displayDomain}</p>
            )}
          </div>
        </div>
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            project.status === 'active'
              ? 'bg-success/20 text-success'
              : 'bg-secondary text-[#8888a0]'
          )}
        >
          {project.status === 'active' ? 'Đang hoạt động' : project.status}
        </span>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-secondary/50 rounded-lg p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-card text-[var(--text-primary)] shadow-sm'
                : 'text-[#8888a0] hover:text-[var(--text-primary)]'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <ProjectSeoOverviewTab data={data} />}
      {activeTab === 'links' && <ProjectSeoLinksTab data={data} />}
      {activeTab === 'content' && <ProjectSeoContentTab data={data} />}
      {activeTab === 'technical' && <ProjectSeoTechnicalTab data={data} />}
      {activeTab === 'opportunities' && <ProjectSeoOpportunitiesTab data={data} />}
      {activeTab === 'action-plan' && <ProjectSeoActionPlanTab data={data} />}
    </div>
  );
}
