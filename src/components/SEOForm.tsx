'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Key, Eye, EyeOff, Globe, Tag, Building2, Sparkles } from 'lucide-react';

interface SEOFormProps {
  onSubmit: (data: { url: string; keywords: string[]; brandName: string; geminiApiKey: string }) => void;
  isLoading: boolean;
}

export default function SEOForm({ onSubmit, isLoading }: SEOFormProps) {
  const [url, setUrl] = useState('');
  const [keywords, setKeywords] = useState('');
  const [brandName, setBrandName] = useState('BanPham.Com');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setGeminiApiKey(savedKey);
    }
  }, []);

  const handleApiKeyChange = (value: string) => {
    setGeminiApiKey(value);
    if (value) {
      localStorage.setItem('gemini_api_key', value);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keywordList = keywords
      .split(/[,\n]/)
      .map((kw) => kw.trim())
      .filter((kw) => kw.length > 0);

    onSubmit({
      url: url.trim(),
      keywords: keywordList,
      brandName: brandName.trim() || 'BanPham.Com',
      geminiApiKey: geminiApiKey.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* API Key Section - Highlighted */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#F7C600]/10 via-[#FF9500]/10 to-[#F7C600]/10 p-[1px]">
        <div className="rounded-2xl bg-[#0D0D0D] p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-[#F7C600]/20">
              <Sparkles className="w-4 h-4 text-[#F7C600]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Gemini API Key</h3>
              <p className="text-xs text-gray-500">Cho tính năng AI Suggestions</p>
            </div>
          </div>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type={showApiKey ? 'text' : 'password'}
              value={geminiApiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#F7C600]/50 focus:bg-white/[0.07] transition-all text-sm"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Lấy miễn phí tại{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F7C600] hover:underline"
            >
              Google AI Studio
            </a>
          </p>
        </div>
      </div>

      {/* Main Form Grid */}
      <div className="grid gap-5">
        {/* URL Input - Full Width */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Globe className="w-4 h-4 text-[#F7C600]" />
            URL bài viết
            <span className="text-red-400">*</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/bai-viet-cua-ban"
            required
            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#F7C600]/50 focus:bg-white/[0.07] transition-all"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid sm:grid-cols-2 gap-5">
          {/* Keywords */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Tag className="w-4 h-4 text-[#F7C600]" />
              Từ khóa
              <span className="text-red-400">*</span>
            </label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="từ khóa chính&#10;từ khóa phụ 1&#10;từ khóa phụ 2"
              required
              rows={4}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#F7C600]/50 focus:bg-white/[0.07] transition-all resize-none text-sm"
            />
            <p className="text-xs text-gray-500">Dòng đầu = keyword chính</p>
          </div>

          {/* Brand Name */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Building2 className="w-4 h-4 text-[#F7C600]" />
              Thương hiệu
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="BanPham.Com"
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#F7C600]/50 focus:bg-white/[0.07] transition-all"
            />
            <p className="text-xs text-gray-500">Mặc định: BanPham.Com</p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="relative w-full group"
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#F7C600] to-[#FF9500] rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
        <div className="relative flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#F7C600] to-[#FF9500] rounded-xl font-bold text-[#0D0D0D] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Đang phân tích...</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              <span>Kiểm tra SEO ngay</span>
            </>
          )}
        </div>
      </button>
    </form>
  );
}
