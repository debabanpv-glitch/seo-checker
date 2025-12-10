'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { Project } from '@/types';

interface KeywordRanking {
  id: string;
  keyword: string;
  url: string;
  position: number;
  date: string;
  project_id: string | null;
}

interface KeywordTrend {
  keyword: string;
  url: string;
  currentPosition: number;
  previousPosition: number | null;
  change: number | null;
  history: { date: string; position: number }[];
}

export default function KeywordRankingPage() {
  const [rankings, setRankings] = useState<KeywordRanking[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'position' | 'change' | 'keyword'>('position');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rankingsRes, projectsRes] = await Promise.all([
        fetch(`/api/keyword-rankings${selectedProject ? `?projectId=${selectedProject}` : ''}`),
        fetch('/api/projects'),
      ]);

      const rankingsData = await rankingsRes.json();
      const projectsData = await projectsRes.json();

      setRankings(rankingsData.rankings || []);
      setProjects(projectsData.projects || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Process rankings into trends (group by keyword, calculate changes)
  const keywordTrends = useMemo(() => {
    const keywordMap = new Map<string, KeywordRanking[]>();

    // Group by keyword
    rankings.forEach((r) => {
      const key = r.keyword.toLowerCase();
      if (!keywordMap.has(key)) {
        keywordMap.set(key, []);
      }
      keywordMap.get(key)!.push(r);
    });

    // Calculate trends
    const trends: KeywordTrend[] = [];

    keywordMap.forEach((records) => {
      // Sort by date descending
      const sorted = records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const latest = sorted[0];
      const previous = sorted[1];

      // Get unique dates for history (last 6 months)
      const history: { date: string; position: number }[] = [];
      const seenDates = new Set<string>();

      sorted.forEach((r) => {
        const monthKey = r.date.substring(0, 7); // YYYY-MM
        if (!seenDates.has(monthKey)) {
          seenDates.add(monthKey);
          history.push({ date: r.date, position: r.position });
        }
      });

      // Sort history by date ascending for display
      history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      trends.push({
        keyword: latest.keyword,
        url: latest.url,
        currentPosition: latest.position,
        previousPosition: previous?.position || null,
        change: previous ? previous.position - latest.position : null, // Positive = improved
        history: history.slice(-6), // Last 6 months
      });
    });

    return trends;
  }, [rankings]);

  // Filter and sort
  const filteredTrends = useMemo(() => {
    let result = [...keywordTrends];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.keyword.toLowerCase().includes(query) ||
          t.url.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'position':
          comparison = a.currentPosition - b.currentPosition;
          break;
        case 'change':
          const changeA = a.change ?? 0;
          const changeB = b.change ?? 0;
          comparison = changeB - changeA; // Higher improvement first
          break;
        case 'keyword':
          comparison = a.keyword.localeCompare(b.keyword);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [keywordTrends, searchQuery, sortBy, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const total = keywordTrends.length;
    const top3 = keywordTrends.filter((t) => t.currentPosition <= 3).length;
    const top10 = keywordTrends.filter((t) => t.currentPosition <= 10).length;
    const top20 = keywordTrends.filter((t) => t.currentPosition <= 20).length;
    const top30 = keywordTrends.filter((t) => t.currentPosition <= 30).length;
    const improved = keywordTrends.filter((t) => t.change !== null && t.change > 0).length;
    const declined = keywordTrends.filter((t) => t.change !== null && t.change < 0).length;

    return { total, top3, top10, top20, top30, improved, declined };
  }, [keywordTrends]);

  const getPositionColor = (position: number) => {
    if (position <= 3) return 'text-success';
    if (position <= 10) return 'text-accent';
    if (position <= 20) return 'text-blue-400';
    if (position <= 30) return 'text-warning';
    return 'text-[#8888a0]';
  };

  const getChangeIcon = (change: number | null) => {
    if (change === null) return <Minus className="w-4 h-4 text-[#8888a0]" />;
    if (change > 0) return <ArrowUp className="w-4 h-4 text-success" />;
    if (change < 0) return <ArrowDown className="w-4 h-4 text-danger" />;
    return <Minus className="w-4 h-4 text-[#8888a0]" />;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' });
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Keyword Ranking</h1>
          <p className="text-[#8888a0] text-sm">Theo dõi xếp hạng từ khóa theo thời gian</p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-1">Tổng từ khóa</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-1">Top 3</p>
          <p className="text-2xl font-bold text-success">{stats.top3}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-1">Top 10</p>
          <p className="text-2xl font-bold text-accent">{stats.top10}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-1">Top 20</p>
          <p className="text-2xl font-bold text-blue-400">{stats.top20}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-1">Top 30</p>
          <p className="text-2xl font-bold text-warning">{stats.top30}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-success" /> Tăng
          </p>
          <p className="text-2xl font-bold text-success">{stats.improved}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-1 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-danger" /> Giảm
          </p>
          <p className="text-2xl font-bold text-danger">{stats.declined}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[#8888a0]">
          <Filter className="w-4 h-4" />
          <span className="text-sm">Lọc:</span>
        </div>

        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
        >
          <option value="">Tất cả dự án</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [by, order] = e.target.value.split('-');
            setSortBy(by as 'position' | 'change' | 'keyword');
            setSortOrder(order as 'asc' | 'desc');
          }}
          className="px-3 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] text-sm"
        >
          <option value="position-asc">Vị trí: Thấp → Cao</option>
          <option value="position-desc">Vị trí: Cao → Thấp</option>
          <option value="change-desc">Thay đổi: Tăng nhiều nhất</option>
          <option value="change-asc">Thay đổi: Giảm nhiều nhất</option>
          <option value="keyword-asc">Từ khóa: A → Z</option>
        </select>

        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888a0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm từ khóa..."
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-[var(--text-primary)] placeholder-[#8888a0] text-sm"
            />
          </div>
        </div>
      </div>

      {/* Rankings Table */}
      {filteredTrends.length > 0 ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8888a0]">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8888a0]">Từ khóa</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[#8888a0]">Vị trí</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[#8888a0]">Thay đổi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8888a0]">Lịch sử (6 tháng)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8888a0]">URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTrends.map((trend, idx) => (
                  <tr key={trend.keyword} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-[#8888a0] text-sm">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--text-primary)] font-medium">{trend.keyword}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          'text-lg font-bold font-mono',
                          getPositionColor(trend.currentPosition)
                        )}
                      >
                        {trend.currentPosition}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {getChangeIcon(trend.change)}
                        {trend.change !== null && (
                          <span
                            className={cn(
                              'text-sm font-mono',
                              trend.change > 0 ? 'text-success' : trend.change < 0 ? 'text-danger' : 'text-[#8888a0]'
                            )}
                          >
                            {trend.change > 0 ? '+' : ''}{trend.change}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {trend.history.map((h) => (
                          <div
                            key={h.date}
                            className="flex flex-col items-center"
                            title={`${formatDate(h.date)}: ${h.position}`}
                          >
                            <span className="text-[10px] text-[#8888a0]">{formatDate(h.date)}</span>
                            <span
                              className={cn(
                                'text-xs font-mono px-1.5 py-0.5 rounded',
                                getPositionColor(h.position),
                                'bg-secondary'
                              )}
                            >
                              {h.position}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {trend.url && (
                        <a
                          href={trend.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-accent hover:underline max-w-[200px] truncate"
                        >
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{trend.url.replace(/^https?:\/\//, '')}</span>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={TrendingUp}
          title="Chưa có dữ liệu ranking"
          description="Đồng bộ dữ liệu keyword ranking từ Cài đặt để bắt đầu theo dõi"
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-[#8888a0]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-success/30" /> Top 3
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-accent/30" /> Top 10
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-400/30" /> Top 20
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-warning/30" /> Top 30
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-[#8888a0]/30" /> {'>'} 30
        </span>
      </div>
    </div>
  );
}
