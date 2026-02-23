'use client';

import { useState, useEffect } from 'react';
import { Search, HardDrive, BarChart2, Shield, Link2, FileText, Zap, Target, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import SEOCheckTab from './seo-audit-check-tab';
import CrawlImportTab from './seo-audit-crawl-import-tab';
import SEOOverviewTab from './seo-audit-overview-tab';
import SEOEEATAnalysisTab from './seo-audit-eeat-analysis-tab';
import SEOInternalLinksAnalysisTab from './seo-audit-internal-links-analysis-tab';
import SEOContentQualityAnalysisTab from './seo-audit-content-quality-analysis-tab';
import SEOTechnicalSEOAnalysisTab from './seo-audit-technical-seo-analysis-tab';
import SEOActionPlanPrioritizedTab from './seo-audit-action-plan-prioritized-tab';

type TabId = 'seo-check' | 'crawl-data' | 'overview' | 'eeat' | 'links' | 'content' | 'technical' | 'action-plan';

interface Project {
  id: string;
  name: string;
}

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'seo-check',   label: 'Kiểm tra SEO', icon: <Search className="w-4 h-4" /> },
  { id: 'crawl-data',  label: 'Dữ liệu Crawl', icon: <HardDrive className="w-4 h-4" /> },
  { id: 'overview',    label: 'Tổng quan',   icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'eeat',        label: 'E-E-A-T',     icon: <Shield className="w-4 h-4" /> },
  { id: 'links',       label: 'Liên kết',    icon: <Link2 className="w-4 h-4" /> },
  { id: 'content',     label: 'Nội dung',    icon: <FileText className="w-4 h-4" /> },
  { id: 'technical',   label: 'Kỹ thuật',    icon: <Zap className="w-4 h-4" /> },
  { id: 'action-plan', label: 'Kế hoạch',    icon: <Target className="w-4 h-4" /> },
];

// Tabs that support projectId filtering
const PROJECT_FILTER_TABS: TabId[] = ['overview', 'eeat', 'links', 'content', 'technical', 'action-plan'];

export default function SEOAuditPage() {
  const [activeTab, setActiveTab] = useState<TabId>('seo-check');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  useEffect(() => {
    fetch('/api/v1/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .catch(() => {});
  }, []);

  const showProjectFilter = PROJECT_FILTER_TABS.includes(activeTab);
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h1 className="text-xl font-bold text-[var(--text-primary)] shrink-0">SEO Audit</h1>

        {/* Tab bar — scrollable for 8 tabs */}
        <div className="flex-1 overflow-x-auto min-w-0">
          <div className="flex gap-1 bg-secondary/50 rounded-lg p-1 w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-card text-[var(--text-primary)] shadow-sm'
                    : 'text-[#8888a0] hover:text-[var(--text-primary)]'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Project selector — only for analysis tabs */}
        {showProjectFilter && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowProjectDropdown(v => !v)}
              className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm text-[var(--text-primary)] hover:border-accent/60 transition-colors"
            >
              <span className="text-[#8888a0]">Dự án:</span>
              <span>{selectedProject?.name ?? 'Tất cả'}</span>
              <ChevronDown className="w-4 h-4 text-[#8888a0]" />
            </button>
            {showProjectDropdown && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setShowProjectDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px]">
                  <button
                    onClick={() => { setSelectedProjectId(''); setShowProjectDropdown(false); }}
                    className={cn(
                      'w-full text-left px-4 py-2 text-sm transition-colors',
                      selectedProjectId === ''
                        ? 'text-accent font-medium'
                        : 'text-[var(--text-primary)] hover:bg-secondary/50'
                    )}
                  >
                    Tất cả dự án
                  </button>
                  {projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProjectId(p.id); setShowProjectDropdown(false); }}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm transition-colors',
                        selectedProjectId === p.id
                          ? 'text-accent font-medium'
                          : 'text-[var(--text-primary)] hover:bg-secondary/50'
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'seo-check'   && <SEOCheckTab />}
        {activeTab === 'crawl-data'  && <CrawlImportTab />}
        {activeTab === 'overview'    && <SEOOverviewTab    projectId={selectedProjectId || undefined} />}
        {activeTab === 'eeat'        && <SEOEEATAnalysisTab projectId={selectedProjectId || undefined} />}
        {activeTab === 'links'       && <SEOInternalLinksAnalysisTab projectId={selectedProjectId || undefined} />}
        {activeTab === 'content'     && <SEOContentQualityAnalysisTab projectId={selectedProjectId || undefined} />}
        {activeTab === 'technical'   && <SEOTechnicalSEOAnalysisTab projectId={selectedProjectId || undefined} />}
        {activeTab === 'action-plan' && <SEOActionPlanPrioritizedTab projectId={selectedProjectId || undefined} />}
      </div>
    </div>
  );
}
