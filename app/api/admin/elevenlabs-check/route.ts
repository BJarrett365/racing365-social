import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getServerSecretAsync, getStoredVoiceOptionAsync } from "@/app/lib/server-secrets";

type Body = {
  adminToken?: string;
  elevenlabsApiKey?: string;
};

const FALLBACK_VOICE_ID = "pNInz6obpgDQGcFmaJgB";

function readErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const detail = o.detail;
    if (detail && typeof detail === "object") {
      const d = detail as Record<string, unknown>;
      if (typeof d.message === "string") return d.message;
    }
    const error = o.error;
    if (error && typeof error === "object") {
      const e = error as Record<string, unknown>;
      if (typeof e.message === "string") return e.message;
    }
  }
  return `ElevenLabs API error (${status})`;
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

  const key = body.elevenlabsApiKey?.trim() || await getServerSecretAsync("ELEVENLABS_API_KEY");
  if (!key) {
    return NextResponse.json(
      { error: "No ElevenLabs API key provided (or stored in admin settings)." },
      { status: 400 },
    );
  }

  try {
    const voicesRes = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": key },
      cache: "no-store",
    });
    const voicesData = await voicesRes.json().catch(() => ({}));
    if (!voicesRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          voicesReadOk: false,
          ttsOk: false,
          error: readErrorMessage(voicesData, voicesRes.status),
        },
        { status: 400 },
      );
    }

    const voices = Array.isArray((voicesData as { voices?: unknown[] }).voices)
      ? ((voicesData as { voices?: Array<Record<string, unknown>> }).voices ?? [])
      : [];
    const defaultVoices = voices.filter((v) => v?.category === "premade" || v?.is_default === true);
    const labelledDefaults = defaultVoices.filter((v) => {
      const labels = v?.labels;
      return labels && typeof labels === "object" && Object.keys(labels as object).length > 0;
    });

    const storedVoiceId = await getStoredVoiceOptionAsync("ELEVENLABS_VOICE_ID", "elevenlabsVoiceId") || "";
    const voiceId =
      storedVoiceId ||
      (defaultVoices[0] && typeof defaultVoices[0].voice_id === "string"
        ? String(defaultVoices[0].voice_id)
        : FALLBACK_VOICE_ID);

    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: "Racing three six five audio check.",
        model_id: await getStoredVoiceOptionAsync("ELEVENLABS_MODEL", "elevenlabsModel") || "eleven_multilingual_v2",
      }),
      cache: "no-store",
    });

    if (!ttsRes.ok) {
      const ttsData = await ttsRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          ok: false,
          voicesReadOk: true,
          ttsOk: false,
          defaultVoiceCount: defaultVoices.length,
          labelledDefaultCount: labelledDefaults.length,
          error: readErrorMessage(ttsData, ttsRes.status),
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      voicesReadOk: true,
      ttsOk: true,
      defaultVoiceCount: defaultVoices.length,
      labelledDefaultCount: labelledDefaults.length,
      voiceIdTested: voiceId,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        voicesReadOk: false,
        ttsOk: false,
        error: e instanceof Error ? e.message : "ElevenLabs request failed",
      },
      { status: 500 },
    );
  }
}
