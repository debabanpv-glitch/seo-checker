'use client';

import { useState, useEffect } from 'react';
import {
  Wallet,
  Download,
  CheckCircle2,
  XCircle,
  ExternalLink,
  FileText,
  User,
  FolderOpen,
  BadgeCheck,
  TrendingUp,
  Users,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  DollarSign,
  Percent,
  Briefcase,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Project } from '@/types';
import { cn } from '@/lib/utils';

interface MemberInfo {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone: string;
  bank_name: string;
  bank_account: string;
}

interface TaskDetail {
  id: string;
  title: string;
  project: string;
  publish_date: string | null;
  link: string | null;
}

interface SalaryPayment {
  id: string;
  member_name: string;
  month: number;
  year: number;
  amount: number;
  paid_at: string;
  paid_by: string | null;
  note: string | null;
}

interface SalaryDataWithTasks {
  name: string;
  publishedCount: number;
  baseSalary: number;
  kpiBonus: number;
  extraCount: number;
  extraAmount: number;
  total: number;
  note: string;
  isKpiMet: boolean;
  tasks: TaskDetail[];
  memberInfo?: MemberInfo;
  projectsSummary?: { name: string; count: number }[];
  isPaid?: boolean;
  paymentInfo?: SalaryPayment;
}

interface MonthlyTrend {
  month: number;
  year: number;
  label: string;
  shortLabel: string;
  totalSalary: number;
  totalPaid: number;
  memberCount: number;
  paidCount: number;
  articleCount: number;
  avgCostPerArticle: number;
  isPaid: boolean;
}

interface ProjectBreakdown {
  id: string;
  name: string;
  total: number;
  count: number;
  memberCount: number;
  avgCostPerArticle: number;
}

interface ProjectTrend {
  id: string;
  name: string;
  monthlyData: { month: number; year: number; label: string; cost: number; articles: number }[];
}

interface MemberBreakdown {
  name: string;
  totalEarnings: number;
  totalArticles: number;
  monthlyData: { month: number; year: number; label: string; salary: number; articles: number }[];
  projects: string[];
  kpiMetCount: number;
  avgMonthlyEarnings: number;
  avgArticlesPerMonth: number;
}

interface AnalyticsSummary {
  currentMonth: number;
  lastMonth: number;
  changePercent: number;
  avgMonthly: number;
  avgCostPerArticle: number;
  totalMembers: number;
  paidMembers: number;
  totalArticles: number;
  totalAllTime: number;
  totalArticlesAllTime: number;
  costGrowthRate: number;
  teamGrowthRate: number;
}

const CHART_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981'];

type ViewTab = 'overview' | 'projects' | 'members' | 'detail';

export default function SalaryPage() {
  const [salaryData, setSalaryData] = useState<SalaryDataWithTasks[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedPIC, setSelectedPIC] = useState<string | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');

  // Analytics state
  const [analytics, setAnalytics] = useState<{
    summary: AnalyticsSummary;
    monthlyTrend: MonthlyTrend[];
    projectBreakdown: ProjectBreakdown[];
    projectTrends: ProjectTrend[];
    memberBreakdown: MemberBreakdown[];
  } | null>(null);

  // Selected items for detail views
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedMemberName, setSelectedMemberName] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    setSelectedPIC(null);
    if (activeTab === 'detail') {
      fetchSalary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedProject, activeTab]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/salary/analytics?months=6');
      const data = await res.json();
      setAnalytics(data);

      // Auto-select first project and member
      if (data.projectBreakdown?.length > 0) {
        setSelectedProjectId(data.projectBreakdown[0].id);
      }
      if (data.memberBreakdown?.length > 0) {
        setSelectedMemberName(data.memberBreakdown[0].name);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSalary = async () => {
    setIsLoading(true);
    try {
      const [month, year] = selectedMonth.split('-');
      const projectParam = selectedProject ? `&project=${selectedProject}` : '';
      const [salaryRes, membersRes, paymentsRes] = await Promise.all([
        fetch(`/api/salary?month=${month}&year=${year}${projectParam}`),
        fetch('/api/members'),
        fetch(`/api/salary-payments?month=${month}&year=${year}`),
      ]);
      const salaryResult = await salaryRes.json();
      const membersResult = await membersRes.json();
      const paymentsResult = await paymentsRes.json();

      const paymentsData: SalaryPayment[] = paymentsResult.payments || [];

      const dataWithMemberInfo = (salaryResult.salaryData || []).map((s: SalaryDataWithTasks) => {
        const memberInfo = (membersResult.memberInfos || []).find(
          (m: MemberInfo) => m.name === s.name || m.nickname === s.name
        );

        const projectCounts: Record<string, number> = {};
        s.tasks.forEach((task) => {
          const projectName = task.project || 'Không xác định';
          projectCounts[projectName] = (projectCounts[projectName] || 0) + 1;
        });
        const projectsSummary = Object.entries(projectCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        const paymentInfo = paymentsData.find((p) => p.member_name === s.name);
        const isPaid = !!paymentInfo;

        return { ...s, memberInfo, projectsSummary, isPaid, paymentInfo };
      });

      setSalaryData(dataWithMemberInfo);
      setProjects(salaryResult.projects || []);

      if (dataWithMemberInfo.length > 0 && !selectedPIC) {
        setSelectedPIC(dataWithMemberInfo[0].name);
      }
    } catch (error) {
      console.error('Failed to fetch salary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkPaid = async (memberName: string, amount: number) => {
    const [month, year] = selectedMonth.split('-');
    setIsMarkingPaid(true);
    try {
      const res = await fetch('/api/salary-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_name: memberName,
          month: parseInt(month),
          year: parseInt(year),
          amount,
        }),
      });
      if (res.ok) {
        fetchSalary();
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Failed to mark as paid:', error);
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleMarkUnpaid = async (memberName: string) => {
    const [month, year] = selectedMonth.split('-');
    if (!confirm(`Bạn có chắc muốn đánh dấu "${memberName}" chưa thanh toán?`)) return;

    setIsMarkingPaid(true);
    try {
      const res = await fetch(
        `/api/salary-payments?member_name=${encodeURIComponent(memberName)}&month=${month}&year=${year}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        fetchSalary();
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Failed to mark as unpaid:', error);
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleMarkAllPaid = async () => {
    const unpaidMembers = salaryData.filter((s) => !s.isPaid);
    if (unpaidMembers.length === 0) return;
    if (!confirm(`Đánh dấu đã thanh toán cho ${unpaidMembers.length} thành viên?`)) return;

    setIsMarkingPaid(true);
    const [month, year] = selectedMonth.split('-');

    try {
      await Promise.all(
        unpaidMembers.map((member) =>
          fetch('/api/salary-payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              member_name: member.name,
              month: parseInt(month),
              year: parseInt(year),
              amount: member.total,
            }),
          })
        )
      );
      fetchSalary();
      fetchAnalytics();
    } catch (error) {
      console.error('Failed to mark all as paid:', error);
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      value: `${date.getMonth() + 1}-${date.getFullYear()}`,
      label: `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
    });
  }

  const totals = salaryData.reduce(
    (acc, item) => ({
      publishedCount: acc.publishedCount + item.publishedCount,
      baseSalary: acc.baseSalary + item.baseSalary,
      kpiBonus: acc.kpiBonus + item.kpiBonus,
      extraAmount: acc.extraAmount + item.extraAmount,
      total: acc.total + item.total,
    }),
    { publishedCount: 0, baseSalary: 0, kpiBonus: 0, extraAmount: 0, total: 0 }
  );

  const selectedData = salaryData.find((s) => s.name === selectedPIC);

  const handleExport = () => {
    const [month, year] = selectedMonth.split('-');
    const projectName = selectedProject
      ? projects.find((p) => p.id === selectedProject)?.name || ''
      : 'Tất cả dự án';

    let csv = '\uFEFF';
    csv += `Bảng lương tháng ${month}/${year}\n`;
    csv += `Dự án: ${projectName}\n\n`;
    csv += 'Thành viên,Email,SĐT,Ngân hàng,STK,Số bài,Lương cơ bản,Thưởng KPI,Vượt CT,Tổng,Ghi chú\n';

    salaryData.forEach((item) => {
      const m = item.memberInfo;
      csv += `${item.name},${m?.email || ''},${m?.phone || ''},${m?.bank_name || ''},${m?.bank_account || ''},`;
      csv += `${item.publishedCount},${item.baseSalary},${item.kpiBonus},${item.extraAmount},${item.total},"${item.note}"\n`;
    });

    csv += `\nTỔNG CỘNG,,,,,${totals.publishedCount},${totals.baseSalary},${totals.kpiBonus},${totals.extraAmount},${totals.total},\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luong-thang-${month}-${year}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get selected project data
  const selectedProjectData = analytics?.projectBreakdown.find(p => p.id === selectedProjectId);
  const selectedProjectTrend = analytics?.projectTrends.find(p => p.id === selectedProjectId);

  // Get selected member data
  const selectedMemberData = analytics?.memberBreakdown.find(m => m.name === selectedMemberName);

  if (isLoading && !analytics) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Quản lý Chi phí Lương</h1>
        <div className="flex items-center gap-2">
          {/* Tab Toggle */}
          <div className="flex gap-1 p-1 bg-card border border-border rounded-lg">
            {[
              { key: 'overview', label: 'Tổng quan' },
              { key: 'projects', label: 'Dự án' },
              { key: 'members', label: 'Nhân sự' },
              { key: 'detail', label: 'Chi tiết' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as ViewTab)}
                className={cn(
                  "px-3 py-1 text-xs rounded transition-colors",
                  activeTab === tab.key ? 'bg-accent text-white' : 'text-[#8888a0] hover:text-[var(--text-primary)]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'detail' && (
            <>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-2 py-1.5 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm"
              >
                <option value="">Tất cả dự án</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2 py-1.5 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <button
                onClick={handleExport}
                disabled={salaryData.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 disabled:bg-accent/50 rounded-lg text-white text-sm font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </>
          )}
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && analytics && (
        <div className="space-y-4">
          {/* Summary Cards - Row 1 */}
          <div className="grid grid-cols-6 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8888a0] text-xs">Tháng này</span>
                <Wallet className="w-4 h-4 text-accent" />
              </div>
              <div className="text-xl font-bold text-accent">{formatCurrency(analytics.summary.currentMonth)}</div>
              <div className="flex items-center gap-1 mt-1">
                {analytics.summary.changePercent >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 text-danger" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-success" />
                )}
                <span className={cn("text-xs", analytics.summary.changePercent >= 0 ? "text-danger" : "text-success")}>
                  {Math.abs(analytics.summary.changePercent)}%
                </span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8888a0] text-xs">Tháng trước</span>
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">{formatCurrency(analytics.summary.lastMonth)}</div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8888a0] text-xs">TB/tháng</span>
                <BarChart3 className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">{formatCurrency(analytics.summary.avgMonthly)}</div>
              <div className="text-xs text-[#8888a0]">6 tháng</div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8888a0] text-xs">Chi phí/bài</span>
                <DollarSign className="w-4 h-4 text-warning" />
              </div>
              <div className="text-xl font-bold text-warning">{formatCurrency(analytics.summary.avgCostPerArticle)}</div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8888a0] text-xs">Nhân sự</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">{analytics.summary.totalMembers}</div>
              <div className="text-xs text-emerald-400">{analytics.summary.paidMembers} đã TT</div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8888a0] text-xs">Bài viết</span>
                <FileText className="w-4 h-4 text-pink-400" />
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">{analytics.summary.totalArticles}</div>
              <div className="text-xs text-[#8888a0]">tháng này</div>
            </div>
          </div>

          {/* Growth Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-violet-400" />
                <span className="text-violet-400 text-sm font-medium">Tổng 6 tháng</span>
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(analytics.summary.totalAllTime)}</div>
              <div className="text-xs text-[#8888a0]">{analytics.summary.totalArticlesAllTime} bài viết</div>
            </div>

            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400 text-sm font-medium">Tăng trưởng chi phí</span>
              </div>
              <div className={cn("text-2xl font-bold", analytics.summary.costGrowthRate >= 0 ? "text-danger" : "text-success")}>
                {analytics.summary.costGrowthRate >= 0 ? '+' : ''}{analytics.summary.costGrowthRate}%
              </div>
              <div className="text-xs text-[#8888a0]">so với tháng đầu</div>
            </div>

            <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">Tăng trưởng team</span>
              </div>
              <div className={cn("text-2xl font-bold", analytics.summary.teamGrowthRate >= 0 ? "text-emerald-400" : "text-danger")}>
                {analytics.summary.teamGrowthRate >= 0 ? '+' : ''}{analytics.summary.teamGrowthRate}%
              </div>
              <div className="text-xs text-[#8888a0]">số nhân sự</div>
            </div>

            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 text-sm font-medium">Dự án đang chạy</span>
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{analytics.projectBreakdown.length}</div>
              <div className="text-xs text-[#8888a0]">có chi phí</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Monthly Trend Chart */}
            <div className="col-span-2 bg-card border border-border rounded-xl p-4">
              <h3 className="text-[var(--text-primary)] font-medium mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                Xu hướng chi phí lương
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={analytics.monthlyTrend}>
                  <defs>
                    <linearGradient id="colorSalary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="shortLabel" stroke="#8888a0" fontSize={12} />
                  <YAxis stroke="#8888a0" fontSize={12} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f1f5f9' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: number) => [formatCurrency(value), 'Tổng lương']}
                  />
                  <Area type="monotone" dataKey="totalSalary" stroke="#3b82f6" strokeWidth={2} fill="url(#colorSalary)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Project Breakdown */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-[var(--text-primary)] font-medium mb-4 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-accent" />
                Chi phí theo dự án
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.projectBreakdown.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" stroke="#8888a0" fontSize={12} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="name" stroke="#8888a0" fontSize={11} width={80}
                    tickFormatter={(val) => val.length > 10 ? val.slice(0, 10) + '...' : val} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f1f5f9' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: number) => [formatCurrency(value), 'Chi phí']} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {analytics.projectBreakdown.slice(0, 5).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Member Statistics Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/30">
              <h3 className="text-[var(--text-primary)] font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                Thống kê nhân sự (6 tháng)
              </h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-secondary text-left">
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase">Thành viên</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-right">Tổng thu nhập</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">TB/tháng</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Tổng bài</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">TB bài/tháng</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Đạt KPI</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase">Dự án</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analytics.memberBreakdown.slice(0, 10).map((member, idx) => (
                  <tr key={member.name} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[#8888a0] text-sm w-5">{idx + 1}.</span>
                        <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                          <span className="text-accent font-bold text-sm">{member.name.charAt(0)}</span>
                        </div>
                        <span className="text-[var(--text-primary)] font-medium">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-accent font-bold font-mono">{formatCurrency(member.totalEarnings)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[var(--text-primary)] font-mono">{formatCurrency(member.avgMonthlyEarnings)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[var(--text-primary)]">{member.totalArticles}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[var(--text-primary)]">{member.avgArticlesPerMonth}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("font-bold", member.kpiMetCount >= 4 ? "text-success" : "text-warning")}>
                        {member.kpiMetCount}/6
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {member.projects.slice(0, 2).map(p => (
                          <span key={p} className="px-1.5 py-0.5 bg-accent/10 text-accent rounded text-xs">{p}</span>
                        ))}
                        {member.projects.length > 2 && (
                          <span className="text-[#8888a0] text-xs">+{member.projects.length - 2}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Monthly History Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/30">
              <h3 className="text-[var(--text-primary)] font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                Lịch sử chi phí theo tháng
              </h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-secondary text-left">
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase">Tháng</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-right">Tổng lương</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Nhân sự</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Bài viết</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">CP/bài</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Đã TT</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analytics.monthlyTrend.slice().reverse().map((month) => (
                  <tr key={`${month.month}-${month.year}`} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-[var(--text-primary)] font-medium">{month.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-accent font-bold font-mono">{formatCurrency(month.totalSalary)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">{month.memberCount}</td>
                    <td className="px-4 py-3 text-center">{month.articleCount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-warning font-mono">{formatCurrency(month.avgCostPerArticle)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-emerald-400 font-mono">{formatCurrency(month.totalPaid)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {month.isPaid ? (
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">Hoàn thành</span>
                      ) : month.paidCount > 0 ? (
                        <span className="px-2 py-1 bg-warning/20 text-warning text-xs rounded-full">{month.paidCount}/{month.memberCount}</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full">Chưa TT</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROJECTS TAB */}
      {activeTab === 'projects' && analytics && (
        <div className="grid grid-cols-3 gap-4">
          {/* Project List */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/30">
              <h3 className="text-[var(--text-primary)] font-medium">Danh sách dự án</h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {analytics.projectBreakdown.map((project, idx) => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={cn(
                    "w-full p-3 flex items-center gap-3 text-left border-b border-border hover:bg-white/5 transition-colors",
                    selectedProjectId === project.id && "bg-white/10"
                  )}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${CHART_COLORS[idx % CHART_COLORS.length]}20` }}>
                    <Briefcase className="w-4 h-4" style={{ color: CHART_COLORS[idx % CHART_COLORS.length] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] font-medium truncate">{project.name}</p>
                    <p className="text-xs text-[#8888a0]">{project.count} bài • {project.memberCount} người</p>
                  </div>
                  <div className="text-right">
                    <p className="text-accent font-bold">{formatCurrency(project.total)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Project Detail */}
          <div className="col-span-2 space-y-4">
            {selectedProjectData && selectedProjectTrend && (
              <>
                {/* Project Summary */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-[#8888a0] text-xs mb-1">Tổng chi phí</div>
                    <div className="text-xl font-bold text-accent">{formatCurrency(selectedProjectData.total)}</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-[#8888a0] text-xs mb-1">Số bài viết</div>
                    <div className="text-xl font-bold text-[var(--text-primary)]">{selectedProjectData.count}</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-[#8888a0] text-xs mb-1">Nhân sự</div>
                    <div className="text-xl font-bold text-[var(--text-primary)]">{selectedProjectData.memberCount}</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-[#8888a0] text-xs mb-1">CP/bài</div>
                    <div className="text-xl font-bold text-warning">{formatCurrency(selectedProjectData.avgCostPerArticle)}</div>
                  </div>
                </div>

                {/* Project Trend Chart */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="text-[var(--text-primary)] font-medium mb-4">
                    Xu hướng chi phí - {selectedProjectData.name}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={selectedProjectTrend.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="label" stroke="#8888a0" fontSize={12} />
                      <YAxis stroke="#8888a0" fontSize={12} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f1f5f9' }}
                        labelStyle={{ color: '#94a3b8' }}
                        formatter={(value: number, name: string) => [formatCurrency(value), name === 'cost' ? 'Chi phí' : 'Bài viết']} />
                      <Legend />
                      <Line type="monotone" dataKey="cost" name="Chi phí" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Monthly Breakdown Table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-secondary/30">
                    <h3 className="text-[var(--text-primary)] font-medium">Chi tiết theo tháng</h3>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-secondary">
                        <th className="px-4 py-2 text-xs font-medium text-[#8888a0] text-left">Tháng</th>
                        <th className="px-4 py-2 text-xs font-medium text-[#8888a0] text-right">Chi phí</th>
                        <th className="px-4 py-2 text-xs font-medium text-[#8888a0] text-center">Bài viết</th>
                        <th className="px-4 py-2 text-xs font-medium text-[#8888a0] text-right">CP/bài</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedProjectTrend.monthlyData.slice().reverse().map((m) => (
                        <tr key={`${m.month}-${m.year}`}>
                          <td className="px-4 py-2 text-[var(--text-primary)]">{m.label}</td>
                          <td className="px-4 py-2 text-right text-accent font-mono">{formatCurrency(m.cost)}</td>
                          <td className="px-4 py-2 text-center">{m.articles}</td>
                          <td className="px-4 py-2 text-right text-warning font-mono">
                            {m.articles > 0 ? formatCurrency(Math.round(m.cost / m.articles)) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MEMBERS TAB */}
      {activeTab === 'members' && analytics && (
        <div className="grid grid-cols-3 gap-4">
          {/* Member List */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/30">
              <h3 className="text-[var(--text-primary)] font-medium">Danh sách nhân sự</h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {analytics.memberBreakdown.map((member) => (
                <button
                  key={member.name}
                  onClick={() => setSelectedMemberName(member.name)}
                  className={cn(
                    "w-full p-3 flex items-center gap-3 text-left border-b border-border hover:bg-white/5 transition-colors",
                    selectedMemberName === member.name && "bg-white/10"
                  )}
                >
                  <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                    <span className="text-accent font-bold text-sm">{member.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] font-medium truncate">{member.name}</p>
                    <p className="text-xs text-[#8888a0]">{member.totalArticles} bài • {member.kpiMetCount}/6 KPI</p>
                  </div>
                  <div className="text-right">
                    <p className="text-accent font-bold">{formatCurrency(member.totalEarnings)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Member Detail */}
          <div className="col-span-2 space-y-4">
            {selectedMemberData && (
              <>
                {/* Member Summary */}
                <div className="grid grid-cols-5 gap-3">
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-[#8888a0] text-xs mb-1">Tổng thu nhập</div>
                    <div className="text-xl font-bold text-accent">{formatCurrency(selectedMemberData.totalEarnings)}</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-[#8888a0] text-xs mb-1">TB/tháng</div>
                    <div className="text-xl font-bold text-[var(--text-primary)]">{formatCurrency(selectedMemberData.avgMonthlyEarnings)}</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-[#8888a0] text-xs mb-1">Tổng bài</div>
                    <div className="text-xl font-bold text-[var(--text-primary)]">{selectedMemberData.totalArticles}</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-[#8888a0] text-xs mb-1">TB bài/tháng</div>
                    <div className="text-xl font-bold text-[var(--text-primary)]">{selectedMemberData.avgArticlesPerMonth}</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-[#8888a0] text-xs mb-1">Đạt KPI</div>
                    <div className={cn("text-xl font-bold", selectedMemberData.kpiMetCount >= 4 ? "text-success" : "text-warning")}>
                      {selectedMemberData.kpiMetCount}/6
                    </div>
                  </div>
                </div>

                {/* Projects */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="text-[var(--text-primary)] font-medium mb-3">Dự án tham gia</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedMemberData.projects.map(p => (
                      <span key={p} className="px-3 py-1.5 bg-accent/20 text-accent rounded-lg text-sm">{p}</span>
                    ))}
                  </div>
                </div>

                {/* Member Trend Chart */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="text-[var(--text-primary)] font-medium mb-4">
                    Xu hướng thu nhập - {selectedMemberData.name}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={selectedMemberData.monthlyData.slice().reverse()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="label" stroke="#8888a0" fontSize={12} />
                      <YAxis stroke="#8888a0" fontSize={12} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f1f5f9' }}
                        labelStyle={{ color: '#94a3b8' }}
                        formatter={(value: number, name: string) => [
                          name === 'salary' ? formatCurrency(value) : value,
                          name === 'salary' ? 'Thu nhập' : 'Bài viết'
                        ]} />
                      <Bar dataKey="salary" name="Thu nhập" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Monthly Table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-secondary/30">
                    <h3 className="text-[var(--text-primary)] font-medium">Chi tiết theo tháng</h3>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-secondary">
                        <th className="px-4 py-2 text-xs font-medium text-[#8888a0] text-left">Tháng</th>
                        <th className="px-4 py-2 text-xs font-medium text-[#8888a0] text-right">Thu nhập</th>
                        <th className="px-4 py-2 text-xs font-medium text-[#8888a0] text-center">Bài viết</th>
                        <th className="px-4 py-2 text-xs font-medium text-[#8888a0] text-center">KPI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedMemberData.monthlyData.slice().reverse().map((m) => (
                        <tr key={`${m.month}-${m.year}`}>
                          <td className="px-4 py-2 text-[var(--text-primary)]">{m.label}</td>
                          <td className="px-4 py-2 text-right text-accent font-mono">{formatCurrency(m.salary)}</td>
                          <td className="px-4 py-2 text-center">{m.articles}</td>
                          <td className="px-4 py-2 text-center">
                            {m.articles >= 20 ? (
                              <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-danger mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* DETAIL TAB */}
      {activeTab === 'detail' && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-5 gap-3">
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-2xl font-bold text-[var(--text-primary)]">{salaryData.length}</div>
              <div className="text-xs text-[#8888a0]">Thành viên</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-2xl font-bold text-success">{totals.publishedCount}</div>
              <div className="text-xs text-[#8888a0]">Tổng bài</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-2xl font-bold text-green-400">
                {salaryData.filter((s) => s.isKpiMet).length}
                <span className="text-sm text-[#8888a0] font-normal">/{salaryData.length}</span>
              </div>
              <div className="text-xs text-[#8888a0]">Đạt KPI</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-xl font-bold text-accent">{formatCurrency(totals.total)}</div>
              <div className="text-xs text-[#8888a0]">Tổng lương</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-2xl font-bold text-emerald-400">
                {salaryData.filter((s) => s.isPaid).length}
                <span className="text-sm text-[#8888a0] font-normal">/{salaryData.length}</span>
              </div>
              <div className="text-xs text-[#8888a0]">Đã thanh toán</div>
            </div>
          </div>

          {salaryData.length === 0 ? (
            <EmptyState icon={Wallet} title="Chưa có dữ liệu lương" description="Chọn tháng khác hoặc sync dữ liệu" />
          ) : (
            <div className="flex gap-4" style={{ height: 'calc(100vh - 260px)' }}>
              {/* Salary Table */}
              <div className="w-96 flex-shrink-0 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
                  <h2 className="text-[var(--text-primary)] font-medium">Bảng lương</h2>
                  {salaryData.some((s) => !s.isPaid) && (
                    <button onClick={handleMarkAllPaid} disabled={isMarkingPaid}
                      className="text-xs px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded">
                      Thanh toán tất cả
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {salaryData.map((item) => (
                    <button key={item.name} onClick={() => setSelectedPIC(item.name)}
                      className={cn("w-full p-3 flex items-center gap-3 text-left border-b border-border hover:bg-white/5", selectedPIC === item.name && "bg-white/10")}>
                      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", item.isPaid ? "bg-emerald-500/20" : "bg-accent/20")}>
                        {item.isPaid ? <BadgeCheck className="w-5 h-5 text-emerald-400" /> : <span className="text-accent font-bold text-sm">{item.name?.charAt(0)}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-primary)] font-medium truncate">{item.name}</span>
                          {item.isKpiMet ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <XCircle className="w-3.5 h-3.5 text-danger" />}
                        </div>
                        <div className="text-xs text-[#8888a0]">{item.publishedCount} bài • {item.note}</div>
                      </div>
                      <div className={cn("font-bold", item.isPaid ? "text-emerald-400" : "text-[var(--text-primary)]")}>{formatCurrency(item.total)}</div>
                    </button>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-border bg-accent/10">
                  <div className="flex justify-between">
                    <span className="text-[#8888a0] text-sm">Tổng cộng</span>
                    <span className="text-accent font-bold text-lg">{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              </div>

              {/* Detail Panel */}
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                {selectedData ? (
                  <>
                    <div className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-accent/20 rounded-full flex items-center justify-center">
                            <span className="text-accent font-bold text-xl">{selectedData.name?.charAt(0)}</span>
                          </div>
                          <div>
                            <h2 className="text-[var(--text-primary)] font-bold text-lg">{selectedData.name}</h2>
                            <span className={cn("px-2 py-0.5 rounded text-xs", selectedData.isKpiMet ? "bg-success/20 text-success" : "bg-danger/20 text-danger")}>{selectedData.note}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cn("text-2xl font-bold", selectedData.isPaid ? "text-emerald-400" : "text-accent")}>{formatCurrency(selectedData.total)}</div>
                          {selectedData.isPaid ? (
                            <button onClick={() => handleMarkUnpaid(selectedData.name)} disabled={isMarkingPaid}
                              className="mt-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">Đã thanh toán</button>
                          ) : (
                            <button onClick={() => handleMarkPaid(selectedData.name, selectedData.total)} disabled={isMarkingPaid}
                              className="mt-2 px-3 py-1.5 bg-accent text-white rounded text-xs">Đánh dấu đã TT</button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                        <div className="text-center">
                          <div className="text-[var(--text-primary)] font-mono">{formatCurrency(selectedData.baseSalary)}</div>
                          <div className="text-xs text-[#8888a0]">Lương CB</div>
                        </div>
                        <div className="text-center">
                          <div className="text-success font-mono">{formatCurrency(selectedData.kpiBonus)}</div>
                          <div className="text-xs text-[#8888a0]">Thưởng KPI</div>
                        </div>
                        <div className="text-center">
                          <div className="text-accent font-mono">+{formatCurrency(selectedData.extraAmount)}</div>
                          <div className="text-xs text-[#8888a0]">Vượt CT ({selectedData.extraCount})</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
                      <div className="px-4 py-3 border-b border-border bg-secondary/30">
                        <h3 className="text-[var(--text-primary)] font-medium">Chi tiết {selectedData.publishedCount} bài viết</h3>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {selectedData.tasks.map((task, idx) => (
                          <div key={task.id} className="flex items-center gap-3 p-3 border-b border-border hover:bg-white/5">
                            <span className="text-[#8888a0] text-sm w-6">{idx + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[var(--text-primary)] text-sm truncate">{task.title}</p>
                              <p className="text-xs text-[#8888a0]"><span className="text-accent">{task.project}</span> • {formatDate(task.publish_date)}</p>
                            </div>
                            {task.link && <a href={task.link} target="_blank" className="text-[#8888a0] hover:text-accent"><ExternalLink className="w-4 h-4" /></a>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-card border border-border rounded-lg">
                    <div className="text-center text-[#8888a0]">
                      <User className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Chọn thành viên để xem chi tiết</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
