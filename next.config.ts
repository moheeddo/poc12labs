import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 영상 파일 업로드 크기 제한 확장 — Server Actions + Route Handlers
  experimental: {
    serverActions: {
      bodySizeLimit: "2gb",
    },
  },
  // 이미지 최적화 — 외부 소스 차단
  images: {
    remotePatterns: [],
  },
  // X-Powered-By 헤더 제거 (서버 정보 노출 방지)
  poweredByHeader: false,
};

export default nextConfig;
