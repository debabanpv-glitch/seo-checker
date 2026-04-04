'use client';

import { useState } from 'react';
import {
  ListChecks,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TasksByCategory {
  total: number;
  done: number;
}

interface TaskSummaryProps {
  tasks: {
    total: number;
    done: number;
    inProgress: number;
    overdue: number;
    byCategory: Record<string, TasksByCategory>;
  };
}

// ─── Summary Card ────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  gradientFrom: string;
  iconColor: string;
  valueColor: string;
}

function SummaryCard({ label, value, icon: Icon, gradientFrom, iconColor, valueColor }: SummaryCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} to-transparent pointer-events-none`} />
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#8888a0] text-xs font-medium">{label}</span>
        <div className={`p-1.5 rounded-lg ${iconColor}/10`}>
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value.toLocaleString()}</p>
    </div>
  );
}

// ─── Category Row ─────────────────────────────────────────────────────────────

function CategoryRow({ name, total, done }: { name: string; total: number; done: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const barColor = pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-xs text-[var(--text-primary)] w-40 truncate flex-shrink-0">{name}</span>
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-[#8888a0] whitespace-nowrap w-16 text-right">
        {done}/{total} ({pct}%)
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardV2ExecutionTaskSummary({ tasks }: TaskSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  const categories = Object.entries(tasks.byCategory).sort((a, b) => b[1].total - a[1].total);

  return (
    <div>
      {/* 4 summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <SummaryCard
          label="Tổng nhiệm vụ"
          value={tasks.total}
          icon={ListChecks}
          gradientFrom="from-blue-500/5"
          iconColor="text-blue-400"
          valueColor="text-[var(--text-primary)]"
        />
        <SummaryCard
          label="Hoàn thành"
          value={tasks.done}
          icon={CheckCircle2}
          gradientFrom="from-green-500/5"
          iconColor="text-green-400"
          valueColor="text-green-400"
        />
        <SummaryCard
          label="Đang làm"
          value={tasks.inProgress}
          icon={Clock}
          gradientFrom="from-yellow-500/5"
          iconColor="text-yellow-400"
          valueColor="text-yellow-400"
        />
        <SummaryCard
          label="Trễ hạn"
          value={tasks.overdue}
          icon={AlertTriangle}
          gradientFrom="from-red-500/5"
          iconColor="text-red-400"
          valueColor="text-red-400"
        />
      </div>

      {/* Category breakdown */}
      {categories.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-[var(--text-primary)] hover:bg-secondary/50 transition-colors"
          >
            <span>Phân loại theo danh mục ({categories.length})</span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-[#8888a0]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[#8888a0]" />
            )}
          </button>

          {expanded && (
            <div className="px-4 pb-3 divide-y divide-border">
              {categories.map(([name, { total, done }]) => (
                <CategoryRow key={name} name={name} total={total} done={done} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
