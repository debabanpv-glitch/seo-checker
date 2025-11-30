'use client';

import { useState, useEffect } from 'react';
import { FileText, Hash, Tag, Globe, Sparkles, AlertCircle, ExternalLink, Check, Copy, Code, Search } from 'lucide-react';
import ScoreCircle from './ScoreCircle';
import ModuleCard from './ModuleCard';
import { SEOCheckResult } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const [schemaCopied, setSchemaCopied] = useState(false);

  const percentage = Math.round((result.totalScore / result.maxScore) * 100);

  useEffect(() => {
    if (geminiApiKey && !aiSuggestion && !isLoadingAI) {
      handleGetAISuggestion();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geminiApiKey]);

  const getGrade = () => {
    if (percentage >= 90) return { grade: 'A+', label: 'Xuất sắc', color: 'text-green-400' };
    if (percentage >= 80) return { grade: 'A', label: 'Tốt', color: 'text-green-400' };
    if (percentage >= 70) return { grade: 'B', label: 'Khá', color: 'text-yellow-400' };
    if (percentage >= 60) return { grade: 'C', label: 'Trung bình', color: 'text-yellow-400' };
    if (percentage >= 50) return { grade: 'D', label: 'Yếu', color: 'text-orange-400' };
    return { grade: 'F', label: 'Kém', color: 'text-red-400' };
  };

  const { grade, label, color } = getGrade();

  const handleGetAISuggestion = async () => {
    if (!geminiApiKey) return;

    setIsLoadingAI(true);
    setAiError(null);

    try {
      const response = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, keywords, brandName, geminiApiKey }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Có lỗi xảy ra');
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
    destination: 'Du lịch',
    food: 'Ẩm thực',
    guide: 'Hướng dẫn',
    review: 'Review',
    news: 'Tin tức',
    product: 'Sản phẩm',
    faq: 'FAQ',
    video: 'Video',
    article: 'Bài viết',
  };

  // Group suggestions by module - gộp các gợi ý cùng module
  const groupedSuggestions = result.modules
    .filter(module => module.checks.some(check => check.status !== 'pass' && check.suggestion))
    .map(module => ({
      moduleName: module.name,
      moduleId: module.id,
      suggestions: module.checks
        .filter(check => check.status !== 'pass' && check.suggestion)
        .map(check => check.suggestion)
    }));

  // Generate Schema JSON-LD
  const generateSchema = () => {
    const schemaType = result.articleType === 'faq' ? 'FAQPage' : 'Article';
    const schema = {
      "@context": "https://schema.org",
      "@type": schemaType,
      "headline": result.title,
      "description": `${keywords[0]} - Hướng dẫn chi tiết từ ${brandName}`,
      "author": {
        "@type": "Organization",
        "name": brandName,
        "url": `https://${brandName.toLowerCase().replace(/\s/g, '')}.com`
      },
      "publisher": {
        "@type": "Organization",
        "name": brandName
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": result.url
      },
      "keywords": keywords.join(", "),
      "wordCount": result.wordCount,
      "inLanguage": "vi-VN"
    };
    return JSON.stringify(schema, null, 2);
  };

  const copySchema = () => {
    const schemaCode = `<script type="application/ld+json">
${generateSchema()}
</script>`;
    navigator.clipboard.writeText(schemaCode);
    setSchemaCopied(true);
    setTimeout(() => setSchemaCopied(false), 2000);
  };

  const needsWorkModules = result.modules.filter(m => (m.score / m.maxScore) < 0.8);
  const goodModules = result.modules.filter(m => (m.score / m.maxScore) >= 0.8);

  return (
    <div className="space-y-8">
      {/* Score Overview */}
      <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <ScoreCircle score={result.totalScore} maxScore={result.maxScore} />

          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4 mb-3">
              <span className={`text-5xl font-bold ${color}`}>{grade}</span>
              <span className="text-xl text-[#b3b3b3]">{label}</span>
            </div>
            <p className="text-[#888] text-base mb-6">
              {percentage >= 80
                ? 'Bài viết đã được tối ưu SEO tốt!'
                : percentage >= 60
                  ? 'Còn một số điểm cần cải thiện.'
                  : 'Cần tối ưu SEO nhiều hơn.'}
            </p>

            {/* Title - Full display with clickable URL */}
            <div className="bg-[#252525] rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#888] mb-1">Tiêu đề bài viết</p>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#f5f5f5] font-medium text-base leading-relaxed hover:text-amber-400 transition-colors block"
                  >
                    {result.title}
                  </a>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 text-sm hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {result.url}
                  </a>
                </div>
              </div>
            </div>

            {/* Keywords */}
            <div className="bg-[#252525] rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <Search className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-[#888] mb-2">Từ khóa kiểm tra</p>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((kw, i) => (
                      <span
                        key={i}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          i === 0
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-[#333] text-[#d4d4d4]'
                        }`}
                      >
                        {i === 0 && <span className="mr-1">★</span>}
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#252525] rounded-xl p-4">
                <Hash className="w-5 h-5 text-amber-400 mb-2" />
                <p className="text-sm text-[#888]">Số từ</p>
                <p className="text-[#f5f5f5] font-medium text-lg">{result.wordCount.toLocaleString()}</p>
              </div>
              <div className="bg-[#252525] rounded-xl p-4">
                <Tag className="w-5 h-5 text-amber-400 mb-2" />
                <p className="text-sm text-[#888]">Loại bài</p>
                <p className="text-[#f5f5f5] font-medium">{articleTypeLabels[result.articleType]}</p>
              </div>
              <div className="bg-[#252525] rounded-xl p-4 cursor-pointer hover:bg-[#2a2a2a] transition-colors" onClick={copyUrl}>
                <Globe className="w-5 h-5 text-amber-400 mb-2" />
                <p className="text-sm text-[#888]">URL</p>
                <div className="flex items-center gap-2">
                  <p className="text-[#f5f5f5] font-medium truncate text-sm">{new URL(result.url).hostname}</p>
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-[#666]" />}
                </div>
              </div>
              <div className="bg-[#252525] rounded-xl p-4">
                <FileText className="w-5 h-5 text-amber-400 mb-2" />
                <p className="text-sm text-[#888]">Thương hiệu</p>
                <p className="text-[#f5f5f5] font-medium truncate">{brandName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout 50/50 */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left - Modules */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-[#f5f5f5]">Chi tiết kiểm tra</h2>

          {needsWorkModules.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-red-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                Cần cải thiện ({needsWorkModules.length})
              </h3>
              <div className="space-y-3">
                {needsWorkModules.map((module, i) => (
                  <ModuleCard key={module.id} module={module} defaultExpanded={i === 0} />
                ))}
              </div>
            </div>
          )}

          {goodModules.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-green-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                Đạt chuẩn ({goodModules.length})
              </h3>
              <div className="space-y-3">
                {goodModules.map((module) => (
                  <ModuleCard key={module.id} module={module} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right - Suggestions & Tools */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-[#f5f5f5]">Gợi ý & Công cụ</h2>

          {/* Quick Suggestions - Grouped */}
          {groupedSuggestions.length > 0 && (
            <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-5">
              <h3 className="text-lg font-semibold text-[#f5f5f5] mb-4 flex items-center gap-2">
                💡 Việc cần làm
              </h3>
              <div className="space-y-4">
                {groupedSuggestions.map((group) => (
                  <div key={group.moduleId} className="bg-[#252525] rounded-xl p-4">
                    <h4 className="text-amber-400 font-semibold text-base mb-2">{group.moduleName}</h4>
                    <ul className="space-y-2">
                      {group.suggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start gap-2 text-[#d4d4d4] text-[15px]">
                          <span className="text-amber-400 mt-0.5">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schema Markup */}
          <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#f5f5f5] flex items-center gap-2">
                <Code className="w-5 h-5 text-amber-400" />
                Schema Markup
              </h3>
              <button
                onClick={copySchema}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-[#121212] font-medium rounded-lg transition-colors"
              >
                {schemaCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {schemaCopied ? 'Đã copy!' : 'Copy code'}
              </button>
            </div>
            <p className="text-[#888] text-sm mb-4">
              Dán đoạn code này vào thẻ <code className="bg-[#333] text-amber-400 px-2 py-0.5 rounded">&lt;head&gt;</code> của trang
            </p>
            <pre className="bg-[#0d0d0d] border border-[#333] rounded-xl p-4 text-sm text-green-400 overflow-x-auto max-h-60 custom-scrollbar font-mono">
              <code>{`<script type="application/ld+json">
${generateSchema()}
</script>`}</code>
            </pre>
          </div>

          {/* AI Analysis */}
          <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-5">
            <h3 className="text-lg font-semibold text-[#f5f5f5] mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Phân tích AI
            </h3>

            {!geminiApiKey && !aiSuggestion && !isLoadingAI && (
              <div className="bg-[#252525] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-amber-400 font-medium">Cần Gemini API Key</p>
                    <p className="text-[#888] text-sm mt-1">
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 hover:underline inline-flex items-center gap-1"
                      >
                        Lấy miễn phí tại đây <ExternalLink className="w-4 h-4" />
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {geminiApiKey && !aiSuggestion && !isLoadingAI && !aiError && (
              <button
                onClick={handleGetAISuggestion}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-[#121212] font-semibold rounded-xl transition-colors text-base"
              >
                Phân tích với AI
              </button>
            )}

            {isLoadingAI && (
              <div className="text-center py-8">
                <div className="w-10 h-10 border-3 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto"></div>
                <p className="text-[#888] mt-4">Đang phân tích với Gemini...</p>
              </div>
            )}

            {aiError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
                {aiError}
              </div>
            )}

            {aiSuggestion && (
              <div className="ai-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiSuggestion}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
