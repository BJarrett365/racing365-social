import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { readAdminTokenFromRequest } from "@/app/api/live/_lib/read-admin-token";
import { buildFfmpegRtmpPushCommand } from "@/features/live-control/lib/ffmpeg-live-command";
import { getLiveSession } from "@/features/live-control/services/live-session-service";
import { getRestreamIngest } from "@/features/live-control/services/restream-service";

/**
 * Returns a server-generated ffmpeg command line to push `input` to the session RTMP destination.
 * Does not execute ffmpeg.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  let body: { adminToken?: string; input?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, readAdminTokenFromRequest(request, body.adminToken));
  if (denied) return denied;

  const input = typeof body.input === "string" ? body.input.trim() : "";
  if (!input || input.includes("..")) {
    return NextResponse.json({ error: "input must be a safe path (no ..)" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const session = await getLiveSession(id);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let rtmpUrl: string | undefined;
  try {
    if (session.provider === "mux" || session.provider === "mux_restream") {
      rtmpUrl =
        session.muxRtmpUrl ||
        (session.muxStreamKey ? `rtmps://global-live.mux.com:443/app/${session.muxStreamKey}` : undefined);
    } else {
      const ingest = await getRestreamIngest();
      rtmpUrl = ingest.rtmpUrl;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not resolve RTMP destination";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!rtmpUrl) {
    return NextResponse.json(
      { error: "Start the session first so ingest URL / stream key is available." },
      { status: 400 },
    );
  }

  const command = buildFfmpegRtmpPushCommand({ input, rtmpUrl });
  return NextResponse.json({ command, destination: "rtmp" });
}
