'use client';

import { Zap, AlertTriangle, CheckCircle, Target } from 'lucide-react';
import { type ExpertInsight } from './keyword-insights-types-and-helpers';
import { cn } from '@/lib/utils';

interface Props {
  insights: ExpertInsight[];
}

const ICON_MAP: Record<ExpertInsight['type'], { icon: React.ElementType; color: string; bg: string }> = {
  opportunity: { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  risk: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  action: { icon: Target, color: 'text-blue-400', bg: 'bg-blue-500/10' },
};

export function ExpertPanel({ insights }: Props) {
  if (insights.length === 0) return null;

  return (
    <div className="bg-card border border-accent/20 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-[var(--text-primary)]">Đánh giá chuyên gia</p>

      {insights.map((ins, i) => {
        const cfg = ICON_MAP[ins.type];
        const Icon = cfg.icon;
        return (
          <div key={i} className={cn('flex items-start gap-3 rounded-lg p-3', cfg.bg)}>
            <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', cfg.color)} />
            <div className="min-w-0">
              <p className={cn('text-sm font-medium', cfg.color)}>{ins.title}</p>
              <p className="text-xs text-[#8888a0] mt-0.5">{ins.detail}</p>
              {ins.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ins.keywords.map((kw) => (
                    <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-[var(--text-primary)] border border-border">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
