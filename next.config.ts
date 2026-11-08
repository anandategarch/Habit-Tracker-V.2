import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost", "21.0.9.95"],
  devIndicators: false,
};

export default nextConfig;
