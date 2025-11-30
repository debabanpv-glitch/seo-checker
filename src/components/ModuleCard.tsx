'use client';

import { useState } from 'react';
import { ChevronDown, Check, AlertTriangle, X } from 'lucide-react';
import { Module, Check as CheckType } from '@/types';

interface ModuleCardProps {
  module: Module;
  defaultExpanded?: boolean;
}

export default function ModuleCard({ module, defaultExpanded = false }: ModuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const percentage = Math.round((module.score / module.maxScore) * 100);

  const getScoreStyle = () => {
    if (percentage >= 80) return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' };
    if (percentage >= 60) return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' };
    return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' };
  };

  const getStatusIcon = (status: CheckType['status']) => {
    switch (status) {
      case 'pass':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'fail':
        return <X className="w-4 h-4 text-red-400" />;
    }
  };

  const { bg, text, border } = getScoreStyle();
  const passCount = module.checks.filter(c => c.status === 'pass').length;
  const totalCount = module.checks.length;

  return (
    <div className={`rounded-lg border ${border} ${bg} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/5 transition-colors"
      >
        {/* Score */}
        <div className={`w-12 h-12 rounded-lg bg-neutral-900 border ${border} flex flex-col items-center justify-center`}>
          <span className={`text-lg font-bold ${text}`}>{percentage}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium">{module.name}</h3>
          <p className="text-sm text-neutral-400 mt-0.5">
            {passCount}/{totalCount} đạt · {module.score}/{module.maxScore} điểm
          </p>
        </div>

        {/* Expand */}
        <ChevronDown
          className={`w-5 h-5 text-neutral-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {module.checks.map((check) => (
            <div
              key={check.id}
              className="p-3 bg-neutral-900 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getStatusIcon(check.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-white">{check.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      check.status === 'pass'
                        ? 'bg-green-500/20 text-green-400'
                        : check.status === 'warning'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}>
                      {check.score}/{check.maxScore}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-neutral-400 space-y-1">
                    <p>Hiện tại: <span className="text-neutral-300">{String(check.current)}</span></p>
                    <p>Yêu cầu: <span className="text-neutral-300">{check.expected}</span></p>
                  </div>

                  {check.status !== 'pass' && check.suggestion && (
                    <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                      <p className="text-xs text-amber-300">
                        💡 {check.suggestion}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
