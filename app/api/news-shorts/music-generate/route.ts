import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  buildElevenLabsMusicPrompt,
  parseMusicPresetId,
  type MusicPromptInput,
} from "@/app/lib/elevenlabs-music-prompt";
import { isSafeContentId, normalizeContentIdForFilename } from "@/app/lib/editor-upload";
import { getServerSecret } from "@/app/lib/server-secrets";
import { outputDir } from "@/app/lib/paths";

const ELEVENLABS_MUSIC_URL = "https://api.elevenlabs.io/v1/music";

function clampMusicLengthMs(ms: number): number {
  return Math.min(600_000, Math.max(3_000, Math.round(ms)));
}

function parseBody(json: unknown): {
  contentId: string;
  promptInput: MusicPromptInput;
  musicLengthMs: number;
  forceInstrumental: boolean;
  saveToLibrary: boolean;
  modelId: string;
} | { error: string } {
  if (!json || typeof json !== "object") return { error: "Invalid JSON body" };
  const o = json as Record<string, unknown>;
  const rawContentId = String(o.contentId ?? "").trim();
  if (!rawContentId) return { error: "contentId is required" };
  const contentId = normalizeContentIdForFilename(rawContentId);
  if (!isSafeContentId(contentId)) return { error: "Invalid contentId" };

  const presetId = parseMusicPresetId(typeof o.presetId === "string" ? o.presetId : undefined);
  const mood = typeof o.mood === "string" ? o.mood : undefined;
  const energy = typeof o.energy === "string" ? o.energy : undefined;
  const tempo = typeof o.tempo === "string" ? o.tempo : undefined;
  const genre = typeof o.genre === "string" ? o.genre : undefined;
  const extraPrompt = typeof o.extraPrompt === "string" ? o.extraPrompt : undefined;

  const promptInput: MusicPromptInput = {
    presetId,
    mood,
    energy,
    tempo,
    genre,
    extraPrompt,
  };

  let musicLengthMs = 30_000;
  if (typeof o.musicLengthSec === "number" && Number.isFinite(o.musicLengthSec)) {
    musicLengthMs = clampMusicLengthMs(o.musicLengthSec * 1000);
  } else if (typeof o.musicLengthMs === "number" && Number.isFinite(o.musicLengthMs)) {
    musicLengthMs = clampMusicLengthMs(o.musicLengthMs);
  }

  const forceInstrumental = o.forceInstrumental !== false;
  const saveToLibrary = o.saveToLibrary === true;
  const modelId = typeof o.modelId === "string" && o.modelId.trim() ? o.modelId.trim() : "music_v1";

  return {
    contentId,
    promptInput,
    musicLengthMs,
    forceInstrumental,
    saveToLibrary,
    modelId,
  };
}

export async function POST(req: Request) {
  try {
    const apiKey = getServerSecret("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY is not configured (env or admin settings)." },
        { status: 503 },
      );
    }

    let bodyJson: unknown;
    try {
      bodyJson = await req.json();
    } catch {
      return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
    }

    const parsed = parseBody(bodyJson);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { contentId, promptInput, musicLengthMs, forceInstrumental, saveToLibrary, modelId } = parsed;
    const prompt = buildElevenLabsMusicPrompt(promptInput);

    const url = new URL(ELEVENLABS_MUSIC_URL);
    url.searchParams.set("output_format", "mp3_44100_128");

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        music_length_ms: musicLengthMs,
        model_id: modelId,
        force_instrumental: forceInstrumental,
      }),
    });

    const buf = Buffer.from(await res.arrayBuffer());

    if (!res.ok) {
      let message = buf.toString("utf-8").slice(0, 2000);
      try {
        const j = JSON.parse(message) as { detail?: unknown };
        const d = j.detail;
        if (Array.isArray(d)) {
          message = d
            .map((x: { msg?: string }) => (typeof x?.msg === "string" ? x.msg : ""))
            .filter(Boolean)
            .join("; ");
        } else if (typeof d === "string") message = d;
      } catch {
        /* keep raw */
      }
      return NextResponse.json(
        { error: message || `ElevenLabs music failed (${res.status})` },
        { status: 502 },
      );
    }

    if (buf.length < 256) {
      return NextResponse.json({ error: "ElevenLabs returned an unexpectedly small response." }, { status: 502 });
    }

    const ts = Date.now();
    const filename = `music-bed-${ts}.mp3`;
    const genDir = path.join(outputDir(), "generated", contentId);
    await fs.mkdir(genDir, { recursive: true });
    const absGenerated = path.join(genDir, filename);
    await fs.writeFile(absGenerated, buf);
    const musicRel = path.join("generated", contentId, filename).split(path.sep).join("/");

    let libraryRel: string | undefined;
    if (saveToLibrary) {
      const libDir = path.join(outputDir(), "library", "music");
      await fs.mkdir(libDir, { recursive: true });
      const libName = `${contentId}-gen-${ts}.mp3`;
      const libAbs = path.join(libDir, libName);
      await fs.copyFile(absGenerated, libAbs);
      libraryRel = path.join("library", "music", libName).split(path.sep).join("/");
    }

    return NextResponse.json({
      ok: true,
      musicRel,
      libraryRel,
      meta: {
        musicLengthMs,
        presetId: promptInput.presetId,
        forceInstrumental,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Music generation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
