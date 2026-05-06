import { NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/guards";
import {
  participantForUser,
  participantFromUser,
  RECORDING_CONSENT_TEXT,
  RECORDING_CONSENT_VERSION,
  readAudioGuestSession,
  updateAudioGuestSession,
  upsertSessionParticipant,
} from "@/app/lib/audio-guest-sessions";
import { jsonError } from "../../../_shared";

type Body = {
  action?: "accept-recording-consent";
  speakerId?: string;
  languageIn?: string;
  languageOut?: string;
};

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) return auth.response;

    const { sessionId } = await ctx.params;
    let session = await readAudioGuestSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Guest session not found. Ask the host to create a fresh invite link." },
        { status: 404 },
      );
    }
    const isHost = session.hostUserId === auth.user.id;
    if (!participantForUser(session, auth.user.id)) {
      const participantSpeakers = new Set((session.participants ?? []).map((participant) => participant.speakerId).filter(Boolean));
      const guestSpeaker = session.speakers.find((speaker) => speaker.role !== "Host" && !participantSpeakers.has(speaker.id));
      session = await updateAudioGuestSession(session.id, (target) => {
        upsertSessionParticipant(target, participantFromUser(auth.user, isHost ? "host" : "guest", {
          speakerId: isHost ? target.speakers.find((speaker) => speaker.role === "Host")?.id : guestSpeaker?.id,
          languageIn: guestSpeaker?.languageIn,
          languageOut: guestSpeaker?.languageOut,
        }));
      }) ?? session;
    }

    return NextResponse.json({ session, user: { id: auth.user.id, name: auth.user.name, email: auth.user.email } });
  } catch (error) {
    return jsonError(error, "Guest session lookup failed");
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) return auth.response;

    const body = await req.json().catch(() => ({})) as Body;
    if (body.action !== "accept-recording-consent") {
      return NextResponse.json({ error: "Unsupported guest session action." }, { status: 400 });
    }

    const { sessionId } = await ctx.params;
    const now = new Date().toISOString();
    const session = await updateAudioGuestSession(sessionId, (target) => {
      const existing = participantForUser(target, auth.user.id);
      upsertSessionParticipant(target, {
        ...(existing ?? participantFromUser(auth.user, target.hostUserId === auth.user.id ? "host" : "guest")),
        speakerId: body.speakerId || existing?.speakerId,
        languageIn: body.languageIn || existing?.languageIn || "en",
        languageOut: body.languageOut || existing?.languageOut || "en",
        recordingConsentAcceptedAt: now,
        recordingConsentText: RECORDING_CONSENT_TEXT,
        recordingConsentVersion: RECORDING_CONSENT_VERSION,
        updatedAt: now,
      });
    });
    if (!session) return NextResponse.json({ error: "Guest session not found" }, { status: 404 });

    return NextResponse.json({ session, consentText: RECORDING_CONSENT_TEXT, consentVersion: RECORDING_CONSENT_VERSION });
  } catch (error) {
    return jsonError(error, "Guest consent update failed");
  }
}
