import { NextResponse } from "next/server";

/**
 * Stub: future server-side trim / re-mux pipeline (ffmpeg).
 * v1: acknowledge request and return stub payload so the UI can show “queued” without failing.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      relPath?: string;
      assetId?: string;
      trimStartSec?: number;
      trimEndSec?: number | null;
    };

    const trimStartSec = typeof body.trimStartSec === "number" ? body.trimStartSec : 0;
    const trimEndSec = body.trimEndSec ?? null;

    return NextResponse.json({
      ok: true,
      stub: true,
      message: "Video trim processing is not configured yet. Trim settings are saved on the asset for export.",
      received: {
        relPath: body.relPath ?? null,
        assetId: body.assetId ?? null,
        trimStartSec,
        trimEndSec,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
