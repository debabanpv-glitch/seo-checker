'use client';

import { useState } from 'react';
import { LayoutDashboard, TrendingUp, ListChecks, Shield, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import DashboardV2OverviewTab from './dashboard-v2-overview-tab';
import DashboardV2GrowthTab from './dashboard-v2-growth-tab';
import DashboardV2ExecutionTab from './dashboard-v2-execution-tab-main-container';
import DashboardV2SeoStrengthTab from './dashboard-v2-seo-strength-tab';

type DashboardTab = 'overview' | 'growth' | 'execution' | 'seo-strength';

const TABS: { id: DashboardTab; label: string; icon: typeof LayoutDashboard; subtitle: string }[] = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard, subtitle: 'KPIs & hoạt động' },
  { id: 'growth', label: 'Tăng trưởng', icon: TrendingUp, subtitle: 'Traffic & từ khóa' },
  { id: 'execution', label: 'Thực thi', icon: ListChecks, subtitle: 'Nội dung & tasks' },
  { id: 'seo-strength', label: 'SEO Strength', icon: Shield, subtitle: 'Backlinks & audit' },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = [2024, 2025, 2026];

const VIET_DAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

function TimeContextBar() {
  const now = new Date();
  const dayName = VIET_DAYS[now.getDay()];
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const week = getWeekNumber(now);
  const daysInMonth = new Date(yyyy, now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100);

  return (
    <div className="flex items-center gap-4 flex-wrap text-xs text-[#8888a0]">
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        <span className="text-[var(--text-primary)] font-medium">{dayName}, {dd}/{mm}/{yyyy}</span>
      </div>
      <span className="hidden sm:inline">·</span>
      <span>Tuần {week}</span>
      <span className="hidden sm:inline">·</span>
      <span>Tháng {now.getMonth() + 1}/{yyyy}</span>
      <span className="hidden sm:inline">·</span>
      <div className="flex items-center gap-1.5">
        <span>Tiến độ tháng:</span>
        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full" style={{ width: `${monthProgress}%` }} />
        </div>
        <span className="text-[var(--text-primary)] font-medium">{dayOfMonth}/{daysInMonth} ngày ({monthProgress}%)</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = Tổng (all months)
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  const currentTab = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="space-y-4">
      {/* Time Context */}
      <TimeContextBar />

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Title + Tab Switcher */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-xl border border-accent/20">
              <LayoutDashboard className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">Dashboard</h1>
              <p className="text-[#8888a0] text-xs">{currentTab.subtitle}</p>
            </div>
          </div>

          {/* Tab Pills */}
          <div className="flex gap-1 bg-secondary rounded-xl p-1 border border-border">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                    activeTab === tab.id
                      ? "bg-accent text-white shadow-sm shadow-accent/30"
                      : "text-[#8888a0] hover:text-[var(--text-primary)] hover:bg-secondary/80"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Month/Year Picker */}
        {(activeTab === 'execution' || activeTab === 'growth') && (
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-[#8888a0]" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-[var(--text-primary)] text-sm cursor-pointer outline-none"
            >
              <option value={0}>Tổng</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>T{m}</option>
              ))}
            </select>
            <span className="text-[#8888a0] text-sm">/</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent text-[var(--text-primary)] text-sm cursor-pointer outline-none"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <DashboardV2OverviewTab />}
      {activeTab === 'growth' && <DashboardV2GrowthTab selectedMonth={selectedMonth} selectedYear={selectedYear} />}
      {activeTab === 'execution' && <DashboardV2ExecutionTab selectedMonth={selectedMonth} selectedYear={selectedYear} />}
      {activeTab === 'seo-strength' && <DashboardV2SeoStrengthTab />}
    </div>
  );
}
