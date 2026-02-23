'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { DomainSummary } from './backlinks-types-and-helpers';

const COLORS = ['#6366f1', '#38bdf8', '#a78bfa', '#34d399', '#f59e0b', '#f87171', '#fb923c', '#e879f9', '#22d3ee', '#94a3b8'];

interface Props {
  domains: DomainSummary[];
}

export function BacklinksDomainDistributionChart({ domains }: Props) {
  const data = domains.slice(0, 15);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Phân bố Domains</h3>
      <p className="text-xs text-[#8888a0] mb-3">Top {data.length} source domains theo số lượng backlinks</p>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 28)}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fill: '#8888a0', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="domain" width={160}
              tick={{ fill: '#c8c8e0', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a40', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#e0e0f0' }}
              itemStyle={{ color: '#8888a0' }}
              formatter={(v: number) => [`${v} backlinks`, 'Số lượng']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-32 flex items-center justify-center text-[#8888a0] text-sm">Chưa có dữ liệu</div>
      )}
    </div>
  );
}
