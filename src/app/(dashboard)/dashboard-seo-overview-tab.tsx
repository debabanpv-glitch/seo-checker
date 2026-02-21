'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe,
  FileText,
  CheckCircle2,
  AlertTriangle,
  LinkIcon,
  ArrowRight,
} from 'lucide-react';
import ScoreRing from '@/components/score-ring-svg-circle';
import { PageLoading } from '@/components/LoadingSpinner';

interface ProjectCard {
  id: string;
  name: string;
  slug: string | null;
  domain: string | null;
  healthScore: number;
  checkedPages: number;
  auditDate: string | null;
  stats: {
    totalPages: number;
    status200: number;
    status301: number;
    status404: number;
    avgSpeed: number;
    orphanPages: number;
    indexable: number;
  };
}

export default function DashboardSEOOverviewTab() {
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSEOOverview();
  }, []);

  const fetchSEOOverview = async () => {
    try {
      const res = await fetch('/api/v1/dashboard/seo-overview');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to fetch SEO overview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#8888a0]">
        <Globe className="w-12 h-12 mb-4 opacity-40" />
        <p className="text-lg font-medium">Chưa có dự án nào</p>
        <p className="text-sm mt-1">Thêm dự án trong phần Cài đặt để bắt đầu</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectSEOCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

function ProjectSEOCard({ project }: { project: ProjectCard }) {
  const { stats } = project;
  const hasAuditData = stats.totalPages > 0 || project.checkedPages > 0;
  const projectUrl = `/projects/${project.slug || project.id}`;

  return (
    <Link
      href={projectUrl}
      className="group bg-card border border-border rounded-xl p-5 hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/5"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-[var(--text-primary)] truncate group-hover:text-accent transition-colors">
            {project.name}
          </h3>
          {project.domain && (
            <p className="text-xs text-[#8888a0] mt-0.5 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {project.domain}
            </p>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-[#8888a0] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
      </div>

      {hasAuditData ? (
        <>
          {/* Score Ring + Key Stats */}
          <div className="flex items-center gap-4 mb-4">
            <ScoreRing score={project.healthScore} size={80} strokeWidth={8} />
            <div className="flex-1 space-y-1.5">
              <StatRow
                label="Tổng trang"
                value={stats.totalPages.toLocaleString()}
                icon={<FileText className="w-3 h-3" />}
              />
              <StatRow
                label="200 OK"
                value={stats.status200.toLocaleString()}
                icon={<CheckCircle2 className="w-3 h-3" />}
                color="text-success"
              />
              <StatRow
                label="301"
                value={stats.status301.toLocaleString()}
                icon={<LinkIcon className="w-3 h-3" />}
                color="text-warning"
              />
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
            <MiniStat
              label="404"
              value={stats.status404}
              color={stats.status404 > 0 ? 'text-danger' : 'text-success'}
            />
            <MiniStat
              label="Speed"
              value={stats.avgSpeed > 0 ? `${stats.avgSpeed.toFixed(1)}s` : '-'}
              color={stats.avgSpeed > 5 ? 'text-danger' : stats.avgSpeed > 3 ? 'text-warning' : 'text-success'}
            />
            <MiniStat
              label="Orphan"
              value={stats.orphanPages}
              color={stats.orphanPages > 0 ? 'text-warning' : 'text-success'}
            />
          </div>

          {/* Audit Date */}
          {project.auditDate && (
            <p className="text-[10px] text-[#8888a0] mt-3">
              Crawl: {new Date(project.auditDate).toLocaleDateString('vi-VN')}
            </p>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-[#8888a0]">
          <AlertTriangle className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">Chưa có dữ liệu audit</p>
          <p className="text-xs mt-1">Chạy SEO Audit để xem kết quả</p>
        </div>
      )}
    </Link>
  );
}

function StatRow({
  label,
  value,
  icon,
  color = 'text-[var(--text-primary)]',
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1 text-[#8888a0]">
        {icon}
        {label}
      </span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color = 'text-[var(--text-primary)]',
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="text-center">
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-[#8888a0]">{label}</p>
    </div>
  );
}
