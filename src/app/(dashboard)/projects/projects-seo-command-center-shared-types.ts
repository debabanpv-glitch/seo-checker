// ---------------------------------------------------------------------------
// Projects Command Center — Shared Types
// ---------------------------------------------------------------------------

export interface ProjectWithStats {
  id: string;
  name: string;
  sheet_id: string;
  slug?: string | null;
  domain?: string | null;
  target: number;
  actual: number;       // published count (from getProjectsWithStats)
  inProgress: number;
  doneQC: number;
  overdue: number;
  thisMonthTotal: number;
}

export interface ProjectSummaryFromUnified {
  id: string;
  name: string;
  clicks: number;
  kwTop10: number;
  kwTrackedTotal: number;
  kwTrackedTop10: number;
  kwFollowTotal: number;
  kwFollowTop10: number;
  contentPublished: number;
  auditScore: number;
  progressPercent: number;
  tasksDone: number;
  tasksTotal: number;
  backlinksAlive: number;
  backlinksTotal: number;
  strategyRate: number;
}

export interface ProjectGoalTargets {
  weekly_clicks: number;
  top10_keywords: number;
  strategy_completion: number;
  seo_score: number;
}

export interface ProjectGoal {
  start_date: string;
  deadline: string;
  targets: ProjectGoalTargets;
}

export interface HealthAssessment {
  id: string;
  name: string;
  slug: string | null;
  domain: string | null;
  overallScore: number;
  overallLabel: string;
  categoryScores: {
    technical: number | null;
    content: number | null;
    images: number | null;
    links: number | null;
    eeat: number | null;
    aiReadiness: number | null;
    traffic: number | null;
    keywords: number | null;
    strategy: number | null;
  };
  warnings: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    title: string;
    detail: string;
  }>;
  trends: {
    traffic: 'up' | 'down' | 'stable' | 'no_data';
    keywords: 'up' | 'down' | 'stable' | 'no_data';
    seoScore: 'up' | 'down' | 'stable' | 'no_data';
  };
  trafficData: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    prevClicks: number | null;
    prevImpressions: number | null;
  } | null;
  keywordData: {
    total: number;
    top3: number;
    top10: number;
    top3Change: number;
    top10Change: number;
  } | null;
  progressReport: {
    startDate: string;
    deadline: string;
    daysElapsed: number;
    daysRemaining: number;
    timelineProgress: number;
    kpiProgress: Array<{ label: string; current: number; target: number; percent: number }>;
    overallKpiPercent: number;
    onTrack: boolean;
    forecast: string;
  } | null;
}

export interface KeywordInsightsSummary {
  total: number;
  improved: number;
  declined: number;
  trackedTotal: number;
  trackedInTop10: number;
}

export interface KeywordTiersSummary {
  top3: number;
  top10: number;
  top30: number;
  beyond30: number;
}

export interface KeywordMoversSummary {
  surging: number;
  dropping: number;
  boundary: number;
}

export interface ProjectKeywordData {
  projectId: string;
  summary: KeywordInsightsSummary;
  tiers: KeywordTiersSummary;
  movers: KeywordMoversSummary;
}

// Merged project data for cards
export interface MergedProjectData {
  project: ProjectWithStats;
  unified: ProjectSummaryFromUnified | null;
  health: HealthAssessment | null;
  goal: ProjectGoal | null;
  kwData: ProjectKeywordData | null;
}
