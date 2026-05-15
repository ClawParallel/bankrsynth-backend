import type { NextConfig } from "next";
import path from "path";

// Monorepo root — two levels up from apps/frontend
const monorepoRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  // Transpile workspace packages so Next.js compiles their TypeScript/ESM sources
  transpilePackages: ["@bankrsynth/shared", "@bankrsynth/synth-sdk"],

  // Standalone output for Docker — produces self-contained server.js bundle
  // Vercel ignores this; only used when NEXT_OUTPUT=standalone (Docker builds)
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,

  // Point Turbopack at the monorepo root to avoid lockfile ambiguity warning
  turbopack: {
    root: monorepoRoot,
  },

  // Image optimization — add production domains as needed
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.bankr.bot",
      },
      {
        protocol: "https",
        hostname: "**.gitlawb.com",
      },
    ],
  },
};

export default nextConfig;
