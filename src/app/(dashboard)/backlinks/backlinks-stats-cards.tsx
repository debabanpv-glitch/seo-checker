'use client';

import { Link2, Globe, Hash, ShieldCheck, ShieldOff, AlertTriangle } from 'lucide-react';
import type { BacklinkStats } from './backlinks-types-and-helpers';

interface Props {
  stats: BacklinkStats;
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#8888a0] uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}

export function BacklinksStatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard label="Liên kết" value={stats.totalBacklinks} icon={<Link2 className="w-4 h-4 text-accent" />} color="text-accent" />
      <StatCard label="Tên miền" value={stats.uniqueDomains} icon={<Globe className="w-4 h-4 text-sky-400" />} color="text-sky-400" />
      <StatCard label="Từ khóa" value={stats.uniqueKeywords} icon={<Hash className="w-4 h-4 text-purple-400" />} color="text-purple-400" />
      <StatCard label="DoFollow" value={stats.dofollowCount} icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />} color="text-emerald-400" />
      <StatCard label="NoFollow" value={stats.nofollowCount} icon={<ShieldOff className="w-4 h-4 text-orange-400" />} color="text-orange-400" />
      <StatCard label="Sắp hết hạn" value={stats.expiringSoon} icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />} color="text-yellow-400" />
    </div>
  );
}
