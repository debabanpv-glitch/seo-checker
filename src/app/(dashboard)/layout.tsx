import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-primary flex flex-col">
      <Sidebar />
      <main className="lg:pl-64 flex-1">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
      {/* Footer */}
      <footer className="lg:pl-64 py-4 text-center text-sm text-[var(--text-secondary)] border-t border-border bg-secondary">
        Bản quyền thuộc về <a href="https://banpham.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-dark font-medium">Banpham.com</a> - Website làm hoàn toàn từ AI
      </footer>
    </div>
  );
}
