'use client';

import { useState, useEffect } from 'react';
import { FileText, Hash, Tag, Globe, Sparkles, AlertCircle, ExternalLink, Check, Copy, Code, ChevronDown } from 'lucide-react';
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
  const [schemaCopied, setSchemaCopied] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

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

  // Group suggestions by module
  const groupedSuggestions = result.modules
    .filter(module => module.checks.some(check => check.status !== 'pass' && check.suggestion))
    .map(module => ({
      moduleName: module.name,
      moduleId: module.id,
      suggestions: module.checks
        .filter(check => check.status !== 'pass' && check.suggestion)
        .map(check => ({
          suggestion: check.suggestion,
          status: check.status,
        }))
    }));

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

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
  const totalSuggestions = groupedSuggestions.reduce((acc, g) => acc + g.suggestions.length, 0);

  return (
    <div className="space-y-6">
      {/* Score Overview */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ScoreCircle score={result.totalScore} maxScore={result.maxScore} />

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
              <span className={`text-5xl font-bold ${color}`}>{grade}</span>
              <span className="text-lg text-neutral-400">{label}</span>
            </div>
            <p className="text-neutral-400 text-sm mb-4">
              {percentage >= 80
                ? 'Bài viết đã được tối ưu SEO tốt!'
                : percentage >= 60
                  ? 'Còn một số điểm cần cải thiện.'
                  : 'Cần tối ưu SEO nhiều hơn.'}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-neutral-800 rounded-lg p-3">
                <FileText className="w-4 h-4 text-amber-400 mb-1" />
                <p className="text-xs text-neutral-500">Tiêu đề</p>
                <p className="text-sm text-white truncate" title={result.title}>
                  {result.title.length > 20 ? result.title.slice(0, 20) + '...' : result.title}
                </p>
              </div>
              <div className="bg-neutral-800 rounded-lg p-3">
                <Hash className="w-4 h-4 text-amber-400 mb-1" />
                <p className="text-xs text-neutral-500">Số từ</p>
                <p className="text-sm text-white">{result.wordCount.toLocaleString()}</p>
              </div>
              <div className="bg-neutral-800 rounded-lg p-3">
                <Tag className="w-4 h-4 text-amber-400 mb-1" />
                <p className="text-xs text-neutral-500">Loại bài</p>
                <p className="text-sm text-white">{articleTypeLabels[result.articleType]}</p>
              </div>
              <div className="bg-neutral-800 rounded-lg p-3 cursor-pointer" onClick={copyUrl}>
                <Globe className="w-4 h-4 text-amber-400 mb-1" />
                <p className="text-xs text-neutral-500">URL</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-white truncate">{new URL(result.url).hostname}</p>
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-neutral-500" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left - Modules (2/3) */}
        <div className="lg:w-2/3 space-y-6">
          {needsWorkModules.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                Cần cải thiện ({needsWorkModules.length})
              </h2>
              <div className="space-y-3">
                {needsWorkModules.map((module, i) => (
                  <ModuleCard key={module.id} module={module} defaultExpanded={i === 0} />
                ))}
              </div>
            </div>
          )}

          {goodModules.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                Đạt chuẩn ({goodModules.length})
              </h2>
              <div className="space-y-3">
                {goodModules.map((module) => (
                  <ModuleCard key={module.id} module={module} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right - Suggestions (1/3) */}
        <div className="lg:w-1/3">
          <div className="lg:sticky lg:top-20 space-y-4">
            {/* Quick Suggestions - Grouped by Module */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <span className="text-amber-400">💡</span>
                Gợi ý nhanh
                <span className="text-xs text-neutral-500 font-normal">({totalSuggestions})</span>
              </h3>

              {groupedSuggestions.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                  {groupedSuggestions.map((group) => (
                    <div key={group.moduleId} className="border border-neutral-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleModule(group.moduleId)}
                        className="w-full px-3 py-2 bg-neutral-800 flex items-center justify-between text-left hover:bg-neutral-750 transition-colors"
                      >
                        <span className="text-sm font-medium text-white">{group.moduleName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-500">{group.suggestions.length}</span>
                          <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedModules.includes(group.moduleId) ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {expandedModules.includes(group.moduleId) && (
                        <div className="p-2 space-y-1.5 bg-neutral-850">
                          {group.suggestions.map((item, i) => (
                            <div
                              key={i}
                              className={`p-2 rounded text-xs ${
                                item.status === 'fail'
                                  ? 'bg-red-500/10 text-red-300'
                                  : 'bg-yellow-500/10 text-yellow-300'
                              }`}
                            >
                              💡 {item.suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-medium">Tuyệt vời!</p>
                  <p className="text-sm text-neutral-500">Không có đề xuất</p>
                </div>
              )}
            </div>

            {/* Schema Markup */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Code className="w-4 h-4 text-amber-400" />
                  Schema Markup
                </h3>
                <button
                  onClick={copySchema}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-400 hover:bg-amber-500 text-neutral-900 rounded transition-colors"
                >
                  {schemaCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {schemaCopied ? 'Đã copy' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-neutral-400 mb-3">
                Dán vào <code className="bg-neutral-800 px-1 rounded">&lt;head&gt;</code> của bài viết
              </p>
              <pre className="bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-xs text-green-400 overflow-x-auto max-h-48 custom-scrollbar">
                <code>{`<script type="application/ld+json">
${generateSchema()}
</script>`}</code>
              </pre>
            </div>

            {/* AI Analysis */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Phân tích AI
              </h3>

              {!geminiApiKey && !aiSuggestion && !isLoadingAI && (
                <div className="p-3 bg-neutral-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-300">Cần API Key</p>
                      <p className="text-xs text-neutral-400 mt-1">
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:underline inline-flex items-center gap-1"
                        >
                          Lấy miễn phí <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {geminiApiKey && !aiSuggestion && !isLoadingAI && !aiError && (
                <button
                  onClick={handleGetAISuggestion}
                  className="w-full py-2 bg-amber-400 hover:bg-amber-500 text-neutral-900 font-medium rounded-lg transition-colors"
                >
                  Phân tích với AI
                </button>
              )}

              {isLoadingAI && (
                <div className="text-center py-6">
                  <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-neutral-400 mt-3">Đang phân tích...</p>
                </div>
              )}

              {aiError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                  {aiError}
                </div>
              )}

              {aiSuggestion && (
                <div className="prose prose-sm prose-invert max-w-none max-h-96 overflow-y-auto custom-scrollbar
                  prose-headings:text-amber-400 prose-headings:text-sm prose-headings:font-semibold
                  prose-p:text-neutral-300 prose-p:text-sm prose-p:leading-relaxed
                  prose-strong:text-white
                  prose-ul:text-neutral-300 prose-ol:text-neutral-300
                  prose-li:text-sm prose-li:marker:text-amber-400"
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
