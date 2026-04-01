import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2gb",
    },
  },
  images: {
    remotePatterns: [],
  },
  poweredByHeader: false,

  // CDN 레벨 리버스 프록시 — 서버리스 함수를 거치지 않으므로 body size 제한 없음
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
