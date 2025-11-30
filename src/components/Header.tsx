'use client';

import { useState } from 'react';
import { Mail, Phone, Menu, X, ExternalLink } from 'lucide-react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0D0D0D]/80 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-[#F7C600] to-[#FF9500] rounded-xl flex items-center justify-center shadow-lg shadow-[#F7C600]/20 group-hover:shadow-[#F7C600]/40 transition-shadow">
                <span className="text-[#0D0D0D] font-black text-lg">B</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0D0D0D]"></div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white group-hover:text-[#F7C600] transition-colors">
                BanPham.Com
              </h1>
              <p className="text-[10px] text-gray-500 -mt-0.5">Cứ đi rồi sẽ đến</p>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="https://banpham.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
              Website
              <ExternalLink className="w-3 h-3" />
            </a>
            <div className="h-4 w-px bg-white/10"></div>
            <a
              href="mailto:hi@banpham.com"
              className="text-sm text-gray-400 hover:text-[#F7C600] transition-colors flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              hi@banpham.com
            </a>
            <a
              href="tel:0972829205"
              className="text-sm text-gray-400 hover:text-[#F7C600] transition-colors flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              0972.829.205
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/5">
            <div className="flex flex-col gap-4">
              <a
                href="https://banpham.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Website
              </a>
              <a
                href="mailto:hi@banpham.com"
                className="text-sm text-gray-400 hover:text-[#F7C600] transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                hi@banpham.com
              </a>
              <a
                href="tel:0972829205"
                className="text-sm text-gray-400 hover:text-[#F7C600] transition-colors flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                0972.829.205
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
