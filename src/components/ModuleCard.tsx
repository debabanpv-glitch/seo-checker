'use client';

import { useState } from 'react';
import { ChevronDown, Check, AlertTriangle, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Module, Check as CheckType } from '@/types';

interface ModuleCardProps {
  module: Module;
  defaultExpanded?: boolean;
}

export default function ModuleCard({ module, defaultExpanded = false }: ModuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const percentage = Math.round((module.score / module.maxScore) * 100);

  const getScoreColor = () => {
    if (percentage >= 80) return { bg: 'from-green-500/20 to-green-500/5', text: 'text-green-400', border: 'border-green-500/20' };
    if (percentage >= 60) return { bg: 'from-yellow-500/20 to-yellow-500/5', text: 'text-yellow-400', border: 'border-yellow-500/20' };
    return { bg: 'from-red-500/20 to-red-500/5', text: 'text-red-400', border: 'border-red-500/20' };
  };

  const getStatusIcon = (status: CheckType['status']) => {
    switch (status) {
      case 'pass':
        return (
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-green-400" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
          </div>
        );
      case 'fail':
        return (
          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-red-400" />
          </div>
        );
    }
  };

  const getTrendIcon = () => {
    if (percentage >= 80) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (percentage >= 60) return <Minus className="w-4 h-4 text-yellow-400" />;
    return <TrendingDown className="w-4 h-4 text-red-400" />;
  };

  const { bg, text, border } = getScoreColor();
  const passCount = module.checks.filter(c => c.status === 'pass').length;
  const failCount = module.checks.filter(c => c.status === 'fail').length;

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${border} bg-gradient-to-br ${bg} backdrop-blur-sm transition-all duration-300 hover:border-white/20`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-5 flex items-center gap-4 text-left"
      >
        {/* Score Badge */}
        <div className={`relative shrink-0 w-14 h-14 rounded-xl bg-black/30 flex flex-col items-center justify-center ${border} border`}>
          <span className={`text-lg font-bold ${text}`}>{percentage}</span>
          <span className="text-[10px] text-gray-500">điểm</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold truncate">{module.name}</h3>
            {getTrendIcon()}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-green-400 flex items-center gap-1">
              <Check className="w-3 h-3" />
              {passCount} đạt
            </span>
            {failCount > 0 && (
              <span className="text-red-400 flex items-center gap-1">
                <X className="w-3 h-3" />
                {failCount} chưa đạt
              </span>
            )}
            <span className="text-gray-500">
              {module.score}/{module.maxScore} điểm
            </span>
          </div>
        </div>

        {/* Expand Icon */}
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded Content */}
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-2">
          {module.checks.map((check) => (
            <div
              key={check.id}
              className="p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(check.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-white font-medium leading-tight">
                      {check.name}
                    </p>
                    <span className={`text-xs font-medium shrink-0 px-2 py-0.5 rounded-full ${
                      check.status === 'pass' ? 'bg-green-500/20 text-green-400' :
                      check.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {check.score}/{check.maxScore}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span className="text-gray-500">
                      Hiện tại: <span className="text-gray-300">{String(check.current)}</span>
                    </span>
                    <span className="text-gray-500">
                      Yêu cầu: <span className="text-gray-300">{check.expected}</span>
                    </span>
                  </div>

                  {check.status !== 'pass' && (
                    <div className="mt-2 p-2 rounded-lg bg-[#F7C600]/10 border border-[#F7C600]/20">
                      <p className="text-xs text-[#F7C600] leading-relaxed">
                        💡 {check.suggestion}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
