export interface ModuleConfig {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  path: string;
  order: number;
  group: 'core' | 'extension' | 'settings';
  enabled: boolean;
}

export const modules: ModuleConfig[] = [
  // CORE
  { id: 'dashboard', name: 'Dashboard',   icon: 'LayoutDashboard', path: '/',                order: 0,  group: 'core',      enabled: true },
  { id: 'projects',  name: 'Dự án',       icon: 'FolderKanban',    path: '/projects',        order: 1,  group: 'core',      enabled: true },
  { id: 'tasks',     name: 'Tasks',        icon: 'ListTodo',        path: '/tasks',           order: 2,  group: 'core',      enabled: true },
  { id: 'members',   name: 'Thành viên',  icon: 'Users',           path: '/members',         order: 3,  group: 'core',      enabled: true },
  { id: 'salary',    name: 'Tính lương',  icon: 'Wallet',          path: '/salary',          order: 4,  group: 'core',      enabled: true },
  { id: 'seo-audit', name: 'SEO Audit',   icon: 'Search',          path: '/seo-audit',       order: 5,  group: 'core',      enabled: true },
  { id: 'keywords',  name: 'Keywords',    icon: 'TrendingUp',      path: '/keyword-ranking', order: 6,  group: 'core',      enabled: true },
  // EXTENSIONS
  { id: 'strategy',      name: 'Chiến lược',     icon: 'Target',          path: '/strategy',        order: 10, group: 'extension', enabled: true },
  { id: 'claude-log',   name: 'Claude Log',     icon: 'Bot',             path: '/claude-log',      order: 11, group: 'extension', enabled: true },
  { id: 'notes',        name: 'Notes',          icon: 'StickyNote',      path: '/notes',           order: 12, group: 'extension', enabled: true },
  { id: 'gsc',          name: 'Search Console', icon: 'Globe',           path: '/gsc',             order: 14, group: 'extension', enabled: true },
  { id: 'reports',      name: 'Báo cáo',        icon: 'FileText',        path: '/reports',         order: 15, group: 'extension', enabled: true },
  // SETTINGS
  { id: 'settings',  name: 'Cài đặt',    icon: 'Settings',        path: '/settings',        order: 90, group: 'settings',  enabled: true },
];
