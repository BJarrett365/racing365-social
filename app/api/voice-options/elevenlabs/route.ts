import { NextResponse } from "next/server";
import { getServerSecretAsync } from "@/app/lib/server-secrets";

type ElevenLabsVoice = {
  voice_id: string;
  name: string;
  description?: string;
  category?: string;
  labels?: Record<string, string>;
  is_default?: boolean;
};

function isLabelled(v: ElevenLabsVoice): boolean {
  return Boolean(v.labels && Object.keys(v.labels).length > 0);
}

function isMyVoice(v: ElevenLabsVoice): boolean {
  const c = String(v.category ?? "").toLowerCase();
  return (
    c === "cloned" ||
    c === "generated" ||
    c === "professional" ||
    c === "fine_tuned" ||
    c === "custom" ||
    c === "instant"
  );
}

function toVoiceResponse(v: ElevenLabsVoice) {
  return {
    ...v,
    groupLabel: groupLabelForVoice(v),
  };
}

function buildDiagnostics(voices: ElevenLabsVoice[]) {
  const labelled = voices.filter(isLabelled);
  const unlabelled = voices.filter((v) => !isLabelled(v));
  const mine = voices.filter(isMyVoice);
  return {
    totalDefaults: voices.length,
    labelledDefaults: labelled.length,
    unlabelledDefaults: unlabelled.length,
    unlabelledVoiceNames: unlabelled.map((v) => v.name).slice(0, 50),
    myVoicesCount: mine.length,
  };
}

function groupLabelForVoice(v: ElevenLabsVoice): string {
  if (isMyVoice(v)) return "My voices";
  const gender = String(v.labels?.gender ?? "").toLowerCase().trim();
  if (gender === "female") return "Female";
  if (gender === "male") return "Male";
  if (v.category === "premade" || v.is_default) return "Unspecified";
  return "Other";
}

const FALLBACK_DEFAULTS: ElevenLabsVoice[] = [
  { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", category: "premade", is_default: true },
  {
    voice_id: "JBFqnCBsd6RMkjVDRZzb",
    name: "George",
    category: "premade",
    is_default: true,
    labels: { gender: "male" },
  },
  { voice_id: "ErXwobaYiN019PkySvjV", name: "Antoni", category: "premade", is_default: true },
  { voice_id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", category: "premade", is_default: true },
  { voice_id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", category: "premade", is_default: true },
  { voice_id: "VR6AewLTigWG4xSOukaG", name: "Arnold", category: "premade", is_default: true },
  { voice_id: "pNInz6obpgDQGcFmaJgB", name: "Adam", category: "premade", is_default: true },
  { voice_id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", category: "premade", is_default: true },
  { voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", category: "premade", is_default: true },
];

export async function GET() {
  const key = await getServerSecretAsync("ELEVENLABS_API_KEY");
  if (!key) {
    const diagnostics = buildDiagnostics(FALLBACK_DEFAULTS);
    return NextResponse.json({
      voices: FALLBACK_DEFAULTS.map(toVoiceResponse),
      diagnostics,
      source: "fallback",
      status: "missing_key",
    });
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": key,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const diagnostics = buildDiagnostics(FALLBACK_DEFAULTS);
      return NextResponse.json({
        voices: FALLBACK_DEFAULTS.map(toVoiceResponse),
        diagnostics,
        source: "fallback",
        status: res.status === 401 ? "auth_failed" : "api_error",
      });
    }

    const data = (await res.json()) as { voices?: ElevenLabsVoice[] };
    const raw = Array.isArray(data.voices) ? data.voices : [];
    /** Every voice the API key can use — premade library plus your cloned / generated / professional voices. */
    const all = raw.filter((v) => String(v.voice_id ?? "").trim() && String(v.name ?? "").trim());
    const sortForUi = (voices: ElevenLabsVoice[]) =>
      [...voices].sort((a, b) => {
        const ma = isMyVoice(a);
        const mb = isMyVoice(b);
        if (ma !== mb) return ma ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    const sourceVoices = all.length > 0 ? sortForUi(all) : FALLBACK_DEFAULTS;
    const diagnostics = buildDiagnostics(sourceVoices);
    return NextResponse.json({
      voices: sourceVoices.map(toVoiceResponse),
      diagnostics,
      source: all.length > 0 ? "elevenlabs" : "fallback",
      status: "ok",
    });
  } catch {
    const diagnostics = buildDiagnostics(FALLBACK_DEFAULTS);
    return NextResponse.json({
      voices: FALLBACK_DEFAULTS.map(toVoiceResponse),
      diagnostics,
      source: "fallback",
      status: "network_error",
    });
  }
}
