import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 영상 파일 업로드 크기 제한 확장
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
