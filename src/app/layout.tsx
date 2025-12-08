import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Content Tracker - Quản lý công việc Team Content',
  description: 'Hệ thống theo dõi tiến độ content SEO',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-primary text-white antialiased">
        {children}
      </body>
    </html>
  );
}
