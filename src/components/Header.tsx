import { Mail, Phone } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b border-[#333333]">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F7C600] rounded-lg flex items-center justify-center">
              <span className="text-[#0D0D0D] font-bold text-xl">B</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">BanPham.Com</h1>
              <p className="text-xs text-gray-400">Cứ đi rồi sẽ đến</p>
            </div>
          </div>

          {/* Contact */}
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <a
              href="mailto:hi@banpham.com"
              className="flex items-center gap-1 hover:text-[#F7C600] transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">hi@banpham.com</span>
            </a>
            <a
              href="tel:0972829205"
              className="flex items-center gap-1 hover:text-[#F7C600] transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">0972.829.205</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
