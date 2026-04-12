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
  Menu,
  X,
  Search,
  TrendingUp,
  Target,
  Bot,
  StickyNote,
  Upload,
  Globe,
  FileText,
  ShieldCheck,
  Lightbulb,
  Link2,
  Star,
  Eye,
  ChevronDown,
  Network,
  FileBarChart,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { modules, type ModuleConfig } from '@/modules/registry';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Users,
  Wallet,
  Search,
  TrendingUp,
  Target,
  Bot,
  StickyNote,
  Settings,
  Upload,
  Globe,
  FileText,
  ShieldCheck,
  Lightbulb,
  Link2,
  Star,
  Eye,
  Network,
  FileBarChart,
};

const enabledModules = modules.filter((m) => m.enabled).sort((a, b) => a.order - b.order);

const coreModules = enabledModules.filter((m) => m.group === 'core');
const extensionModules = enabledModules.filter((m) => m.group === 'extension');
const settingsModules = enabledModules.filter((m) => m.group === 'settings');

function NavItem({ item, onClick }: { item: ModuleConfig; onClick: () => void }) {
  const pathname = usePathname();
  const fullUrl = typeof window !== 'undefined' ? pathname + window.location.search : pathname;
  const isActive = pathname === item.path;
  const hasChildren = item.children && item.children.length > 0;
  const isChildActive = hasChildren && item.children!.some(c => fullUrl === c.path || pathname === c.path.split('?')[0]);
  const [expanded, setExpanded] = useState(isActive || isChildActive);
  const Icon = iconMap[item.icon];

  if (hasChildren) {
    return (
      <div>
        <div className={cn('nav-link w-full justify-between', (isActive || isChildActive) && 'active')}>
          <Link
            href={item.path}
            onClick={onClick}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            {Icon && <Icon className="w-5 h-5" />}
            <span>{item.name}</span>
          </Link>
          <button onClick={() => setExpanded(!expanded)} className="p-0.5 -mr-1 rounded hover:bg-[var(--bg-accent)]">
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
          </button>
        </div>
        {expanded && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
            {item.children!.map(child => {
              const ChildIcon = iconMap[child.icon];
              const childActive = fullUrl === child.path || (pathname === child.path.split('?')[0] && child.path.includes('?') && fullUrl.includes(child.path.split('?')[1]));
              return (
                <Link
                  key={child.id}
                  href={child.path}
                  onClick={onClick}
                  className={cn('nav-link text-sm py-1.5', childActive && 'active')}
                >
                  {ChildIcon && <ChildIcon className="w-4 h-4" />}
                  <span>{child.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.path}
      onClick={onClick}
      className={cn('nav-link', isActive && 'active')}
    >
      {Icon && <Icon className="w-5 h-5" />}
      <span>{item.name}</span>
    </Link>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-border">
        <div className="w-10 h-10 bg-gradient-to-br from-accent-light to-accent rounded-xl flex items-center justify-center shadow-gold">
          <span className="text-[var(--text-primary)] font-bold text-lg">CT</span>
        </div>
        <div>
          <h1 className="font-semibold text-[var(--text-primary)]">Content Tracker</h1>
          <p className="text-xs text-[var(--text-secondary)]">Team Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {/* Core */}
        <div className="space-y-1">
          {coreModules.map((item) => (
            <NavItem key={item.id} item={item} onClick={closeMobile} />
          ))}
        </div>

        {/* Extensions */}
        {extensionModules.length > 0 && (
          <>
            <div className="my-3 border-t border-border" />
            <div className="space-y-1">
              {extensionModules.map((item) => (
                <NavItem key={item.id} item={item} onClick={closeMobile} />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Settings — pinned to bottom */}
      {settingsModules.length > 0 && (
        <div className="mt-auto px-3 py-4 border-t border-border space-y-1">
          {settingsModules.map((item) => (
            <NavItem key={item.id} item={item} onClick={closeMobile} />
          ))}
        </div>
      )}
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
