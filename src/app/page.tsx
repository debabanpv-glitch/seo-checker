'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOForm from '@/components/SEOForm';
import ResultSection from '@/components/ResultSection';
import { SEOCheckResult } from '@/types';
import { Search, CheckCircle, Zap, Shield } from 'lucide-react';

export default function Home() {
  const [result, setResult] = useState<SEOCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    keywords: string[];
    brandName: string;
  } | null>(null);

  const handleSubmit = async (data: {
    url: string;
    keywords: string[];
    brandName: string;
  }) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setFormData({ keywords: data.keywords, brandName: data.brandName });

    try {
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-[#F7C600]">SEO</span> Onpage Checker
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Kiểm tra và tối ưu SEO Onpage cho bài viết của bạn với 18 tiêu chí quan trọng.
            Nhận đề xuất cải thiện từ AI.
          </p>
        </div>

        {/* Features */}
        {!result && (
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-[#F7C600]/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-[#F7C600]" />
              </div>
              <h3 className="font-semibold mb-2">18 Tiêu chí kiểm tra</h3>
              <p className="text-sm text-gray-400">
                Title, Meta, Heading, Content, Images, Links, Schema...
              </p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-[#F7C600]/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-[#F7C600]" />
              </div>
              <h3 className="font-semibold mb-2">AI Suggestions</h3>
              <p className="text-sm text-gray-400">
                Đề xuất cải thiện chi tiết từ Gemini AI
              </p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-[#F7C600]/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-[#F7C600]" />
              </div>
              <h3 className="font-semibold mb-2">100% Miễn phí</h3>
              <p className="text-sm text-gray-400">
                Không giới hạn số lần kiểm tra
              </p>
            </div>
          </div>
        )}

        {/* Form Section */}
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#F7C600]" />
            Nhập thông tin bài viết
          </h2>
          <SEOForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-8">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && formData && (
          <ResultSection
            result={result}
            keywords={formData.keywords}
            brandName={formData.brandName}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
