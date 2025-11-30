'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOForm from '@/components/SEOForm';
import ResultSection from '@/components/ResultSection';
import { SEOCheckResult } from '@/types';
import { Search, Zap, BarChart3, CheckCircle } from 'lucide-react';

export default function Home() {
  const [result, setResult] = useState<SEOCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    keywords: string[];
    brandName: string;
    geminiApiKey: string;
  } | null>(null);

  const handleSubmit = async (data: {
    url: string;
    keywords: string[];
    brandName: string;
    geminiApiKey: string;
  }) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setFormData({ keywords: data.keywords, brandName: data.brandName, geminiApiKey: data.geminiApiKey });

    try {
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: data.url,
          keywords: data.keywords,
          brandName: data.brandName,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Có lỗi xảy ra');
      }

      setResult(responseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: BarChart3, text: '18 tiêu chí SEO' },
    { icon: Zap, text: 'AI phân tích' },
    { icon: CheckCircle, text: 'Miễn phí 100%' },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero + Form */}
        {!result && (
          <div className="max-w-2xl mx-auto">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                <span className="text-amber-400">SEO</span> Onpage Checker
              </h1>
              <p className="text-neutral-400">
                Kiểm tra và tối ưu SEO bài viết với 18 tiêu chí quan trọng
              </p>

              {/* Features */}
              <div className="flex items-center justify-center gap-6 mt-4">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-sm text-neutral-500">
                    <f.icon className="w-4 h-4 text-amber-400" />
                    {f.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-amber-400/10 rounded-lg">
                  <Search className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Kiểm tra SEO</h2>
                  <p className="text-sm text-neutral-500">Nhập URL và từ khóa</p>
                </div>
              </div>

              <SEOForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
          </div>
        )}

        {/* Back Button */}
        {result && (
          <button
            onClick={() => {
              setResult(null);
              setError(null);
            }}
            className="mb-6 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            ← Kiểm tra URL khác
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && formData && (
          <ResultSection
            result={result}
            keywords={formData.keywords}
            brandName={formData.brandName}
            geminiApiKey={formData.geminiApiKey}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
