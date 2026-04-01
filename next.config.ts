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
};

export default nextConfig;
