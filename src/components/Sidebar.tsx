'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Users,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  BookOpen,
  UserCog,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[]; // Nếu không có, tất cả đều xem được
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Dự án', href: '/projects', icon: FolderKanban },
  { name: 'Tasks', href: '/tasks', icon: ListTodo },
  { name: 'SEO Audit', href: '/seo-audit', icon: Search },
  { name: 'Thành viên', href: '/members', icon: Users },
  { name: 'Tính lương', href: '/salary', icon: Wallet, roles: ['admin', 'member'] },
  { name: 'Cài đặt', href: '/settings', icon: Settings, roles: ['admin'] },
  { name: 'Quản lý users', href: '/users', icon: UserCog, roles: ['admin'] },
  { name: 'Docs', href: '/docs', icon: BookOpen },
];

// Role badge colors
const roleBadgeColors: Record<UserRole, string> = {
  admin: 'bg-danger/20 text-danger',
  seo: 'bg-accent/20 text-accent',
  member: 'bg-success/20 text-success',
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  seo: 'SEO',
  member: 'Member',
};

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-border">
        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-lg">CT</span>
        </div>
        <div>
          <h1 className="font-semibold text-white">Content Tracker</h1>
          <p className="text-xs text-[#8888a0]">Team Management</p>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent/20 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.display_name}
              </p>
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                roleBadgeColors[user.role]
              )}>
                {roleLabels[user.role]}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'nav-link',
                isActive && 'active'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="nav-link w-full text-danger hover:text-danger hover:bg-danger/10"
        >
          <LogOut className="w-5 h-5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg border border-border"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-secondary border-r border-border">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-secondary border-r border-border transform transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
