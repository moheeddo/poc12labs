import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  experimental: {
    serverActions: {
      bodySizeLimit: "2gb",
    },
  },
  images: {
    remotePatterns: [],
    // WebP/AVIF 자동 변환 (Next.js 기본값이지만 명시)
    formats: ["image/avif", "image/webp"],
  },
  poweredByHeader: false,
  // gzip/brotli 압축 (Vercel은 자체 압축하므로 로컬 dev/자체 서버용)
  compress: true,

  async headers() {
    return [
      // HTML 페이지 — 항상 최신 버전 요청 (배포 후 즉시 반영)
      {
        source: "/((?!_next/static|_next/image|favicon).*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      // 정적 자산(_next/static) — content-hash 기반 장기 캐시
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
