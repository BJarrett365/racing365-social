import { existsSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { getLibraryBlobAssetDiagnostics } from "@/app/lib/library-blob-assets";
import { shouldUseNetlifyBlobStore } from "@/app/lib/netlify-blob-json";
import {
  hasNetlifyBlobExecutionContext,
  isNetlifyHostedLambdaRuntime,
  usesEphemeralOutputRootRuntime,
} from "@/app/lib/netlify-hosted-runtime";
import { outputDir } from "@/app/lib/paths";

/** Minimal JSON probe — no DB, fonts, or data files. Use when debugging “nothing loads”. */
export async function GET() {
  const blobDiagnostics = await getLibraryBlobAssetDiagnostics();
  const payload: Record<string, unknown> = { ok: true, service: "racing365-social" };
  payload.storage = {
    outputDir: outputDir(),
    ephemeralOutputRoot: usesEphemeralOutputRootRuntime(),
    netlifyBlobStoreEnabled: shouldUseNetlifyBlobStore(),
    hasNetlifyBlobExecutionContext: hasNetlifyBlobExecutionContext(),
    isNetlifyHostedLambdaRuntime: isNetlifyHostedLambdaRuntime(),
    libraryBlobAssets: blobDiagnostics,
  };
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
