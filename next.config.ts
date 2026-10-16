import type { NextConfig } from "next";

/**
 * The dev server is also used from a proxied preview host, so HMR/asset
 * requests coming from that origin must be allowed.
 */
const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without it Next.js walks up from
  // the project folder looking for lockfiles, and a package-lock.json in a
  // parent directory (for example C:\Users\<name>\package-lock.json) makes it
  // guess the wrong root and print a warning on every start.
  outputFileTracingRoot: __dirname,
  allowedDevOrigins: ["*.e2b.app", "*.arena.ai", "localhost", "127.0.0.1"],
  reactStrictMode: true,
};

export default nextConfig;
