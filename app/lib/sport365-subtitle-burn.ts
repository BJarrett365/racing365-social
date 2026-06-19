/**
 * Sport365 / World Cup football table — sentence-by-sentence burned subtitles (ASS).
 */

import { distributeDurationsForChunks } from "@/app/lib/script-scene-captions";
import type { SubtitleCue } from "@/app/features/content/subtitle-generator";

export const SPORT365_SUBTITLE_PINK = "#BD33B5";
export const SPORT365_SUBTITLE_PINK_SOFT = "#E879A9";
export const SPORT365_SUBTITLE_TEXT = "#ffffff";

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Split voiceover into short broadcast lines (sentences, then long clauses). */
export function splitScriptIntoBroadcastSentences(script: string): string[] {
  const t = script.trim().replace(/\s+/g, " ");
  if (!t) return [];

  const sentences = t
    .split(/(?<=[.!?…])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);

  const out: string[] = [];
  for (const sentence of sentences) {
    if (wordCount(sentence) <= 14) {
      out.push(sentence);
      continue;
    }
    const parts = sentence
      .split(/,\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length <= 1) {
      out.push(sentence);
      continue;
    }
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isLast = i === parts.length - 1;
      if (!isLast && !/[.!?…]$/.test(part)) {
        out.push(`${part},`);
      } else {
        out.push(part);
      }
    }
  }
  return out;
}

/** Time each sentence across the video using word-weighted durations. */
export function buildSport365SentenceCues(script: string, targetTotalSec: number, minCueSec = 1.15): SubtitleCue[] {
  const sentences = splitScriptIntoBroadcastSentences(script);
  if (sentences.length === 0) return [];

  const target = Math.max(minCueSec * sentences.length, targetTotalSec);
  const durations = distributeDurationsForChunks(sentences, target, minCueSec);
  let t = 0;
  return sentences.map((text, i) => {
    const startSec = t;
    const endSec = t + (durations[i] ?? minCueSec);
    t = endSec;
    return { startSec, endSec, text };
  });
}

/** ASS uses &HAABBGGRR (alpha B G R). */
function hexToAssColor(hex: string, alphaByte = "00"): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return "&H00FFFFFF&";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `&H${alphaByte}${b.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${r.toString(16).padStart(2, "0")}&`;
}

function formatAssTime(sec: number): string {
  const t = Math.max(0, sec);
  const totalCs = Math.round(t * 100);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function sanitizeAssLiteral(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, " ")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}");
}

/** Wrap to 1–2 short lines for mobile legibility. */
export function wrapSport365SubtitleLines(text: string, maxChars = 36, maxLines = 2): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = w;
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === 0) lines.push(text.trim());
  return lines.slice(0, maxLines);
}

export type Sport365AssStyle = {
  playResX?: number;
  playResY?: number;
  /** Nudge higher when motion video runs behind the card. */
  busyMotionBackdrop?: boolean;
};

export function buildLeagueTableAss(
  cues: SubtitleCue[],
  style: Sport365AssStyle & { accentColor?: string; styleName?: string } = {},
): string {
  const playResX = style.playResX && style.playResX > 0 ? Math.round(style.playResX) : 1080;
  const playResY = style.playResY && style.playResY > 0 ? Math.round(style.playResY) : 1920;
  const fontSize = Math.round(Math.min(56, Math.max(40, playResX * 0.048)));
  const marginLR = Math.round(playResX * 0.07);
  const marginV = Math.round(playResY * (style.busyMotionBackdrop ? 0.22 : 0.19));
  const accent = style.accentColor ?? SPORT365_SUBTITLE_PINK;
  const styleName = style.styleName ?? "LeagueTable";
  const outlineAccent = hexToAssColor(accent, "00");
  const primary = hexToAssColor(SPORT365_SUBTITLE_TEXT, "00");
  const backTransparent = "&HFF000000&";
  const outlinePx = Math.max(3, Math.round(fontSize * 0.065));
  const inlineOutline = `{\\3c${outlineAccent}\\1c${primary}\\bord${outlinePx}\\shad0\\be0}`;

  const header = `[Script Info]
Title: Football Table Subtitles
ScriptType: v4.00+
PlayResX: ${playResX}
PlayResY: ${playResY}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ${styleName},Arial Bold,${fontSize},${primary},&H000000FF,${outlineAccent},${backTransparent},-1,0,0,0,100,100,0,0,1,${outlinePx},0,2,${marginLR},${marginLR},${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const lines: string[] = [];
  for (const cue of cues) {
    const wrapped = wrapSport365SubtitleLines(cue.text);
    const body = wrapped.map((ln) => sanitizeAssLiteral(ln.toUpperCase())).join("\\N");
    lines.push(
      `Dialogue: 0,${formatAssTime(cue.startSec)},${formatAssTime(cue.endSec)},${styleName},,${marginLR},${marginLR},${marginV},,{\\q2}${inlineOutline}${body}`,
    );
  }

  return `${header}${lines.join("\n")}\n`;
}

export function buildSport365Ass(cues: SubtitleCue[], style: Sport365AssStyle = {}): string {
  return buildLeagueTableAss(cues, {
    ...style,
    accentColor: SPORT365_SUBTITLE_PINK,
    styleName: "Sport365",
  });
}
