import { Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#F7C600] to-[#FF9500] rounded-lg flex items-center justify-center">
              <span className="text-[#0D0D0D] font-black text-sm">B</span>
            </div>
            <div className="text-sm text-gray-400">
              © {currentYear}{' '}
              <a
                href="https://banpham.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#F7C600] transition-colors"
              >
                BanPham.Com
              </a>
            </div>
          </div>

          {/* Made with */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> in Vietnam
          </div>
        </div>
      </div>
    </footer>
  );
}
