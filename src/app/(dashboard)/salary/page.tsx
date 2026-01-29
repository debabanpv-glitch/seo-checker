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
  Phone,
  Mail,
  Building2,
  CreditCard,
  FolderOpen,
  BadgeCheck,
  Clock,
  TrendingUp,
  Users,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
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
  isPaid: boolean;
}

interface ProjectBreakdown {
  id: string;
  name: string;
  total: number;
  count: number;
}

interface AnalyticsSummary {
  currentMonth: number;
  lastMonth: number;
  changePercent: number;
  avgMonthly: number;
  totalMembers: number;
  paidMembers: number;
  totalArticles: number;
}

const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

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
  const [activeTab, setActiveTab] = useState<'overview' | 'detail'>('overview');

  // Analytics state
  const [analytics, setAnalytics] = useState<{
    summary: AnalyticsSummary;
    monthlyTrend: MonthlyTrend[];
    projectBreakdown: ProjectBreakdown[];
  } | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    setSelectedPIC(null);
    fetchSalary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedProject]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/salary/analytics?months=6');
      const data = await res.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
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

  if (isLoading && !analytics) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Quản lý Lương</h1>
        <div className="flex items-center gap-2">
          {/* Tab Toggle */}
          <div className="flex gap-1 p-1 bg-card border border-border rounded-lg">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors",
                activeTab === 'overview' ? 'bg-accent text-white' : 'text-[#8888a0] hover:text-[var(--text-primary)]'
              )}
            >
              Tổng quan
            </button>
            <button
              onClick={() => setActiveTab('detail')}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors",
                activeTab === 'detail' ? 'bg-accent text-white' : 'text-[#8888a0] hover:text-[var(--text-primary)]'
              )}
            >
              Chi tiết
            </button>
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

      {activeTab === 'overview' ? (
        /* OVERVIEW TAB */
        <div className="space-y-4">
          {/* Summary Cards */}
          {analytics && (
            <div className="grid grid-cols-4 gap-4">
              {/* Current Month */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#8888a0] text-sm">Tháng này</span>
                  <Wallet className="w-5 h-5 text-accent" />
                </div>
                <div className="text-2xl font-bold text-accent">
                  {formatCurrency(analytics.summary.currentMonth)}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {analytics.summary.changePercent >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-danger" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-success" />
                  )}
                  <span className={cn(
                    "text-sm",
                    analytics.summary.changePercent >= 0 ? "text-danger" : "text-success"
                  )}>
                    {Math.abs(analytics.summary.changePercent)}% so với tháng trước
                  </span>
                </div>
              </div>

              {/* Average */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#8888a0] text-sm">Trung bình/tháng</span>
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(analytics.summary.avgMonthly)}
                </div>
                <div className="text-sm text-[#8888a0] mt-1">
                  6 tháng gần nhất
                </div>
              </div>

              {/* Members */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#8888a0] text-sm">Thành viên</span>
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)]">
                  {analytics.summary.totalMembers}
                </div>
                <div className="text-sm text-emerald-400 mt-1">
                  {analytics.summary.paidMembers} đã thanh toán
                </div>
              </div>

              {/* Articles */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#8888a0] text-sm">Bài viết tháng này</span>
                  <FileText className="w-5 h-5 text-warning" />
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)]">
                  {analytics.summary.totalArticles}
                </div>
                <div className="text-sm text-[#8888a0] mt-1">
                  ~{formatCurrency(analytics.summary.totalArticles * 125000)} chi phí
                </div>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Monthly Trend Chart */}
            <div className="col-span-2 bg-card border border-border rounded-xl p-4">
              <h3 className="text-[var(--text-primary)] font-medium mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                Xu hướng chi phí lương
              </h3>
              {analytics && analytics.monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={analytics.monthlyTrend}>
                    <defs>
                      <linearGradient id="colorSalary" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="shortLabel" stroke="#8888a0" fontSize={12} />
                    <YAxis
                      stroke="#8888a0"
                      fontSize={12}
                      tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: number) => [formatCurrency(value), 'Tổng lương']}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalSalary"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#colorSalary)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-[#8888a0]">
                  Đang tải dữ liệu...
                </div>
              )}
            </div>

            {/* Project Breakdown */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-[var(--text-primary)] font-medium mb-4 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-accent" />
                Chi phí theo dự án
              </h3>
              {analytics && analytics.projectBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.projectBreakdown.slice(0, 5)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      type="number"
                      stroke="#8888a0"
                      fontSize={12}
                      tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#8888a0"
                      fontSize={11}
                      width={80}
                      tickFormatter={(val) => val.length > 10 ? val.slice(0, 10) + '...' : val}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }}
                      formatter={(value: number) => [formatCurrency(value), 'Chi phí']}
                    />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {analytics.projectBreakdown.slice(0, 5).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-[#8888a0]">
                  Đang tải dữ liệu...
                </div>
              )}
            </div>
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
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Thành viên</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Bài viết</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Đã thanh toán</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#8888a0] uppercase text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analytics?.monthlyTrend.slice().reverse().map((month) => (
                  <tr key={`${month.month}-${month.year}`} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-[var(--text-primary)] font-medium">{month.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-accent font-bold font-mono">{formatCurrency(month.totalSalary)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[var(--text-primary)]">{month.memberCount}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[var(--text-primary)]">{month.articleCount}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-emerald-400 font-mono">{formatCurrency(month.totalPaid)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {month.isPaid ? (
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                          Hoàn thành
                        </span>
                      ) : month.paidCount > 0 ? (
                        <span className="px-2 py-1 bg-warning/20 text-warning text-xs rounded-full">
                          {month.paidCount}/{month.memberCount} đã TT
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full">
                          Chưa TT
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* DETAIL TAB - Original detailed view */
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
            <EmptyState
              icon={Wallet}
              title="Chưa có dữ liệu lương"
              description="Sync dữ liệu từ Google Sheets để xem bảng lương"
            />
          ) : (
            <div className="flex gap-4 min-h-0" style={{ height: 'calc(100vh - 220px)' }}>
              {/* Left: Salary Table */}
              <div className="w-96 flex-shrink-0 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
                  <h2 className="text-[var(--text-primary)] font-medium">Bảng lương chi tiết</h2>
                  {salaryData.some((s) => !s.isPaid) && (
                    <button
                      onClick={handleMarkAllPaid}
                      disabled={isMarkingPaid}
                      className="text-xs px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded transition-colors disabled:opacity-50"
                    >
                      Thanh toán tất cả
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {salaryData.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => setSelectedPIC(item.name)}
                      className={cn(
                        "w-full p-3 flex items-center gap-3 text-left border-b border-border hover:bg-white/5 transition-colors",
                        selectedPIC === item.name && "bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                        item.isPaid ? "bg-emerald-500/20" : "bg-accent/20"
                      )}>
                        {item.isPaid ? (
                          <BadgeCheck className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <span className="text-accent font-bold text-sm">
                            {item.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-primary)] font-medium truncate">{item.name}</span>
                          {item.isKpiMet ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-danger flex-shrink-0" />
                          )}
                          {item.isPaid && (
                            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded flex-shrink-0">
                              Đã TT
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#8888a0]">
                          {item.publishedCount} bài • {item.note}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "font-bold",
                          item.isPaid ? "text-emerald-400" : "text-[var(--text-primary)]"
                        )}>
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="px-4 py-3 border-t border-border bg-accent/10">
                  <div className="flex justify-between items-center">
                    <span className="text-[#8888a0] text-sm">Tổng cộng</span>
                    <span className="text-accent font-bold text-lg">{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Details */}
              <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto">
                {selectedData ? (
                  <>
                    {/* Person Info Card */}
                    <div className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-accent/20 rounded-full flex items-center justify-center">
                            <span className="text-accent font-bold text-xl">
                              {selectedData.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <h2 className="text-[var(--text-primary)] font-bold text-lg">{selectedData.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                selectedData.isKpiMet
                                  ? "bg-success/20 text-success"
                                  : "bg-danger/20 text-danger"
                              )}>
                                {selectedData.note}
                              </span>
                              <span className="text-[#8888a0] text-sm">
                                {selectedData.publishedCount} bài publish
                              </span>
                            </div>
                            {selectedData.projectsSummary && selectedData.projectsSummary.length > 0 && (
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <FolderOpen className="w-3.5 h-3.5 text-[#8888a0]" />
                                {selectedData.projectsSummary.map((p) => (
                                  <span
                                    key={p.name}
                                    className="px-2 py-0.5 bg-accent/10 text-accent rounded text-xs"
                                  >
                                    {p.name}: {p.count} bài
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cn(
                            "text-2xl font-bold",
                            selectedData.isPaid ? "text-emerald-400" : "text-accent"
                          )}>
                            {formatCurrency(selectedData.total)}
                          </div>
                          <div className="text-xs text-[#8888a0] mt-1">Tổng lương</div>
                          {selectedData.isPaid ? (
                            <button
                              onClick={() => handleMarkUnpaid(selectedData.name)}
                              disabled={isMarkingPaid}
                              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-red-500/20 text-emerald-400 hover:text-red-400 rounded text-xs transition-colors disabled:opacity-50"
                            >
                              <BadgeCheck className="w-3.5 h-3.5" />
                              Đã thanh toán
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkPaid(selectedData.name, selectedData.total)}
                              disabled={isMarkingPaid}
                              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/80 text-white rounded text-xs transition-colors disabled:opacity-50"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Đánh dấu đã TT
                            </button>
                          )}
                        </div>
                      </div>

                      {selectedData.isPaid && selectedData.paymentInfo && (
                        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                          <div className="flex items-center gap-2 text-emerald-400 text-sm">
                            <BadgeCheck className="w-4 h-4" />
                            <span className="font-medium">Đã thanh toán</span>
                            <span className="text-emerald-400/70">
                              {formatDate(selectedData.paymentInfo.paid_at)}
                            </span>
                          </div>
                        </div>
                      )}

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

                      {selectedData.memberInfo && (
                        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                          {selectedData.memberInfo.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-[#8888a0]" />
                              <span className="text-[var(--text-primary)] truncate">{selectedData.memberInfo.email}</span>
                            </div>
                          )}
                          {selectedData.memberInfo.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-[#8888a0]" />
                              <span className="text-[var(--text-primary)]">{selectedData.memberInfo.phone}</span>
                            </div>
                          )}
                          {selectedData.memberInfo.bank_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <Building2 className="w-4 h-4 text-[#8888a0]" />
                              <span className="text-[var(--text-primary)]">{selectedData.memberInfo.bank_name}</span>
                            </div>
                          )}
                          {selectedData.memberInfo.bank_account && (
                            <div className="flex items-center gap-2 text-sm">
                              <CreditCard className="w-4 h-4 text-[#8888a0]" />
                              <span className="text-[var(--text-primary)] font-mono">{selectedData.memberInfo.bank_account}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Task List */}
                    <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden flex flex-col min-h-0">
                      <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-accent" />
                        <h3 className="text-[var(--text-primary)] font-medium">
                          Chi tiết {selectedData.publishedCount} bài viết
                        </h3>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {selectedData.tasks.map((task, idx) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-3 p-3 border-b border-border hover:bg-white/5"
                          >
                            <span className="text-[#8888a0] text-sm font-mono w-6">{idx + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[var(--text-primary)] text-sm truncate">{task.title}</p>
                              <div className="flex items-center gap-2 text-xs text-[#8888a0]">
                                <span className="text-accent">{task.project}</span>
                                {task.publish_date && (
                                  <>
                                    <span>•</span>
                                    <span>{formatDate(task.publish_date)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {task.link && (
                              <a
                                href={task.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-[#8888a0] hover:text-accent"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-card border border-border rounded-lg">
                    <div className="text-center text-[#8888a0]">
                      <User className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Chọn một thành viên để xem chi tiết</p>
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
