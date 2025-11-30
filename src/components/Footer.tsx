import { ExternalLink } from 'lucide-react';

export default function Footer() {
  const affiliateLinks = [
    {
      name: 'Hosting Tốc Độ Cao',
      url: 'https://www.hostvn.net/?aff=banpham',
      description: 'HostVN - Hosting chất lượng'
    },
    {
      name: 'Domain Giá Rẻ',
      url: 'https://www.tenten.vn/?aff=banpham',
      description: 'Tên Miền .VN giá tốt'
    },
    {
      name: 'SEO Tools Pro',
      url: 'https://ahrefs.com/?ref=banpham',
      description: 'Ahrefs - Phân tích backlink'
    },
    {
      name: 'Email Marketing',
      url: 'https://www.getresponse.com/?ref=banpham',
      description: 'GetResponse - Email automation'
    }
  ];

  return (
    <footer className="border-t border-neutral-800 mt-12">
      {/* Affiliate Section */}
      <div className="py-8 bg-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h3 className="text-center text-amber-400 font-semibold mb-4 text-sm uppercase tracking-wide">
            Công cụ SEO & Marketing được đề xuất
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {affiliateLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="bg-[#252525] hover:bg-[#2a2a2a] border border-[#333] hover:border-amber-500/50 rounded-lg p-4 transition-all group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#f5f5f5] font-medium text-sm group-hover:text-amber-400 transition-colors">
                    {link.name}
                  </span>
                  <ExternalLink className="w-3 h-3 text-[#666] group-hover:text-amber-400" />
                </div>
                <p className="text-xs text-[#888]">{link.description}</p>
              </a>
            ))}
          </div>
          <p className="text-center text-xs text-[#666] mt-4">
            * Một số link trên là affiliate link. Chúng tôi có thể nhận hoa hồng khi bạn đăng ký qua các link này.
          </p>
        </div>
      </div>

      {/* Copyright */}
      <div className="py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-amber-400 rounded flex items-center justify-center">
                <span className="text-neutral-900 font-bold text-xs">B</span>
              </div>
              <span>© {new Date().getFullYear()} BanPham.Com</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://banpham.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-400 transition-colors"
              >
                Website
              </a>
              <a
                href="https://banpham.com/lien-he"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-400 transition-colors"
              >
                Liên hệ
              </a>
              <span>Made with ❤️ in Vietnam</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
