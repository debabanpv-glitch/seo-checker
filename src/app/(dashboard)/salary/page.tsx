'use client';

import { useState, useEffect } from 'react';
import {
  Wallet,
  Download,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
  FileText,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Project } from '@/types';

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
  const [expandedPIC, setExpandedPIC] = useState<string | null>(null);

  useEffect(() => {
    fetchSalary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedProject]);

  const fetchSalary = async () => {
    setIsLoading(true);
    try {
      const [month, year] = selectedMonth.split('-');
      const projectParam = selectedProject ? `&project=${selectedProject}` : '';
      const res = await fetch(`/api/salary?month=${month}&year=${year}${projectParam}`);
      const data = await res.json();
      setSalaryData(data.salaryData || []);
      setProjects(data.projects || []);
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

  // Export to CSV
  const handleExport = () => {
    const [month, year] = selectedMonth.split('-');
    const projectName = selectedProject
      ? projects.find((p) => p.id === selectedProject)?.name || ''
      : 'Tất cả dự án';

    // Header
    let csv = '\uFEFF'; // BOM for UTF-8
    csv += `Bảng lương tháng ${month}/${year}\n`;
    csv += `Dự án: ${projectName}\n\n`;
    csv += 'Thành viên,Số bài,Lương cơ bản,Thưởng KPI,Vượt chỉ tiêu,Tổng,Ghi chú\n';

    // Data rows
    salaryData.forEach((item) => {
      csv += `${item.name},${item.publishedCount},${item.baseSalary},${item.kpiBonus},${item.extraAmount},${item.total},"${item.note}"\n`;
    });

    // Total row
    csv += `\nTỔNG CỘNG,${totals.publishedCount},${totals.baseSalary},${totals.kpiBonus},${totals.extraAmount},${totals.total},\n`;

    // Add task details section
    csv += '\n\n--- CHI TIẾT BÀI VIẾT ---\n\n';
    salaryData.forEach((item) => {
      csv += `\n${item.name} (${item.publishedCount} bài)\n`;
      csv += 'STT,Tiêu đề,Dự án,Ngày publish,Link\n';
      item.tasks.forEach((task, idx) => {
        const title = task.title.replace(/"/g, '""');
        csv += `${idx + 1},"${title}",${task.project},${task.publish_date || '-'},${task.link || '-'}\n`;
      });
    });

    // Download
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tính lương & Nghiệm thu</h1>
          <p className="text-[#8888a0] text-sm">Bảng lương theo tháng - Xem chi tiết từng người</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#8888a0]" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 bg-card border border-border rounded-lg text-white text-sm"
            >
              <option value="">Tất cả dự án</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-card border border-border rounded-lg text-white"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={salaryData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 rounded-lg text-white font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-1">Tổng bài publish</p>
          <p className="text-2xl font-bold text-success">{totals.publishedCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-1">Số người</p>
          <p className="text-2xl font-bold text-white">{salaryData.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-1">Đạt KPI</p>
          <p className="text-2xl font-bold text-success">
            {salaryData.filter((s) => s.isKpiMet).length}
            <span className="text-sm text-[#8888a0] font-normal">/{salaryData.length}</span>
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[#8888a0] text-xs mb-1">Tổng lương</p>
          <p className="text-2xl font-bold text-accent">{formatCurrency(totals.total)}</p>
        </div>
      </div>

      {/* Salary Info Box */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Công thức tính lương</h3>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-secondary rounded-lg p-4">
            <p className="text-danger mb-2">Chưa đủ 20 bài:</p>
            <p className="text-white font-mono">Số bài × 125.000đ</p>
          </div>
          <div className="bg-secondary rounded-lg p-4">
            <p className="text-success mb-2">Đạt KPI (≥20 bài):</p>
            <p className="text-white font-mono">2.500.000đ + 500.000đ KPI + (Vượt × 120.000đ)</p>
          </div>
        </div>
      </div>

      {/* Salary Table with Expandable Rows */}
      {salaryData.length > 0 ? (
        <div className="space-y-3">
          {salaryData.map((item) => (
            <div
              key={item.name}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              {/* Main Row */}
              <button
                onClick={() => setExpandedPIC(expandedPIC === item.name ? null : item.name)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-secondary/30 transition-colors"
              >
                {/* Avatar & Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-accent font-bold">
                      {item.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{item.name}</p>
                    <p className="text-xs text-[#8888a0]">
                      {item.publishedCount} bài publish
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-[#8888a0]">Lương CB</p>
                    <p className="text-white font-mono">{formatCurrency(item.baseSalary)}</p>
                  </div>
                  {item.kpiBonus > 0 && (
                    <div className="text-center">
                      <p className="text-xs text-[#8888a0]">KPI</p>
                      <p className="text-success font-mono">{formatCurrency(item.kpiBonus)}</p>
                    </div>
                  )}
                  {item.extraAmount > 0 && (
                    <div className="text-center">
                      <p className="text-xs text-[#8888a0]">Vượt</p>
                      <p className="text-accent font-mono">+{formatCurrency(item.extraAmount)}</p>
                    </div>
                  )}
                </div>

                {/* Total & Status */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">{formatCurrency(item.total)}</p>
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${
                        item.isKpiMet ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {item.isKpiMet ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {item.note}
                    </span>
                  </div>
                  <div className="text-[#8888a0]">
                    {expandedPIC === item.name ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Task List */}
              {expandedPIC === item.name && (
                <div className="border-t border-border bg-secondary/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-accent" />
                    <h4 className="text-white font-medium">
                      Chi tiết {item.publishedCount} bài viết
                    </h4>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {item.tasks.map((task, idx) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 bg-card rounded-lg"
                      >
                        <span className="text-[#8888a0] text-sm font-mono w-6">
                          {idx + 1}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{task.title}</p>
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
                            className="p-2 text-accent hover:bg-accent/20 rounded transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Total Summary Card */}
          <div className="bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/30 rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[#8888a0] text-sm">TỔNG CỘNG</p>
                <p className="text-white font-bold">{salaryData.length} người</p>
              </div>
              <div className="text-center">
                <p className="text-[#8888a0] text-xs">Tổng bài</p>
                <p className="text-success font-bold text-xl">{totals.publishedCount}</p>
              </div>
              <div className="text-center">
                <p className="text-[#8888a0] text-xs">Lương CB</p>
                <p className="text-white font-mono">{formatCurrency(totals.baseSalary)}</p>
              </div>
              <div className="text-center">
                <p className="text-[#8888a0] text-xs">Thưởng KPI</p>
                <p className="text-success font-mono">{formatCurrency(totals.kpiBonus)}</p>
              </div>
              <div className="text-center">
                <p className="text-[#8888a0] text-xs">Vượt CT</p>
                <p className="text-accent font-mono">{formatCurrency(totals.extraAmount)}</p>
              </div>
              <div className="text-right">
                <p className="text-[#8888a0] text-xs">TỔNG LƯƠNG</p>
                <p className="text-accent font-bold text-2xl">{formatCurrency(totals.total)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Wallet}
          title="Chưa có dữ liệu lương"
          description="Sync dữ liệu từ Google Sheets để xem bảng lương"
        />
      )}
    </div>
  );
}
