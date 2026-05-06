import { NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/guards";
import {
  audioGuestTrackId,
  participantForUser,
  participantFromUser,
  readAudioGuestSession,
  updateAudioGuestSession,
  upsertSessionParticipant,
} from "@/app/lib/audio-guest-sessions";
import { jsonError, saveAudioFileFromForm } from "../../../../_shared";

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) return auth.response;

    const { sessionId } = await ctx.params;
    const session = await readAudioGuestSession(sessionId);
    if (!session) return NextResponse.json({ error: "Guest session not found" }, { status: 404 });
    if (session.status !== "open") return NextResponse.json({ error: "Guest session is closed" }, { status: 400 });
    const participant = participantForUser(session, auth.user.id);
    const isHost = session.hostUserId === auth.user.id;
    if (!isHost && !participant?.recordingConsentAcceptedAt) {
      return NextResponse.json({ error: "Please accept the meeting recording notice before uploading audio." }, { status: 403 });
    }

    const form = await req.formData();
    const displayName = String(form.get("displayName") || participant?.displayName || auth.user.name || auth.user.email || "Guest").trim();
    form.set("projectId", session.projectId);
    form.set("title", `${session.title} - ${displayName}`);
    const savedFile = await saveAudioFileFromForm(form, "recording");
    const now = new Date().toISOString();
    const track = {
      id: audioGuestTrackId(),
      userId: auth.user.id,
      speakerId: String(form.get("speakerId") || participant?.speakerId || "").trim() || undefined,
      displayName,
      languageIn: String(form.get("languageIn") || participant?.languageIn || "en").trim(),
      languageOut: String(form.get("languageOut") || participant?.languageOut || "en").trim(),
      audioFileId: savedFile.id,
      relPath: savedFile.relPath,
      createdAt: now,
    };

    await updateAudioGuestSession(sessionId, (target) => {
      target.tracks.unshift(track);
      upsertSessionParticipant(target, {
        ...(participant ?? participantFromUser(auth.user, isHost ? "host" : "guest", { now })),
        displayName,
        speakerId: track.speakerId,
        languageIn: track.languageIn,
        languageOut: track.languageOut,
        lastTrackAt: now,
        updatedAt: now,
      });
      target.updatedAt = now;
    });

    return NextResponse.json({ track, file: savedFile });
  } catch (error) {
    return jsonError(error, "Guest track upload failed");
  }
}
