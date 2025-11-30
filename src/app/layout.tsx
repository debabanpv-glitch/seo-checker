import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "SEO Onpage Checker - BanPham.Com",
  description: "Kiểm tra và tối ưu SEO Onpage cho bài viết với 18 tiêu chí quan trọng. Nhận đề xuất cải thiện từ AI. Tool miễn phí từ BanPham.Com",
  keywords: "SEO checker, SEO onpage, kiểm tra SEO, tối ưu SEO, BanPham.Com",
  authors: [{ name: "BanPham.Com" }],
  openGraph: {
    title: "SEO Onpage Checker - BanPham.Com",
    description: "Kiểm tra và tối ưu SEO Onpage cho bài viết với 18 tiêu chí quan trọng",
    type: "website",
    locale: "vi_VN",
  },
  twitter: {
    card: "summary_large_image",
    title: "SEO Onpage Checker - BanPham.Com",
    description: "Kiểm tra và tối ưu SEO Onpage cho bài viết với 18 tiêu chí quan trọng",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0D0D0D]`}
      >
        {children}
      </body>
    </html>
  );
}
