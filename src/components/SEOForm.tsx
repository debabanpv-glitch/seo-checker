'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Key, Eye, EyeOff } from 'lucide-react';

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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* URL Input */}
      <div>
        <label className="block text-sm font-medium text-neutral-200 mb-2">
          URL bài viết <span className="text-red-400">*</span>
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/bai-viet"
          required
          className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
        />
      </div>

      {/* Two Column */}
      <div className="grid sm:grid-cols-2 gap-5">
        {/* Keywords */}
        <div>
          <label className="block text-sm font-medium text-neutral-200 mb-2">
            Từ khóa <span className="text-red-400">*</span>
          </label>
          <textarea
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="từ khóa chính&#10;từ khóa phụ 1&#10;từ khóa phụ 2"
            required
            rows={3}
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors resize-none"
          />
          <p className="mt-1.5 text-xs text-neutral-500">Mỗi dòng một từ khóa. Dòng đầu là keyword chính.</p>
        </div>

        {/* Brand Name */}
        <div>
          <label className="block text-sm font-medium text-neutral-200 mb-2">
            Thương hiệu
          </label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="BanPham.Com"
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
          />
          <p className="mt-1.5 text-xs text-neutral-500">Dùng để kiểm tra branding trong title.</p>
        </div>
      </div>

      {/* API Key */}
      <div className="p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg">
        <label className="block text-sm font-medium text-neutral-200 mb-2">
          <Key className="w-4 h-4 inline mr-1.5 text-amber-400" />
          Gemini API Key
          <span className="text-neutral-500 font-normal ml-2">(tùy chọn)</span>
        </label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={geminiApiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full px-4 py-2.5 pr-10 bg-neutral-900 border border-neutral-600 rounded-lg text-white placeholder-neutral-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors text-sm"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
          >
            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Để dùng tính năng AI Suggestions.{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:underline"
          >
            Lấy key miễn phí →
          </a>
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-400 hover:bg-amber-500 disabled:bg-amber-400/50 rounded-lg font-semibold text-neutral-900 transition-colors"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Đang phân tích...
          </>
        ) : (
          <>
            <Search className="w-5 h-5" />
            Kiểm tra SEO
          </>
        )}
      </button>
    </form>
  );
}
