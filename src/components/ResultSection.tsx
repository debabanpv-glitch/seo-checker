'use client';

import { useState } from 'react';
import { FileText, Globe, Hash, Tag, Sparkles, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

  const percentage = Math.round((result.totalScore / result.maxScore) * 100);

  const getGrade = () => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-400', bg: 'from-green-500/20 to-green-500/5' };
    if (percentage >= 80) return { grade: 'A', color: 'text-green-500', bg: 'from-green-500/20 to-green-500/5' };
    if (percentage >= 70) return { grade: 'B', color: 'text-yellow-400', bg: 'from-yellow-500/20 to-yellow-500/5' };
    if (percentage >= 60) return { grade: 'C', color: 'text-yellow-500', bg: 'from-yellow-500/20 to-yellow-500/5' };
    if (percentage >= 50) return { grade: 'D', color: 'text-orange-500', bg: 'from-orange-500/20 to-orange-500/5' };
    return { grade: 'F', color: 'text-red-500', bg: 'from-red-500/20 to-red-500/5' };
  };

  const { grade, color, bg } = getGrade();

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

  const copyUrl = () => {
    navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  // Separate modules by performance
  const goodModules = result.modules.filter(m => (m.score / m.maxScore) >= 0.8);
  const needsWorkModules = result.modules.filter(m => (m.score / m.maxScore) < 0.8);

  return (
    <div className="space-y-8">
      {/* Score Overview Card */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${bg} border border-white/10 p-6 sm:p-8`}>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

        <div className="relative flex flex-col lg:flex-row items-center gap-8">
          {/* Score Circle */}
          <div className="shrink-0">
            <ScoreCircle score={result.totalScore} maxScore={result.maxScore} />
          </div>

          {/* Info */}
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
              <span className={`text-6xl font-black ${color}`}>{grade}</span>
              <div className="text-left">
                <p className="text-sm text-gray-400">Grade</p>
                <p className="text-lg font-semibold text-white">
                  {percentage >= 80 ? 'Tuyệt vời!' : percentage >= 60 ? 'Khá tốt' : 'Cần cải thiện'}
                </p>
              </div>
            </div>

            <p className="text-gray-400 mb-6 max-w-lg">
              {percentage >= 80
                ? 'Bài viết của bạn đã được tối ưu SEO rất tốt. Tiếp tục duy trì!'
                : percentage >= 60
                  ? 'Bài viết có nền tảng SEO tốt, nhưng vẫn còn một số điểm cần cải thiện.'
                  : 'Bài viết cần được tối ưu SEO nhiều hơn để đạt hiệu quả tốt nhất.'}
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                <FileText className="w-4 h-4 text-[#F7C600] mb-1" />
                <p className="text-xs text-gray-500">Title</p>
                <p className="text-sm text-white truncate" title={result.title}>
                  {result.title.length > 25 ? result.title.slice(0, 25) + '...' : result.title}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                <Hash className="w-4 h-4 text-[#F7C600] mb-1" />
                <p className="text-xs text-gray-500">Số từ</p>
                <p className="text-sm text-white">{result.wordCount.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                <Tag className="w-4 h-4 text-[#F7C600] mb-1" />
                <p className="text-xs text-gray-500">Loại bài</p>
                <p className="text-sm text-white">{articleTypeLabels[result.articleType]}</p>
              </div>
              <div className="p-3 rounded-xl bg-black/20 border border-white/5 group cursor-pointer" onClick={copyUrl}>
                <Globe className="w-4 h-4 text-[#F7C600] mb-1" />
                <p className="text-xs text-gray-500">URL</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-white truncate">{new URL(result.url).hostname}</p>
                  {copied ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Section */}
      <div className="space-y-6">
        {/* Needs Work */}
        {needsWorkModules.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              Cần cải thiện ({needsWorkModules.length})
            </h2>
            <div className="grid gap-3">
              {needsWorkModules.map((module, index) => (
                <ModuleCard key={module.id} module={module} defaultExpanded={index === 0} />
              ))}
            </div>
          </div>
        )}

        {/* Good Performance */}
        {goodModules.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              Đạt chuẩn ({goodModules.length})
            </h2>
            <div className="grid gap-3">
              {goodModules.map((module) => (
                <ModuleCard key={module.id} module={module} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Suggestions */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#F7C600]/10 via-transparent to-[#FF9500]/10 border border-[#F7C600]/20 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F7C600]/10 rounded-full blur-3xl"></div>

        <div className="relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#F7C600]/20">
                <Sparkles className="w-6 h-6 text-[#F7C600]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">AI Suggestions</h2>
                <p className="text-sm text-gray-400">Đề xuất cải thiện từ Gemini AI</p>
              </div>
            </div>

            {!aiSuggestion && !isLoadingAI && (
              <button
                onClick={handleGetAISuggestion}
                disabled={!geminiApiKey}
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#F7C600] to-[#FF9500] rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative px-5 py-2.5 bg-gradient-to-r from-[#F7C600] to-[#FF9500] rounded-xl font-semibold text-[#0D0D0D] flex items-center gap-2 disabled:opacity-50">
                  <Sparkles className="w-4 h-4" />
                  Phân tích với AI
                </div>
              </button>
            )}
          </div>

          {!geminiApiKey && !aiSuggestion && !isLoadingAI && (
            <div className="p-4 rounded-xl bg-black/20 border border-[#F7C600]/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#F7C600] shrink-0 mt-0.5" />
              <div>
                <p className="text-[#F7C600] font-medium">Cần Gemini API Key</p>
                <p className="text-gray-400 text-sm mt-1">
                  Nhập Gemini API Key ở form phía trên để sử dụng tính năng này.{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#F7C600] hover:underline inline-flex items-center gap-1"
                  >
                    Lấy key miễn phí <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
          )}

          {isLoadingAI && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-[#F7C600]/20 border-t-[#F7C600] animate-spin"></div>
                <Sparkles className="w-6 h-6 text-[#F7C600] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="mt-4 text-gray-400">Đang phân tích với AI...</p>
              <p className="text-sm text-gray-500">Có thể mất 10-20 giây</p>
            </div>
          )}

          {aiError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              {aiError}
            </div>
          )}

          {aiSuggestion && (
            <div className="prose prose-invert prose-sm max-w-none
              prose-headings:text-[#F7C600] prose-headings:font-bold
              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
              prose-p:text-gray-300 prose-p:leading-relaxed
              prose-a:text-[#F7C600] prose-a:no-underline hover:prose-a:underline
              prose-strong:text-white prose-strong:font-semibold
              prose-code:text-[#F7C600] prose-code:bg-black/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl
              prose-ul:text-gray-300 prose-ol:text-gray-300
              prose-li:marker:text-[#F7C600]
              prose-table:border-collapse prose-th:bg-black/30 prose-th:p-3 prose-th:text-left prose-th:border prose-th:border-white/10
              prose-td:p-3 prose-td:border prose-td:border-white/10"
            >
              <ReactMarkdown>{aiSuggestion}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
