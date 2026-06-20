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
      <head>
        {/* 폰트 preconnect + 비차단 link 로드 (CSS @import 대비 LCP 개선). display=swap으로 FOIT 방지 */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      {/* scanline-overlay 제거 — 전역 스캔라인은 '제어실 모니터' 테크 클리셰 슬롭 + 무한 애니메이션 */}
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
