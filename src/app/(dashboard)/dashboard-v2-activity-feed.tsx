'use client';

import { Clock, Database, FileText, Globe, Shield, Wrench, User } from 'lucide-react';

interface ActivityItem {
  source: string;
  action: string;
  description: string;
  project_id?: string;
  created_at: string;
}

interface Props {
  activities: ActivityItem[];
}

const SOURCE_CONFIG: Record<string, { icon: typeof Database; color: string; label: string }> = {
  notion: { icon: Database, color: '#8B5CF6', label: 'Notion' },
  sheet: { icon: FileText, color: '#22C55E', label: 'Sheet' },
  gsc: { icon: Globe, color: '#3B82F6', label: 'GSC' },
  wp: { icon: Globe, color: '#F97316', label: 'WP' },
  audit: { icon: Shield, color: '#EF4444', label: 'Audit' },
  manual: { icon: User, color: '#6B7280', label: 'Thủ công' },
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 172800) return 'hôm qua';
  return `${Math.floor(diff / 86400)} ngày trước`;
}

export default function DashboardV2ActivityFeed({ activities }: Props) {
  if (!activities.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Hoạt động gần đây</h3>
        <p className="text-[#8888a0] text-sm">Chưa có hoạt động nào</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Hoạt động gần đây</h3>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {activities.map((a, i) => {
          const cfg = SOURCE_CONFIG[a.source] || SOURCE_CONFIG.manual;
          const Icon = cfg.icon;
          return (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${cfg.color}20` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] truncate">{a.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-[#8888a0] text-[10px] flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {relativeTime(a.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
