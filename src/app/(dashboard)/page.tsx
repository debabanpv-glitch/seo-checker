'use client';

import { useState } from 'react';
import { FileText, Globe, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import DashboardContentManagementTab from './dashboard-content-management-tab';
import DashboardSEOOverviewTab from './dashboard-seo-overview-tab';

type DashboardTab = 'content' | 'seo';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('content');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with Tab Switcher + Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
            <p className="text-[#8888a0] text-xs md:text-sm">
              {activeTab === 'content'
                ? `Tổng quan tiến độ công việc - T${selectedMonth}/${selectedYear}`
                : 'Tổng quan SEO các dự án'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('content')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === 'content'
                  ? "bg-card text-[var(--text-primary)] shadow-sm"
                  : "text-[#8888a0] hover:text-[var(--text-primary)]"
              )}
            >
              <FileText className="w-4 h-4" />
              Content
            </button>
            <button
              onClick={() => setActiveTab('seo')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === 'seo'
                  ? "bg-card text-[var(--text-primary)] shadow-sm"
                  : "text-[#8888a0] hover:text-[var(--text-primary)]"
              )}
            >
              <Globe className="w-4 h-4" />
              SEO
            </button>
          </div>
        </div>

        {/* Month/Year Picker - only for Content tab */}
        {activeTab === 'content' && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#8888a0]" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-card border border-border rounded-lg text-[var(--text-primary)] text-sm cursor-pointer"
            >
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>{year}</option>
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
