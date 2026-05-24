import type { NextConfig } from "next";

const rawBase = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim();
const basePath =
  !rawBase || rawBase === "/"
    ? undefined
    : rawBase.startsWith("/")
      ? rawBase.replace(/\/$/, "")
      : `/${rawBase.replace(/\/$/, "")}`;

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  distDir: process.env.NEXT_DIST_DIR || ".next",
  /** Dev: allow 127.0.0.1 vs localhost / ::1 host mix so `/_next/*` is not treated as cross-site. */
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
  // Keep native/heavy deps and Supabase out of webpack vendor chunks — avoids missing
  // `./vendor-chunks/@supabase.js` when the dev bundle graph is interrupted or mismatched.
  serverExternalPackages: ["puppeteer", "@sparticuz/chromium", "ffmpeg-static", "@supabase/supabase-js"],
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 8,
  },
};

if (process.env.USE_TURBO !== "1") {
  nextConfig.webpack = (config, { dev, isServer }) => {
    if (dev) {
      config.cache = { type: "memory" };
    }
    if (dev && isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
      };
    }
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...(config.resolve?.fallback ?? {}),
          fs: false,
          path: false,
          net: false,
          tls: false,
          child_process: false,
        },
      };
    }
    if (dev && process.env.NEXT_WEBPACK_POLL !== "0") {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 1000,
      };
    }
    return config;
  };
}

export default nextConfig;
