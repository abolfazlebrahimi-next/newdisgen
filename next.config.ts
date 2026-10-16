import type { NextConfig } from "next";

/**
 * The dev server is also used from a proxied preview host, so HMR/asset
 * requests coming from that origin must be allowed.
 */
const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.e2b.app", "*.arena.ai", "localhost", "127.0.0.1"],
  reactStrictMode: true,
};

export default nextConfig;
