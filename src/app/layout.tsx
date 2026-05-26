import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "KHNP HRDI 영상분석 PoC3",
    template: "%s | KHNP HRDI",
  },
  description:
    "한국수력원자력 인재개발원 — 리더십 역량진단 2.0 (멀티모달 행동지표 기반 AI 영상 분석 플랫폼)",
  keywords: ["한국수력원자력", "HRDI", "영상분석", "AI", "역량평가", "리더십", "멀티모달", "TwelveLabs"],
  authors: [{ name: "KHNP 인재개발원" }],
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "KHNP HRDI 영상분석 PoC3",
    description:
      "한국수력원자력 인재개발원 — 리더십 역량진단 2.0 (멀티모달 행동지표 기반 AI 영상 분석 플랫폼)",
    type: "website",
    locale: "ko_KR",
    siteName: "KHNP HRDI Video AI Platform",
  },
  twitter: {
    card: "summary_large_image",
    title: "KHNP HRDI 영상분석 PoC3",
    description: "리더십 역량진단 2.0 — 멀티모달 행동지표 AI 분석",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased scanline-overlay">{children}</body>
    </html>
  );
}
