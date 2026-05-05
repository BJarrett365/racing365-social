import { NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/guards";
import { readAudioGuestSession } from "@/app/lib/audio-guest-sessions";
import { jsonError } from "../../../_shared";

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) return auth.response;

    const { sessionId } = await ctx.params;
    const session = await readAudioGuestSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Guest session not found. Ask the host to create a fresh invite link." },
        { status: 404 },
      );
    }

    return NextResponse.json({ session, user: { id: auth.user.id, name: auth.user.name, email: auth.user.email } });
  } catch (error) {
    return jsonError(error, "Guest session lookup failed");
  }
}
