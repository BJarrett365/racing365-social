import type {
  PodcastScriptSegment,
  PodcastSpeaker,
} from "../../types/podcast-template";
import { PODCAST_DEFAULT_VOICE_SETTINGS } from "./constants";

type ParseInput = {
  script: string;
  existingSpeakers?: PodcastSpeaker[];
};

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toUpperCase();
}

function findOrCreateSpeaker(label: string, speakers: PodcastSpeaker[]): PodcastSpeaker {
  const n = normalizeLabel(label);
  let found = speakers.find((s) => normalizeLabel(s.name) === n);
  if (found) return found;
  found = {
    id: newId("speaker"),
    name: n,
    role: "Custom",
    voiceId: "",
    voiceSettings: { ...PODCAST_DEFAULT_VOICE_SETTINGS },
  };
  speakers.push(found);
  return found;
}

function parseJsonFormat(script: string): Array<{ speaker: string; text: string }> | null {
  const t = script.trim();
  if (!t.startsWith("[")) return null;
  try {
    const arr = JSON.parse(t) as Array<Record<string, unknown>>;
    if (!Array.isArray(arr)) return null;
    return arr
      .map((x) => ({
        speaker: String(x.speaker ?? "").trim(),
        text: String(x.text ?? "").trim(),
      }))
      .filter((x) => x.speaker && x.text);
  } catch {
    return null;
  }
}

function parseCsvishFormat(script: string): Array<{ speaker: string; text: string }> | null {
  const lines = script
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  if (!/^speaker\s*,\s*(line|text)/i.test(lines[0] ?? "")) return null;
  const rows: Array<{ speaker: string; text: string }> = [];
  for (let i = 1; i < lines.length; i += 1) {
    const ln = lines[i] ?? "";
    const firstComma = ln.indexOf(",");
    if (firstComma <= 0) continue;
    const speaker = ln.slice(0, firstComma).trim();
    const text = ln.slice(firstComma + 1).trim().replace(/^"|"$/g, "");
    if (speaker && text) rows.push({ speaker, text });
  }
  return rows.length ? rows : null;
}

function parseLabelLines(script: string): Array<{ speaker: string; text: string }> {
  const lines = script.split(/\r?\n/).map((x) => x.trim());
  const rows: Array<{ speaker: string; text: string }> = [];
  for (const ln of lines) {
    if (!ln) continue;
    const m = ln.match(/^([A-Za-z0-9 _-]{2,40})\s*:\s*(.+)$/);
    if (!m) continue;
    const speaker = m[1]?.trim() ?? "";
    const text = m[2]?.trim() ?? "";
    if (speaker && text) rows.push({ speaker, text });
  }
  return rows;
}

export class ScriptParserService {
  parse(input: ParseInput): {
    segments: PodcastScriptSegment[];
    speakers: PodcastSpeaker[];
    errors: string[];
  } {
    const script = input.script ?? "";
    const speakers = [...(input.existingSpeakers ?? [])];
    let lines = parseJsonFormat(script);
    if (!lines) lines = parseCsvishFormat(script);
    if (!lines) lines = parseLabelLines(script);
    if (!lines.length) {
      return {
        segments: [],
        speakers,
        errors: ["Could not parse script. Use SPEAKER: line, JSON array, or CSV speaker,text format."],
      };
    }
    const segments: PodcastScriptSegment[] = lines.map((row, idx) => {
      const sp = findOrCreateSpeaker(row.speaker, speakers);
      return {
        id: newId("seg"),
        speakerId: sp.id,
        speakerLabel: sp.name,
        text: row.text,
        order: idx,
      };
    });
    return { segments, speakers, errors: [] };
  }
}
