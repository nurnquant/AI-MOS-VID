import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@aivs/assets",
    "@aivs/auth",
    "@aivs/content",
    "@aivs/database",
    "@aivs/generation",
    "@aivs/media-core",
    "@aivs/providers",
    "@aivs/queue",
    "@aivs/storage",
    "@aivs/types",
  ],
  serverExternalPackages: ["bullmq", "sharp", "@prisma/client", "@prisma/adapter-pg"],
};

export default nextConfig;
