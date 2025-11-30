'use client';

import { useState } from 'react';
import { FileText, Globe, Hash, Tag, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import ScoreCircle from './ScoreCircle';
import ModuleCard from './ModuleCard';
import { SEOCheckResult } from '@/types';
import ReactMarkdown from 'react-markdown';

interface ResultSectionProps {
  result: SEOCheckResult;
  keywords: string[];
  brandName: string;
  geminiApiKey: string;
}

export default function ResultSection({ result, keywords, brandName, geminiApiKey }: ResultSectionProps) {
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const percentage = Math.round((result.totalScore / result.maxScore) * 100);

  const getGrade = () => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-400' };
    if (percentage >= 80) return { grade: 'A', color: 'text-green-500' };
    if (percentage >= 70) return { grade: 'B', color: 'text-yellow-400' };
    if (percentage >= 60) return { grade: 'C', color: 'text-yellow-500' };
    if (percentage >= 50) return { grade: 'D', color: 'text-orange-500' };
    return { grade: 'F', color: 'text-red-500' };
  };

  const { grade, color } = getGrade();

  const handleGetAISuggestion = async () => {
    if (!geminiApiKey) {
      setAiError('Vui lòng nhập Gemini API Key ở form phía trên để sử dụng tính năng AI Suggestions');
      return;
    }

    setIsLoadingAI(true);
    setAiError(null);

    try {
      const response = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result,
          keywords,
          brandName,
          geminiApiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      setAiSuggestion(data.suggestion);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const articleTypeLabels: Record<string, string> = {
    destination: 'Du lịch/Điểm đến',
    food: 'Ẩm thực',
    guide: 'Hướng dẫn',
    review: 'Review/Đánh giá',
    news: 'Tin tức',
    product: 'Sản phẩm',
    faq: 'FAQ/Hỏi đáp',
    video: 'Video',
    article: 'Bài viết',
  };

  return (
    <div className="space-y-6">
      {/* Score Overview */}
      <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <ScoreCircle score={result.totalScore} maxScore={result.maxScore} />
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <span className={`text-4xl font-bold ${color}`}>{grade}</span>
              <span className="text-gray-400 text-lg">Grade</span>
            </div>
            <p className="text-gray-400 mb-4">
              {percentage >= 80
                ? 'Bài viết được tối ưu SEO tốt!'
                : percentage >= 60
                  ? 'Bài viết cần cải thiện một số điểm.'
                  : 'Bài viết cần tối ưu SEO nhiều hơn.'}
            </p>

            {/* Article Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate" title={result.title}>
                  {result.title.length > 40 ? result.title.slice(0, 40) + '...' : result.title}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Globe className="w-4 h-4 shrink-0" />
                <span className="truncate">{new URL(result.url).hostname}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Hash className="w-4 h-4 shrink-0" />
                <span>{result.wordCount.toLocaleString()} từ</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Tag className="w-4 h-4 shrink-0" />
                <span>{articleTypeLabels[result.articleType] || result.articleType}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div className="grid gap-4">
        <h2 className="text-xl font-bold text-white">Chi tiết kiểm tra</h2>
        {result.modules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>

      {/* AI Suggestions */}
      <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#F7C600]" />
            AI Suggestions
          </h2>
          {!aiSuggestion && !isLoadingAI && (
            <button
              onClick={handleGetAISuggestion}
              disabled={!geminiApiKey}
              className="px-4 py-2 bg-[#F7C600] text-[#0D0D0D] font-medium rounded-lg hover:bg-[#e5b600] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              Nhận đề xuất từ AI
            </button>
          )}
        </div>

        {!geminiApiKey && !aiSuggestion && !isLoadingAI && (
          <div className="p-4 bg-[#F7C600]/10 border border-[#F7C600]/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#F7C600] shrink-0 mt-0.5" />
            <div>
              <p className="text-[#F7C600] font-medium">Cần Gemini API Key</p>
              <p className="text-gray-400 text-sm mt-1">
                Nhập Gemini API Key ở form phía trên để sử dụng tính năng AI Suggestions.
                Lấy key miễn phí tại{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F7C600] hover:underline"
                >
                  aistudio.google.com
                </a>
              </p>
            </div>
          </div>
        )}

        {isLoadingAI && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#F7C600]" />
            <span className="ml-3 text-gray-400">Đang phân tích với AI...</span>
          </div>
        )}

        {aiError && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {aiError}
          </div>
        )}

        {aiSuggestion && (
          <div className="prose prose-invert prose-sm max-w-none prose-headings:text-[#F7C600] prose-a:text-[#F7C600] prose-strong:text-white prose-code:text-[#F7C600] prose-code:bg-[#333333] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[#333333] prose-pre:border prose-pre:border-[#444444]">
            <ReactMarkdown>{aiSuggestion}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
