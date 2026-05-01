import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getServerSecretAsync, readStoredSettingsAsync } from "@/app/lib/server-secrets";

type Body = {
  adminToken?: string;
  apifyApiToken?: string;
  apifyYoutubeTranscriptActorId?: string;
};

const DEFAULT_ACTOR_ID = "apilabs/youtube-caption-transcription-scraper";

function toActorPath(actorId: string): string {
  return actorId.trim().replace("/", "~");
}

function readApifyError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const row = data as Record<string, unknown>;
    const error = row.error;
    if (error && typeof error === "object") {
      const message = (error as Record<string, unknown>).message;
      if (typeof message === "string") return message;
    }
    const message = row.message;
    if (typeof message === "string") return message;
  }
  return `Apify API error (${status})`;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  const settings = await readStoredSettingsAsync();
  const token = body.apifyApiToken?.trim() || (await getServerSecretAsync("APIFY_API_TOKEN"));
  const actorId =
    body.apifyYoutubeTranscriptActorId?.trim() ||
    process.env.APIFY_YOUTUBE_TRANSCRIPT_ACTOR_ID ||
    settings.apifyYoutubeTranscriptActorId?.trim() ||
    DEFAULT_ACTOR_ID;

  if (!token) {
    return NextResponse.json(
      { error: "No Apify API token provided (set APIFY_API_TOKEN or store a token in admin settings)." },
      { status: 400 },
    );
  }

  try {
    const userRes = await fetch("https://api.apify.com/v2/users/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const userData = (await userRes.json().catch(() => ({}))) as Record<string, unknown>;
    if (!userRes.ok) {
      return NextResponse.json({ ok: false, error: readApifyError(userData, userRes.status) }, { status: 400 });
    }

    const actorPath = toActorPath(actorId);
    const actorRes = await fetch(`https://api.apify.com/v2/acts/${actorPath}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const actorData = (await actorRes.json().catch(() => ({}))) as Record<string, unknown>;
    if (!actorRes.ok) {
      return NextResponse.json(
        { ok: false, error: `Apify token is valid, but actor "${actorId}" could not be reached: ${readApifyError(actorData, actorRes.status)}` },
        { status: 400 },
      );
    }

    const username =
      typeof userData.data === "object" && userData.data
        ? String((userData.data as Record<string, unknown>).username ?? "")
        : "";
    return NextResponse.json({ ok: true, username, actorId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Apify request failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
