'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOForm from '@/components/SEOForm';
import ResultSection from '@/components/ResultSection';
import { SEOCheckResult } from '@/types';
import { Search, Zap, Shield, Target, BarChart3, Lightbulb } from 'lucide-react';

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
    {
      icon: Target,
      title: '18 Tiêu chí',
      desc: 'Kiểm tra toàn diện từ Title đến Schema',
    },
    {
      icon: Zap,
      title: 'AI Powered',
      desc: 'Đề xuất cải thiện từ Gemini AI',
    },
    {
      icon: BarChart3,
      title: 'Chi tiết',
      desc: 'Báo cáo điểm số từng module',
    },
    {
      icon: Shield,
      title: 'Miễn phí',
      desc: 'Không giới hạn số lần kiểm tra',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Section */}
        {!result && (
          <div className="text-center mb-12 sm:mb-16">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7C600]/10 border border-[#F7C600]/20 mb-6">
              <Lightbulb className="w-4 h-4 text-[#F7C600]" />
              <span className="text-sm text-[#F7C600]">Tool SEO miễn phí cho Content Creator</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 leading-tight">
              <span className="bg-gradient-to-r from-[#F7C600] to-[#FF9500] bg-clip-text text-transparent">SEO</span>
              {' '}Onpage Checker
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
              Phân tích và tối ưu SEO bài viết với 18 tiêu chí quan trọng.
              Nhận đề xuất cải thiện chi tiết từ AI.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                >
                  <feature.icon className="w-6 h-6 text-[#F7C600] mx-auto mb-2" />
                  <h3 className="font-semibold text-white text-sm mb-1">{feature.title}</h3>
                  <p className="text-xs text-gray-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back Button when showing results */}
        {result && (
          <button
            onClick={() => {
              setResult(null);
              setError(null);
            }}
            className="mb-6 text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            ← Kiểm tra URL khác
          </button>
        )}

        {/* Form Section */}
        <div className={`${result ? 'hidden' : ''}`}>
          <div className="relative overflow-hidden rounded-3xl bg-white/[0.02] border border-white/10 p-6 sm:p-8">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#F7C600]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#FF9500]/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-[#F7C600]/20">
                  <Search className="w-6 h-6 text-[#F7C600]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Kiểm tra SEO</h2>
                  <p className="text-sm text-gray-400">Nhập URL và từ khóa để bắt đầu</p>
                </div>
              </div>

              <SEOForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
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
