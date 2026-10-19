import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@sustainability/auth", "@sustainability/db"],
};

export default nextConfig;
