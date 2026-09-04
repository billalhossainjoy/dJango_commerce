import type { NextConfig } from "next";

const djangoApiUrl = process.env.DJANGO_API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  reactCompiler: true,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${djangoApiUrl}/api/:path*/`,
      },
    ];
  },
};

export default nextConfig;
