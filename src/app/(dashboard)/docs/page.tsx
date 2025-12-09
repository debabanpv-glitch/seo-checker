'use client';

import { BookOpen, Database, Globe, Calculator, Search, Clock, Users, FolderKanban, Settings, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Documentation</h1>
        <p className="text-[#8888a0] mt-1">Tài liệu hướng dẫn và changelog của hệ thống</p>
      </div>

      {/* System Overview */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-accent" />
          Tổng quan hệ thống
        </h2>
        <div className="prose prose-invert text-[#8888a0] space-y-3">
          <p>
            <strong className="text-white">Content Tracker</strong> là hệ thống quản lý công việc Team Content SEO,
            đồng bộ dữ liệu từ Notion và lưu trữ trên Supabase.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mt-4">
            <div className="bg-secondary p-4 rounded-xl">
              <Database className="w-6 h-6 text-accent mb-2" />
              <p className="text-white font-medium">Supabase</p>
              <p className="text-xs">PostgreSQL database</p>
            </div>
            <div className="bg-secondary p-4 rounded-xl">
              <Globe className="w-6 h-6 text-accent mb-2" />
              <p className="text-white font-medium">Vercel</p>
              <p className="text-xs">Next.js hosting</p>
            </div>
            <div className="bg-secondary p-4 rounded-xl">
              <BookOpen className="w-6 h-6 text-accent mb-2" />
              <p className="text-white font-medium">Notion</p>
              <p className="text-xs">Data source</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Tính năng đã hoàn thành
        </h2>
        <div className="space-y-4">
          <FeatureItem
            icon={<FolderKanban className="w-5 h-5" />}
            title="Quản lý Dự án"
            description="Xem danh sách dự án, tiến độ, số bài theo trạng thái. Báo cáo chi tiết theo tuần với so sánh MoM."
            status="done"
          />
          <FeatureItem
            icon={<Users className="w-5 h-5" />}
            title="Quản lý Thành viên"
            description="Danh sách thành viên, số task đang làm, đã hoàn thành."
            status="done"
          />
          <FeatureItem
            icon={<Calculator className="w-5 h-5" />}
            title="Tính lương"
            description="Tính lương theo KPI (20 bài/tháng). Filter theo dự án, xem chi tiết từng bài, export CSV."
            status="done"
          />
          <FeatureItem
            icon={<Search className="w-5 h-5" />}
            title="SEO Audit"
            description="Kiểm tra SEO on-page cho các bài đã publish. 20 tiêu chí: title, meta, keyword, headings, images, links..."
            status="done"
          />
          <FeatureItem
            icon={<Clock className="w-5 h-5" />}
            title="Sync dữ liệu"
            description="Đồng bộ từ Notion. Gọi thủ công qua /api/sync (Cron job bị giới hạn do Vercel Hobby plan)."
            status="done"
          />
          <FeatureItem
            icon={<Settings className="w-5 h-5" />}
            title="Cài đặt KPI"
            description="Tùy chỉnh mục tiêu KPI cho từng dự án."
            status="done"
          />
        </div>
      </section>

      {/* API Reference */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-accent" />
          API Reference
        </h2>
        <div className="space-y-3 font-mono text-sm">
          <APIItem method="GET" path="/api/projects" description="Danh sách dự án" />
          <APIItem method="GET" path="/api/projects/report?project=ID&month=12&year=2025" description="Báo cáo dự án" />
          <APIItem method="GET" path="/api/tasks?project=ID&month=12&year=2025" description="Danh sách tasks" />
          <APIItem method="GET" path="/api/salary?month=12&year=2025&project=ID" description="Tính lương" />
          <APIItem method="GET" path="/api/members" description="Danh sách thành viên" />
          <APIItem method="GET" path="/api/stats?month=12&year=2025" description="Thống kê tổng quan" />
          <APIItem method="POST" path="/api/seo-check" description="Kiểm tra SEO (body: url, keyword, subKeyword)" />
          <APIItem method="GET" path="/api/sync" description="Đồng bộ từ Notion" />
        </div>
      </section>

      {/* Changelog */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-accent" />
          Changelog
        </h2>
        <div className="space-y-6">
          <ChangelogItem
            date="09/12/2025"
            version="1.3.0"
            changes={[
              { type: 'feat', text: 'Thêm trang SEO Audit - kiểm tra on-page SEO' },
              { type: 'feat', text: 'SEO checklist 20 tiêu chí (content, images, technical)' },
              { type: 'feat', text: 'Tính lương: filter theo dự án, expandable rows xem chi tiết bài' },
              { type: 'feat', text: 'Tính lương: export CSV với đầy đủ chi tiết' },
              { type: 'feat', text: 'Thêm trang Documentation' },
              { type: 'fix', text: 'Xóa cron job do giới hạn Vercel Hobby' },
            ]}
          />
          <ChangelogItem
            date="08/12/2025"
            version="1.2.0"
            changes={[
              { type: 'feat', text: 'Báo cáo dự án theo tuần với so sánh MoM' },
              { type: 'feat', text: 'Redesign trang Projects thành analytics view' },
              { type: 'fix', text: 'Fix workflow status matching' },
            ]}
          />
          <ChangelogItem
            date="07/12/2025"
            version="1.1.0"
            changes={[
              { type: 'feat', text: 'Dashboard với thống kê tổng quan' },
              { type: 'feat', text: 'Trang Tasks với filter và search' },
              { type: 'feat', text: 'Trang Members' },
              { type: 'feat', text: 'Trang Settings - cấu hình KPI' },
            ]}
          />
          <ChangelogItem
            date="06/12/2025"
            version="1.0.0"
            changes={[
              { type: 'feat', text: 'Initial release' },
              { type: 'feat', text: 'Sync từ Notion sang Supabase' },
              { type: 'feat', text: 'Authentication với password' },
            ]}
          />
        </div>
      </section>

      {/* Tech Stack */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-accent" />
          Tech Stack
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-white font-medium mb-2">Frontend</p>
            <ul className="text-[#8888a0] space-y-1">
              <li>• Next.js 14 (App Router)</li>
              <li>• TypeScript</li>
              <li>• Tailwind CSS</li>
              <li>• Lucide Icons</li>
            </ul>
          </div>
          <div>
            <p className="text-white font-medium mb-2">Backend</p>
            <ul className="text-[#8888a0] space-y-1">
              <li>• Next.js API Routes</li>
              <li>• Supabase (PostgreSQL)</li>
              <li>• Notion API</li>
              <li>• Vercel Hosting</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Environment Variables */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-accent" />
          Environment Variables
        </h2>
        <div className="font-mono text-sm space-y-2">
          <div className="bg-secondary p-3 rounded-lg">
            <span className="text-accent">APP_PASSWORD</span>
            <span className="text-[#8888a0]"> - Mật khẩu đăng nhập</span>
          </div>
          <div className="bg-secondary p-3 rounded-lg">
            <span className="text-accent">NEXT_PUBLIC_SUPABASE_URL</span>
            <span className="text-[#8888a0]"> - Supabase project URL</span>
          </div>
          <div className="bg-secondary p-3 rounded-lg">
            <span className="text-accent">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
            <span className="text-[#8888a0]"> - Supabase anon key</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureItem({ icon, title, description, status }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: 'done' | 'progress' | 'planned';
}) {
  const statusColors = {
    done: 'text-green-500',
    progress: 'text-yellow-500',
    planned: 'text-[#8888a0]',
  };
  const statusIcons = {
    done: <CheckCircle className="w-4 h-4" />,
    progress: <AlertTriangle className="w-4 h-4" />,
    planned: <XCircle className="w-4 h-4" />,
  };

  return (
    <div className="flex gap-4 p-4 bg-secondary rounded-xl">
      <div className="text-accent">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-white font-medium">{title}</p>
          <span className={statusColors[status]}>{statusIcons[status]}</span>
        </div>
        <p className="text-[#8888a0] text-sm mt-1">{description}</p>
      </div>
    </div>
  );
}

function APIItem({ method, path, description }: { method: string; path: string; description: string }) {
  const methodColors: Record<string, string> = {
    GET: 'bg-green-500/20 text-green-400',
    POST: 'bg-blue-500/20 text-blue-400',
    PUT: 'bg-yellow-500/20 text-yellow-400',
    DELETE: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
      <span className={`px-2 py-0.5 rounded text-xs font-bold ${methodColors[method]}`}>{method}</span>
      <span className="text-white flex-1">{path}</span>
      <span className="text-[#8888a0] text-xs">{description}</span>
    </div>
  );
}

function ChangelogItem({ date, version, changes }: {
  date: string;
  version: string;
  changes: Array<{ type: 'feat' | 'fix' | 'breaking'; text: string }>;
}) {
  const typeColors = {
    feat: 'bg-green-500/20 text-green-400',
    fix: 'bg-yellow-500/20 text-yellow-400',
    breaking: 'bg-red-500/20 text-red-400',
  };
  const typeLabels = {
    feat: 'NEW',
    fix: 'FIX',
    breaking: 'BREAKING',
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-white font-bold">v{version}</span>
        <span className="text-[#8888a0] text-sm">{date}</span>
      </div>
      <div className="space-y-2 pl-4 border-l-2 border-border">
        {changes.map((change, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${typeColors[change.type]}`}>
              {typeLabels[change.type]}
            </span>
            <span className="text-[#8888a0] text-sm">{change.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
