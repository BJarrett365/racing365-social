import { NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/guards";
import { readAudioGuestSession, updateAudioGuestSession } from "@/app/lib/audio-guest-sessions";
import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { jsonError } from "../../../../_shared";

type DailyRoomResponse = {
  name?: string;
  url?: string;
  error?: string;
  info?: string;
};

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) return auth.response;

    const { sessionId } = await ctx.params;
    const session = await readAudioGuestSession(sessionId);
    if (!session) return NextResponse.json({ error: "Guest session not found" }, { status: 404 });
    if (session.hostUserId !== auth.user.id) {
      return NextResponse.json({ error: "Only the host can start the guest room video." }, { status: 403 });
    }
    if (session.dailyRoomUrl) return NextResponse.json({ session, roomUrl: session.dailyRoomUrl });

    const apiKey = await getServerSecretAsync("DAILY_API_KEY");
    if (!apiKey) return NextResponse.json({ error: "DAILY_API_KEY is required" }, { status: 503 });

    const roomName = dailyRoomName(session.id);
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 6;
    const res = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "public",
        properties: {
          exp,
          enable_prejoin_ui: true,
          enable_people_ui: true,
          enable_chat: false,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({})) as DailyRoomResponse;
    if (!res.ok || !data.url) {
      return NextResponse.json(
        { error: data.info || data.error || `Daily room creation failed (${res.status})` },
        { status: 400 },
      );
    }

    const updated = await updateAudioGuestSession(session.id, (target) => {
      target.dailyRoomName = data.name || roomName;
      target.dailyRoomUrl = data.url;
      target.dailyRoomCreatedAt = new Date().toISOString();
    });

    return NextResponse.json({ session: updated, roomUrl: data.url, roomName: data.name || roomName });
  } catch (error) {
    return jsonError(error, "Daily room creation failed");
  }
}

function dailyRoomName(sessionId: string): string {
  return `plexa-${sessionId}`.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 120);
}
