'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface SEOFormProps {
  onSubmit: (data: { url: string; keywords: string[]; brandName: string }) => void;
  isLoading: boolean;
}

export default function SEOForm({ onSubmit, isLoading }: SEOFormProps) {
  const [url, setUrl] = useState('');
  const [keywords, setKeywords] = useState('');
  const [brandName, setBrandName] = useState('BanPham.Com');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse keywords (comma or newline separated)
    const keywordList = keywords
      .split(/[,\n]/)
      .map((kw) => kw.trim())
      .filter((kw) => kw.length > 0);

    onSubmit({
      url: url.trim(),
      keywords: keywordList,
      brandName: brandName.trim() || 'BanPham.Com',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* URL Input */}
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-1">
          URL bài viết <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/bai-viet"
          required
          className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#F7C600] transition-colors"
        />
      </div>

      {/* Keywords Input */}
      <div>
        <label htmlFor="keywords" className="block text-sm font-medium text-gray-300 mb-1">
          Từ khóa <span className="text-red-500">*</span>
          <span className="text-gray-500 font-normal ml-2">
            (phân cách bằng dấu phẩy hoặc xuống dòng, từ đầu tiên = keyword chính)
          </span>
        </label>
        <textarea
          id="keywords"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="từ khóa chính&#10;từ khóa phụ 1&#10;từ khóa phụ 2"
          required
          rows={4}
          className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#F7C600] transition-colors resize-none"
        />
      </div>

      {/* Brand Name Input */}
      <div>
        <label htmlFor="brandName" className="block text-sm font-medium text-gray-300 mb-1">
          Tên thương hiệu
          <span className="text-gray-500 font-normal ml-2">(mặc định: BanPham.Com)</span>
        </label>
        <input
          type="text"
          id="brandName"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="BanPham.Com"
          className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#F7C600] transition-colors"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-4 bg-[#F7C600] text-[#0D0D0D] font-bold rounded-lg hover:bg-[#e5b600] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Đang kiểm tra...
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
