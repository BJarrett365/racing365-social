import { spawnSync } from "child_process";
import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { ffmpegBinary, ffmpegResolutionDebug } from "@/app/features/video/ffmpeg-utils";

function isLocalRequest(req: Request): boolean {
  const host = req.headers.get("host")?.toLowerCase() ?? "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host.startsWith("[::1]:");
}

function assertHealthAccess(req: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const auth = req.headers.get("authorization")?.trim();
    const header = req.headers.get("x-cron-secret")?.trim();
    if (auth === `Bearer ${cronSecret}` || header === cronSecret) return null;
    return NextResponse.json({ error: "Invalid or missing cron secret." }, { status: 401 });
  }
  const denied = assertAdminWrite(req);
  if (!denied) return null;
  if (isLocalRequest(req) && denied.status === 503) return null;
  return denied;
}

export async function GET(req: Request) {
  const denied = assertHealthAccess(req);
  if (denied) return denied;

  const resolution = ffmpegResolutionDebug();
  let version: string | null = null;
  let spawnError: string | null = null;

  try {
    const bin = ffmpegBinary();
    const probe = spawnSync(bin, ["-hide_banner", "-version"], {
      encoding: "utf-8",
      timeout: 10_000,
    });
    if (probe.error) {
      spawnError = probe.error.message;
    } else if (probe.status !== 0) {
      spawnError = (probe.stderr || probe.stdout || `exit ${probe.status}`).slice(0, 500);
    } else {
      version = (probe.stdout || probe.stderr || "").split("\n")[0]?.trim() || null;
    }
  } catch (e) {
    spawnError = e instanceof Error ? e.message : "ffmpeg probe failed";
  }

  return NextResponse.json({
    ok: resolution.selectedExists && !spawnError,
    resolution,
    version,
    spawnError,
  });
}
