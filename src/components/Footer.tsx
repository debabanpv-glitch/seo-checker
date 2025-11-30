export default function Footer() {
  return (
    <footer className="border-t border-neutral-800 py-6 mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-400 rounded flex items-center justify-center">
              <span className="text-neutral-900 font-bold text-xs">B</span>
            </div>
            <span>© {new Date().getFullYear()} BanPham.Com</span>
          </div>
          <p>Made with ❤️ in Vietnam</p>
        </div>
      </div>
    </footer>
  );
}
