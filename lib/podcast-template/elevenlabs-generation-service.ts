import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { getServerSecret } from "@/app/lib/server-secrets";
import { outputDir } from "@/app/lib/paths";
import { ffmpegBinary } from "@/app/features/video/ffmpeg-utils";
import type { PodcastProject, PodcastScriptSegment } from "@/types/podcast-template";
import { buildDialoguePayload } from "@/lib/podcast-template/generation-payload";

type GeneratedDialogueResult = {
  mode: "dialogue" | "per_line";
  segmentAudioRels: string[];
};

function outputAbs(rel: string): string {
  const n = rel.split(path.sep).join("/");
  if (n.includes("..")) throw new Error("Invalid output rel");
  const abs = path.normalize(path.join(outputDir(), ...n.split("/")));
  const root = path.normalize(outputDir());
  if (!abs.startsWith(root + path.sep) && abs !== root) throw new Error("Path outside output");
  return abs;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function writeBuffer(rel: string, buf: Buffer): Promise<void> {
  const abs = outputAbs(rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buf);
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegBinary(), args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    p.stderr.on("data", (c) => {
      err += c.toString();
    });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg failure (${code}): ${err.slice(-900)}`));
    });
  });
}

export class ElevenLabsGenerationService {
  private apiKey(): string {
    const key = getServerSecret("ELEVENLABS_API_KEY");
    if (!key) throw new Error("ELEVENLABS_API_KEY is missing on server");
    return key;
  }

  async generate(project: PodcastProject): Promise<GeneratedDialogueResult> {
    if (project.settings.useDialogueApi) {
      try {
        const rel = await this.generateDialogue(project);
        return { mode: "dialogue", segmentAudioRels: [rel] };
      } catch {
        // Fallback intentionally silent; API surface varies across ElevenLabs plans/models.
      }
    }
    const rels = await this.generatePerLine(project);
    return { mode: "per_line", segmentAudioRels: rels };
  }

  private async generateDialogue(project: PodcastProject): Promise<string> {
    const key = this.apiKey();
    const res = await fetch("https://api.elevenlabs.io/v1/text-to-dialogue", {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildDialoguePayload(project)),
    });
    if (!res.ok) {
      throw new Error(`Dialogue API failed (${res.status})`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const rel = `audio/podcast-template/${project.id}/${newId("dialogue")}.mp3`;
    await writeBuffer(rel, buf);
    return rel;
  }

  private async generatePerLine(project: PodcastProject): Promise<string[]> {
    const key = this.apiKey();
    const out: string[] = [];
    for (const s of [...project.segments].sort((a, b) => a.order - b.order)) {
      const rel = await this.ttsLine(project, s, key);
      out.push(rel);
      if (project.settings.pauseMsBetweenLines > 0) {
        const pauseRel = `audio/podcast-template/${project.id}/${newId("pause")}.mp3`;
        await this.makeSilence(pauseRel, project.settings.pauseMsBetweenLines / 1000);
        out.push(pauseRel);
      }
    }
    return out;
  }

  private async ttsLine(project: PodcastProject, segment: PodcastScriptSegment, key: string): Promise<string> {
    const speaker = project.speakers.find((x) => x.id === segment.speakerId);
    if (!speaker?.voiceId) {
      throw new Error(`Speaker "${segment.speakerLabel}" is missing a voice selection`);
    }
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(speaker.voiceId)}`, {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: segment.text,
        model_id: project.settings.modelId,
        language_code: project.settings.languageCode,
        output_format: project.settings.outputFormat,
        voice_settings: {
          stability: speaker.voiceSettings.stability,
          similarity_boost: speaker.voiceSettings.similarityBoost,
          style: speaker.voiceSettings.style,
          use_speaker_boost: speaker.voiceSettings.speakerBoost,
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`TTS failed for ${segment.speakerLabel} (${res.status}): ${body.slice(0, 240)}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const rel = `audio/podcast-template/${project.id}/${newId("line")}.mp3`;
    await writeBuffer(rel, buf);
    return rel;
  }

  private async makeSilence(rel: string, seconds: number): Promise<void> {
    const abs = outputAbs(rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await runFfmpeg([
      "-y",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-t",
      String(Math.max(0.02, seconds)),
      "-c:a",
      "libmp3lame",
      "-q:a",
      "5",
      abs,
    ]);
  }
}
