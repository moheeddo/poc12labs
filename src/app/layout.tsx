import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0a0e14",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "KHNP HRDI 영상분석 PoC3",
  description:
    "한국수력원자력 인재개발원 — 시뮬레이터 훈련 멀티모달 분석·리더십 코칭·POV 분석을 위한 AI 영상 역량 평가 플랫폼",
  keywords: ["한국수력원자력", "HRDI", "영상분석", "AI", "역량평가", "시뮬레이터"],
  openGraph: {
    title: "KHNP HRDI 영상분석 PoC3",
    description:
      "한국수력원자력 인재개발원 — 시뮬레이터 훈련 멀티모달 분석·리더십 코칭·POV 분석을 위한 AI 영상 역량 평가 플랫폼",
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
      <body className="min-h-screen antialiased scanline-overlay">{children}</body>
    </html>
  );
}
