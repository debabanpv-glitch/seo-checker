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
} from 'lucide-react';
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
}

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

  useEffect(() => {
    fetchSalary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedProject]);

  const fetchSalary = async () => {
    setIsLoading(true);
    try {
      const [month, year] = selectedMonth.split('-');
      const projectParam = selectedProject ? `&project=${selectedProject}` : '';
      const [salaryRes, membersRes] = await Promise.all([
        fetch(`/api/salary?month=${month}&year=${year}${projectParam}`),
        fetch('/api/members'),
      ]);
      const salaryResult = await salaryRes.json();
      const membersResult = await membersRes.json();

      // Merge member info and projects summary into salary data
      const dataWithMemberInfo = (salaryResult.salaryData || []).map((s: SalaryDataWithTasks) => {
        const memberInfo = (membersResult.memberInfos || []).find(
          (m: MemberInfo) => m.name === s.name || m.nickname === s.name
        );

        // Calculate projects summary from tasks
        const projectCounts: Record<string, number> = {};
        s.tasks.forEach((task) => {
          const projectName = task.project || 'Không xác định';
          projectCounts[projectName] = (projectCounts[projectName] || 0) + 1;
        });
        const projectsSummary = Object.entries(projectCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        return { ...s, memberInfo, projectsSummary };
      });

      setSalaryData(dataWithMemberInfo);
      setProjects(salaryResult.projects || []);

      // Auto-select first person
      if (dataWithMemberInfo.length > 0 && !selectedPIC) {
        setSelectedPIC(dataWithMemberInfo[0].name);
      }
    } catch (error) {
      console.error('Failed to fetch salary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate month options
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      value: `${date.getMonth() + 1}-${date.getFullYear()}`,
      label: `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
    });
  }

  // Calculate totals
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

  // Get selected person data
  const selectedData = salaryData.find((s) => s.name === selectedPIC);

  // Export to CSV
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

    csv += '\n\n--- CHI TIẾT BÀI VIẾT ---\n\n';
    salaryData.forEach((item) => {
      csv += `\n${item.name} (${item.publishedCount} bài)\n`;
      csv += 'STT,Tiêu đề,Dự án,Ngày publish,Link\n';
      item.tasks.forEach((task, idx) => {
        const title = task.title.replace(/"/g, '""');
        csv += `${idx + 1},"${title}",${task.project},${task.publish_date || '-'},${task.link || '-'}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luong-thang-${month}-${year}${selectedProject ? `-${projectName.replace(/\s/g, '-')}` : ''}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Bảng lương</h1>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
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
      </div>

      {salaryData.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Chưa có dữ liệu lương"
          description="Sync dữ liệu từ Google Sheets để xem bảng lương"
        />
      ) : (
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left: Salary Table */}
          <div className="w-96 flex-shrink-0 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border bg-secondary/30">
              <h2 className="text-[var(--text-primary)] font-medium">Bảng lương chi tiết</h2>
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
                  <div className="w-9 h-9 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-accent font-bold text-sm">
                      {item.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-primary)] font-medium truncate">{item.name}</span>
                      {item.isKpiMet ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-danger flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-[#8888a0]">
                      {item.publishedCount} bài • {item.note}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[var(--text-primary)] font-bold">{formatCurrency(item.total)}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Total Footer */}
            <div className="px-4 py-3 border-t border-border bg-accent/10">
              <div className="flex justify-between items-center">
                <span className="text-[#8888a0] text-sm">Tổng cộng</span>
                <span className="text-accent font-bold text-lg">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          {/* Right: Details */}
          <div className="flex-1 flex flex-col gap-4 min-h-0">
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
                        {/* Projects summary */}
                        {selectedData.projectsSummary && selectedData.projectsSummary.length > 0 && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <FolderOpen className="w-3.5 h-3.5 text-[#8888a0]" />
                            {selectedData.projectsSummary.map((p, idx) => (
                              <span
                                key={p.name}
                                className="px-2 py-0.5 bg-accent/10 text-accent rounded text-xs"
                              >
                                {p.name}: {p.count} bài
                                {idx < selectedData.projectsSummary!.length - 1 ? '' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-accent">{formatCurrency(selectedData.total)}</div>
                      <div className="text-xs text-[#8888a0] mt-1">Tổng lương</div>
                    </div>
                  </div>

                  {/* Salary Breakdown */}
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

                  {/* Member Contact Info */}
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
    </div>
  );
}
