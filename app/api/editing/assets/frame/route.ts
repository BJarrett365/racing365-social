import { NextResponse } from "next/server";

/**
 * Stub: future frame extraction (ffmpeg thumbnail at timeSec).
 * v1: client stores cover time in asset meta; no file returned here.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      relPath?: string;
      assetId?: string;
      timeSec?: number;
    };

    const timeSec = typeof body.timeSec === "number" ? body.timeSec : 0;

    return NextResponse.json({
      ok: true,
      stub: true,
      message: "Frame extraction service is not configured yet. Cover time is stored on the asset.",
      coverRelPath: null as string | null,
      received: {
        relPath: body.relPath ?? null,
        assetId: body.assetId ?? null,
        timeSec,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
