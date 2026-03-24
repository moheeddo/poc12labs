import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0a0e14",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "KHNP Video AI Platform — 영상 기반 역량 평가 시스템",
  description:
    "한국수력원자력 원전 시뮬레이터 평가·리더십 코칭·POV 분석을 위한 AI 영상 역량 평가 플랫폼",
  keywords: ["한국수력원자력", "영상분석", "AI", "역량평가", "시뮬레이터"],
  openGraph: {
    title: "KHNP Video AI Platform — 영상 기반 역량 평가 시스템",
    description:
      "한국수력원자력 원전 시뮬레이터 평가·리더십 코칭·POV 분석을 위한 AI 영상 역량 평가 플랫폼",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
  },
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
