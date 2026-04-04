'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Filter } from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';

interface GrowthRow {
  period_label: string;
  clicks: number;
  clicks_delta: number | null;
  impressions: number;
  impressions_delta: number | null;
  kw_top10: number;
  kw_top10_delta: number | null;
  content_published: number;
  content_published_delta: number | null;
  backlinks_new: number;
  backlinks_new_delta: number | null;
  audit_score: number;
  audit_score_delta: number | null;
}

interface Project {
  id: string;
  name: string;
}

interface GrowthReportData {
  project: Project;
  period: 'weekly' | 'monthly';
  rows: GrowthRow[];
}

function DeltaCell({ value, isPercent = true }: { value: number | null; isPercent?: boolean }) {
  if (value === null) return <span className="text-[#8888a0] text-xs">—</span>;
  if (value === 0) return <span className="text-[#8888a0] text-xs flex items-center gap-0.5"><Minus className="w-3 h-3" />0</span>;

  const isPositive = value > 0;
  const color = isPositive ? 'text-green-400' : 'text-red-400';
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${color}`}>
      <Icon className="w-3 h-3" />
      {isPositive ? '+' : ''}{isPercent ? `${value}%` : value}
    </span>
  );
}

export default function DashboardV2GrowthReportTable({ projectId }: { projectId?: string }) {
  const [data, setData] = useState<GrowthReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [projectsList, setProjectsList] = useState<Project[]>([]);

  useEffect(() => {
    fetch('/api/v1/projects').then(r => r.json()).then(d => {
      setProjectsList(Array.isArray(d) ? d : d.projects || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchReport();
  }, [period, selectedProject]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (selectedProject) params.set('project_id', selectedProject);
      const res = await fetch(`/api/v1/dashboard/growth-report?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Filter bar */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Filter className="w-4 h-4 text-accent" />
          Báo cáo tăng trưởng
        </h3>
        <div className="flex items-center gap-3">
          {/* Project filter */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-secondary text-[var(--text-primary)] text-xs px-2 py-1.5 rounded-lg border border-border outline-none"
          >
            <option value="">Tất cả dự án</option>
            {projectsList.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {/* Period toggle */}
          <div className="flex gap-1 bg-secondary rounded-lg p-0.5 border border-border">
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-2 py-1 text-xs rounded-md transition-all ${
                period === 'weekly' ? 'bg-accent text-white' : 'text-[#8888a0] hover:text-[var(--text-primary)]'
              }`}
            >
              Tuần
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-2 py-1 text-xs rounded-md transition-all ${
                period === 'monthly' ? 'bg-accent text-white' : 'text-[#8888a0] hover:text-[var(--text-primary)]'
              }`}
            >
              Tháng
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-8"><PageLoading /></div>
      ) : !data?.rows.length ? (
        <div className="p-8 text-center text-[#8888a0] text-sm">Chưa đủ dữ liệu để hiển thị báo cáo</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#8888a0] text-xs border-b border-border">
                <th className="text-left px-4 py-3 sticky left-0 bg-card z-10 font-medium">Kỳ</th>
                <th className="text-right px-3 py-3 font-medium">Clicks</th>
                <th className="text-right px-3 py-3 font-medium">Δ%</th>
                <th className="text-right px-3 py-3 font-medium">Impressions</th>
                <th className="text-right px-3 py-3 font-medium">Δ%</th>
                <th className="text-right px-3 py-3 font-medium">KW Top10</th>
                <th className="text-right px-3 py-3 font-medium">Δ</th>
                <th className="text-right px-3 py-3 font-medium">Nội dung</th>
                <th className="text-right px-3 py-3 font-medium">Δ</th>
                <th className="text-right px-3 py-3 font-medium">Backlinks</th>
                <th className="text-right px-3 py-3 font-medium">Δ</th>
                <th className="text-right px-3 py-3 font-medium">Audit</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-[var(--text-primary)] sticky left-0 bg-card z-10 whitespace-nowrap">
                    {row.period_label}
                  </td>
                  <td className="text-right px-3 py-2.5 text-[var(--text-primary)]">{row.clicks.toLocaleString()}</td>
                  <td className="text-right px-3 py-2.5"><DeltaCell value={row.clicks_delta} /></td>
                  <td className="text-right px-3 py-2.5 text-[var(--text-primary)]">{row.impressions.toLocaleString()}</td>
                  <td className="text-right px-3 py-2.5"><DeltaCell value={row.impressions_delta} /></td>
                  <td className="text-right px-3 py-2.5 text-[var(--text-primary)]">{row.kw_top10}</td>
                  <td className="text-right px-3 py-2.5"><DeltaCell value={row.kw_top10_delta} isPercent={false} /></td>
                  <td className="text-right px-3 py-2.5 text-[var(--text-primary)]">{row.content_published}</td>
                  <td className="text-right px-3 py-2.5"><DeltaCell value={row.content_published_delta} isPercent={false} /></td>
                  <td className="text-right px-3 py-2.5 text-[var(--text-primary)]">{row.backlinks_new}</td>
                  <td className="text-right px-3 py-2.5"><DeltaCell value={row.backlinks_new_delta} isPercent={false} /></td>
                  <td className="text-right px-3 py-2.5 text-[var(--text-primary)]">{row.audit_score}/100</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
