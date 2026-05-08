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
  // Keep native/heavy deps and Supabase out of webpack vendor chunks — avoids missing
  // `./vendor-chunks/@supabase.js` when the dev bundle graph is interrupted or mismatched.
  serverExternalPackages: ["puppeteer", "ffmpeg-static", "@supabase/supabase-js"],
};

if (process.env.USE_TURBO !== "1") {
  nextConfig.webpack = (config, { dev }) => {
    if (dev && process.env.NEXT_WEBPACK_POLL !== "0") {
      // Avoid EMFILE / half-built dev bundles when native file watchers fail (common on macOS).
      // Disable: NEXT_WEBPACK_POLL=0 npm run dev
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  };
}

export default nextConfig;
