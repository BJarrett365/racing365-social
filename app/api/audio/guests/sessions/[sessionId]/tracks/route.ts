import { NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/guards";
import { audioGuestTrackId, readAudioGuestSession, updateAudioGuestSession } from "@/app/lib/audio-guest-sessions";
import { jsonError, saveAudioFileFromForm } from "../../../../_shared";

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) return auth.response;

    const { sessionId } = await ctx.params;
    const session = await readAudioGuestSession(sessionId);
    if (!session) return NextResponse.json({ error: "Guest session not found" }, { status: 404 });
    if (session.status !== "open") return NextResponse.json({ error: "Guest session is closed" }, { status: 400 });

    const form = await req.formData();
    form.set("projectId", session.projectId);
    form.set("title", `${session.title} - ${String(form.get("displayName") || auth.user.name || "Guest")}`);
    const savedFile = await saveAudioFileFromForm(form, "recording");
    const now = new Date().toISOString();
    const track = {
      id: audioGuestTrackId(),
      userId: auth.user.id,
      speakerId: String(form.get("speakerId") || "").trim() || undefined,
      displayName: String(form.get("displayName") || auth.user.name || "Guest").trim(),
      languageIn: String(form.get("languageIn") || "en").trim(),
      languageOut: String(form.get("languageOut") || "en").trim(),
      audioFileId: savedFile.id,
      relPath: savedFile.relPath,
      createdAt: now,
    };

    await updateAudioGuestSession(sessionId, (target) => {
      target.tracks.unshift(track);
      target.updatedAt = now;
    });

    return NextResponse.json({ track, file: savedFile });
  } catch (error) {
    return jsonError(error, "Guest track upload failed");
  }
}
