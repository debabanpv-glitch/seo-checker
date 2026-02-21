'use client';

import { useState } from 'react';
import { FileText, Globe, Calendar, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import DashboardContentManagementTab from './dashboard-content-management-tab';
import DashboardSEOOverviewTab from './dashboard-seo-overview-tab';

type DashboardTab = 'content' | 'seo';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = [2024, 2025, 2026];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('content');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  return (
    <div className="space-y-5">
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
              <p className="text-[#8888a0] text-xs">
                {activeTab === 'content'
                  ? `Tiến độ T${selectedMonth}/${selectedYear}`
                  : 'Tổng quan SEO'}
              </p>
            </div>
          </div>

          {/* Tab Pills */}
          <div className="flex gap-1 bg-secondary rounded-xl p-1 border border-border">
            <button
              onClick={() => setActiveTab('content')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === 'content'
                  ? "bg-accent text-white shadow-sm shadow-accent/30"
                  : "text-[#8888a0] hover:text-[var(--text-primary)] hover:bg-secondary/80"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              Content
            </button>
            <button
              onClick={() => setActiveTab('seo')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === 'seo'
                  ? "bg-accent text-white shadow-sm shadow-accent/30"
                  : "text-[#8888a0] hover:text-[var(--text-primary)] hover:bg-secondary/80"
              )}
            >
              <Globe className="w-3.5 h-3.5" />
              SEO
            </button>
          </div>
        </div>

        {/* Right: Month/Year Picker */}
        {activeTab === 'content' && (
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-[#8888a0]" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-[var(--text-primary)] text-sm cursor-pointer outline-none"
            >
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
      {activeTab === 'content' && (
        <DashboardContentManagementTab selectedMonth={selectedMonth} selectedYear={selectedYear} />
      )}
      {activeTab === 'seo' && (
        <DashboardSEOOverviewTab />
      )}
    </div>
  );
}
