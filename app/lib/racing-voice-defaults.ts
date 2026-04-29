import type { VoiceGender } from "@/types";

export const RACING_EDITOR_DEFAULT_VOICE_GENDER: VoiceGender = "male";
export const RACING_EDITOR_DEFAULT_VOICE_SPEED = 1.2;

export function pickRacingCommentatorVoiceId<
  T extends {
    voiceId: string;
    name: string;
    description?: string | null;
    labels?: Record<string, string> | null;
  },
>(voices: T[]): string | undefined {
  if (!voices.length) return undefined;
  const score = (v: T) => {
    const n = v.name.toLowerCase();
    const accent = (v.labels?.accent ?? "").toLowerCase();
    const uc = (v.labels?.use_case ?? "").toLowerCase();
    const desc = (v.description ?? "").toLowerCase();
    const hay = `${n} ${desc} ${uc}`;
    let s = 0;
    if (accent.includes("british") || accent.includes("uk")) s += 50;
    if (/(commentator|narrator|sports|radio|news|documentary)/.test(hay)) s += 30;
    if (v.labels?.gender?.toLowerCase() === "male") s += 20;
    return s;
  };
  const sorted = [...voices].sort((a, b) => score(b) - score(a));
  return sorted[0]?.voiceId;
}
