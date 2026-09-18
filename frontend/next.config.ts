import type { NextConfig } from "next";

const backendUrl = process.env.CLUSTER_HUB_BACKEND_INTERNAL_URL ?? "http://127.0.0.1:3001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  allowedDevOrigins: ["openclaw.tail6518ad.ts.net"],
};

export default nextConfig;
