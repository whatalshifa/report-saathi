import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // Produces a small self-contained server, used by the Docker image.
  output: "standalone",
  // The browser calls /api/* on the website's own address and Next forwards it to FastAPI.
  // One address means the sign-in cookie is first-party and there is no CORS to configure.
  experimental: {
    // Forwarded requests are buffered up to this size; reports can be 20 MB plus form overhead.
    proxyClientMaxBodySize: "25mb",
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
