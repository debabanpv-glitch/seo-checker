'use client';

import { useState } from 'react';
import { Search, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import SEOCheckTab from './seo-audit-check-tab';
import CrawlImportTab from './seo-audit-crawl-import-tab';

type TabId = 'seo-check' | 'crawl-data';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'seo-check', label: 'SEO Check', icon: <Search className="w-4 h-4" /> },
  { id: 'crawl-data', label: 'Crawl Data', icon: <HardDrive className="w-4 h-4" /> },
];

export default function SEOAuditPage() {
  const [activeTab, setActiveTab] = useState<TabId>('seo-check');

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* Header + Tabs */}
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">SEO Audit</h1>
        <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-card text-[var(--text-primary)] shadow-sm"
                  : "text-[#8888a0] hover:text-[var(--text-primary)]"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'seo-check' && <SEOCheckTab />}
      {activeTab === 'crawl-data' && <CrawlImportTab />}
    </div>
  );
}
