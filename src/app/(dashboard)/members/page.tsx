'use client';

import { useState, useEffect } from 'react';
import { Users, FileText, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import ProgressBar from '@/components/ProgressBar';
import { MemberStats } from '@/types';

export default function MembersPage() {
  const [members, setMembers] = useState<MemberStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const [month, year] = selectedMonth.split('-');
      const res = await fetch(`/api/members?month=${month}&year=${year}`);
      const data = await res.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
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

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Thành viên</h1>
          <p className="text-[#8888a0] text-sm">Thống kê hiệu suất từng người</p>
        </div>

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
      </div>

      {/* Members Grid */}
      {members.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <div
              key={member.name}
              className="bg-card border border-border rounded-xl p-6 card-hover"
            >
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                  <span className="text-accent font-bold text-lg">
                    {member.name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">{member.name}</h3>
                  <p className="text-xs text-[#8888a0]">Content Writer</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-secondary rounded-lg p-3">
                  <div className="flex items-center gap-2 text-[#8888a0] text-xs mb-1">
                    <FileText className="w-3 h-3" />
                    Tổng bài
                  </div>
                  <p className="text-white font-bold font-mono text-lg">
                    {member.totalThisMonth}
                  </p>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <div className="flex items-center gap-2 text-[#8888a0] text-xs mb-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Đã publish
                  </div>
                  <p className="text-success font-bold font-mono text-lg">
                    {member.published}
                  </p>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <div className="flex items-center gap-2 text-[#8888a0] text-xs mb-1">
                    <Clock className="w-3 h-3" />
                    Đang làm
                  </div>
                  <p className="text-warning font-bold font-mono text-lg">
                    {member.inProgress}
                  </p>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <div className="flex items-center gap-2 text-[#8888a0] text-xs mb-1">
                    <TrendingUp className="w-3 h-3" />
                    Đúng hạn
                  </div>
                  <p className="text-accent font-bold font-mono text-lg">
                    {member.onTimeRate}%
                  </p>
                </div>
              </div>

              {/* Progress to KPI */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#8888a0]">Tiến độ KPI</span>
                  <span className="text-white">{member.published}/20</span>
                </div>
                <ProgressBar value={member.published} max={20} showLabel={false} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Chưa có dữ liệu thành viên"
          description="Sync dữ liệu từ Google Sheets để xem thống kê"
        />
      )}
    </div>
  );
}
