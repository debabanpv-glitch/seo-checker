export interface ModuleConfig {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  path: string;
  order: number;
  group: 'core' | 'extension' | 'settings';
  enabled: boolean;
  children?: { id: string; name: string; icon: string; path: string }[];
}

export const modules: ModuleConfig[] = [
  // CORE
  { id: 'dashboard', name: 'Dashboard',   icon: 'LayoutDashboard', path: '/',                order: 0,  group: 'core',      enabled: true },
  { id: 'projects',  name: 'Dự án',       icon: 'FolderKanban',    path: '/projects',        order: 1,  group: 'core',      enabled: true },
  { id: 'seo-audit', name: 'Kiểm tra SEO', icon: 'Search',          path: '/seo-audit',       order: 2,  group: 'core',      enabled: true },
  { id: 'keywords',  name: 'Từ khóa',    icon: 'TrendingUp',      path: '/keyword-ranking', order: 3,  group: 'core',      enabled: true, children: [
    { id: 'kw-committed', name: 'Cam kết', icon: 'Star', path: '/keyword-ranking?type=committed' },
    { id: 'kw-follow', name: 'Tự follow', icon: 'Eye', path: '/keyword-ranking?type=follow' },
  ]},
  { id: 'backlinks', name: 'Liên kết ngoài', icon: 'Link2', path: '/backlinks', order: 4, group: 'core', enabled: true },
  { id: 'topical-map', name: 'Topical Map', icon: 'Network', path: '/topical-map', order: 5, group: 'core', enabled: true },
  { id: 'gsc',          name: 'Search Console', icon: 'Globe',           path: '/gsc',             order: 6, group: 'core', enabled: true },
  { id: 'seo-report', name: 'Báo cáo SEO', icon: 'FileBarChart', path: '/seo-report', order: 7, group: 'core', enabled: true },
  { id: 'salary',    name: 'Tính lương',  icon: 'Wallet',          path: '/salary',          order: 8,  group: 'core',      enabled: true },
  { id: 'fix-alt-text', name: 'Fix Alt Text', icon: 'ImageOff',    path: '/fix-alt-text',    order: 9,  group: 'core',      enabled: true },
  // HIDDEN — pages still accessible via URL, just hidden from sidebar
  { id: 'tasks',     name: 'Công việc',    icon: 'ListTodo',        path: '/tasks',           order: 6,  group: 'core', enabled: true },
  { id: 'members',   name: 'Thành viên',  icon: 'Users',           path: '/members',         order: 21,  group: 'extension', enabled: false },
  { id: 'health-check', name: 'Sức khỏe', icon: 'ShieldCheck', path: '/health-check', order: 22, group: 'extension', enabled: false },
  { id: 'keyword-insights', name: 'Phân tích KW', icon: 'Lightbulb', path: '/keyword-insights', order: 23, group: 'extension', enabled: false },
  { id: 'strategy',      name: 'Chiến lược',     icon: 'Target',          path: '/strategy',        order: 24, group: 'extension', enabled: false },
  { id: 'claude-log',   name: 'Nhật ký Claude', icon: 'Bot',             path: '/claude-log',      order: 25, group: 'extension', enabled: false },
  { id: 'notes',        name: 'Ghi chú',       icon: 'StickyNote',      path: '/notes',           order: 26, group: 'extension', enabled: false },
  { id: 'reports',      name: 'Báo cáo',        icon: 'FileText',        path: '/reports',         order: 27, group: 'extension', enabled: false },
  // SETTINGS
  { id: 'settings',  name: 'Cài đặt',    icon: 'Settings',        path: '/settings',        order: 90, group: 'settings',  enabled: true },
];
