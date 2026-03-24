import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KHNP Video AI Platform",
  description: "한국수력원자력 영상 기반 역량 평가 시스템",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
