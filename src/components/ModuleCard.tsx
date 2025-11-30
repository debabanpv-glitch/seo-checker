'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, AlertTriangle, X } from 'lucide-react';
import { Module, Check as CheckType } from '@/types';

interface ModuleCardProps {
  module: Module;
}

export default function ModuleCard({ module }: ModuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const percentage = Math.round((module.score / module.maxScore) * 100);

  const getProgressColor = () => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusIcon = (status: CheckType['status']) => {
    switch (status) {
      case 'pass':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'fail':
        return <X className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBg = (status: CheckType['status']) => {
    switch (status) {
      case 'pass':
        return 'bg-green-500/10 border-green-500/30';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'fail':
        return 'bg-red-500/10 border-red-500/30';
    }
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-[#222222] transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-medium">{module.name}</h3>
            <span className="text-sm text-gray-400">
              {module.score}/{module.maxScore} điểm
            </span>
          </div>
          <div className="w-full bg-[#333333] rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        <div className="ml-4">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {module.checks.map((check) => (
            <div
              key={check.id}
              className={`p-3 rounded-lg border ${getStatusBg(check.status)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getStatusIcon(check.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-white font-medium truncate">
                      {check.id}. {check.name}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0">
                      {check.score}/{check.maxScore}đ
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    <span>Hiện tại: </span>
                    <span className="text-gray-300">{String(check.current)}</span>
                    <span className="mx-2">|</span>
                    <span>Yêu cầu: </span>
                    <span className="text-gray-300">{check.expected}</span>
                  </div>
                  {check.status !== 'pass' && (
                    <p className="mt-1 text-xs text-[#F7C600]">
                      💡 {check.suggestion}
                    </p>
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
