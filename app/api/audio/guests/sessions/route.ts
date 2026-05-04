import { NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/guards";
import {
  audioGuestSessionId,
  updateAudioGuestSessions,
  type AudioGuestSession,
  type GuestSessionSpeaker,
} from "@/app/lib/audio-guest-sessions";
import { jsonError } from "../../_shared";

type Body = {
  projectId?: string;
  title?: string;
  speakers?: GuestSessionSpeaker[];
};

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) return auth.response;

    const body = await req.json() as Body;
    const now = new Date().toISOString();
    const session: AudioGuestSession = {
      id: audioGuestSessionId(),
      projectId: String(body.projectId || "default-audio-project").trim(),
      title: String(body.title || "Audio with Guests").trim(),
      hostUserId: auth.user.id,
      status: "open",
      speakers: normaliseSpeakers(body.speakers),
      tracks: [],
      createdAt: now,
      updatedAt: now,
    };

    await updateAudioGuestSessions((store) => {
      store.sessions.unshift(session);
    });

    const url = new URL(req.url);
    return NextResponse.json({
      session,
      joinUrl: `${url.origin}/audio-studio/guests/${session.id}`,
    });
  } catch (error) {
    return jsonError(error, "Guest session creation failed");
  }
}

function normaliseSpeakers(speakers: GuestSessionSpeaker[] | undefined): GuestSessionSpeaker[] {
  const input = Array.isArray(speakers) ? speakers : [];
  return input.map((speaker, index) => ({
    id: String(speaker.id || `speaker-${index}`).trim(),
    displayName: String(speaker.displayName || `Guest ${index}`).trim(),
    role: String(speaker.role || (index === 0 ? "Host" : "Guest")).trim(),
    languageIn: String(speaker.languageIn || "en").trim(),
    languageOut: String(speaker.languageOut || "en").trim(),
  }));
}
