// User roles
export type UserRole = 'admin' | 'seo' | 'member';

// User interface
export interface User {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  pic_name: string | null;
  project_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

// Session interface
export interface Session {
  id: string;
  user_id: string;
  token: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  created_at: string;
}

// Activity log interface
export interface ActivityLog {
  id: number;
  user_id: string | null;
  username: string;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Auth context
export interface AuthUser {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  pic_name: string | null;
  project_ids: string[];
}

// Permission checks
export const PERMISSIONS = {
  admin: {
    viewSettings: true,
    viewSalary: true,
    viewAllProjects: true,
    viewAllTasks: true,
    checkSeoAll: true,
    manageUsers: true,
    sync: true,
  },
  seo: {
    viewSettings: false,
    viewSalary: false,
    viewAllProjects: true,
    viewAllTasks: true,
    checkSeoAll: true,
    manageUsers: false,
    sync: false,
  },
  member: {
    viewSettings: false,
    viewSalary: true, // Chỉ lương của mình
    viewAllProjects: false, // Chỉ dự án của mình
    viewAllTasks: false, // Chỉ tasks của mình
    checkSeoAll: false, // Chỉ check SEO bài của mình
    manageUsers: false,
    sync: false,
  },
} as const;

export type Permission = keyof typeof PERMISSIONS.admin;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS[role][permission];
}
