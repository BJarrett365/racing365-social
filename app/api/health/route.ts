import { existsSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

/** Minimal JSON probe — no DB, fonts, or data files. Use when debugging “nothing loads”. */
export async function GET() {
  const payload: Record<string, unknown> = { ok: true, service: "racing365-social" };
  if (process.env.NODE_ENV !== "production") {
    const distDir = (process.env.NEXT_DIST_DIR || ".next").trim() || ".next";
    const root = process.cwd();
    payload.dev = {
      distDir,
      useTurboEnv: process.env.USE_TURBO ?? null,
      turbopackEnv: process.env.TURBOPACK ?? null,
      middlewareManifestExists: existsSync(join(root, distDir, "server", "middleware-manifest.json")),
    };
  }
  return NextResponse.json(payload);
}
