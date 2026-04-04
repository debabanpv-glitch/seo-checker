'use client';

// Re-export the main Growth tab container so page.tsx can import DashboardV2GrowthTab
import DashboardV2GrowthTabContainerWithProjectFilter from './dashboard-v2-growth-tab-container-with-project-filter';

export default function DashboardV2GrowthTab({ selectedMonth, selectedYear }: { selectedMonth?: number; selectedYear?: number }) {
  return <DashboardV2GrowthTabContainerWithProjectFilter selectedMonth={selectedMonth} selectedYear={selectedYear} />;
}
