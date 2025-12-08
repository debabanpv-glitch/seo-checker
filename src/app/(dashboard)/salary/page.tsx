'use client';

import { useState, useEffect } from 'react';
import { Wallet, Download, CheckCircle2, XCircle } from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { formatCurrency } from '@/lib/utils';
import { SalaryData } from '@/types';

export default function SalaryPage() {
  const [salaryData, setSalaryData] = useState<SalaryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });

  useEffect(() => {
    fetchSalary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const fetchSalary = async () => {
    setIsLoading(true);
    try {
      const [month, year] = selectedMonth.split('-');
      const res = await fetch(`/api/salary?month=${month}&year=${year}`);
      const data = await res.json();
      setSalaryData(data.salaryData || []);
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

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tính lương</h1>
          <p className="text-[#8888a0] text-sm">Bảng lương theo tháng</p>
        </div>

        <div className="flex gap-3">
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
          <button
            onClick={() => {
              // TODO: Export to CSV
              alert('Tính năng export sẽ sớm được cập nhật!');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
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

      {/* Salary Table */}
      {salaryData.length > 0 ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr className="bg-secondary">
                  <th>Thành viên</th>
                  <th className="text-center">Số bài</th>
                  <th className="text-right">Lương cơ bản</th>
                  <th className="text-right">Thưởng KPI</th>
                  <th className="text-right">Vượt chỉ tiêu</th>
                  <th className="text-right">Tổng</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {salaryData.map((item) => (
                  <tr key={item.name}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                          <span className="text-accent font-medium text-sm">
                            {item.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <span className="text-white font-medium">{item.name}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="font-mono text-white">{item.publishedCount}</span>
                    </td>
                    <td className="text-right font-mono text-white">
                      {formatCurrency(item.baseSalary)}
                    </td>
                    <td className="text-right font-mono">
                      {item.kpiBonus > 0 ? (
                        <span className="text-success">{formatCurrency(item.kpiBonus)}</span>
                      ) : (
                        <span className="text-[#8888a0]">-</span>
                      )}
                    </td>
                    <td className="text-right font-mono">
                      {item.extraAmount > 0 ? (
                        <span className="text-accent">
                          +{item.extraCount} × 120k = {formatCurrency(item.extraAmount)}
                        </span>
                      ) : (
                        <span className="text-[#8888a0]">-</span>
                      )}
                    </td>
                    <td className="text-right font-mono font-bold text-white">
                      {formatCurrency(item.total)}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 text-xs ${
                          item.publishedCount >= 20 ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {item.publishedCount >= 20 ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {item.note}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-secondary font-bold">
                  <td className="text-white">TỔNG CỘNG</td>
                  <td className="text-center font-mono text-white">{totals.publishedCount}</td>
                  <td className="text-right font-mono text-white">
                    {formatCurrency(totals.baseSalary)}
                  </td>
                  <td className="text-right font-mono text-success">
                    {formatCurrency(totals.kpiBonus)}
                  </td>
                  <td className="text-right font-mono text-accent">
                    {formatCurrency(totals.extraAmount)}
                  </td>
                  <td className="text-right font-mono text-xl text-white">
                    {formatCurrency(totals.total)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
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
