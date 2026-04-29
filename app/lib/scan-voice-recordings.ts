import fs from "fs/promises";
import path from "path";
import { outputAudioDir } from "@/app/lib/paths";

const VOICE_RECORD_RE = /^(.+)-voice-record\.(webm|mp3|m4a|wav)$/i;

/** Relative paths under `output/`, e.g. `audio/news-123-voice-record.webm`. */
export async function scanVoiceRecordingRels(): Promise<string[]> {
  const out: { rel: string; mtimeMs: number }[] = [];
  let names: string[] = [];
  const dir = outputAudioDir();
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  for (const f of names) {
    if (!VOICE_RECORD_RE.test(f)) continue;
    const st = await fs.stat(path.join(dir, f));
    out.push({ rel: path.join("audio", f).split(path.sep).join("/"), mtimeMs: st.mtimeMs });
  }
  out.sort((a, b) => b.mtimeMs - a.mtimeMs || a.rel.localeCompare(b.rel));
  return out.map((item) => item.rel);
}
