'use client';

import { Mail, Phone } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
              <span className="text-neutral-900 font-bold text-sm">B</span>
            </div>
            <span className="text-white font-semibold">BanPham.Com</span>
          </a>

          {/* Contact */}
          <div className="hidden sm:flex items-center gap-5 text-sm text-neutral-400">
            <a
              href="mailto:hi@banpham.com"
              className="hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Mail className="w-4 h-4" />
              hi@banpham.com
            </a>
            <a
              href="tel:0972829205"
              className="hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Phone className="w-4 h-4" />
              0972.829.205
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
