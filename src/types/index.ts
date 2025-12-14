// Database Types
export interface Project {
  id: string;
  name: string;
  sheet_id: string;
  sheet_name: string;
  monthly_target: number;
  ranking_sheet_url?: string;
  crawl_sheet_url?: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  stt: number;
  year: number;
  month: number;
  parent_keyword: string;
  keyword_sub: string;
  keyword_count: number;
  keywords_list: string[];
  search_volume: number;
  title: string;
  outline: string;
  timeline_outline: string;
  status_outline: string;
  pic: string;
  content_file: string;
  deadline: string;
  status_content: string;
  link_publish: string;
  publish_date: string;
  note: string;
  month_year: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  project?: Project;
}

export interface MonthlyTarget {
  id: string;
  project_id: string;
  month: number;
  year: number;
  target: number;
}

// Status constants
export const OUTLINE_STATUSES = [
  '1. Doing Outline',
  '1.1 Fixing Outline',
  '1.2 Đã fix',
  '2. QC Outline',
  '3. Done QC Outline',
] as const;

export const CONTENT_STATUSES = [
  '1. Doing',
  '1.1 Fixing',
  '1.2 Đã fix',
  '2. QC Content',
  '3. Done QC',
  '4. Publish',
] as const;

export type OutlineStatus = typeof OUTLINE_STATUSES[number];
export type ContentStatus = typeof CONTENT_STATUSES[number];

// Stats types
export interface Stats {
  total: number;
  published: number;
  inProgress: number;
  overdue: number;
}

export interface ProjectStats extends Project {
  actual: number;
  target: number;
}

export interface BottleneckTask {
  id: string;
  title: string;
  pic: string;
  project: string;
  link?: string;
  deadline?: string;
}

export interface BottleneckData {
  content: {
    doingOutline: number;
    fixingOutline: number;
    doingContent: number;
    fixingContent: number;
  };
  seo: {
    qcOutline: number;
    qcContent: number;
    waitPublish: number;
  };
  tasks?: {
    qcContent: BottleneckTask[];
    qcOutline: BottleneckTask[];
    waitPublish: BottleneckTask[];
    doingContent: BottleneckTask[];
    fixingOutline: BottleneckTask[];
    fixingContent: BottleneckTask[];
    doingOutline: BottleneckTask[];
  };
  biggest: string;
}

export interface MemberStats {
  name: string;
  totalThisMonth: number;
  published: number;
  inProgress: number;
  onTimeRate: number;
}

export interface SalaryData {
  name: string;
  publishedCount: number;
  baseSalary: number;
  kpiBonus: number;
  extraCount: number;
  extraAmount: number;
  total: number;
  note: string;
}

// Filter types
export interface TaskFilter {
  project?: string;
  pic?: string;
  status?: string;
  month?: number;
  year?: number;
  search?: string;
}
