import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // WARNING: this will allow _all_ type errors in your project to slip past
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // /* config options here */
  // // output: "standalone",
  // // Configure static file serving
  // async rewrites() {
  //   return [];
  // },
};

export default nextConfig;
