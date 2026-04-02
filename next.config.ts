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
  },
  poweredByHeader: false,

  // CDN 레벨 리버스 프록시 — Vercel 서버리스 4.5MB body 제한 우회
  // 파일이 서버리스 함수를 거치지 않고 TwelveLabs API로 직접 스트리밍됨
  async rewrites() {
    return [
      {
        source: "/api/tl-upload",
        destination: "https://api.twelvelabs.io/v1.3/tasks",
      },
    ];
  },
};

export default nextConfig;
