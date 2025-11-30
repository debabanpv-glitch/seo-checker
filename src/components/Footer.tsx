export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#333333] mt-12">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <p>
            © {currentYear}{' '}
            <a
              href="https://banpham.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F7C600] hover:underline"
            >
              BanPham.Com
            </a>
            . All rights reserved.
          </p>
          <p>
            SEO Onpage Checker - Tool kiểm tra SEO miễn phí
          </p>
        </div>
      </div>
    </footer>
  );
}
