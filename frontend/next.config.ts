import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a small self-contained server, used by the Docker image.
  output: "standalone",
};

export default nextConfig;
