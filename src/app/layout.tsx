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
    "한국수력원자력 인재개발원 — 리더십 코칭·POV 분석을 위한 AI 영상 역량 평가 플랫폼",
  keywords: ["한국수력원자력", "HRDI", "영상분석", "AI", "역량평가", "시뮬레이터", "리더십", "POV", "TwelveLabs"],
  authors: [{ name: "KHNP 인재개발원" }],
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "KHNP HRDI 영상분석 PoC3",
    description:
      "한국수력원자력 인재개발원 — 리더십 코칭·POV 분석을 위한 AI 영상 역량 평가 플랫폼",
    type: "website",
    locale: "ko_KR",
    siteName: "KHNP HRDI Video AI Platform",
  },
  twitter: {
    card: "summary_large_image",
    title: "KHNP HRDI 영상분석 PoC3",
    description: "리더십 코칭·POV 분석 AI 플랫폼",
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
