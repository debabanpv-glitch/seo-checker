'use client';

import { useState, useEffect } from 'react';
import { FileText, Globe, Hash, Tag, Sparkles, AlertCircle, ExternalLink, Copy, Check, Lightbulb } from 'lucide-react';
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

  // Auto-fetch AI suggestion when API key is available
  useEffect(() => {
    if (geminiApiKey && !aiSuggestion && !isLoadingAI) {
      handleGetAISuggestion();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geminiApiKey]);

  const getGrade = () => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-400', bg: 'from-green-500/20 to-green-500/5', label: 'Xuất sắc' };
    if (percentage >= 80) return { grade: 'A', color: 'text-green-500', bg: 'from-green-500/20 to-green-500/5', label: 'Tuyệt vời' };
    if (percentage >= 70) return { grade: 'B', color: 'text-yellow-400', bg: 'from-yellow-500/20 to-yellow-500/5', label: 'Khá tốt' };
    if (percentage >= 60) return { grade: 'C', color: 'text-yellow-500', bg: 'from-yellow-500/20 to-yellow-500/5', label: 'Trung bình' };
    if (percentage >= 50) return { grade: 'D', color: 'text-orange-500', bg: 'from-orange-500/20 to-orange-500/5', label: 'Yếu' };
    return { grade: 'F', color: 'text-red-500', bg: 'from-red-500/20 to-red-500/5', label: 'Cần cải thiện' };
  };

  const { grade, color, bg, label } = getGrade();

  const handleGetAISuggestion = async () => {
    if (!geminiApiKey) {
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

  // Get all suggestions from checks that need improvement
  const allSuggestions = result.modules.flatMap(module =>
    module.checks
      .filter(check => check.status !== 'pass' && check.suggestion)
      .map(check => ({
        moduleName: module.name,
        checkName: check.name,
        suggestion: check.suggestion,
        current: check.current,
        expected: check.expected,
        status: check.status,
      }))
  );

  // Separate modules by performance
  const goodModules = result.modules.filter(m => (m.score / m.maxScore) >= 0.8);
  const needsWorkModules = result.modules.filter(m => (m.score / m.maxScore) < 0.8);

  return (
    <div className="space-y-6">
      {/* Score Overview Card */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${bg} border border-white/10 p-6 sm:p-8`}>
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
                <p className="text-sm text-gray-400">Xếp hạng</p>
                <p className="text-lg font-semibold text-white">{label}</p>
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
                <p className="text-xs text-gray-500">Tiêu đề</p>
                <p className="text-sm text-white truncate" title={result.title}>
                  {result.title.length > 25 ? result.title.slice(0, 25) + '...' : result.title}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                <Hash className="w-4 h-4 text-[#F7C600] mb-1" />
                <p className="text-xs text-gray-500">Số từ</p>
                <p className="text-sm text-white">{result.wordCount.toLocaleString()} từ</p>
              </div>
              <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                <Tag className="w-4 h-4 text-[#F7C600] mb-1" />
                <p className="text-xs text-gray-500">Loại bài</p>
                <p className="text-sm text-white">{articleTypeLabels[result.articleType]}</p>
              </div>
              <div className="p-3 rounded-xl bg-black/20 border border-white/5 group cursor-pointer" onClick={copyUrl}>
                <Globe className="w-4 h-4 text-[#F7C600] mb-1" />
                <p className="text-xs text-gray-500">Địa chỉ</p>
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

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - Technical Details (2/3) */}
        <div className="lg:w-2/3 space-y-6">
          {/* Needs Work */}
          {needsWorkModules.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                Cần cải thiện ({needsWorkModules.length} mục)
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
                Đạt chuẩn ({goodModules.length} mục)
              </h2>
              <div className="grid gap-3">
                {goodModules.map((module) => (
                  <ModuleCard key={module.id} module={module} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - AI Suggestions (1/3) - Sticky */}
        <div className="lg:w-1/3">
          <div className="lg:sticky lg:top-24 space-y-4">
            {/* Quick Suggestions */}
            <div className="rounded-2xl bg-gradient-to-br from-[#F7C600]/10 via-transparent to-[#FF9500]/10 border border-[#F7C600]/20 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-[#F7C600]/20">
                  <Lightbulb className="w-5 h-5 text-[#F7C600]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Gợi ý nhanh</h3>
                  <p className="text-xs text-gray-400">{allSuggestions.length} đề xuất cải thiện</p>
                </div>
              </div>

              {allSuggestions.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {allSuggestions.map((item, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-xl border ${
                        item.status === 'fail'
                          ? 'bg-red-500/5 border-red-500/20'
                          : 'bg-yellow-500/5 border-yellow-500/20'
                      }`}
                    >
                      <p className="text-xs text-gray-500 mb-1">{item.moduleName}</p>
                      <p className="text-sm text-[#F7C600] leading-relaxed">
                        💡 {item.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Check className="w-10 h-10 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-medium">Tuyệt vời!</p>
                  <p className="text-sm text-gray-500">Không có đề xuất cải thiện</p>
                </div>
              )}
            </div>

            {/* AI Deep Analysis */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-[#F7C600]/20">
                  <Sparkles className="w-5 h-5 text-[#F7C600]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Phân tích AI</h3>
                  <p className="text-xs text-gray-400">Đề xuất chi tiết từ Gemini</p>
                </div>
              </div>

              {!geminiApiKey && !aiSuggestion && !isLoadingAI && (
                <div className="p-4 rounded-xl bg-black/20 border border-[#F7C600]/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#F7C600] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[#F7C600] font-medium text-sm">Cần Gemini API Key</p>
                      <p className="text-gray-400 text-xs mt-1">
                        Nhập API Key ở form để dùng tính năng này.{' '}
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#F7C600] hover:underline inline-flex items-center gap-1"
                        >
                          Lấy miễn phí <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isLoadingAI && (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-3 border-[#F7C600]/20 border-t-[#F7C600] animate-spin"></div>
                    <Sparkles className="w-5 h-5 text-[#F7C600] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="mt-3 text-sm text-gray-400">Đang phân tích...</p>
                  <p className="text-xs text-gray-500">Khoảng 10-20 giây</p>
                </div>
              )}

              {aiError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {aiError}
                </div>
              )}

              {aiSuggestion && (
                <div className="prose prose-invert prose-sm max-w-none max-h-[500px] overflow-y-auto pr-2 custom-scrollbar
                  prose-headings:text-[#F7C600] prose-headings:font-bold prose-headings:text-base
                  prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-2
                  prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-sm
                  prose-a:text-[#F7C600] prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-white prose-strong:font-semibold
                  prose-code:text-[#F7C600] prose-code:bg-black/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                  prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-lg
                  prose-ul:text-gray-300 prose-ol:text-gray-300 prose-ul:text-sm prose-ol:text-sm
                  prose-li:marker:text-[#F7C600]"
                >
                  <ReactMarkdown>{aiSuggestion}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
