import { NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/guards";
import {
  audioGuestSessionId,
  participantFromUser,
  upsertAudioGuestSession,
  upsertSessionParticipant,
  type AudioGuestSession,
  type GuestSessionSpeaker,
} from "@/app/lib/audio-guest-sessions";
import { readAuthData } from "@/app/lib/auth/store";
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
    const speakers = normaliseSpeakers(body.speakers, auth.user.name || auth.user.email);
    const hostSpeaker = speakers.find((speaker) => speaker.role === "Host") ?? speakers[0];
    const session: AudioGuestSession = {
      id: audioGuestSessionId(),
      projectId: String(body.projectId || "default-audio-project").trim(),
      title: String(body.title || "Audio with Guests").trim(),
      hostUserId: auth.user.id,
      hostName: auth.user.name || auth.user.email,
      hostEmail: auth.user.email,
      status: "open",
      speakers,
      participants: [],
      tracks: [],
      createdAt: now,
      updatedAt: now,
    };
    upsertSessionParticipant(session, participantFromUser(auth.user, "host", {
      speakerId: hostSpeaker?.id,
      languageIn: hostSpeaker?.languageIn,
      languageOut: hostSpeaker?.languageOut,
      now,
    }));
    const authData = await readAuthData();
    for (const speaker of speakers) {
      if (speaker.role === "Host" || !speaker.assignedUserId) continue;
      const user = authData.users[speaker.assignedUserId];
      if (!user?.active || !user.emailVerifiedAt) continue;
      upsertSessionParticipant(session, participantFromUser(user, "guest", {
        speakerId: speaker.id,
        languageIn: speaker.languageIn,
        languageOut: speaker.languageOut,
        now,
      }));
    }

    await upsertAudioGuestSession(session);

    const url = new URL(req.url);
    return NextResponse.json({
      session,
      joinUrl: `${url.origin}/audio-studio/guests/${session.id}`,
    });
  } catch (error) {
    return jsonError(error, "Guest session creation failed");
  }
}

function normaliseSpeakers(speakers: GuestSessionSpeaker[] | undefined, hostName: string): GuestSessionSpeaker[] {
  const input = Array.isArray(speakers) ? speakers : [];
  return input.map((speaker, index) => ({
    id: String(speaker.id || `speaker-${index}`).trim(),
    displayName: String(index === 0 ? hostName : speaker.displayName || `Guest ${index}`).trim(),
    role: String(speaker.role || (index === 0 ? "Host" : "Guest")).trim(),
    languageIn: String(speaker.languageIn || "en").trim(),
    languageOut: String(speaker.languageOut || "en").trim(),
    assignedUserId: String(speaker.assignedUserId || "").trim() || undefined,
  }));
}
