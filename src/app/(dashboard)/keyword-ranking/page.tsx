'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  X,
  Calendar,
  ChevronRight,
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

type PositionFilter = 'all' | 'top3' | 'top10' | 'top20' | 'top30' | 'below30';

export default function KeywordRankingPage() {
  const [rankings, setRankings] = useState<KeywordRanking[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'position' | 'change' | 'keyword'>('position');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all');
  const [selectedKeyword, setSelectedKeyword] = useState<KeywordTrend | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

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

    // Filter by position
    switch (positionFilter) {
      case 'top3':
        result = result.filter((t) => t.currentPosition <= 3);
        break;
      case 'top10':
        result = result.filter((t) => t.currentPosition <= 10);
        break;
      case 'top20':
        result = result.filter((t) => t.currentPosition <= 20);
        break;
      case 'top30':
        result = result.filter((t) => t.currentPosition <= 30);
        break;
      case 'below30':
        result = result.filter((t) => t.currentPosition > 30);
        break;
    }

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
  }, [keywordTrends, searchQuery, sortBy, sortOrder, positionFilter]);

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

      {/* Position Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: 'all', label: 'Tất cả', count: stats.total },
          { value: 'top10', label: 'Top cao (1-10)', count: stats.top10, color: 'text-accent' },
          { value: 'top3', label: 'Top 3', count: stats.top3, color: 'text-success' },
          { value: 'top20', label: 'Top 20', count: stats.top20, color: 'text-blue-400' },
          { value: 'top30', label: 'Top 30', count: stats.top30, color: 'text-warning' },
          { value: 'below30', label: '> 30', count: stats.total - stats.top30, color: 'text-[#8888a0]' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setPositionFilter(tab.value as PositionFilter)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              positionFilter === tab.value
                ? 'bg-accent text-white shadow-lg'
                : 'bg-card border border-border text-[var(--text-primary)] hover:bg-secondary'
            )}
          >
            <span className={positionFilter !== tab.value ? tab.color : ''}>{tab.label}</span>
            <span className={cn(
              'ml-2 px-1.5 py-0.5 rounded text-xs',
              positionFilter === tab.value ? 'bg-white/20' : 'bg-secondary'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
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
                  <tr
                    key={trend.keyword}
                    className={cn(
                      "hover:bg-secondary/30 transition-colors cursor-pointer",
                      selectedKeyword?.keyword === trend.keyword && "bg-accent/10"
                    )}
                    onClick={() => setSelectedKeyword(selectedKeyword?.keyword === trend.keyword ? null : trend)}
                  >
                    <td className="px-4 py-3 text-[#8888a0] text-sm">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text-primary)] font-medium">{trend.keyword}</span>
                        {trend.history.length > 1 && (
                          <span className="text-xs text-[#8888a0] bg-secondary px-1.5 py-0.5 rounded">
                            {trend.history.length} lần check
                          </span>
                        )}
                      </div>
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
                      {/* Mini sparkline preview */}
                      <div className="flex items-center gap-1">
                        <MiniSparkline history={trend.history} getPositionColor={getPositionColor} />
                        <ChevronRight className={cn(
                          "w-4 h-4 text-[#8888a0] transition-transform",
                          selectedKeyword?.keyword === trend.keyword && "rotate-90"
                        )} />
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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

      {/* Timeline Modal */}
      {selectedKeyword && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedKeyword(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-secondary/30">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectedKeyword.keyword}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className={cn(
                    "text-2xl font-bold font-mono",
                    getPositionColor(selectedKeyword.currentPosition)
                  )}>
                    Top {selectedKeyword.currentPosition}
                  </span>
                  {selectedKeyword.change !== null && (
                    <span className={cn(
                      "flex items-center gap-1 text-sm font-medium",
                      selectedKeyword.change > 0 ? "text-success" : selectedKeyword.change < 0 ? "text-danger" : "text-[#8888a0]"
                    )}>
                      {selectedKeyword.change > 0 ? <ArrowUp className="w-4 h-4" /> : selectedKeyword.change < 0 ? <ArrowDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      {selectedKeyword.change > 0 ? "+" : ""}{selectedKeyword.change}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedKeyword(null)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#8888a0]" />
              </button>
            </div>

            {/* Timeline Chart */}
            <div className="p-6" ref={timelineRef}>
              <div className="flex items-center gap-2 mb-4 text-[#8888a0]">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Lịch sử xếp hạng</span>
              </div>

              {/* Chart Area */}
              <div className="relative h-64 bg-secondary/30 rounded-xl p-4">
                <TimelineChart
                  history={selectedKeyword.history}
                  getPositionColor={getPositionColor}
                  formatDate={formatDate}
                />
              </div>

              {/* Timeline Events */}
              <div className="mt-6 relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-4">
                  {[...selectedKeyword.history].reverse().map((h, idx) => {
                    const prevItem = selectedKeyword.history[selectedKeyword.history.length - idx - 2];
                    const change = prevItem ? prevItem.position - h.position : null;

                    return (
                      <div
                        key={h.date}
                        className="relative pl-10 animate-in slide-in-from-left duration-300"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        {/* Dot */}
                        <div className={cn(
                          "absolute left-2 w-4 h-4 rounded-full border-2 border-card",
                          h.position <= 3 ? "bg-success" :
                          h.position <= 10 ? "bg-accent" :
                          h.position <= 20 ? "bg-blue-400" :
                          h.position <= 30 ? "bg-warning" : "bg-[#8888a0]"
                        )} />

                        <div className="bg-secondary/50 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[#8888a0]">
                              {new Date(h.date).toLocaleDateString('vi-VN', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                            <p className={cn(
                              "text-xl font-bold font-mono mt-1",
                              getPositionColor(h.position)
                            )}>
                              Top {h.position}
                            </p>
                          </div>
                          {change !== null && change !== 0 && (
                            <div className={cn(
                              "flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
                              change > 0 ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                            )}>
                              {change > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                              {change > 0 ? "+" : ""}{change}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* URL */}
            {selectedKeyword.url && (
              <div className="px-6 pb-6">
                <a
                  href={selectedKeyword.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-accent hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="truncate">{selectedKeyword.url}</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Mini Sparkline Component
function MiniSparkline({
  history,
  getPositionColor
}: {
  history: { date: string; position: number }[];
  getPositionColor: (pos: number) => string;
}) {
  if (history.length === 0) return null;

  const maxPos = Math.max(...history.map(h => h.position), 30);
  const width = 80;
  const height = 24;
  const padding = 2;

  const points = history.map((h, i) => {
    const x = padding + (i / (history.length - 1 || 1)) * (width - padding * 2);
    const y = padding + (h.position / maxPos) * (height - padding * 2);
    return { x, y, position: h.position };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-accent"
      />
      {/* Dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="3"
          className={cn(
            p.position <= 3 ? "fill-success" :
            p.position <= 10 ? "fill-accent" :
            p.position <= 20 ? "fill-blue-400" :
            p.position <= 30 ? "fill-warning" : "fill-[#8888a0]"
          )}
        />
      ))}
    </svg>
  );
}

// Timeline Chart Component
function TimelineChart({
  history,
  getPositionColor,
  formatDate
}: {
  history: { date: string; position: number }[];
  getPositionColor: (pos: number) => string;
  formatDate: (date: string) => string;
}) {
  if (history.length === 0) return <div className="text-center text-[#8888a0]">Không có dữ liệu</div>;

  const maxPos = Math.max(...history.map(h => h.position), 30);
  const minPos = Math.min(...history.map(h => h.position));
  const yRange = maxPos - minPos + 10;

  return (
    <div className="relative h-full">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-[#8888a0]">
        <span>1</span>
        <span>{Math.round(maxPos / 2)}</span>
        <span>{maxPos}</span>
      </div>

      {/* Chart */}
      <div className="absolute left-12 right-0 top-0 bottom-8">
        <svg width="100%" height="100%" className="overflow-visible" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="0" x2="100%" y2="0" stroke="currentColor" strokeOpacity="0.1" />
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" strokeOpacity="0.1" />
          <line x1="0" y1="100%" x2="100%" y2="100%" stroke="currentColor" strokeOpacity="0.1" />

          {/* Area fill */}
          {history.length > 1 && (
            <path
              d={`
                M 0 100%
                ${history.map((h, i) => {
                  const x = (i / (history.length - 1)) * 100;
                  const y = ((h.position - 1) / (yRange - 1)) * 100;
                  return `L ${x}% ${y}%`;
                }).join(' ')}
                L 100% 100%
                Z
              `}
              fill="url(#gradient)"
              className="opacity-30"
            />
          )}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent-rgb, 99 102 241))" />
              <stop offset="100%" stopColor="rgb(var(--accent-rgb, 99 102 241))" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Line */}
          {history.length > 1 && (
            <path
              d={history.map((h, i) => {
                const x = (i / (history.length - 1)) * 100;
                const y = ((h.position - 1) / (yRange - 1)) * 100;
                return `${i === 0 ? 'M' : 'L'} ${x}% ${y}%`;
              }).join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent"
            />
          )}

          {/* Points */}
          {history.map((h, i) => {
            const x = history.length > 1 ? (i / (history.length - 1)) * 100 : 50;
            const y = ((h.position - 1) / (yRange - 1)) * 100;
            return (
              <g key={i}>
                <circle
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="8"
                  className={cn(
                    h.position <= 3 ? "fill-success" :
                    h.position <= 10 ? "fill-accent" :
                    h.position <= 20 ? "fill-blue-400" :
                    h.position <= 30 ? "fill-warning" : "fill-[#8888a0]"
                  )}
                  style={{
                    animation: `pulse 2s ease-in-out ${i * 0.1}s infinite`
                  }}
                />
                <text
                  x={`${x}%`}
                  y={`${y}%`}
                  dy="-14"
                  textAnchor="middle"
                  className="text-xs fill-[var(--text-primary)] font-bold"
                >
                  {h.position}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="absolute left-12 right-0 bottom-0 h-6 flex justify-between text-xs text-[#8888a0]">
        {history.map((h, i) => (
          <span key={i} className="text-center" style={{ width: `${100 / history.length}%` }}>
            {formatDate(h.date)}
          </span>
        ))}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
